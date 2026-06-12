import { env } from '../config/env';
import { hashSecret } from './hash';

// Generates a 6-digit numeric OTP
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP is valid for 10 minutes
export function otpExpiresAt(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10);
  return d;
}

export async function hashOtp(otp: string): Promise<string> {
  return hashSecret(otp);
}

/**
 * Send OTP via SMS.
 * In bypass mode (development), logs to console and returns "000000".
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  if (env.OTP_BYPASS_MODE) {
    console.log(`📱 [OTP BYPASS] Phone: ${phone} → OTP: ${otp}`);
    return;
  }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    throw new Error('Twilio credentials not configured. Set OTP_BYPASS_MODE=true for development.');
  }

  // Dynamically import Twilio only when needed (not in bypass mode)
  const twilio = await import('twilio');
  const client = twilio.default(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);

  await client.messages.create({
    body: `Your KisanMitra OTP is: ${otp}. Valid for 10 minutes. Do not share it with anyone.`,
    from: env.TWILIO_FROM_NUMBER,
    to: `+91${phone}`,
  });
}

/**
 * In bypass mode, OTP is always "000000".
 * In production, the real OTP is generated and stored hashed.
 */
export function getEffectiveOtp(generated: string): string {
  return env.OTP_BYPASS_MODE ? '000000' : generated;
}
