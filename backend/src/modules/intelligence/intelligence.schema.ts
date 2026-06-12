import { z } from 'zod';

export const evaluateZoneSchema = z.object({});
export const evaluateFarmSchema = z.object({});

export interface EvaluationResult {
  zoneId: string;
  needIrrigation: boolean;
  priority: 'HIGH' | 'LOW' | 'NONE';
  reason: string;
  actionTaken: string | null;
}
