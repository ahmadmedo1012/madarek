/**
 * Backend unit test — .strict() envelopes for the OWNER governance
 * schemas in `backend/src/http/routes/owner.routes.ts`.
 *
 * The OWNER router mutates platform-critical state (roles, account
 * status, settings, feature flags); non-strict zod objects silently
 * ignored unknown keys, so a typo'd field name made a request look
 * accepted while its payload was dropped. These schemas must now be
 * closed-world, and the settings :key param must be a bounded
 * identifier (it feeds an upsert's create branch).
 */
import { describe, expect, it } from 'vitest';
import {
  changeRoleSchema,
  settingKeySchema,
  toggleFlagSchema,
  toggleStatusSchema,
  upsertSettingSchema,
} from '../../src/http/routes/owner.routes';

describe('changeRoleSchema (.strict)', () => {
  it('accepts a bare role payload', () => {
    expect(changeRoleSchema.safeParse({ role: 'TEACHER' }).success).toBe(true);
  });

  it('accepts optional TEACHER provisioning fields', () => {
    expect(
      changeRoleSchema.safeParse({
        role: 'TEACHER',
        departmentId: 'cku5c2q8x0000mc9q7v0example',
        specialty: 'هندسة البرمجيات',
      }).success,
    ).toBe(true);
  });

  it('rejects unknown keys', () => {
    const result = changeRoleSchema.safeParse({ role: 'TEACHER', isAdmin: true });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid role value', () => {
    expect(changeRoleSchema.safeParse({ role: 'SUPERADMIN' }).success).toBe(false);
  });

  it('rejects a missing role', () => {
    expect(changeRoleSchema.safeParse({}).success).toBe(false);
  });
});

describe('toggleStatusSchema (.strict)', () => {
  it('accepts a boolean isActive', () => {
    expect(toggleStatusSchema.safeParse({ isActive: true }).success).toBe(true);
    expect(toggleStatusSchema.safeParse({ isActive: false }).success).toBe(true);
  });

  it('rejects stringified booleans', () => {
    expect(toggleStatusSchema.safeParse({ isActive: 'true' }).success).toBe(false);
  });

  it('rejects unknown keys', () => {
    expect(toggleStatusSchema.safeParse({ isActive: true, reason: 'cleanup' }).success).toBe(false);
  });
});

describe('upsertSettingSchema (.strict)', () => {
  it('accepts value + category', () => {
    expect(upsertSettingSchema.safeParse({ value: '42', category: 'ai' }).success).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect(upsertSettingSchema.safeParse({ value: '42', ttl: 60 }).success).toBe(false);
  });

  it('rejects a non-string value', () => {
    expect(upsertSettingSchema.safeParse({ value: 42 }).success).toBe(false);
  });
});

describe('toggleFlagSchema (.strict)', () => {
  it('accepts a boolean enabled', () => {
    expect(toggleFlagSchema.safeParse({ enabled: false }).success).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect(toggleFlagSchema.safeParse({ enabled: true, scope: 'beta' }).success).toBe(false);
  });
});

describe('settingKeySchema (PUT /settings/:key param)', () => {
  it('accepts identifier-style keys', () => {
    expect(settingKeySchema.safeParse('ai.chat.enabled').success).toBe(true);
    expect(settingKeySchema.safeParse('feature-flag:beta').success).toBe(true);
    expect(settingKeySchema.safeParse('max_100').success).toBe(true);
    expect(settingKeySchema.safeParse('CamelCase').success).toBe(true); // i-flag: case-insensitive
  });

  it('rejects keys with spaces, slashes or non-identifier characters', () => {
    expect(settingKeySchema.safeParse('has space').success).toBe(false);
    expect(settingKeySchema.safeParse('A/B').success).toBe(false);
    expect(settingKeySchema.safeParse('مفتاح').success).toBe(false);
    expect(settingKeySchema.safeParse('key;drop').success).toBe(false);
  });

  it('rejects empty and over-long keys', () => {
    expect(settingKeySchema.safeParse('').success).toBe(false);
    expect(settingKeySchema.safeParse('x'.repeat(101)).success).toBe(false);
  });
});
