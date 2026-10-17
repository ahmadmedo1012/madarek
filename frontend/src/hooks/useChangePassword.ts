import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import { api, unwrap, extractSessionExtras, type AuthSessionResponse } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { apiErrorMessage } from '../lib/format';
import { isCommonPassword } from '../lib/commonPasswords';

/**
 * r180-F4 — POST /auth/change-password (the backend contract, verified
 * in auth.routes.ts + auth.service.ts changePassword):
 *
 * - the CURRENT password is argon2-verified first; a mismatch answers
 *   401 INVALID_CREDENTIALS with the backend's own Arabic copy
 *   («كلمة المرور الحالية غير صحيحة»);
 * - the NEW password enforces the shared register policy (auth.dto.ts
 *   passwordSchema — the r170g ASVS floor: 12–72 chars, never one of
 *   the most-abused passwords, never trimmed);
 * - the failed-attempt limiter is per-USER (10 failures / 15 min,
 *   successful changes free) and its 429 carries Arabic copy;
 * - on success the hash update AND the tokenVersion bump land in ONE
 *   atomic conditional write: every OTHER device's refresh cookie
 *   dies, and the route immediately issues THIS device a fresh
 *   session (new access token + rotated httpOnly refresh cookie in
 *   the same response).
 *
 * The honest post-success behavior is therefore: KEEP this session
 * logged in — persist the re-issued tokens (setSession) so the next
 * request carries the fresh access token — and tell the user the
 * other sessions were signed out. No forced logout: this is NOT a
 * session boundary (same user, same cached data; the payload
 * re-resolves the institution context the same way refresh does).
 */

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

/**
 * FE mirror of the backend password policy (auth.dto.ts
 * passwordSchema + lib/commonPasswords.ts — the r165f/r170g parity
 * contract RegisterPage's local registerPasswordSchema also mirrors).
 * Duplicated here ON PURPOSE: importing the schema from
 * RegisterPage.tsx would drag the whole lazy register-page chunk into
 * every consumer. Same rules, same Arabic messages the backend's
 * field-specific 400 carries, so an 8–11-char or blocklisted secret
 * is caught client-side instead of bouncing as a generic 400.
 */
export const changePasswordPolicy = z
  .string()
  .min(12, '12 حرفًا على الأقل')
  .max(72, '72 حرفًا كحدّ أقصى')
  .refine((pw) => !isCommonPassword(pw), {
    message: 'كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا',
  });

export function useChangePassword() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      unwrap<AuthSessionResponse>(api.post('/auth/change-password', input)),
    onSuccess: ({ user, accessToken }) => {
      // This device seamlessly continues on the re-issued tokens (the
      // route rotated the refresh cookie + returned a fresh access
      // token); other devices died at the tokenVersion bump — the UI
      // copy says so, this hook never logs the user out.
      setSession(user, accessToken, extractSessionExtras(user));
    },
  });
}

/* ── Pure error mapping (exported for the unit suite) ─────────── */

type HttpErrorShape = {
  response?: { status?: number; data?: { error?: { code?: unknown } } };
};

/** 401 INVALID_CREDENTIALS — the current password did not verify
 *  (the ONLY 401 the endpoint answers with for a wrong current
 *  password; api.ts exempts /auth/ routes from the 401-refresh retry,
 *  so the rejection surfaces here as-is). */
export function isWrongCurrentPassword(error: unknown): boolean {
  const e = error as HttpErrorShape | null;
  return e?.response?.status === 401 && e?.response?.data?.error?.code === 'INVALID_CREDENTIALS';
}

/** Inline Arabic message: the backend's own Arabic copy when it
 *  answered (wrong-current-password, the 429 limiter line), else the
 *  connection fallback. The Arabic guard inside apiErrorMessage keeps
 *  Latin-only transport errors out of the RTL UI. */
export function changePasswordErrorMessage(error: unknown): string {
  return apiErrorMessage(error, 'تعذَّر تغيير كلمة المرور — تحقّق من اتصالك ثم أعد المحاولة.');
}
