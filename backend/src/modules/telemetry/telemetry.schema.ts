import { z } from 'zod';

// ── ESP32 Sensor Data Ingestion ─────────────────────────────────────────
export const ingestReadingSchema = z.object({
  moisture: z.number().min(0).max(100).optional(),
  temperature: z.number().min(-40).max(80).optional(), // °C range for agricultural sensors
  humidity: z.number().min(0).max(100).optional(),
  soilTemperature: z.number().min(-40).max(80).optional(),
  ph: z.number().min(0).max(14).optional(),
  gps: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  battery: z.number().min(0).max(100).optional(),
});

// ── Command Creation (user sends command to receiver) ────────────────────
export const createCommandSchema = z.object({
  deviceId: z.string().min(1, 'Device ID required'), // DB primary key
  command: z.string().min(1, 'Command is required'),  // e.g. "START_PUMP", "STOP_VALVE"
  payload: z.record(z.unknown()).optional(),           // e.g. { "duration": 300 }
});

// ── Command Acknowledgement (receiver ESP32 reports back) ────────────────
export const ackCommandSchema = z.object({
  commandId: z.string().cuid('Invalid command ID'),
  status: z.enum(['EXECUTED', 'FAILED']),
});

// ── History query params ─────────────────────────────────────────────────
export const historyQuerySchema = z.object({
  page: z.string().default('1').transform(Number),
  pageSize: z.string().default('50').transform(Number),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type IngestReadingInput = z.infer<typeof ingestReadingSchema>;
export type CreateCommandInput = z.infer<typeof createCommandSchema>;
export type AckCommandInput = z.infer<typeof ackCommandSchema>;
export type HistoryQuery = z.infer<typeof historyQuerySchema>;
