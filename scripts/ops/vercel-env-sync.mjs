#!/usr/bin/env node
/**
 * R351 X2h — vercel-env-sync.mjs
 *
 * Diffs the backend's env schema (backend/src/env.ts — parsed with a
 * regex, the single source of truth for what the API reads) against the
 * Vercel project's environment variables, and sets any MISSING required
 * key from the local environment file (/home/z/.madarek-env by default —
 * NEVER committed, values NEVER printed).
 *
 * Usage:
 *   node scripts/ops/vercel-env-sync.mjs [--project madarek] [--env-file /home/z/.madarek-env]
 *                    [--environment production|preview|all] [--token $VERCEL_TOKEN]
 *                    [--dry-run]
 *
 * Behaviour:
 *   · REQUIRED env.ts keys missing on Vercel → set (upsert) from the env
 *     file / process env; if no value is found anywhere the row is
 *     reported MISSING-VALUE and the exit code turns 1.
 *   · Optional keys are REPORTED only (never auto-set — opting in to a
 *     feature is a decision, not a sync).
 *   · Values are never logged: the table shows key · required · on-Vercel
 *     · action. The Vercel API call sends the value but nothing echoes it.
 *   · Secrets that exist on Vercel are never overwritten (only truly
 *     missing keys are set) — rotating a secret is an owner action.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const PROJECT = flag('project', 'madarek');
const ENV_FILE = flag('env-file', '/home/z/.madarek-env');
const ENVIRONMENT = flag('environment', 'all'); // production | preview | all
const TOKEN = flag('token', process.env.VERCEL_TOKEN ?? '');
const DRY_RUN = args.includes('--dry-run');

if (!TOKEN) {
  console.error('vercel-env-sync: --token $VERCEL_TOKEN (or the env var) is required');
  process.exit(1);
}

/* ── 1. parse env.ts's schema keys ─────────────────────────────── */
const envTs = readFileSync(path.resolve('backend/src/env.ts'), 'utf8');
// env.ts declares `const schema = z
//   .object({ ... })` — the object opens on its own line and closes at
// the 2-space `})` (inner refine/transform closers sit deeper-indented;
// a bare \s*\} anchor would stop at the first one of THOSE).
const schemaMatch = envTs.match(/\.object\(\{([\s\S]*?)\n  \}\)/);
if (!schemaMatch) {
  console.error('vercel-env-sync: could not locate the z.object schema in backend/src/env.ts');
  process.exit(1);
}
const keys = [];
// Block-scan: a key line starts a block that runs until the next key
// line, so multiline definitions (AI_MODELS spans lines) classify
// correctly from their own block.
const schemaLines = schemaMatch[1].split('\n');
const keyStartRe = /^\s{4}([A-Z][A-Z0-9_]+):\s*z/;
for (let i = 0; i < schemaLines.length; i += 1) {
  const m = schemaLines[i].match(keyStartRe);
  if (!m) continue;
  const block = [schemaLines[i]];
  for (let j = i + 1; j < schemaLines.length; j += 1) {
    if (keyStartRe.test(schemaLines[j])) break;
    block.push(schemaLines[j]);
  }
  const text = block.join('\n');
  const optional = /\.optional\(\)/.test(text);
  const defaulted = /\.default\(/.test(text);
  keys.push({ key: m[1], required: !optional && !defaulted });
}
// NODE_ENV/PORT are platform-provided on Vercel — never synced.
const SKIP = new Set(['NODE_ENV', 'PORT']);

/* ── 2. load the local values (never printed) ──────────────────── */
const localValues = {};
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^export\s+([A-Z][A-Z0-9_]+)='(.*)'\s*$/);
    if (m) localValues[m[1]] = m[2];
  }
}
Object.assign(localValues, process.env); // process env wins for ad-hoc runs

/* ── 3. resolve the Vercel team id + list project env ──────────── */
const api = (pathname, init) =>
  fetch(`https://api.vercel.com${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body?.error?.message ?? body)}`);
    return body;
  });

const project = await api(`/v9/projects/${PROJECT}`).catch((err) => {
  console.error(`vercel-env-sync: cannot read project ${PROJECT}: ${err.message}`);
  process.exit(1);
});
const teamId = project.accountId;
const existing = await api(`/v9/projects/${PROJECT}/env?teamId=${teamId}`);
const onVercel = new Set(existing.envs.map((e) => e.key));

/* ── 4. diff + set ─────────────────────────────────────────────── */
const targets =
  ENVIRONMENT === 'all' ? ['production', 'preview'] : [ENVIRONMENT];
const rows = [];
let failures = 0;

for (const { key, required } of keys) {
  if (SKIP.has(key)) continue;
  const present = onVercel.has(key);
  const value = localValues[key];
  let action = 'present';
  if (!present && required) {
    if (!value) {
      action = 'MISSING-VALUE';
      failures += 1;
    } else if (DRY_RUN) {
      action = `would-set (${targets.join('+')})`;
    } else {
      for (const target of targets) {
        await api(`/v10/projects/${PROJECT}/env?teamId=${teamId}&upsert=true`, {
          method: 'POST',
          body: JSON.stringify({
            key,
            value,
            type: 'sensitive',
            target: [target],
          }),
        });
      }
      action = `set (${targets.join('+')})`;
    }
  } else if (!present && !required) {
    action = 'absent (optional — not auto-set)';
  }
  rows.push({ key, required, present, action });
}

/* ── 5. report (values NEVER printed) ──────────────────────────── */
const pad = (s, n) => String(s).padEnd(n);
console.log(`vercel-env-sync · project ${PROJECT} · team ${teamId} · ${ENVIRONMENT}`);
console.log(pad('KEY', 28), pad('REQUIRED', 9), pad('ON-VERCEL', 10), 'ACTION');
for (const r of rows) {
  console.log(pad(r.key, 28), pad(r.required ? 'yes' : 'no', 9), pad(r.present ? 'yes' : 'no', 10), r.action);
}
if (failures > 0) {
  console.error(`\n${failures} required key(s) have no value in ${ENV_FILE} or the process env — set them and re-run.`);
  process.exit(1);
}
console.log('\nOK — env.ts required keys are all present on Vercel.');
