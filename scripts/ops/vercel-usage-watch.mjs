#!/usr/bin/env node
/**
 * R351 X5 — the Vercel usage watch (the honest one).
 *
 * Records what the API can actually give with this token+plan:
 *   · deployments per day (vs the 100/day Hobby limit) — from
 *     GET /v6/deployments (state=ALL, paginated)
 *   · the production freshness pair: the live buildId on
 *     /api/v1/status vs origin/main HEAD (git rev-parse)
 * and documents what it CANNOT (L1 — evidence over claims, never
 * invented numbers):
 *   · invocations / Active-CPU-hours / fast transfer — no usage API
 *     on this token+plan (404 on /v9 projects usage, /v1 billing/usage,
 *     /v1 teams usage — probed 2026-11-14); the owner reads the
 *     dashboard weekly; revisit with a scoped token if Vercel exposes it.
 *   · Blob totals — /v2/blob is outside this token's scope (403).
 *
 * Threshold: any day ≥ 60% of the daily-deploy limit lands in `alerts`
 * (the workflow opens an issue per breach + one for a stale buildId).
 *
 * Usage: node scripts/ops/vercel-usage-watch.mjs [--token $VERCEL_TOKEN]
 *   [--days 7] [--origin https://madarek-nine.vercel.app]
 *   [--write frontend/public/ops/vercel-usage.json] [--dry-run]
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);
const TOKEN = flag('token', process.env.VERCEL_TOKEN ?? '');
const PROJECT = flag('project', '');
const TEAM = flag('team', '');
const DAYS = Number(flag('days', '7'));
const ORIGIN = flag('origin', 'https://madarek-nine.vercel.app');
const OUT = flag('write', 'frontend/public/ops/vercel-usage.json');
const LIMITS = { deploysPerDay: 100, invocations: 1_000_000, activeCpuHours: 4, transferGB: 100 };
const THRESHOLD_PCT = 60;

if ((!TOKEN && !has('dry-run')) || !PROJECT || !TEAM) {
  console.error('vercel-usage-watch: --token (or VERCEL_TOKEN), --project (prj_…) and --team (team_…) are all required');
  process.exit(1);
}

const api = (pathname) =>
  fetch(`https://api.vercel.com${pathname}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  }).then(async (res) => {
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${res.status} ${pathname}: ${JSON.stringify(body?.error?.message ?? '')}`);
    return body;
  });

/* 1) THIS project's deployments in the window (paginate until older
 * than the window). Two API quirks convicted 2026-11-14: `state=ALL`
 * yields an EMPTY list (it also faked an earlier "0 production
 * deployments" reading), and the unscoped listing mixes every project
 * under the account (the ulara storm landed in madarek's first seed) —
 * so the query is projectId+teamId scoped, no state param. */
const since = Date.now() - DAYS * 86_400_000;
let collected = [];
for (let skip = 0; skip < 600; skip += 100) {
  const page = await api(`/v6/deployments?limit=100&skip=${skip}&projectId=${PROJECT}&teamId=${TEAM}`);
  const batch = page.deployments ?? [];
  collected.push(...batch);
  if (batch.length < 100 || ((batch.at(-1)?.createdAt ?? 0) < since)) break;
}
const inWindow = collected.filter((d) => (d.createdAt ?? 0) >= since);
const perDay = new Map();
for (const d of inWindow) {
  const day = new Date(d.createdAt).toISOString().slice(0, 10);
  perDay.set(day, (perDay.get(day) ?? 0) + 1);
}
/* fill the quiet days with an honest 0 */
for (let i = DAYS - 1; i >= 0; i -= 1) {
  const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
  if (!perDay.has(day)) perDay.set(day, 0);
}
const deploymentsPerDay = [...perDay.entries()]
  .sort((a, b) => (a[0] < b[0] ? -1 : 1))
  .map(([date, count]) => ({ date, count }));
const maxDay = deploymentsPerDay.reduce((a, b) => (b.count > a.count ? b : a), { date: '-', count: 0 });
const pctOfLimit = Math.round((maxDay.count / LIMITS.deploysPerDay) * 100);

/* 2) the production freshness pair */
let liveBuildId = 'unreachable';
try {
  const res = await fetch(`${ORIGIN}/api/v1/status`, { signal: AbortSignal.timeout(15_000) });
  const body = await res.json();
  liveBuildId = String(body?.data?.buildId ?? 'unreachable');
} catch {
  /* keep the sentinel */
}
let mainHead = 'unknown';
try {
  /* The DEPLOY-RELEVANT HEAD (deploy-vercel's path set), not HEAD itself:
   * docs-only commits advance HEAD without redeploying — flagging those
   * as staleness would cry wolf every week. */
  mainHead = execSync(
    'git rev-parse --short=12 "$(git log -1 --format=%H -- backend frontend shared api vercel.json package.json package-lock.json)"',
    { encoding: 'utf8' },
  ).trim();
} catch {
  /* keep the sentinel */
}
const freshness = { liveBuildId, mainHead, current: liveBuildId === mainHead };

/* 3) the alerts (any day ≥ the threshold) */
const alerts = deploymentsPerDay
  .filter((d) => (d.count / LIMITS.deploysPerDay) * 100 >= THRESHOLD_PCT)
  .map((d) => ({
    metric: 'deploysPerDay',
    date: d.date,
    value: d.count,
    limit: LIMITS.deploysPerDay,
    pct: Math.round((d.count / LIMITS.deploysPerDay) * 100),
  }));

const doc = {
  generatedAt: new Date().toISOString(),
  windowDays: DAYS,
  origin: ORIGIN,
  deployments7d: inWindow.length,
  deploymentsPerDay,
  maxDay: { ...maxDay, pctOfLimit },
  freshness,
  plan: { name: 'Hobby', nonCommercial: true, limits: LIMITS },
  thresholdPct: THRESHOLD_PCT,
  alerts,
  limitations: [
    'invocations/Active-CPU/النقل: لا تُكشف عبر الـ API بهذا الرمز+الخطة (404 على جميع نقاط الاستخدام — مُختبَرة 2026-11-14)؛ يقرأ المالك لوحة Vercel أسبوعيًا.',
    'Blob: ‎/v2/blob خارج نطاق هذا الرمز (403) — يُراجع لاحقًا برمزٍ مخصّص للقراءة.',
  ],
};

const json = `${JSON.stringify(doc, null, 2)}\n`;
if (has('dry-run')) {
  console.log(json);
  process.exit(0);
}
mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
writeFileSync(path.resolve(OUT), json, 'utf8');
console.log(
  `vercel-usage-watch: wrote ${OUT} · deployments ${inWindow.length}/${DAYS}d · max day ${maxDay.date}=${maxDay.count} (${pctOfLimit}% of ${LIMITS.deploysPerDay}/day) · freshness ${freshness.current ? 'current' : `STALE live=${liveBuildId} main=${mainHead}`} · alerts ${alerts.length}`,
);
