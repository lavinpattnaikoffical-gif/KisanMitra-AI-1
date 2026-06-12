import { z } from 'zod';

export const createFarmSchema = z.object({
  name: z.string().trim().min(1, 'Farm name is required').max(100),
  location: z.string().trim().default(''),
  totalArea: z.number().min(0).default(0),
  areaUnit: z.enum(['ACRES', 'BIGHA', 'HECTARES']).default('ACRES'),
  state: z.string().trim().default(''),
  district: z.string().trim().default(''),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const updateFarmSchema = createFarmSchema.partial();

export type CreateFarmInput = z.infer<typeof createFarmSchema>;
export type UpdateFarmInput = z.infer<typeof updateFarmSchema>;
