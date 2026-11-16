/**
 * R357 L1 — the supersede-aware CI gate (scripts/qa/await-ci.mjs).
 *
 * Deploy Vercel used to go red on stacked pushes: a newer main push
 * (docs-only counts) cancels the previous sha's CI run and the old
 * inline gate read `completed cancelled` as a failure. The new law:
 * cancelled runs are ignored; a superseded sha exits green with a
 * notice; otherwise the latest non-cancelled CI run decides.
 *
 * This suite pins BOTH layers:
 *   · decide() — the pure law, including the exact red scenarios from
 *     c83f6d67 / 600c943a / aa7cb126;
 *   · --dry-run — the CLI surface the workflow actually invokes,
 *     against the checked-in fixtures (exit 0 + decision JSON).
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { decide } from '../../../scripts/qa/await-ci.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(here, '../../../scripts/qa/await-ci.mjs');
const FIXTURES = path.resolve(here, '../../../scripts/qa/fixtures/await-ci');

const run = (name, status, conclusion, created_at, id = 1) => ({
  name,
  status,
  conclusion,
  created_at,
  id,
});

describe('r357 L1 · decide() — the law', () => {
  it('LAW 1+2: a cancelled CI run is not a conclusion; a newer main tip supersedes (the aa7cb126 red)', () => {
    const d = decide({
      sha: 'aa7cb126ffffffff',
      mainTip: 'dce338aaffffffff',
      event: 'push',
      ref: 'refs/heads/main',
      runs: [
        run('CI', 'completed', 'cancelled', '2026-11-20T09:00:00Z', 1),
        run('CI', 'queued', null, '2026-11-20T09:01:00Z', 2),
      ],
    });
    expect(d.action).toBe('superseded');
    expect(d.note).toContain('dce338aa');
  });

  it('LAW 3: latest NON-cancelled run decides — cancelled then green on the same sha passes (600c943a red)', () => {
    const d = decide({
      sha: '600c943a',
      mainTip: '600c943a',
      event: 'push',
      ref: 'refs/heads/main',
      runs: [
        run('CI', 'completed', 'cancelled', '2026-11-20T08:00:00Z', 1),
        run('Deploy Vercel', 'completed', 'success', '2026-11-20T08:00:30Z', 9),
        run('CI', 'completed', 'success', '2026-11-20T08:05:00Z', 3),
      ],
    });
    expect(d.action).toBe('pass');
  });

  it('LAW 3 edge: a NEWER cancelled run does not poison an OLDER green run', () => {
    const d = decide({
      sha: 's',
      mainTip: 's',
      event: 'push',
      ref: 'refs/heads/main',
      runs: [
        run('CI', 'completed', 'success', '2026-11-20T08:00:00Z', 1),
        run('CI', 'completed', 'cancelled', '2026-11-20T09:00:00Z', 2),
      ],
    });
    expect(d.action).toBe('pass');
  });

  it('LAW 3 edge: latest non-cancelled ordering — older failure loses to newer success', () => {
    const d = decide({
      sha: 's',
      mainTip: 's',
      event: 'push',
      ref: 'refs/heads/main',
      runs: [
        run('CI', 'completed', 'failure', '2026-11-20T08:00:00Z', 1),
        run('CI', 'completed', 'success', '2026-11-20T08:10:00Z', 2),
      ],
    });
    expect(d.action).toBe('pass');
  });

  it('only cancelled runs on the tip sha → WAIT (a real run may still appear)', () => {
    const d = decide({
      sha: 'c83f6d67',
      mainTip: 'c83f6d67',
      event: 'push',
      ref: 'refs/heads/main',
      runs: [run('CI', 'completed', 'cancelled', '2026-11-20T07:00:00Z', 1)],
    });
    expect(d.action).toBe('wait');
    expect(d.note).toContain('no non-cancelled CI run');
  });

  it('a genuine CI failure on the tip sha stays RED — the fix must not swallow real signals', () => {
    const d = decide({
      sha: 'deadbeef',
      mainTip: 'deadbeef',
      event: 'push',
      ref: 'refs/heads/main',
      runs: [
        run('CI', 'completed', 'cancelled', '2026-11-20T06:00:00Z', 1),
        run('CI', 'completed', 'failure', '2026-11-20T06:10:00Z', 2),
      ],
    });
    expect(d.action).toBe('fail');
    expect(d.note).toContain('real signal');
  });

  it('PR events are never superseded (a PR head is not main) — they wait like before', () => {
    const d = decide({
      sha: '4911ab22',
      mainTip: 'dce338aa',
      event: 'pull_request',
      ref: 'refs/pull/49/merge',
      runs: [run('CI', 'in_progress', null, '2026-11-20T10:00:00Z', 5)],
    });
    expect(d.action).toBe('wait');
    expect(d.note).toContain('CI is in_progress');
  });

  it('a push to a non-main branch is never superseded either', () => {
    const d = decide({
      sha: 'wipsha',
      mainTip: 'dce338aa',
      event: 'push',
      ref: 'refs/heads/wip/r357-ui',
      runs: [run('CI', 'in_progress', null, '2026-11-20T10:00:00Z', 5)],
    });
    expect(d.action).toBe('wait');
  });
});

describe('r357 L1 · --dry-run (the CLI surface the workflow calls)', () => {
  const cases = [
    ['superseded-by-docs-push.json', 'superseded'],
    ['cancelled-then-green.json', 'pass'],
    ['only-cancelled-wait.json', 'wait'],
    ['ci-failure-red.json', 'fail'],
    ['pr-never-superseded.json', 'wait'],
  ] as const;

  it.each(cases)('%s → %s (exit 0, decision JSON)', (fixture, expected) => {
    const stdout = execFileSync(
      process.execPath,
      [SCRIPT, '--dry-run', path.join(FIXTURES, fixture)],
      { encoding: 'utf8' },
    );
    const d = JSON.parse(stdout) as { action: string; note: string };
    expect(d.action).toBe(expected);
    expect(typeof d.note).toBe('string');
    expect(d.note.length).toBeGreaterThan(0);
  });
});
