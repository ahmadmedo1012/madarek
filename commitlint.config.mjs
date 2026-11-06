/**
 * commitlint.config.mjs — Madarek conventional-commit law (r339/T-23).
 *
 * Zero-dependency by design: `@commitlint/*` is NOT installed (the repo is
 * dependency-conscious — knip/jscpd gates). The engine that enforces these
 * rules is `.githooks/commit-msg.mjs`, wired via the existing
 * `git config core.hooksPath .githooks` (package.json "prepare"). This file
 * is the single source of truth for the rules; if real commitlint is ever
 * adopted, it can consume this config as-is.
 *
 * Types = the conventional set the mission pinned PLUS the types the repo's
 * own history actually uses (git log census, last 400 commits) so the gate
 * never blocks an established in-house commit style (wip checkpoints,
 * motion/conformance/instrument/audit rounds, …).
 *
 * subject-max-length is level 1 (WARN, non-blocking) at 100: 184 of the last
 * 400 real subjects exceed 100 chars (evidence-rich subjects are house
 * style — measurements, coverage, artifacts inline). Blocking on it would
 * break the existing flow; tighten to [2, 'always', 100] post-r339 if the
 * shorter-subject discipline is wanted.
 */
export default {
  extends: [],
  // git-native messages pass through untouched (plain `git merge`, `git
  // revert`, `--fixup`/`--squash` — none follow type(scope): subject).
  ignores: [(message) => /^(Merge |Revert |fixup! |squash! )/.test(message)],
  rules: {
    'type-empty': [2, 'never'],
    // alphabetized; sources: r339/T-23 spec + git-log census + CONTRIBUTING.
    'type-enum': [
      2,
      'always',
      [
        'audit',       // instrument-honesty audits (r339 T-02)
        'chore',
        'ci',
        'conformance', // conformance seat work
        'diet',        // bundle diet
        'docs',
        'feat',
        'fix',
        'instrument',  // conformance-instrument changes (r339 T-02b)
        'merge',       // round landings: merge: rNNN/<task> (…)
        'motion',      // motion/animation work (r339 T-11b)
        'perf',
        'polish',      // UI polish (documented since r1xx)
        'refactor',
        'revert',
        'spec',
        'style',
        'test',
        'wip',         // mid-task checkpoints (r339 convention)
      ],
    ],
    'subject-empty': [2, 'never'],
    // WARN-only — see header comment for why this is not blocking.
    'subject-max-length': [1, 'always', 100],
    // No scope rules: scopes are free-form and OPTIONAL — history mixes
    // `fix(r131):`, `feat(motion r339 T-11b1):` and scope-less `merge: r339/…`.
  },
};
