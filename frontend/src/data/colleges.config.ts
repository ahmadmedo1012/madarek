// College identity profiles — see contracts/college-identity-profile.md
// Source of truth (this PR): static config. Long-term: backend College table.

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
