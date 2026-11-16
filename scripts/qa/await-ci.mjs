#!/usr/bin/env node
/**
 * R357 L1 — the supersede-aware "CI green on this sha" gate.
 *
 * WHY: Deploy Vercel used to go RED whenever pushes stacked. Its verify
 * job polled the LATEST CI run for the exact sha; a newer main push
 * (any paths — a docs-only push counts) cancels the previous sha's CI
 * run via ci.yml's per-ref concurrency, and the old gate matched
 * `completed cancelled` as "concluded without success" → red, even
 * though the git-integration deploy itself was fine (seen on c83f6d67,
 * 600c943a, aa7cb126).
 *
 * THE LAW (fix, R357):
 *   1. A cancelled CI run is NOT a conclusion — ignore it entirely.
 *   2. If a NEWER commit sits on main (push events on main only), this
 *      sha is superseded: exit SUCCESS with a "superseded" notice. The
 *      newer sha's own runs carry the verification; main only moves
 *      forward, so the newer commit contains this one as an ancestor.
 *   3. Otherwise wait for the latest NON-cancelled CI run of this sha:
 *      success → pass; any other completed conclusion (failure,
 *      startup_failure, …) → red immediately (a real signal, keep it).
 *   4. PR events can never be "superseded" (a PR head is not main) —
 *      for those the gate just waits as before.
 *
 * MODES
 *   gate (default)  — poll the GitHub API until pass/superseded/fail.
 *   --dry-run FILE  — read {runs, mainTip, sha, event, ref} from a
 *                     fixture, print the decision JSON, exit 0. This is
 *                     the test/dry-run surface: unit tests assert on it.
 */
import { readFileSync } from 'node:fs';

/**
 * Pure decision function (exported for tests + the .d.mts contract).
 * returns { action: 'pass' | 'superseded' | 'wait' | 'fail', note }.
 */
export function decide({ runs = [], mainTip = null, sha = '', event = '', ref = '' } = {}) {
  const onMainPush = event === 'push' && (ref === 'refs/heads/main' || ref === 'main');
  if (onMainPush && mainTip && sha && mainTip !== sha) {
    return {
      action: 'superseded',
      note: `superseded on main by ${String(mainTip).slice(0, 12)} — this sha rides main history; the newer sha's runs carry the verification`,
    };
  }
  const ci = (Array.isArray(runs) ? runs : [])
    .filter((r) => r && r.name === 'CI')
    // LAW 1: a cancelled run is not a conclusion.
    .filter((r) => !(r.status === 'completed' && r.conclusion === 'cancelled'))
    .sort(
      (a, b) =>
        String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
        (a.id || 0) - (b.id || 0),
    );
  const latest = ci[ci.length - 1];
  if (!latest) return { action: 'wait', note: 'no non-cancelled CI run for this sha yet' };
  if (latest.status !== 'completed') return { action: 'wait', note: `CI is ${latest.status}` };
  if (latest.conclusion === 'success') return { action: 'pass', note: 'CI green on this sha' };
  return { action: 'fail', note: `CI concluded ${latest.conclusion} (a real signal — not a cancellation)` };
}

/**
 * CLI entry — only when executed as a program (node scripts/qa/await-ci.mjs),
 * never when a test imports the module for decide().
 */
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const invokedAsProgram = () => {
  try {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1] || '')).href;
  } catch {
    return false;
  }
};

if (invokedAsProgram()) {
  const usage = () => {
    console.error(
      [
        'usage: await-ci.mjs --repo OWNER/NAME --sha SHA --event push|pull_request --ref REF --token TOKEN',
        '               [--max-minutes 28] [--poll-seconds 20] [--api https://api.github.com]',
        '       await-ci.mjs --dry-run fixture.json',
      ].join('\n'),
    );
    process.exit(2);
  };

  const args = process.argv.slice(2);
  const opt = {};
  for (let i = 0; i < args.length; i += 2) {
    const k = args[i];
    const v = args[i + 1];
    if (!v) usage();
    if (k === '--dry-run') {
      const fixture = JSON.parse(readFileSync(v, 'utf8'));
      const d = decide(fixture);
      console.log(JSON.stringify(d));
      process.exit(0);
    }
    opt[k] = v;
  }

  const need = ['--repo', '--sha', '--event', '--ref', '--token'];
  for (const k of need) if (!opt[k]) usage();

  const MAX_MINUTES = Number(opt['--max-minutes'] || 28);
  const POLL_SECONDS = Number(opt['--poll-seconds'] || 20);
  const API = opt['--api'] || 'https://api.github.com';
  const ATTEMPTS = Math.max(1, Math.floor((MAX_MINUTES * 60) / POLL_SECONDS));
  const headers = {
    Authorization: `Bearer ${opt['--token']}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const gh = async (pathArg) => {
    const res = await fetch(`${API}${pathArg}`, { headers });
    if (!res.ok) throw new Error(`GET ${pathArg} → HTTP ${res.status}`);
    return res.json();
  };

  const apiMainTip = async () => {
    try {
      const j = await gh(`/repos/${opt['--repo']}/commits/main`);
      return typeof j.sha === 'string' ? j.sha : null;
    } catch (e) {
      console.log(`  (main tip unavailable: ${e.message})`);
      return null;
    }
  };

  const apiRuns = async () => {
    try {
      const j = await gh(
        `/repos/${opt['--repo']}/actions/runs?head_sha=${encodeURIComponent(opt['--sha'])}&per_page=20`,
      );
      return Array.isArray(j.workflow_runs) ? j.workflow_runs : [];
    } catch (e) {
      console.log(`  (runs unavailable: ${e.message})`);
      return [];
    }
  };

  const notice = (msg) => console.log(`::notice::${msg}`);
  const errorOut = (msg) => {
    console.log(`::error::${msg}`);
    process.exit(1);
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  (async () => {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      const mainTip = await apiMainTip();
      const runs = await apiRuns();
      const d = decide({
        runs,
        mainTip,
        sha: opt['--sha'],
        event: opt['--event'],
        ref: opt['--ref'],
      });
      console.log(`attempt ${attempt}/${ATTEMPTS}: ${d.action} — ${d.note}`);
      if (d.action === 'pass') {
        notice(`CI green on ${String(opt['--sha']).slice(0, 12)}`);
        process.exit(0);
      }
      if (d.action === 'superseded') {
        notice(`${String(opt['--sha']).slice(0, 12)} ${d.note}`);
        process.exit(0);
      }
      if (d.action === 'fail') errorOut(d.note);
      await sleep(POLL_SECONDS * 1000);
    }
    errorOut(`CI did not conclude within the wait window (${MAX_MINUTES} min)`);
  })().catch((e) => errorOut(String((e && e.message) || e)));
}
