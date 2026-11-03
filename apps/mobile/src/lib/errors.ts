/**
 * errors — the shared Arabic error humanizer (R334 Round-2 groundwork).
 *
 * WHY: every screen that renders a failure needs an Arabic, calm,
 * user-actionable sentence — never raw `error.message` English (stack
 * fragments, HTTP jargon, library internals). The transport layer
 * already normalizes the common paths into Arabic:
 *
 *   · src/api/client.ts throws `ApiError { code, status, message }`
 *     with Arabic messages for NETWORK / TIMEOUT / UNAUTHENTICATED /
 *     BAD_JSON (see its `networkMessage` constant).
 *   · the backend (backend/src/lib/errors.ts, D17-3 message-language
 *     policy) answers `{ error: { code, message } }` where `message`
 *     is Arabic by default and `code` is an UPPER_SNAKE support code.
 *
 * `humanizeError` therefore TRUSTS an already-Arabic message (pass-
 * through — the most specific copy wins) and only maps when the text
 * would otherwise leak English: known ApiError/backend codes, HTTP
 * statuses, and a small dictionary of English error phrases. Anything
 * unrecognized falls back to the generic Arabic sentence — it never
 * renders the raw message.
 *
 * Duck-typed on purpose: `ApiError` instances, backend-shaped plain
 * objects, and third-party errors all flow through the same structural
 * read (`userMessage` → `message` → `code` → `status`). No imports from
 * the api layer — this module stays dependency-free for every consumer.
 */

/** Any string that carries Arabic glyphs is treated as already-human. */
const HAS_ARABIC = /[\u0600-\u06FF]/;

/** Mirrors the transport's offline copy (src/api/client.ts networkMessage). */
export const NETWORK_AR = "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.";
/** Mirrors the transport's timeout copy (src/api/client.ts). */
export const TIMEOUT_AR = "انتهت مهلة الطلب — الخادم بطيء، أعد المحاولة";
/** Mirrors the backend default (D17-3) for auth-family codes. */
export const AUTH_AR = "يلزم تسجيل الدخول للمتابعة";
export const FORBIDDEN_AR = "ليست لديك صلاحية الوصول إلى هذا المحتوى.";
export const NOT_FOUND_AR = "لم يتم العثور على المطلوب.";
export const VALIDATION_AR = "تحقّق من البيانات المُدخلة ثم أعد المحاولة";
export const RATE_LIMIT_AR = "طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة";
export const SERVER_AR = "حدث خطأ في الخادم — حاول مرة أخرى لاحقًا";
/** The catch-all. NEVER let an unknown error render raw English. */
export const GENERIC_AR = "حدث خطأ غير متوقع، حاول مرة أخرى";

/**
 * Known backend (backend/src/lib/errors.ts ErrorCode) + transport
 * (src/api/client.ts) codes → Arabic. Only consulted when the message
 * itself is not already Arabic.
 */
const CODE_MESSAGES: Record<string, string> = {
  // transport (client.ts)
  NETWORK: NETWORK_AR,
  TIMEOUT: TIMEOUT_AR,
  BAD_JSON: "استجابة غير صالحة من الخادم",
  // backend AppError codes (defaults mirror the backend's Arabic copy)
  BAD_REQUEST: "طلب غير صالح — تحقّق من البيانات المُرسلة",
  VALIDATION_ERROR: VALIDATION_AR,
  UNAUTHENTICATED: AUTH_AR,
  TOKEN_EXPIRED: AUTH_AR,
  INVALID_CREDENTIALS: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
  FORBIDDEN: FORBIDDEN_AR,
  NOT_FOUND: NOT_FOUND_AR,
  CONFLICT: "تعارض في البيانات — حدّث الصفحة ثم أعد المحاولة",
  PAYLOAD_TOO_LARGE: "حجم الملف كبير جدًا — جرّب ملفًا أصغر.",
  UNSUPPORTED_MEDIA_TYPE: "نوع الملف غير مدعوم.",
  TOO_MANY_REQUESTS: RATE_LIMIT_AR,
  RATE_LIMIT: RATE_LIMIT_AR,
  INTERNAL: GENERIC_AR,
};

/** HTTP status → Arabic, when no recognizable code/message shape exists. */
function statusMessage(status: number): string | null {
  if (status === 400 || status === 422) return VALIDATION_AR;
  if (status === 401) return AUTH_AR;
  if (status === 403) return FORBIDDEN_AR;
  if (status === 404) return NOT_FOUND_AR;
  if (status === 429) return RATE_LIMIT_AR;
  if (status >= 500) return SERVER_AR;
  return null;
}

/**
 * Known English error phrases → Arabic. Matched lowercased against the
 * code + message + name text. Ordered: first hit wins, so put the more
 * specific families before the generic network/server buckets.
 */
const PATTERN_MESSAGES: { pattern: RegExp; message: string }[] = [
  { pattern: /unauthorized|unauthenticated|token (has )?expired|session expired|not logged in/, message: AUTH_AR },
  { pattern: /forbidden|access denied|permission denied/, message: FORBIDDEN_AR },
  { pattern: /not found|no such|doesn't exist|does not exist/, message: NOT_FOUND_AR },
  { pattern: /rate ?limit|too many requests|slow down/, message: RATE_LIMIT_AR },
  { pattern: /validat|invalid input|is required|must be/, message: VALIDATION_AR },
  { pattern: /timeout|timed out|abort/, message: TIMEOUT_AR },
  { pattern: /network|fetch failed|connection|offline|dns|internet reachable/, message: NETWORK_AR },
  { pattern: /server error|internal server|bad gateway|service unavailable|gateway timeout/, message: SERVER_AR },
];

/** Structural read of anything error-shaped (ApiError, AppError JSON, …). */
interface ErrorLike {
  userMessage?: unknown;
  message?: unknown;
  code?: unknown;
  status?: unknown;
}

const asString = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v : null;

/**
 * The shared Arabic error humanizer — Round-2 screens render failures
 * through this, never through raw `error.message`.
 *
 *   humanizeError(err) → Arabic sentence, always.
 *
 * Precedence: `userMessage` (explicitly normalized, Arabic) → an
 * already-Arabic `message` (client.ts / D17-3 copy passes through
 * verbatim — the most specific text wins) → known code → known status →
 * English-phrase dictionary → the generic Arabic fallback. Never throws.
 */
export function humanizeError(error: unknown): string {
  if (error === null || error === undefined) return GENERIC_AR;

  // A bare string error is its own message candidate.
  const err: ErrorLike =
    typeof error === "object"
      ? (error as ErrorLike)
      : typeof error === "string"
        ? { message: error }
        : {};

  const userMessage = asString(err.userMessage);
  if (userMessage && HAS_ARABIC.test(userMessage)) return userMessage;

  const message = asString(err.message);
  if (message && HAS_ARABIC.test(message)) return message;

  const code = asString(err.code);
  if (code) {
    const byCode = CODE_MESSAGES[code] ?? CODE_MESSAGES[code.toUpperCase()];
    if (byCode) return byCode;
  }

  if (typeof err.status === "number") {
    const byStatus = statusMessage(err.status);
    if (byStatus) return byStatus;
  }

  const haystack = `${code ?? ""} ${message ?? ""}`.toLowerCase();
  if (haystack.trim()) {
    for (const { pattern, message: arabic } of PATTERN_MESSAGES) {
      if (pattern.test(haystack)) return arabic;
    }
  }

  return GENERIC_AR;
}
