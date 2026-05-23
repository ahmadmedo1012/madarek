/**
 * Single, typed application error class.
 * The error handler middleware turns these into clean JSON responses.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'TOO_MANY_REQUESTS'
  | 'INTERNAL';

export class AppError extends Error {
  status: number;
  code: ErrorCode;
  details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new AppError('BAD_REQUEST', message, 400, details);
  }
  static unauthenticated(message = 'Authentication required') {
    return new AppError('UNAUTHENTICATED', message, 401);
  }
  static invalidCredentials(message = 'Invalid email or password') {
    return new AppError('INVALID_CREDENTIALS', message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError('FORBIDDEN', message, 403);
  }
  static notFound(message = 'Resource not found') {
    return new AppError('NOT_FOUND', message, 404);
  }
  static conflict(message = 'Conflict', details?: unknown) {
    return new AppError('CONFLICT', message, 409, details);
  }
  static tooMany(message = 'Too many requests') {
    return new AppError('TOO_MANY_REQUESTS', message, 429);
  }
}
