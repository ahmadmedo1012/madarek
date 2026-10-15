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
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: passwordSchema,
  })
  .strict();
