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
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
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

  // Default messages are Arabic per D17-3 (message language policy):
  // UPPER_SNAKE codes stay English for the FE support-code chip; the
  // human-readable message is what toasts render. Keep them short, calm
  // and user-actionable — they surface verbatim in the UI.
  static badRequest(message = 'طلب غير صالح — تحقّق من البيانات المُرسلة', details?: unknown) {
    return new AppError('BAD_REQUEST', message, 400, details);
  }
  static unauthenticated(message = 'يلزم تسجيل الدخول للمتابعة') {
    return new AppError('UNAUTHENTICATED', message, 401);
  }
  static invalidCredentials(message = 'البريد الإلكتروني أو كلمة المرور غير صحيحة') {
    return new AppError('INVALID_CREDENTIALS', message, 401);
  }
  static forbidden(message = 'لا تملك صلاحية تنفيذ هذا الإجراء') {
    return new AppError('FORBIDDEN', message, 403);
  }
  static notFound(message = 'العنصر المطلوب غير موجود') {
    return new AppError('NOT_FOUND', message, 404);
  }
  static conflict(message = 'تعارض في البيانات — حدّث الصفحة ثم أعد المحاولة', details?: unknown) {
    return new AppError('CONFLICT', message, 409, details);
  }
  static tooMany(message = 'طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة') {
    return new AppError('TOO_MANY_REQUESTS', message, 429);
  }
  /**
   * Intentional server fault. Deliberately takes no `details` and its
   * message must stay client-safe: the error handler forwards AppError
   * payloads verbatim, so internals (stacks, SQL, file paths) belong
   * in the server log — the default matches the catch-all 500 text
   * exactly.
   */
  static internal(message = 'حدث خطأ غير متوقع — حاول مرة أخرى') {
    return new AppError('INTERNAL', message, 500);
  }
}
