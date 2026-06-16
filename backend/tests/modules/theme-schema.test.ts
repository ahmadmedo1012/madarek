/**
 * Backend unit test — `themePutBodySchema` from
 * `backend/src/modules/theme/router.ts`.
 *
 * Asserts the acceptance / rejection envelope of the zod schema
 * that gates `PUT /api/v1/me/theme`. This is the request-validation
 * portion of T025; the full integration test (audit-log emission,
 * atomic dual-column write, 401 unauth) ships once a DB harness
 * lands in the project.
 */
import { describe, expect, it } from 'vitest';
import { themePutBodySchema } from '../../src/modules/theme/router';

describe('themePutBodySchema', () => {
  it('accepts each of the three enum values', () => {
    expect(themePutBodySchema.safeParse({ themePreference: 'LIGHT'  }).success).toBe(true);
    expect(themePutBodySchema.safeParse({ themePreference: 'DARK'   }).success).toBe(true);
    expect(themePutBodySchema.safeParse({ themePreference: 'SYSTEM' }).success).toBe(true);
  });

  it('rejects lowercase variants (server expects uppercase enum)', () => {
    expect(themePutBodySchema.safeParse({ themePreference: 'light'  }).success).toBe(false);
    expect(themePutBodySchema.safeParse({ themePreference: 'dark'   }).success).toBe(false);
    expect(themePutBodySchema.safeParse({ themePreference: 'system' }).success).toBe(false);
  });

  it('rejects unknown enum values', () => {
    expect(themePutBodySchema.safeParse({ themePreference: 'AUTO'  }).success).toBe(false);
    expect(themePutBodySchema.safeParse({ themePreference: 'HIGH-CONTRAST' }).success).toBe(false);
    expect(themePutBodySchema.safeParse({ themePreference: '' }).success).toBe(false);
  });

  it('rejects missing field', () => {
    expect(themePutBodySchema.safeParse({}).success).toBe(false);
    expect(themePutBodySchema.safeParse({ wrongKey: 'LIGHT' }).success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    const result = themePutBodySchema.safeParse({
      themePreference: 'DARK',
      extra: 'should-not-pass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-object input', () => {
    expect(themePutBodySchema.safeParse(null).success).toBe(false);
    expect(themePutBodySchema.safeParse(undefined).success).toBe(false);
    expect(themePutBodySchema.safeParse('LIGHT').success).toBe(false);
    expect(themePutBodySchema.safeParse(['LIGHT']).success).toBe(false);
  });
});
