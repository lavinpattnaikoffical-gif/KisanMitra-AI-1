import { z } from 'zod';

const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile numbers

export const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Invalid Indian mobile number (10 digits, starting with 6-9)'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().trim().regex(phoneRegex, 'Invalid phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const registerOtpSchema = z.object({
  phone: z.string().trim().regex(phoneRegex, 'Invalid Indian mobile number'),
  otp: z.string().length(6).regex(/^\d{6}$/),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  state: z.string().trim().min(1, 'State is required'),
  district: z.string().trim().min(1, 'District is required'),
  language: z.enum(['English', 'Hindi', 'Marathi', 'Telugu', 'Tamil', 'Kannada']).default('English'),
  cropType: z.string().trim().default(''),
  farmSize: z.number().min(0).default(0),
  farmSizeUnit: z.enum(['ACRES', 'BIGHA', 'HECTARES']).default('ACRES'),
  temperatureUnit: z.enum(['C', 'F']).default('C'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().optional(),
  district: z.string().trim().optional(),
  language: z.enum(['English', 'Hindi', 'Marathi', 'Telugu', 'Tamil', 'Kannada']).optional(),
  cropType: z.string().trim().optional(),
  farmSize: z.number().min(0).optional(),
  farmSizeUnit: z.enum(['ACRES', 'BIGHA', 'HECTARES']).optional(),
  temperatureUnit: z.enum(['C', 'F']).optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RegisterOtpInput = z.infer<typeof registerOtpSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
