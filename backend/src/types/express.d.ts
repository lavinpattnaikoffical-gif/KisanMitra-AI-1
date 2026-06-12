import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: Omit<User, 'createdAt' | 'updatedAt'>;
      deviceId?: string;      // Human-readable device ID (set by device auth middleware)
      deviceContext?: {        // Full device info (set by device auth middleware)
        id: string;            // DB primary key
        deviceId: string;      // Human-readable e.g. KM-A1B2C3
        zoneId: string;
        status: string;
      };
    }
  }
}

export {};
