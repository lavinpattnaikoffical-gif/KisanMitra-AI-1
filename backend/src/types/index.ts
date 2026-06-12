// Shared types used across the backend (not Prisma-generated)

export interface JwtPayload {
  userId: string;
  phone: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface DeviceProvisionResult {
  deviceId: string;
  deviceSecret: string; // Shown only once at provisioning
}

export interface StandardResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface TelemetryPayload {
  soilMoisture?: number;
  temperature?: number;
  humidity?: number;
  ph?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  [key: string]: unknown; // Allow extra sensor fields
}
