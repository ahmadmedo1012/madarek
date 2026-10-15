/**
 * Backend unit test — operator DB tooling pins (r166c).
 *
 * Two layers, both DB-free (the repo rule — no test ever touches a
 * database, and pg_dump/pg_restore are NEVER spawned here):
 *
 *  1. BEHAVIOR pins — the scripts' pure logic lives in
 *     scripts/db-ops-lib.mjs exactly so these tests can import it:
 *     the refuse-live-restore guard, URL redaction, arg parsing,
 *     binary discovery, dry-run command shape, backup naming.
 *  2. SOURCE pins (the deploy-ops/ai-provider technique — the file is
 *     the contract): wiring of `db:backup`/`db:restore`/
 *     `db:rotate-password`, the backups/ gitignore, the rotate
 *     script's argon2 parameters == backend/src/lib/password.ts (the
 *     pair cannot drift), its password bounds == passwordSchema, its
 *     atomic D3 update payload, and the boot-pg.sh readiness probe.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildBackupCommand,
  buildRestoreCommand,
  defaultBackupPath,
  displayCommand,
  findBinary,
  humanSize,
  liveRestoreGuard,
  missingBinaryMessage,
  parseOpsArgs,
  redactUrl,
  requireYesInProduction,
  resolveEnvUrl,
  sameDatabase,
  sha256File,
  summarizeVerify,
  timestampSlug,
  validatePgUrl,
  VERIFY_QUERIES,
} from '../../../scripts/db-ops-lib.mjs';

const gitignoreSource = readSource('../../../.gitignore');
const rootPackage = JSON.parse(readSource('../../../package.json')) as {
  scripts?: Record<string, string>;
};
const backendPackage = JSON.parse(readSource('../../package.json')) as {
  scripts?: Record<string, string>;
};
const backupScriptSource = readSource('../../../scripts/db-backup.mjs');
const restoreScriptSource = readSource('../../../scripts/db-restore.mjs');
const verifyScriptSource = readSource('../../../scripts/db-verify.mjs');
const exerciseLogSource = readSource('../../../docs/runbooks/restore-exercise-log.md');
const opsLibSource = readSource('../../../scripts/db-ops-lib.mjs');
const rotateScriptSource = readSource('../../scripts/rotate-demo-passwords.mjs');
const passwordLibSource = readSource('../../src/lib/password.ts');
const authDtoSource = readSource('../../src/modules/auth/auth.dto.ts');
const bootPgSource = readSource('../../../tools/boot-pg.sh');

function readSource(relativeUrl: string): string {
  return readFileSync(new URL(`${relativeUrl}`, import.meta.url), 'utf8');
}

const SECRET_URL = 'postgresql://madarek-owner:supersecret@ep-pooler.example.neon.tech/madarek?sslmode=require';

// ─── redactUrl — credentials never leak ────────────────────────────

describe('redactUrl (shared with migrate-deploy semantics)', () => {
  it('redacts username AND password of a postgres URL', () => {
    const out = redactUrl(SECRET_URL);
    expect(out).not.toContain('madarek-owner');
    expect(out).not.toContain('supersecret');
    expect(out).toContain('***');
    // host + db stay visible — they are not secrets and the operator
    // needs them to recognize the target.
    expect(out).toContain('ep-pooler.example.neon.tech');
    expect(out).toContain('/madarek');
  });

  it('keeps scheme/host for URLs without credentials', () => {
    expect(redactUrl('postgresql://localhost:5433/madarek')).toBe('postgresql://localhost:5433/madarek');
  });

  it('returns <invalid-url> for garbage instead of echoing it', () => {
    const out = redactUrl('not a url at all: user/pass@host');
    expect(out).toBe('<invalid-url>');
    expect(out).not.toContain('user/pass');
  });
});

// ─── refuse-live-restore guard ─────────────────────────────────────

describe('liveRestoreGuard (db-restore HARD GUARD)', () => {
  const LIVE = 'postgresql://u:pw@db.example.neon.tech/madarek?sslmode=require';

  it('REFUSES when the target IS the live DATABASE_URL', () => {
    const result = liveRestoreGuard({ targetUrl: LIVE, liveUrl: LIVE });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('REFUSED');
    expect(result.error).toContain('DATABASE_URL');
  });

  it('passes when the target is a DIFFERENT database', () => {
    const result = liveRestoreGuard({
      targetUrl: 'postgresql://u:pw@stage.example.neon.tech/madarek-restore',
      liveUrl: LIVE,
    });
    expect(result.ok).toBe(true);
    expect(result.warned).toBeUndefined();
  });

  it('--confirm-live-restore bypasses the refusal (flagged, not silent)', () => {
    const result = liveRestoreGuard({ targetUrl: LIVE, liveUrl: LIVE, confirmLiveRestore: true });
    expect(result.ok).toBe(true);
    expect(result.warned).toBe(true);
  });

  it('passes when no live DATABASE_URL is configured (nothing to protect)', () => {
    const result = liveRestoreGuard({ targetUrl: LIVE, liveUrl: undefined });
    expect(result.ok).toBe(true);
  });

  it('catches normalized equality: postgres:// alias + default 5432 port', () => {
    // Literal strings differ; the database does not.
    const result = liveRestoreGuard({
      targetUrl: 'postgres://u:pw@db.example.neon.tech:5432/madarek',
      liveUrl: LIVE,
    });
    expect(result.ok).toBe(false);
  });

  it('same host but different database passes (a branch is a different target)', () => {
    const result = liveRestoreGuard({
      targetUrl: 'postgresql://u:pw@db.example.neon.tech/madarek-restore-exercise',
      liveUrl: LIVE,
    });
    expect(result.ok).toBe(true);
  });
});

describe('sameDatabase normalization', () => {
  it('treats postgres:// and postgresql:// as the same scheme', () => {
    expect(sameDatabase('postgres://h/db', 'postgresql://h/db')).toBe(true);
  });
  it('treats a missing port as 5432', () => {
    expect(sameDatabase('postgresql://h:5432/db', 'postgresql://h/db')).toBe(true);
  });
  it('a different password is a different database (no silent pass)', () => {
    expect(sameDatabase('postgresql://u:a@h/db', 'postgresql://u:b@h/db')).toBe(false);
  });
});

// ─── requireYesInProduction (rotate script wall) ───────────────────

describe('requireYesInProduction', () => {
  it('refuses NODE_ENV=production without --yes', () => {
    const result = requireYesInProduction('production', false);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('--yes');
  });
  it('allows production WITH --yes (conscious operator act)', () => {
    expect(requireYesInProduction('production', true).ok).toBe(true);
  });
  it('passes outside production (the script still demands --yes to execute)', () => {
    expect(requireYesInProduction('development', false).ok).toBe(true);
    expect(requireYesInProduction(undefined, false).ok).toBe(true);
  });
});

// ─── Arg parsing / env resolution ──────────────────────────────────

describe('parseOpsArgs', () => {
  it('accepts --opt value AND --opt=value forms (camelCase keys)', () => {
    const r = parseOpsArgs(['--url-env', 'PG_DIRECT', '--out=backups/x.dump', '--dry-run'], {
      valueOpts: ['--url-env', '--out'],
      flagOpts: ['--dry-run'],
    });
    expect(r.values.urlEnv).toBe('PG_DIRECT');
    expect(r.values.out).toBe('backups/x.dump');
    expect(r.flags.has('dryRun')).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
  it('rejects unknown arguments and missing values (never throws)', () => {
    const r = parseOpsArgs(['--wat', '--out'], { valueOpts: ['--out'], flagOpts: [] });
    expect(r.errors.length).toBe(2);
    expect(r.errors[0]).toContain('unknown');
    expect(r.errors[1]).toContain('requires a value');
  });
  it('-h / --help set the help flag', () => {
    expect(parseOpsArgs(['-h'], {}).help).toBe(true);
    expect(parseOpsArgs(['--help'], {}).help).toBe(true);
  });
});

describe('resolveEnvUrl — secrets arrive via env name, never argv', () => {
  it('refuses unset/empty/whitespace-only vars, naming the var', () => {
    expect(resolveEnvUrl({}, 'PG_DIRECT').error).toContain('PG_DIRECT');
    expect(resolveEnvUrl({ PG_DIRECT: '' }, 'PG_DIRECT').ok).toBe(false);
    expect(resolveEnvUrl({ PG_DIRECT: '   ' }, 'PG_DIRECT').ok).toBe(false);
  });
  it('returns the trimmed URL (URLs tolerate whitespace; passwords do not)', () => {
    expect(resolveEnvUrl({ PG_DIRECT: ` ${SECRET_URL} ` }, 'PG_DIRECT').url).toBe(SECRET_URL);
  });
});

describe('validatePgUrl', () => {
  it('accepts postgres:// and postgresql:// only', () => {
    expect(validatePgUrl(SECRET_URL).ok).toBe(true);
    expect(validatePgUrl('postgres://h/db').ok).toBe(true);
    expect(validatePgUrl('mysql://h/db').ok).toBe(false);
    expect(validatePgUrl('garbage').ok).toBe(false);
  });
});

// ─── Binary discovery + missing-binary guidance ────────────────────

describe('findBinary (PATH scan, no process spawn)', () => {
  it('finds the tool on PATH via the injectable exists() predicate', () => {
    const fakeFs = new Set(['/usr/bin/pg_dump', '/opt/other/pg_restore']);
    const exists = (p: string) => fakeFs.has(p);
    expect(findBinary('pg_dump', { pathEnv: '/usr/local/bin:/usr/bin', exists })).toBe('/usr/bin/pg_dump');
    expect(findBinary('pg_restore', { pathEnv: '/usr/local/bin:/opt/other', exists })).toBe('/opt/other/pg_restore');
  });
  it('returns null when the tool is nowhere on PATH', () => {
    expect(findBinary('pg_dump', { pathEnv: '/usr/local/bin:/usr/bin', exists: () => false })).toBeNull();
    expect(findBinary('pg_dump', { pathEnv: '', exists: () => true })).toBeNull();
  });
});

describe('missingBinaryMessage', () => {
  it('names the missing tool and how to install it (bilingual)', () => {
    const msg = missingBinaryMessage('pg_dump');
    expect(msg).toContain('pg_dump');
    expect(msg).toContain('brew install');
    expect(msg).toContain('apt-get install');
    expect(msg).toContain('apk add');
    expect(msg).toContain('postgresql.org/download');
    expect(msg).toContain('لا يثبّت أي أداة');
  });
});

// ─── Dry-run command shape (runbook canon) ─────────────────────────

describe('buildBackupCommand / buildRestoreCommand / displayCommand', () => {
  it('backup argv is the documented canon: custom format, no owner/privileges, URL positional', () => {
    expect(
      buildBackupCommand({ binary: 'pg_dump', url: SECRET_URL, outFile: 'backups/madarek-x.dump' }),
    ).toEqual([
      'pg_dump',
      '--format=custom',
      '--no-owner',
      '--no-privileges',
      '--file',
      'backups/madarek-x.dump',
      SECRET_URL,
    ]);
  });
  it('restore argv targets --dbname with the dump positional (never the live DB unguarded)', () => {
    expect(
      buildRestoreCommand({ binary: 'pg_restore', url: SECRET_URL, dumpFile: 'backups/madarek-x.dump' }),
    ).toEqual(['pg_restore', '--no-owner', '--no-privileges', '--dbname', SECRET_URL, 'backups/madarek-x.dump']);
  });
  it('displayCommand redacts every postgres URL slot and quotes unsafe args', () => {
    const out = displayCommand(buildBackupCommand({ binary: 'pg_dump', url: SECRET_URL, outFile: 'my dump file' }));
    expect(out).not.toContain('supersecret');
    expect(out).not.toContain('madarek-owner');
    expect(out).toContain('***');
    expect(out).toContain("'my dump file'");
  });
});

// ─── Backup naming ─────────────────────────────────────────────────

describe('backup naming', () => {
  it('default path: backups/madarek-<UTC timestamp>.dump', () => {
    expect(defaultBackupPath(new Date('2026-10-15T09:08:07Z'))).toBe('backups/madarek-20261015T090807Z.dump');
  });
  it('label is slugified and folded into the name', () => {
    expect(defaultBackupPath(new Date('2026-10-15T09:08:07Z'), 'Pre Migration!!')).toBe(
      'backups/madarek-20261015T090807Z-pre-migration.dump',
    );
  });
  it('timestampSlug is UTC-stable regardless of local timezone', () => {
    expect(timestampSlug(new Date('2026-10-15T23:59:59Z'))).toBe('20261015T235959Z');
  });
});

// ─── Post-backup evidence (sha256 / size) ──────────────────────────

describe('sha256File / humanSize', () => {
  it('streams a real local file to its sha256 hex digest', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'madarek-dbops-'));
    const file = path.join(dir, 'probe.txt');
    writeFileSync(file, 'abc');
    try {
      expect(await sha256File(file)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it('humanSize renders exact bytes and one-decimal units', () => {
    expect(humanSize(0)).toBe('0 B');
    expect(humanSize(512)).toBe('512 B');
    expect(humanSize(1536)).toBe('1.5 KB');
    expect(humanSize(10 * 1024)).toBe('10 KB');
    expect(humanSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });
});

// ─── Source pins: wiring + gitignore ───────────────────────────────

describe('operator script wiring (r166c)', () => {
  it('root package.json wires db:backup / db:restore / db:rotate-password', () => {
    expect(rootPackage.scripts?.['db:backup']).toBe('node scripts/db-backup.mjs');
    expect(rootPackage.scripts?.['db:restore']).toBe('node scripts/db-restore.mjs');
    // r169a (ops D1): the trailing `--` is load-bearing — without it the
    // inner npm eats --email/--new-password-env/--yes as its own options
    // and the documented owner-recovery invocation fails with "unknown
    // argument". Verified live: flags now reach the script verbatim.
    expect(rootPackage.scripts?.['db:rotate-password']).toBe('npm run rotate:password -w backend --');
  });
  it('backend package.json wires rotate:password (the migrate-deploy invocation pattern)', () => {
    expect(backendPackage.scripts?.['rotate:password']).toBe('node scripts/rotate-demo-passwords.mjs');
  });
  it('.gitignore keeps backups/ out of the repo (dumps carry user data)', () => {
    expect(gitignoreSource).toMatch(/^backups\/$/m);
  });
  it('backup/restore scripts stay dependency-free (node: builtins + the local lib only)', () => {
    for (const src of [backupScriptSource, restoreScriptSource]) {
      const imports = [...src.matchAll(/^\s*import\s+.*?from\s+'([^']+)'/gm)]
        .map((m) => m[1])
        .filter((s): s is string => typeof s === 'string');
      for (const specifier of imports) {
        expect(specifier.startsWith('node:') || specifier.startsWith('./db-ops-lib.mjs')).toBe(true);
      }
    }
    // The lib itself: node: builtins only, so the scripts run on a bare
    // checkout (the smoke-deploy rule, pinned the same way).
    const libImports = [...opsLibSource.matchAll(/^\s*import\s+.*?from\s+'([^']+)'/gm)]
      .map((m) => m[1])
      .filter((s): s is string => typeof s === 'string');
    for (const specifier of libImports) expect(specifier.startsWith('node:')).toBe(true);
  });
});

// ─── Source pins: rotate script contract ───────────────────────────

describe('rotate-demo-passwords contract (r166c)', () => {
  /** Extract the four argon2 parameters from a source text. */
  const argonParamsOf = (src: string) => ({
    type: /type:\s*argon2\.argon2id/.test(src) ? 'argon2id' : null,
    memoryCost: src.match(/memoryCost:\s*(\d[\d_]*)/)?.[1] ?? null,
    timeCost: src.match(/timeCost:\s*(\d+)/)?.[1] ?? null,
    parallelism: src.match(/parallelism:\s*(\d+)/)?.[1] ?? null,
  });

  it('argon2 parameters are IDENTICAL to backend/src/lib/password.ts — the pair cannot drift', () => {
    // password.ts is the single source of truth; the script duplicates
    // the values (plain .mjs cannot import TS) and THIS pin is what
    // keeps them one source: change either side alone → CI fails here.
    expect(argonParamsOf(rotateScriptSource)).toEqual(argonParamsOf(passwordLibSource));
    expect(argonParamsOf(passwordLibSource)).toEqual({
      type: 'argon2id',
      memoryCost: '19_456',
      timeCost: '2',
      parallelism: '1',
    });
  });

  it('password bounds mirror passwordSchema (min 8 / max 72, argon2 input cap)', () => {
    const schemaMin = authDtoSource.match(/\.min\((\d+)\)/)?.[1];
    const schemaMax = authDtoSource.match(/\.max\((\d+)\)/)?.[1];
    const scriptMin = rotateScriptSource.match(/PASSWORD_MIN\s*=\s*(\d+)/)?.[1];
    const scriptMax = rotateScriptSource.match(/PASSWORD_MAX\s*=\s*(\d+)/)?.[1];
    expect(schemaMin).toBe('8');
    expect(schemaMax).toBe('72');
    expect(scriptMin).toBe(schemaMin);
    expect(scriptMax).toBe(schemaMax);
  });

  it('ONE atomic conditional write: hash + tokenVersion increment + unlock (D3 mirror)', () => {
    // The conditional where (tokenVersion as-read) is the concurrent-
    // writer guard; the data payload is the atomic revocation event.
    expect(rotateScriptSource).toMatch(/where:\s*\{\s*id:\s*user\.id,\s*tokenVersion:\s*user\.tokenVersion\s*\}/);
    expect(rotateScriptSource).toMatch(/tokenVersion:\s*\{\s*increment:\s*1\s*\}/);
    expect(rotateScriptSource).toMatch(/failedLoginCount:\s*0/);
    expect(rotateScriptSource).toMatch(/lockedUntil:\s*null/);
    expect(rotateScriptSource).toMatch(/result\.count\s*===\s*0/);
  });

  it('the password is never a literal arg, never printed, never trimmed', () => {
    // Env-var NAME only…
    expect(rotateScriptSource).toContain('--new-password-env');
    expect(rotateScriptSource).not.toMatch(/['"]--new-password['"]/);
    // …read raw from process.env under the operator's chosen name…
    expect(rotateScriptSource).toContain('process.env[values.newPasswordEnv]');
    // …never echoed: no console.* touches the raw password variable.
    expect(rotateScriptSource).not.toMatch(/console\.\w+\([^)]*passwordRaw/);
    // …and DATABASE_URL only ever appears redacted.
    expect(rotateScriptSource).toMatch(/redactUrl\(process\.env\.DATABASE_URL/);
  });

  it('verifies the account exists AND isActive before any write', () => {
    expect(rotateScriptSource).toMatch(/findUnique\(\{\s*where:\s*\{\s*email\s*\}\s*\}\)/);
    expect(rotateScriptSource).toMatch(/!user\.isActive/);
    expect(rotateScriptSource).toContain('لا يوجد حساب بهذا البريد');
  });
});

// ─── Source pins: db-restore safety contract ───────────────────────

describe('db-restore safety contract (r166c)', () => {
  it('the target env var is REQUIRED — DATABASE_URL is never the implicit target', () => {
    expect(restoreScriptSource).toMatch(/values\.urlEnv\b/);
    expect(restoreScriptSource).toContain('--url-env <ENV_VAR> is required');
    // No default: unlike db-backup, restore never falls back to DATABASE_URL.
    expect(restoreScriptSource).not.toMatch(/values\.urlEnv\s*\?\?\s*['"]DATABASE_URL['"]/);
  });
  it('the live guard runs against process.env.DATABASE_URL behind --confirm-live-restore', () => {
    expect(restoreScriptSource).toMatch(/liveRestoreGuard\(\{/);
    expect(restoreScriptSource).toMatch(/liveUrl:\s*process\.env\.DATABASE_URL/);
    expect(restoreScriptSource).toContain("'--confirm-live-restore'");
  });
  it('dry-run prints the exact redacted command (displayCommand) and runs nothing', () => {
    for (const src of [backupScriptSource, restoreScriptSource]) {
      expect(src).toContain('displayCommand(argv)');
      expect(src).toMatch(/spawnSync/);
    }
  });
  it('suggests the docs/12 §3 verification checklist after a real restore', () => {
    // r167: Prisma's real migrations table is _prisma_migrations (leading
    // underscore) — the r166c checklist named it without the underscore and
    // the r167 live exercise caught the false failure an operator would hit.
    expect(restoreScriptSource).toContain('_prisma_migrations');
    expect(restoreScriptSource).toContain('restore-exercise-log');
  });
});

// ─── r167: db-verify — automated post-restore verification ─────────

describe('db:verify (r167) — pure verdict logic', () => {
  it('PASS on a sane restored Madarek copy (77 tables / 18 migrations / users / owner)', () => {
    const v = summarizeVerify({ tables: 77, migrations: 18, users: 6, ownerCount: 1 });
    expect(v.level).toBe('PASS');
    expect(v.findings.length).toBeGreaterThanOrEqual(4);
    for (const f of v.findings) expect(f).toContain('✅');
  });
  it('FAIL when the schema is clearly incomplete (tables < 50)', () => {
    const v = summarizeVerify({ tables: 12, migrations: 3, users: 5, ownerCount: 1 });
    expect(v.level).toBe('FAIL');
    expect(v.findings.some((f) => f.includes('incomplete restore'))).toBe(true);
  });
  it('FAIL when _prisma_migrations is empty/missing — not a Madarek schema', () => {
    const v = summarizeVerify({ tables: 77, migrations: 0, users: 6, ownerCount: 1 });
    expect(v.level).toBe('FAIL');
    expect(v.findings.some((f) => f.includes('_prisma_migrations'))).toBe(true);
  });
  it('FAIL when zero users were restored', () => {
    const v = summarizeVerify({ tables: 77, migrations: 18, users: 0, ownerCount: 0 });
    expect(v.level).toBe('FAIL');
    expect(v.findings.some((f) => f.includes('zero users'))).toBe(true);
  });
  it('WARN (not FAIL) on a degraded-but-working copy (few tables / no owner)', () => {
    const v = summarizeVerify({ tables: 65, migrations: 18, users: 6, ownerCount: 0 });
    expect(v.level).toBe('WARN');
    expect(v.findings.some((f) => f.includes('below the expected'))).toBe(true);
    expect(v.findings.some((f) => f.includes('OWNER'))).toBe(true);
  });
  it('a FAIL from any axis dominates WARNs (escalation is monotonic)', () => {
    const v = summarizeVerify({ tables: 12, migrations: 0, users: 0, ownerCount: 0 });
    expect(v.level).toBe('FAIL');
  });
});

describe('db:verify (r167) — the query contract', () => {
  it('runs exactly five read-only checks mirroring docs/12 §3 items 1–4', () => {
    expect(VERIFY_QUERIES.length).toBe(5);
    expect(VERIFY_QUERIES.map((q) => q.key)).toEqual(['tables', 'migrations', 'last_migration', 'roles', 'counts']);
    for (const q of VERIFY_QUERIES) {
      expect(q.sql.trim().toUpperCase().startsWith('SELECT')).toBe(true);
    }
  });
  it('pins the REAL table names (leading underscore, quoted User)', () => {
    const sql = VERIFY_QUERIES.map((q) => q.sql).join('\n');
    expect(sql).toContain('_prisma_migrations');
    expect(sql).not.toMatch(/(?<!_)prisma_migrations/); // bare spelling must never reappear
    expect(sql).toContain('FROM "User"');
    expect(sql).toContain('FROM "Enrollment"');
    expect(sql).toContain('FROM "Notification"');
  });
});

describe('db:verify (r167) — script wiring', () => {
  it('is wired as db:verify → node scripts/db-verify.mjs at the root', () => {
    expect(rootPackage?.scripts?.['db:verify']).toBe('node scripts/db-verify.mjs');
  });
  it('requires --url-env by name (no implicit DATABASE_URL target)', () => {
    expect(verifyScriptSource).toMatch(/values\.urlEnv/);
    expect(verifyScriptSource).toContain('--url-env إلزامي');
  });
  it('is dependency-free (node: builtins + the local lib only)', () => {
    const specifiers = [...verifyScriptSource.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1] ?? '');
    expect(specifiers.length).toBeGreaterThanOrEqual(2);
    for (const spec of specifiers) {
      expect(spec.startsWith('node:') || spec === './db-ops-lib.mjs').toBe(true);
    }
  });
  it('exits 1 on a FAIL verdict and prints measured values, never secrets', () => {
    expect(verifyScriptSource).toContain("process.exit(1)");
    expect(verifyScriptSource).toContain('summarizeVerify(');
    expect(verifyScriptSource).toContain('redactUrl');
    // the URL reaches psql as a connection string argument but is never
    // printed raw — only through redactUrl.
    expect(verifyScriptSource).not.toMatch(/console\.(log|error)\([^)]*targetUrl\.url/);
  });
});

// ─── r167: the exercise log is honest about what ran ───────────────

describe('restore-exercise log (r167)', () => {
  it('entry 1 records the executed local exercise with measured values', () => {
    expect(exerciseLogSource).toContain('مدخل 1 — 2026-10-15');
    expect(exerciseLogSource).toContain('4b5ede93ab5d487006333979ee956f317861ab313f27376a100cf935fd03904c');
    expect(exerciseLogSource).toContain('_prisma_migrations');
    // honesty: local seed data, NOT production
    expect(exerciseLogSource).toContain('ليست بيانات إنتاج');
  });
  it('keeps a blank template for future entries', () => {
    expect(exerciseLogSource).toContain('قالب فارغ لمدخل جديد');
  });
});

// ─── Source pins: boot-pg readiness probe ──────────────────────────

describe('tools/boot-pg.sh readiness probe (r166c)', () => {
  it('no longer invokes pg_isready (not shipped by the pinned embedded-postgres)', () => {
    // The pin targets the INVOCATION, not the mention: the fix's own
    // comment explains why the call was removed.
    expect(bootPgSource).not.toMatch(/\$PGBIN\/pg_isready/);
    expect(bootPgSource).not.toMatch(/pg_isready\s+-h/);
  });
  it('probes the TCP port with node net.connect instead', () => {
    expect(bootPgSource).toContain('node:net');
    expect(bootPgSource).toMatch(/net\.connect/);
    expect(bootPgSource).toMatch(/PG_PROBE_PORT="\$PORT"/);
  });
});
