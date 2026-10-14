/**
 * r165f — register password blocklist honesty (field-specific 400).
 *
 * The register (and change-password) zod schema always rejected the
 * most-abused credentials (auth.dto.ts passwordSchema →
 * password-policy.ts), but the 400 the visitor saw was always the
 * field-less envelope «تحقّق من البيانات المُدخلة» — the refine's
 * message rode in `details` (English, FE-hidden) so a user picking
 * `password123` (8+ chars, FE-valid) retried the SAME secret in a
 * loop at the public funnel's most important form.
 *
 * Pins (through the REAL app — createApp, ephemeral port, the same
 * pattern as colleges-public-access.test.ts):
 *   1. a blocklist password (single failure) → 400 whose envelope
 *      message IS the field-specific Arabic copy; the zod detail
 *      still rides in `details` unchanged;
 *   2. a short password (zod's English default message) → the generic
 *      envelope, byte-identically (cross-route safety: no zod message
 *      outside the password refine carries Arabic script);
 *   3. a multi-field failure (blocklist password + bad email) → the
 *      generic envelope.
 *
 * Plus direct validate() middleware pins (fake req/res/next — the
 * error-handler-body.test.ts pattern) proving other routes' English
 * refine messages and multi-field failures keep the generic envelope.
 *
 * DB-free: the 400 paths never reach the service — prisma is mocked
 * for the import chain only.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { z } from 'zod';

vi.mock('../../src/db.js', () => ({
  prisma: {
    // The register 400 paths under test never reach the DB — validate()
    // rejects before the service. Mocked for the import chain only.
    user: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  },
}));

import { createApp } from '../../src/app.js';
import { validate } from '../../src/http/validate.js';
import type { AppError } from '../../src/lib/errors.js';

const GENERIC_ENVELOPE = 'تحقّق من البيانات المُدخلة';
const COMMON_PASSWORD_MESSAGE = 'كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const postRegister = (body: Record<string, unknown>) =>
  fetch(`${baseUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const VALID_REGISTER_BODY = {
  email: 'salem@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الفيتوري',
  role: 'STUDENT',
};

describe('POST /auth/register — password blocklist 400 is field-specific (r165f)', () => {
  it('a blocklist password (single failure) names the password in the envelope message', async () => {
    const res = await postRegister({ ...VALID_REGISTER_BODY, password: 'password123' });

    expect(res.status).toBe(400);
    const payload = (await res.json()) as {
      error: { code: string; message: string; details?: { fieldErrors?: Record<string, string[]> } };
    };
    expect(payload.error.code).toBe('VALIDATION_ERROR');
    // The envelope IS the field-specific Arabic copy — the visitor can
    // act on it (the FE RegisterPage mirrors the same check + message).
    expect(payload.error.message).toBe(COMMON_PASSWORD_MESSAGE);
    // The zod detail still rides in `details` unchanged.
    expect(payload.error.details?.fieldErrors?.password).toEqual([COMMON_PASSWORD_MESSAGE]);
  });

  it('a short password (zod English default) keeps the generic envelope — cross-route safety', async () => {
    const res = await postRegister({ ...VALID_REGISTER_BODY, password: 'Ab1!xyz' });

    expect(res.status).toBe(400);
    const payload = (await res.json()) as { error: { message: string } };
    // English single-field messages (zod defaults + every other route's
    // dev-internal refine copy) can never take the new branch.
    expect(payload.error.message).toBe(GENERIC_ENVELOPE);
  });

  it('a multi-field failure (blocklist password + bad email) keeps the generic envelope', async () => {
    const res = await postRegister({
      ...VALID_REGISTER_BODY,
      email: 'not-an-email',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    const payload = (await res.json()) as { error: { message: string } };
    expect(payload.error.message).toBe(GENERIC_ENVELOPE);
  });
});

describe('validate() — the new branch stays surgical (r165f)', () => {
  const runValidate = (schema: z.ZodTypeAny, body: unknown) => {
    const middleware = validate(schema);
    const req = { body } as Parameters<typeof middleware>[0];
    const next = vi.fn();
    middleware(req, {} as Parameters<typeof middleware>[1], next);
    return next.mock.calls[0]?.[0] as AppError | undefined;
  };

  it('an English refine message (the dev-internal idiom across the routes) keeps the generic envelope', () => {
    // e.g. submissions.routes.ts / curriculum.routes.ts style.
    const schema = z.object({
      fileUrl: z.string().refine((s) => s.startsWith('https://'), {
        message: 'fileUrl must start with https://',
      }),
    });
    const err = runValidate(schema, { fileUrl: 'http://insecure' });

    expect(err).toBeInstanceOf(Error);
    expect(err?.code).toBe('VALIDATION_ERROR');
    expect(err?.status).toBe(400);
    expect(err?.message).toBe(GENERIC_ENVELOPE);
  });

  it('an Arabic message alongside a second failing field keeps the generic envelope', () => {
    const schema = z.object({
      password: z.string().refine((pw) => pw !== 'password123', {
        message: COMMON_PASSWORD_MESSAGE,
      }),
      email: z.string().email(),
    });
    const err = runValidate(schema, { password: 'password123', email: 'nope' });

    expect(err?.message).toBe(GENERIC_ENVELOPE);
  });

  it('a form-level (root) Arabic refine keeps the generic envelope', () => {
    const schema = z
      .object({ endsAt: z.string(), startsAt: z.string() })
      .refine((b) => b.endsAt > b.startsAt, { message: COMMON_PASSWORD_MESSAGE });
    const err = runValidate(schema, { endsAt: '1', startsAt: '2' });

    // Root refines land in formErrors — only FIELD-level copy surfaces.
    expect(err?.message).toBe(GENERIC_ENVELOPE);
  });
});
