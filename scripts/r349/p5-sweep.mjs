#!/usr/bin/env node
/* scripts/r349/p5-sweep.mjs — the R349 P5 evidence sweep for the people
 * surfaces (LANE P): builds REAL-API storageStates (the auth-storage.ts
 * pattern — login through the running local stack, seed mdrk-auth in the
 * zustand persist shape), then drives scripts/qa/overlap.mjs over the
 * new authed routes × light/dark × 1440/390 with evidence screenshots.
 *
 * Prereqs (the local stack): embedded PG on :5433 (tools/boot-pg.sh,
 * migrated + seeded), backend on :4000 (tsx src/index.ts), frontend dev
 * on :5173. Usage: node scripts/r349/p5-sweep.mjs [--out <dir>]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const API = 'http://localhost:4000';
const WEB = 'http://localhost:5173';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OUT = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : '/tmp/r349-p5';

async function login(email, password) {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: HTTP ${res.status}`);
  const { data } = await res.json();
  if (!data?.accessToken) throw new Error(`no token for ${email}`);
  return data;
}

const storageState = (session) => ({
  cookies: [],
  origins: [{
    origin: WEB,
    localStorage: [{
      name: 'mdrk-auth',
      value: JSON.stringify({
        state: {
          user: session.user,
          accessToken: session.accessToken,
          memberships: session.user.memberships ?? [],
          currentInstitution: session.user.currentInstitution ?? null,
          membershipRole: session.user.membershipRole ?? null,
        },
        version: 1,
      }),
    }],
  }],
});

const run = async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const admin = await login('registrar@test.ly', '12345678');
  const student = await login('student@test.ly', '12345678');
  fs.writeFileSync(`${OUT}/admin-state.json`, JSON.stringify(storageState(admin)));
  fs.writeFileSync(`${OUT}/student-state.json`, JSON.stringify(storageState(student)));

  /* a real person id for the registrar's file page */
  const dir = await fetch(`${API}/api/v1/directory?kind=student&limit=5`, {
    headers: { Authorization: `Bearer ${admin.accessToken}` },
  }).then(r => r.json());
  const person = dir?.data?.[0];
  if (!person?.id) throw new Error('directory returned no person — is the seed enriched?');
  console.log(`person: ${person.nameAr ?? person.user?.firstName} (${person.id})`);

  const overlap = (tag, storage, routes) => {
    /* overlap.mjs's argv parser expects --key value (space-separated),
     * NOT --key=value — the first sweep run measured mangled-arg empty
     * pages (url='--routes=…' → goto caught → blank 0-finding runs). */
    const args = [
      'scripts/qa/overlap.mjs',
      '--url', WEB,
      '--routes', routes.join(','),
      '--bps', '1440x900,390x844',
      '--themes', 'light,dark',
      '--out', `${OUT}/overlap-${tag}.json`,
      '--storage', storage,
      '--shots', `${OUT}/shots-${tag}`,
    ];
    console.log(`\n=== overlap ${tag}: ${routes.join(' ')} ===`);
    const r = spawnSync('node', args, { cwd: ROOT, stdio: 'inherit' });
    if (r.status) process.exitCode = Math.max(process.exitCode ?? 0, r.status);
  };

  overlap('admin', `${OUT}/admin-state.json`, ['/admin/directory', `/admin/people/${person.id}`]);
  overlap('student', `${OUT}/student-state.json`, ['/student/profile']);
  console.log(`\nevidence: ${OUT}`);
};
run().catch(e => { console.error(e.message); process.exit(1); });
