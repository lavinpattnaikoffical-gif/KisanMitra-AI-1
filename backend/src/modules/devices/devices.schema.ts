import { z } from 'zod';

export const provisionDeviceSchema = z.object({
  zoneId: z.string().min(1, 'Zone ID is required'),
  role: z.enum(['SENDER', 'RECEIVER']),
  type: z.enum(['SOIL', 'WEATHER', 'NPK', 'PH', 'GPS', 'RELAY', 'PUMP', 'VALVE']),
  firmware: z.string().trim().optional(),
});

export const updateDeviceSchema = z.object({
  role: z.enum(['SENDER', 'RECEIVER']).optional(),
  type: z.enum(['SOIL', 'WEATHER', 'NPK', 'PH', 'GPS', 'RELAY', 'PUMP', 'VALVE']).optional(),
  firmware: z.string().trim().optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'PROVISIONED', 'ERROR']).optional(),
});

export type ProvisionDeviceInput = z.infer<typeof provisionDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
