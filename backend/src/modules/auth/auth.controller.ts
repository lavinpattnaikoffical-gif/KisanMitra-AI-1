import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import * as R from '../../utils/response';
import { SendOtpInput, VerifyOtpInput, RegisterOtpInput, UpdateProfileInput } from './auth.schema';

export class AuthController {
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.sendOtp(req.body as SendOtpInput);
      R.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.verifyOtp(req.body as VerifyOtpInput);

      if (result.isNewUser) {
        R.success(res, { isNewUser: true }, 'New user — please complete registration', 200);
        return;
      }

      R.success(res, { token: result.token, user: result.user, isNewUser: false }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  async registerOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.registerOtp(req.body as RegisterOtpInput);
      R.created(res, result, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.getMe(req.user!.id);
      R.success(res, user);
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await authService.updateMe(req.user!.id, req.body as UpdateProfileInput);
      R.success(res, user, 'Profile updated');
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
