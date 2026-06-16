# Contract: College Identity Profile

**Date**: 2026-06-02
**Owner**: `frontend/src/data/colleges.config.ts` (new) + `frontend/src/styles/colleges.css` (extend)

Drives every college page's accent layer (color, hero, icon, optional motif)
without bespoke styling per college.

## Source of Truth (this PR)

A static module:

```
frontend/src/data/colleges.config.ts
```

Long-term follow-up moves these fields onto the backend `College` table.
Tracked separately in `tasks.md`. The frontend contract below does not
change when the backend migration lands; only the data source switches
from import to fetch.

## TypeScript Type

```ts
// frontend/src/data/colleges.config.ts
export type CollegeIdentityProfile = {
  /** Stable college slug; primary key; matches existing college records. */
  slug: string;

  /** Display names (i18n keys allowed). */
  nameAr: string;
  nameEn: string;

  /** Primary accent color (hex). AA-validated at build. */
  accent: `#${string}`;

  /** Override accent used when `accent` fails contrast on the platform background. */
  accentAccessible?: `#${string}`;

  /** Hero imagery shown on the college landing. */
  heroImage: { src: string; alt: string };

  /** Lucide icon name (must exist in `lucide-react` exports). */
  icon: string;

  /** Optional decorative motif behind the hero. */
  motif?: { src: string; alt: string };

  /** Optional per-college token nudges; keys must be in the allowlist below. */
  namedTokens?: Partial<{
    'college-accent-soft': string;
    'college-accent-fg':   string;
  }>;
};

export const colleges: CollegeIdentityProfile[];
```

## CSS Surface

The college page root applies the profile as scoped custom properties:

```css
[data-college="<slug>"] {
  --college-accent:        <accent>;
  --college-accent-fg:     <auto-derived or override>;
  --college-accent-soft:   <auto-derived or override>;
}
```

Components on the college page consume these — never the slug, never the
hex value directly. Example:

```css
.college-hero h1 {
  color: var(--college-accent-fg);
  border-bottom: 3px solid var(--college-accent);
}
```

## Validation Rules

1. **Slug match**: Every entry's `slug` MUST match an existing college
   record in the canonical colleges data. Orphan profiles fail build.
2. **Coverage**: Every real University of Zawia college MUST have a
   profile. Missing profiles fail build (Principle III: real data only).
3. **AA contrast**: A build-time script validates `accent` against the
   platform background (`--surface`) and against `--college-accent-soft`.
   - Body-text contrast on `--surface`: must be ≥ 4.5:1.
   - If `accent` fails, `accentAccessible` MUST be provided.
   - If neither passes, build fails with a specific error per slug.
4. **Asset existence**: `heroImage.src` and (if present) `motif.src`
   MUST resolve to a file under `frontend/public/`. Missing assets fail
   build.
5. **Icon existence**: `icon` MUST be a valid export from `lucide-react`.
6. **Allowlisted token nudges**: `namedTokens` keys MUST be in the
   declared allowlist (`college-accent-soft`, `college-accent-fg`). Any
   other key fails type-check.
7. **No accent override of system semantics**: identity accents MUST NOT
   shadow the system tokens for `--success`, `--warning`, or `--danger`
   under any circumstances.

## Build-Time Verification

A single script — `scripts/validate-college-identity.ts` — runs in CI:

- Loads `colleges.config.ts`.
- Cross-references against the canonical colleges data.
- Verifies asset existence on disk.
- Computes WCAG contrast for each accent.
- Verifies icon names resolve.
- Emits a clear pass/fail summary per college.

Failure of any check fails the PR build.

## Adding a New College

1. Add an entry to `colleges.config.ts` with all required fields.
2. Place hero image at `frontend/public/colleges/<slug>/hero.{jpg,webp}`.
3. (Optional) Place motif at `frontend/public/colleges/<slug>/motif.{svg,png}`.
4. Run `pnpm validate:colleges` (or equivalent) locally.
5. Visit the college page; confirm identity reads correctly in both LTR
   and RTL.

The college page itself requires zero code changes. This is the
"data-only adoption" path required by FR-024.

## Versioning

This contract is **v1.0.0**.

- Adding a new optional field: MINOR.
- Adding a required field: MAJOR (existing entries must backfill).
- Renaming `slug`, `accent`, `heroImage`, or `icon`: MAJOR.
