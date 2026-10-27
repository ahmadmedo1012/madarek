import { z } from 'zod';
import { Role } from '@prisma/client';
import { isCommonPassword } from './password-policy.js';

/**
 * Public registration is restricted to academic self-serve roles.
 * Administrative roles (ADMIN / QUALITY / OWNER) are invitation-only — provisioned
 * by an existing administrator via the governance panel, not by the open form.
 */
const SELF_SERVE_ROLES = [Role.STUDENT, Role.TEACHER] as const;

/**
 * Shared password policy — registration AND password change enforce the
 * SAME rules (one definition, no drift between the two flows):
 * length 12–72 (argon2 input cap) + not one of the most-abused passwords.
 * No forced complexity classes: Arabic-context users, and complexity
 * rules mostly generate predictable substitutions. Never TRIM passwords —
 * trimming silently changes the stored secret.
 *
 * r170g (ASVS 2.1.1): minimum raised 8 → 12. Deliberate policy change —
 * argon2 + lockout + failed-only limiter stay the brute-force defense;
 * the floor is the length floor ASVS recommends. The FE register form
 * (RegisterPage.tsx) mirrors this schema and must be aligned by the
 * frontend stream.
 */
export const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine((pw) => !isCommonPassword(pw), {
    // r165f (D17-3): user-facing copy, not a dev-internal. validate()
    // surfaces this exact message as the 400 envelope when it is the
    // single failure, so the visitor knows WHICH field to fix — the FE
    // (RegisterPage registerPasswordSchema) mirrors the same check and
    // the same message, catching it before the submit.
    message: 'كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا',
  });

export const registerSchema = z
  .object({
    // Trim + lowercase BEFORE validation: emails are case-insensitive
    // identifiers, and stray whitespace must not mint a second account
    // or fail a lookup ("a@x.com " ≠ "a@x.com").
    email: z.string().trim().toLowerCase().email().max(120),
    password: passwordSchema,
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    role: z.enum(SELF_SERVE_ROLES),
    // r178: the institution the account registers into. Plain min(1)
    // string — NOT cuid: showcase institutions carry fixed literal ids
    // (e.g. 'inst-zawia-showcase'). The service validates the academic
    // chain (department → faculty → institution) belongs to it.
    institutionId: z.string().min(1),
    // Optional profile fields (validated in service):
    facultyId: z.string().cuid().optional(),
    departmentId: z.string().cuid().optional(),
    universityId: z.string().trim().min(3).max(40).optional(),
    year: z.number().int().min(1).max(8).optional(),
    specialty: z.string().trim().min(2).max(120).optional(),
    rank: z.enum(['LECTURER', 'ASSISTANT_PROFESSOR', 'ASSOCIATE_PROFESSOR', 'PROFESSOR']).optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    /**
     * Identifier — either an email address (existing accounts) OR a
     * university registration number (new student onboarding).
     * The auth service detects which one it is by shape:
     * an '@' character means email; otherwise it's a reg-number lookup
     * against StudentProfile.universityId. Trimmed here so the service's
     * own trim is pure defense-in-depth for programmatic callers.
     */
    email: z.string().trim().min(1).max(120),
    password: z.string().min(1).max(72),
    /**
     * r178: reg-numbers are unique PER INSTITUTION — the same number can
     * exist in several institutions. When the identifier resolves to
     * more than one student profile, this slug disambiguates (login by
     * email works without it). Ignored for email identifiers.
     */
    institutionSlug: z.string().trim().min(1).max(80).optional(),
  })
  .strict();

/**
 * r178: POST /auth/select-institution — pick the institution context for
 * a multi-membership session (or re-affirm the current one). The service
 * verifies an ACTIVE membership in an ACTIVE institution server-side.
 */
export const selectInstitutionSchema = z
  .object({
    institutionId: z.string().min(1),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: passwordSchema,
  })
  .strict();

/**
 * R320 §D (PAGES-GAP §5): POST /auth/forgot-password. Same email shape
 * and normalization as register (trim + lowercase — emails are
 * case-insensitive identifiers), `.strict()` so the envelope can never
 * smuggle extra fields past a future handler edit.
 */
export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(120),
  })
  .strict();

/**
 * R320 §D (PAGES-GAP §5): POST /auth/reset-password.
 *
 * `token` — base64url(32 bytes) is exactly 43 chars; the 128 ceiling is
 * deliberate headroom for a future entropy bump (never below 43 — a
 * shorter string cannot be one of our tokens, and fat padding attempts
 * must not reach the service). NOT trimmed: it is a SECRET, and like
 * passwords, trimming would silently change the credential being
 * checked.
 *
 * `password` — the REAL shared policy (12–72 + blocklist). The reset
 * flow NEVER accepts a demo bypass: the @test.ly convenience ends at
 * the dev-inbox link; the new password is a real credential.
 */
export const resetPasswordSchema = z
  .object({
    token: z.string().min(43).max(128),
    password: passwordSchema,
  })
  .strict();
