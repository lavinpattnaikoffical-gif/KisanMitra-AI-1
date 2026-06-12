import prisma from '../../config/prisma';
import { signToken } from '../../utils/jwt';
import { hashSecret, compareSecret } from '../../utils/hash';
import {
  generateOtp,
  otpExpiresAt,
  hashOtp,
  sendOtpSms,
  getEffectiveOtp,
} from '../../utils/otp';
import { SendOtpInput, VerifyOtpInput, RegisterOtpInput, UpdateProfileInput } from './auth.schema';

export class AuthService {
  /** Step 1: Generate OTP and send SMS */
  async sendOtp(input: SendOtpInput): Promise<{ message: string; bypassOtp?: string }> {
    const { phone } = input;

    // Invalidate any existing unused OTPs for this phone
    await prisma.otpRecord.updateMany({
      where: { phone, used: false },
      data: { used: true },
    });

    const rawOtp = generateOtp();
    const effectiveOtp = getEffectiveOtp(rawOtp);
    const otpHash = await hashOtp(effectiveOtp);

    await prisma.otpRecord.create({
      data: {
        phone,
        otpHash,
        expiresAt: otpExpiresAt(),
        used: false,
      },
    });

    await sendOtpSms(phone, effectiveOtp);

    const result: { message: string; bypassOtp?: string } = {
      message: 'OTP sent successfully',
    };

    // In bypass mode, return OTP in response so frontend can auto-fill
    if (process.env.OTP_BYPASS_MODE === 'true') {
      result.bypassOtp = effectiveOtp;
    }

    return result;
  }

  /** Step 2a: Verify OTP — returns JWT for existing user */
  async verifyOtp(
    input: VerifyOtpInput
  ): Promise<{ token: string; user: object; isNewUser: boolean }> {
    const { phone, otp } = input;

    const record = await prisma.otpRecord.findFirst({
      where: {
        phone,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new Error('OTP expired or not found. Please request a new OTP.');
    }

    const isValid = await compareSecret(otp, record.otpHash);
    if (!isValid) {
      throw new Error('Invalid OTP');
    }

    // Mark OTP as used
    await prisma.otpRecord.update({ where: { id: record.id }, data: { used: true } });

    const existingUser = await prisma.user.findUnique({ where: { phone } });

    if (!existingUser) {
      return { token: '', user: {}, isNewUser: true };
    }

    const token = signToken({ userId: existingUser.id, phone, role: existingUser.role });
    return { token, user: existingUser, isNewUser: false };
  }

  /** Step 2b: Register new user after OTP verification */
  async registerOtp(
    input: RegisterOtpInput
  ): Promise<{ token: string; user: object }> {
    const { phone, otp, ...profileData } = input;

    // Re-verify OTP
    const record = await prisma.otpRecord.findFirst({
      where: { phone, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new Error('OTP expired or not found. Please request a new OTP.');
    }

    const isValid = await compareSecret(otp, record.otpHash);
    if (!isValid) {
      throw new Error('Invalid OTP');
    }

    await prisma.otpRecord.update({ where: { id: record.id }, data: { used: true } });

    // Upsert user — if user already exists, update profile
    const user = await prisma.user.upsert({
      where: { phone },
      update: profileData,
      create: { phone, ...profileData },
    });

    const token = signToken({ userId: user.id, phone, role: user.role });
    return { token, user };
  }

  /** Get current user by ID */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farms: {
          select: { id: true, name: true, location: true, totalArea: true, areaUnit: true },
        },
      },
    });

    if (!user) throw new Error('User not found');
    return user;
  }

  /** Update user profile */
  async updateMe(userId: string, data: UpdateProfileInput) {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}

export const authService = new AuthService();
