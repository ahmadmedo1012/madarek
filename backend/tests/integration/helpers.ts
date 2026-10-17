/**
 * Shared helpers for the DB integration suite (r171b).
 *
 * The OPPOSITE of the unit-test canon: no `vi.mock` — the route stack
 * runs against a REAL disposable Postgres via the REAL `src/db.js`
 * PrismaClient singleton (the guard in guard.setup.ts has already
 * validated DATABASE_URL before anything here is imported).
 *
 * ── The beforeAll / beforeEach pattern every suite follows ─────────
 *
 *   beforeAll  → boot the real app (createApp().listen(0)) once.
 *   beforeEach → `await truncateAll(db())` — the file OWNS the whole
 *                disposable database between assertions; each test
 *                seeds exactly the rows it asserts on. Sequential file
 *                execution (fileParallelism: false in the integration
 *                config) makes this safe.
 *   afterAll   → close the server (the PrismaClient is the process
 *                singleton; vitest tears workers down itself).
 *
 * ── truncateAll contract ────────────────────────────────────────────
 * Acceptable ONLY against a dedicated integration database: it
 * introspects `information_schema.tables` for the `public` schema and
 * truncates EVERY table EXCEPT `_prisma_migrations` (migrations must
 * stay applied across runs) with RESTART IDENTITY CASCADE inside one
 * transaction. Full-schema TRUNCATE is fine here precisely because the
 * guard guarantees the database is disposable and local.
 */
import { randomUUID } from 'node:crypto';
import type { Institution, Membership, PrismaClient, Role, User } from '@prisma/client';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

/** The REAL singleton the route stack uses (same client, same pool).
 * Typed as a function so call sites read `db()` and cannot confuse it
 * with a per-test instance that would bypass the app's transactions. */
export function db(): PrismaClient {
  return prisma;
}

/**
 * Introspect + TRUNCATE every public table except _prisma_migrations
 * (see the file header for why full-schema truncation is acceptable
 * ONLY in the dedicated integration database). Returns the number of
 * tables truncated — a cheap sanity pin (the r178 migrated schema has
 * 79 user tables) that also fails loudly if the DB is somehow empty.
 */
export async function truncateAll(client: PrismaClient): Promise<number> {
  return client.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           AND table_name <> '_prisma_migrations'
         ORDER BY table_name`,
    );
    if (rows.length === 0) return 0;
    const quoted = rows
      .map((r) => `"${r.table_name.replace(/"/g, '""')}"`)
      .join(', ');
    await tx.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
    return rows.length;
  });
}

export interface SeedUserOptions {
  role?: Role;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

/**
 * Create a User with exactly the schema-required fields (email,
 * passwordHash, role, firstName, lastName — everything else defaults).
 * Emails are unique per call via randomUUID, so every test seeds its
 * own users and never collides with leftovers. passwordHash is a
 * deliberate dummy: these tests sign access tokens directly (never
 * log in), so no real argon2 work is needed.
 */
export async function seedUser(options: SeedUserOptions = {}): Promise<User> {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `r171b-${suffix}@inttest.local`,
      passwordHash: 'r171b-integration-dummy-hash',
      role: options.role ?? 'STUDENT',
      firstName: options.firstName ?? 'مستخدم',
      lastName: options.lastName ?? suffix,
      ...(options.isActive === undefined ? {} : { isActive: options.isActive }),
    },
  });
}

/** Bearer header for the real authMiddleware (real HS256 signing via
 * env.JWT_ACCESS_SECRET — placeholder secrets in NODE_ENV=test).
 * r178: optional institutionId lands in the token's `inst` claim
 * (null default = contextless session). */
export function bearer(userId: string, role: Role, institutionId: string | null = null): {
  authorization: string;
} {
  return { authorization: `Bearer ${signAccessToken(userId, role, institutionId)}` };
}

/** A fresh cuid-shaped id that zod's `z.string().cuid()` accepts but no
 * row ever matches — for "unknown recipient" pins. */
export function unknownCuid(): string {
  return `c${randomUUID().replace(/-/g, '')}`;
}

/**
 * r178: an ACTIVE Institution row. Name/slug are unique per call via
 * randomUUID, so every test seeds its own institution and never
 * collides with leftovers (Faculty/Course/StudentProfile fixtures all
 * need one since the schema became membership-scoped).
 */
export async function seedInstitution(): Promise<Institution> {
  const suffix = randomUUID().slice(0, 8);
  return prisma.institution.create({
    data: { name: `مؤسسة ${suffix}`, slug: `inst-${suffix}` },
  });
}

/**
 * r178: an active Membership chaining a user into an institution with
 * the given role. StudentProfile/TeacherProfile fixtures hang off this
 * row (membershipId is @unique on both profile models since r178).
 */
export async function seedMembership(
  userId: string,
  institutionId: string,
  role: Role,
): Promise<Membership> {
  return prisma.membership.create({
    data: { userId, institutionId, role, isActive: true },
  });
}

/** Minimal unique seed value (emails, slugs, universityIds…). */
export function uniqueSuffix(): string {
  return randomUUID().slice(0, 12);
}
