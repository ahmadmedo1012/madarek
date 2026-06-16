// College identity profiles — see contracts/college-identity-profile.md
// Source of truth (this PR): static config. Long-term: backend College table.
//
// Initial coverage: 0 profiles. Per Principle III (university-truth), we
// do NOT seed profiles with synthetic hero imagery. As real University of
// Zawia photography lands under `frontend/public/colleges/<slug>/`, add
// entries here following the documented pattern in
// `specs/001-premium-motion-system/contracts/college-identity-profile.md`
// (`Adding a New College`).
//
// The application layer below (data-college attribute + CSS variables on
// the college page root) activates the moment the first profile is added —
// no further code change required.

export type CollegeIdentityProfile = {
  /** Stable college slug; matches existing canonical college records. */
  slug: string;
  nameAr: string;
  nameEn: string;
  /** Primary accent (hex). AA-validated at build. */
  accent: `#${string}`;
  /** Override accent when `accent` fails contrast on the platform background. */
  accentAccessible?: `#${string}`;
  heroImage: { src: string; alt: string };
  /** Lucide icon name (must exist in `lucide-react`). */
  icon: string;
  motif?: { src: string; alt: string };
  namedTokens?: Partial<{
    'college-accent-soft': string;
    'college-accent-fg': string;
  }>;
};

export const colleges: CollegeIdentityProfile[] = [];

/** Lookup by slug — used by the college page to resolve identity at render. */
export function getCollegeIdentity(slug: string | undefined): CollegeIdentityProfile | null {
  if (!slug) return null;
  return colleges.find((c) => c.slug === slug) ?? null;
}
