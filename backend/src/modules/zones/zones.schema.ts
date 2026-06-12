import { z } from 'zod';

export const createZoneSchema = z.object({
  name: z.string().trim().min(1, 'Zone name is required').max(100),
  cropType: z.string().trim().default(''),
  areaSize: z.number().min(0).default(0),
  areaUnit: z.enum(['ACRES', 'BIGHA', 'HECTARES']).default('ACRES'),
  irrigationType: z.enum(['DRIP', 'SPRINKLER', 'FLOOD', 'MANUAL']).default('DRIP'),
  moistureThreshold: z.number().min(0).max(100).default(40),
  isAutoIrrigationEnabled: z.boolean().default(false),
});

export const updateZoneSchema = createZoneSchema.partial();

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;
