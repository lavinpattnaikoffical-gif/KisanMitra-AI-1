import { z } from 'zod';

export const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  language: z.enum(['English', 'Hindi', 'Marathi']).default('English'),
});

export type ChatInput = z.infer<typeof chatSchema>;

export interface AIRecommendationPayload {
  recommendation: string;
  reason: string;
  confidence: number;
}
