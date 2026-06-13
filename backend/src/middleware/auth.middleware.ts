import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { unauthorized } from '../utils/response';
import prisma from '../config/prisma';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      unauthorized(res, 'Authorization header missing or malformed');
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    // Verify user still exists in DB (catches deleted users)
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        state: true,
        district: true,
        pincode: true,
        language: true,
        cropType: true,
        farmSize: true,
        farmSizeUnit: true,
        temperatureUnit: true,
      },
    });

    if (!user) {
      unauthorized(res, 'User no longer exists');
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    unauthorized(res, 'Invalid or expired token');
  }
}

/** Middleware factory to restrict by role */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
