import { z } from 'zod';
import { passwordSchema } from '../auth/auth.dto.js';

/**
 * r178 — Zod DTOs for the institution API (institution.routes.ts).
 * Style follows the repo convention (D17-3): shape checks here, English
 * zod internals (dev-facing, ride in `details`), the Arabic envelope is
 * produced by validate() / the error handler; the cross-field rules that
 * need authored Arabic copy use superRefine so the single-failure
 * envelope names the field (the r165f validate() branch).
 */

/**
 * Slug contract: lowercase alphanumerics + dashes, 2–63 chars, must
 * start alphanumerically. Same shape the seed uses for the showcase
 * institutions ('madarek-demo', 'alandalus-demo').
 */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}$/;

const slugField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, 'slug must be 2-63 lowercase letters, digits or dashes (alphanumeric first)');

export const createInstitutionSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    nameEn: z.string().trim().min(2).max(200).optional(),
    // Optional — derived from nameEn (slugified) or a generated id when
    // omitted; validated against SLUG_PATTERN either way.
    slug: slugField.optional(),
  })
  .strict();

export const updateInstitutionSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    nameEn: z.string().trim().min(2).max(200).optional(),
    // Suspending blocks ALL institution-context access (requireInstitution
    // re-checks institution.status on every request).
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  })
  .strict();

/**
 * Provision the FIRST institutional ADMIN (or promote an existing user
 * to an ADMIN membership). mode='new' creates the User account (role
 * ADMIN) + membership; mode='existing' attaches/upgrades the membership
 * of a known email. The shared passwordSchema keeps ONE password policy
 * repo-wide (r170g, ASVS 2.1.1 — same floor as register/change-password).
 */
export const provisionAdminSchema = z
  .object({
    mode: z.enum(['new', 'existing']),
    email: z.string().trim().toLowerCase().email().max(120),
    firstName: z.string().trim().min(1).max(60).optional(),
    lastName: z.string().trim().min(1).max(60).optional(),
    password: passwordSchema.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.mode !== 'new') return;
    if (!val.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'كلمة المرور مطلوبة عند إنشاء حساب مدير جديد',
      });
    }
    if (!val.firstName || !val.lastName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['firstName'],
        message: 'الاسم الأول والأخير مطلوبان عند إنشاء حساب مدير جديد',
      });
    }
  });

/** Membership revoke / restore take no body — ids ride in the path. */
export const membershipActionSchema = z.object({}).strict();
