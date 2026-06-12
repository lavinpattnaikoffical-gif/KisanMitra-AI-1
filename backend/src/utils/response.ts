import { Response } from 'express';
import { StandardResponse, PaginationMeta } from '../types';

export function success<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: PaginationMeta
): Response {
  const body: StandardResponse<T> = { success: true, message, data, meta };
  return res.status(statusCode).json(body);
}

export function created<T>(res: Response, data: T, message = 'Created'): Response {
  return success(res, data, message, 201);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}

export function badRequest(res: Response, message = 'Bad Request', errors?: unknown): Response {
  const body: StandardResponse = { success: false, message, errors };
  return res.status(400).json(body);
}

export function unauthorized(res: Response, message = 'Unauthorized'): Response {
  const body: StandardResponse = { success: false, message };
  return res.status(401).json(body);
}

export function forbidden(res: Response, message = 'Forbidden'): Response {
  const body: StandardResponse = { success: false, message };
  return res.status(403).json(body);
}

export function notFound(res: Response, message = 'Not Found'): Response {
  const body: StandardResponse = { success: false, message };
  return res.status(404).json(body);
}

export function conflict(res: Response, message = 'Conflict'): Response {
  const body: StandardResponse = { success: false, message };
  return res.status(409).json(body);
}

export function serverError(res: Response, message = 'Internal Server Error'): Response {
  const body: StandardResponse = { success: false, message };
  return res.status(500).json(body);
}
