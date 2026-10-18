/**
 * r184 — health buildId derivation pins (DB-free).
 *
 * The health endpoint's buildId used to be a hand-bumped constant
 * ('…-r180-product-completion') that nobody bumped for three rounds:
 * production happily reported an r180 buildId while serving r183 code
 * (verified live 2026-10-19 via the r183a neutral favicon md5). These
 * pins keep the replacement DERIVED id honest across all three input
 * branches, so `EXPECTED_BUILD_ID=$(git rev-parse --short=12 HEAD)`
 * (the smoke-deploy contract) stays comparable.
 */
import { describe, it, expect } from 'vitest';

import { buildIdFromEnv } from '../../src/lib/build-id.js';

describe('buildIdFromEnv (r184 — derived health buildId)', () => {
  it('shortens a full platform sha to the 12-char git-style prefix', () => {
    // The real r183 deploy sha, exercised end-to-end in r184.
    expect(
      buildIdFromEnv('6ca558698d8fbde47e601cd3aa1608a599185678'),
    ).toBe('6ca558698d8f');
  });

  it('keeps a short (≥7 hex) sha as-is — no padding, no truncation below 12', () => {
    expect(buildIdFromEnv('abc1234def89')).toBe('abc1234def89');
    expect(buildIdFromEnv('0123456')).toBe('0123456'); // exactly 7 — minimum trusted
  });

  it('falls back to the local-dev sentinel when no sha is provided', () => {
    expect(buildIdFromEnv(undefined)).toBe('local-dev');
    expect(buildIdFromEnv('')).toBe('local-dev');
    expect(buildIdFromEnv('   ')).toBe('local-dev');
  });

  it('rejects sha-shaped lies: wrong alphabet, too short, or junk — never claims a commit', () => {
    // Non-hex characters, a 6-char fragment, and arbitrary strings must
    // all degrade to the sentinel — the field may not claim an identity
    // it cannot prove (buildId is an honesty surface, not decoration).
    expect(buildIdFromEnv('xyz-branch-name')).toBe('local-dev');
    expect(buildIdFromEnv('abc123')).toBe('local-dev'); // 6 hex chars < 7
    expect(buildIdFromEnv('G@56789abcdef')).toBe('local-dev');
  });

  it('trims surrounding whitespace before judging the sha', () => {
    expect(buildIdFromEnv('  6ca558698d8fbde47e601cd3aa1608a599185678\n')).toBe(
      '6ca558698d8f',
    );
  });
});
