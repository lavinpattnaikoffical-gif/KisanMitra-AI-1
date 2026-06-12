import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Middleware factory for Zod request validation.
 * Usage: validate(MySchema) — validates req.body by default
 *        validate(MySchema, 'params') — validates req.params
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = (result.error as ZodError).flatten().fieldErrors;
      res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
      return;
    }

    // Replace request data with parsed (coerced/transformed) values
    req[target] = result.data;
    next();
  };
}
