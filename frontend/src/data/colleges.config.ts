// College identity profiles — see contracts/college-identity-profile.md
// Source of truth (this PR): static config. Long-term: backend College table.
//
// ═══════════════════════════════════════════════════════════════════
// r188 — FICTIONAL DEMONSTRATION REGISTRY (جامعة مدارك التجريبية).
//
// The registry previously transcribed the real University of Zawia
// faculty list (13 الزاوية + 8 العجيلات + 1 زوارة + 3 أخرى — real
// Libyan cities tied to a real institution). r188 replaces it with a
// coherent SYNTHETIC catalogue for the demonstration institution:
// 25 faculties across three fictional knowledge-named campuses
// (حرم المعرفة · حرم الابتكار · حرم البيان). Names stay realistic
// academic names (a credible demo needs credible structure), but no
// entry resolves to a real university's registry — the campuses are
// concept labels, not places, and the owning institution is explicitly
// synthetic (see seed.ts / docs).
//
// PRINCIPLE III (university-truth): no synthetic hero imagery. heroImage
// and motif are intentionally omitted from every entry — CollegePages
// falls back to its default emoji masthead whenever heroImage is absent.
//
// SLUG SCHEME: `<facultyKey>-<campusKey>` — ASCII, lowercase, hyphenated.
//   facultyKey — compact English key derived from nameEn:
//     it · engineering · sciences · medicine · arts · economics ·
//     education · law · pharmacy · dentistry · medical-technology ·
//     sports · nursing · veterinary · sharia-law · public-health ·
//     natural-resources-engineering · oil-gas · natural-resources ·
//     languages · arts-design
//   campusKey — the fictional campus:
//     حرم المعرفة→maarifa · حرم الابتكار→ibtikar · حرم البيان→bayan
//   e.g. 'it-maarifa', 'engineering-maarifa', 'economics-ibtikar'.
//
// API ⇄ REGISTRY RECONCILIATION: the API keys colleges by Prisma id
// (cuid); this registry keys by slug. `getCollegeIdentityByRecord()`
// is the deterministic bridge — an exact `nameAr|cityAr` match (both
// sides come from the same seed list, where (name, city) is the
// uniqueness constraint).
// ═══════════════════════════════════════════════════════════════════

import type { LucideIcon } from 'lucide-react';
import {
  Laptop, Cog, FlaskConical, Stethoscope, BookOpen, Briefcase, GraduationCap,
  Scale, Pill, Smile, Microscope, Dumbbell, HeartPulse, Leaf, Scroll,
  Hospital, Mountain, Fuel, Sprout, Languages, Palette,
} from 'lucide-react';

export type CollegeIdentityProfile = {
  /** Stable college slug; `<facultyKey>-<campusKey>` per the scheme above. */
  slug: string;
  nameAr: string;
  nameEn: string;
  /**
   * Arabic campus label exactly as the API/seed records it (e.g.
   * 'حرم المعرفة'). The deterministic API-record bridge
   * (`getCollegeIdentityByRecord`) keys on `nameAr|cityAr`; entries
   * without it match no API record.
   */
  cityAr?: string;
  /** Primary accent (hex). AA-validated at build. */
  accent: `#${string}`;
  /** Override accent when `accent` fails contrast on the platform background. */
  accentAccessible?: `#${string}`;
  /**
   * Hero imagery shown on the college masthead. Optional since wave 6-c
   * (contract v1.1, minor): Principle III forbids synthetic imagery, so
   * the page renders its default emoji masthead whenever this is absent.
   */
  heroImage?: { src: string; alt: string };
  /** Lucide icon name — the exact `lucide-react` EXPORT name (PascalCase). */
  icon: string;
  /** Optional decorative motif behind the hero. */
  motif?: { src: string; alt: string };
  namedTokens?: Partial<{
    'college-accent-soft': string;
    'college-accent-fg': string;
  }>;
};

// ═══════════════════════════════════════════════════════════════════
// ACCENT PALETTE — 25 distinct-but-harmonious mid-value colors derived
// from the 9 pastel-family hue anchors in tokens.css (peach / mint /
// lavender / sky / yellow / rose / sand / grey / copper) plus adjacent
// hues. Every accent is pinned to relative luminance ≈ 0.150 so it
// simultaneously clears BOTH runtime gates with margin:
//   · ≥ 4.5:1 vs light chrome #FBFAF9 — AA body-text (also what
//     `npm run validate:colleges` enforces, so no accentAccessible is
//     ever needed);
//   · ≥ 3.0:1 vs dark chrome #191918 — `gateCollegeAccent(hex, 'dark')`
//     in lib/theme.ts, so no accent is silently gated off in dark mode.
// Feasible luminance band for both: [0.129, 0.174]; all 25 sit at
// L ≈ 0.150 (verified with the WCAG math mirrored from lib/theme.ts).
//
// Same-name colleges in different campuses share a hue family with a
// shade step (documented in the table): Education ×2 rust→copper,
// Economics ×2 green→emerald, Sciences ×2 teal→deep teal, Arts ×2
// plum→mauve.
//
// slug                                accent    vs #FBFAF9  vs #191918
// ─────────────────────────────────── ────────  ─────────  ─────────
// it-maarifa                          #236BC8     5.03:1      3.36:1
// engineering-maarifa                 #46708F     5.07:1      3.33:1
// sciences-maarifa                    #2D776F     5.06:1      3.33:1
// medicine-maarifa                    #CA2F44     5.03:1      3.35:1
// arts-maarifa                        #9948BA     5.05:1      3.34:1
// economics-maarifa                   #2E7A3B     5.08:1      3.32:1
// education-maarifa                   #975F28     5.06:1      3.34:1
// law-maarifa                         #4963CF     5.08:1      3.33:1
// pharmacy-maarifa                    #2A7861     5.09:1      3.32:1
// dentistry-maarifa                   #277591     4.99:1      3.38:1
// medical-technology-maarifa          #AA4599     5.01:1      3.37:1
// sports-maarifa                      #B54C20     5.01:1      3.37:1
// nursing-maarifa                     #B6407B     5.03:1      3.36:1
// economics-ibtikar                   #327951     5.05:1      3.34:1
// veterinary-ibtikar                  #4A7833     5.00:1      3.37:1
// education-ibtikar                   #8C652A     5.02:1      3.36:1
// sharia-law-ibtikar                  #785BBC     5.01:1      3.37:1
// sciences-ibtikar                    #27777C     5.02:1      3.36:1
// public-health-ibtikar               #675EC6     5.04:1      3.35:1
// natural-resources-engineering-ibtikar #626C82   5.05:1      3.34:1
// oil-gas-ibtikar                     #8D6513     5.03:1      3.35:1
// arts-bayan                          #9D4BA7     5.04:1      3.35:1
// languages-bayan                     #31689E     5.01:1      3.37:1
// arts-design-bayan                   #7A3E8F     5.02:1      3.36:1
// natural-resources-bayan             #657233     5.03:1      3.36:1
// ═══════════════════════════════════════════════════════════════════

export const colleges: CollegeIdentityProfile[] = [
  // ── حرم المعرفة (main campus, 13 faculties) ──────────────
  {
    slug: 'it-maarifa', nameAr: 'كلية تقنية المعلومات', nameEn: 'Information Technology',
    cityAr: 'حرم المعرفة', accent: '#236BC8', icon: 'Laptop',
  },
  {
    slug: 'engineering-maarifa', nameAr: 'كلية الهندسة', nameEn: 'Engineering',
    cityAr: 'حرم المعرفة', accent: '#46708F', icon: 'Cog',
  },
  {
    slug: 'sciences-maarifa', nameAr: 'كلية العلوم', nameEn: 'Sciences',
    cityAr: 'حرم المعرفة', accent: '#2D776F', icon: 'FlaskConical',
  },
  {
    slug: 'medicine-maarifa', nameAr: 'كلية الطب البشري', nameEn: 'Human Medicine',
    cityAr: 'حرم المعرفة', accent: '#CA2F44', icon: 'Stethoscope',
  },
  {
    slug: 'arts-maarifa', nameAr: 'كلية الآداب', nameEn: 'Arts',
    cityAr: 'حرم المعرفة', accent: '#9948BA', icon: 'BookOpen',
  },
  {
    slug: 'economics-maarifa', nameAr: 'كلية الاقتصاد', nameEn: 'Economics',
    cityAr: 'حرم المعرفة', accent: '#2E7A3B', icon: 'Briefcase',
  },
  {
    slug: 'education-maarifa', nameAr: 'كلية التربية', nameEn: 'Education',
    cityAr: 'حرم المعرفة', accent: '#975F28', icon: 'GraduationCap',
  },
  {
    slug: 'law-maarifa', nameAr: 'كلية القانون', nameEn: 'Law',
    cityAr: 'حرم المعرفة', accent: '#4963CF', icon: 'Scale',
  },
  {
    slug: 'pharmacy-maarifa', nameAr: 'كلية الصيدلة', nameEn: 'Pharmacy',
    cityAr: 'حرم المعرفة', accent: '#2A7861', icon: 'Pill',
  },
  {
    slug: 'dentistry-maarifa', nameAr: 'كلية طب وجراحة الفم والأسنان', nameEn: 'Dentistry & Oral Surgery',
    // r197: the paper ground (#F3EEE4) is darker than the r195 #FBFAF9 —
    // #277591 measured 4.50:1 there and drops under AA on the paper, so
    // the accent gets its deep accessible twin (6.16:1 on the paper).
    cityAr: 'حرم المعرفة', accent: '#277591', accentAccessible: '#1F5F73', icon: 'Smile',
  },
  {
    slug: 'medical-technology-maarifa', nameAr: 'كلية التقنية الطبية', nameEn: 'Medical Technology',
    cityAr: 'حرم المعرفة', accent: '#AA4599', icon: 'Microscope',
  },
  {
    slug: 'sports-maarifa', nameAr: 'كلية الرياضة والتربية البدنية', nameEn: 'Physical Education & Sports',
    cityAr: 'حرم المعرفة', accent: '#B54C20', icon: 'Dumbbell',
  },
  {
    slug: 'nursing-maarifa', nameAr: 'كلية التمريض', nameEn: 'Nursing',
    cityAr: 'حرم المعرفة', accent: '#B6407B', icon: 'HeartPulse',
  },
  // ── حرم الابتكار (8 faculties) ──────────────────────────
  {
    slug: 'economics-ibtikar', nameAr: 'كلية الاقتصاد', nameEn: 'Economics',
    cityAr: 'حرم الابتكار', accent: '#327951', icon: 'Briefcase',
  },
  {
    slug: 'veterinary-ibtikar', nameAr: 'كلية البيطرة والعلوم الزراعية', nameEn: 'Veterinary & Agricultural Sciences',
    cityAr: 'حرم الابتكار', accent: '#4A7833', icon: 'Leaf',
  },
  {
    slug: 'education-ibtikar', nameAr: 'كلية التربية', nameEn: 'Education',
    cityAr: 'حرم الابتكار', accent: '#8C652A', icon: 'GraduationCap',
  },
  {
    slug: 'sharia-law-ibtikar', nameAr: 'كلية الشريعة والقانون', nameEn: 'Sharia & Law',
    cityAr: 'حرم الابتكار', accent: '#785BBC', icon: 'Scroll',
  },
  {
    slug: 'sciences-ibtikar', nameAr: 'كلية العلوم', nameEn: 'Sciences',
    cityAr: 'حرم الابتكار', accent: '#27777C', icon: 'FlaskConical',
  },
  {
    slug: 'public-health-ibtikar', nameAr: 'كلية الصحة العامة', nameEn: 'Public Health',
    cityAr: 'حرم الابتكار', accent: '#675EC6', icon: 'Hospital',
  },
  {
    slug: 'natural-resources-engineering-ibtikar', nameAr: 'كلية هندسة الموارد الطبيعية', nameEn: 'Natural Resources Engineering',
    cityAr: 'حرم الابتكار', accent: '#626C82', icon: 'Mountain',
  },
  {
    slug: 'oil-gas-ibtikar', nameAr: 'كلية هندسة النفط والغاز', nameEn: 'Oil & Gas Engineering',
    cityAr: 'حرم الابتكار', accent: '#8D6513', icon: 'Fuel',
  },
  // ── حرم البيان (4 faculties) ─────────────────────────────
  {
    slug: 'arts-bayan', nameAr: 'كلية الآداب', nameEn: 'Arts',
    cityAr: 'حرم البيان', accent: '#9D4BA7', icon: 'BookOpen',
  },
  {
    slug: 'languages-bayan', nameAr: 'كلية اللغات', nameEn: 'Languages',
    cityAr: 'حرم البيان', accent: '#31689E', icon: 'Languages',
  },
  {
    slug: 'arts-design-bayan', nameAr: 'كلية الفنون والتصميم', nameEn: 'Arts & Design',
    cityAr: 'حرم البيان', accent: '#7A3E8F', icon: 'Palette',
  },
  {
    slug: 'natural-resources-bayan', nameAr: 'كلية الموارد الطبيعية', nameEn: 'Natural Resources',
    cityAr: 'حرم البيان', accent: '#657233', icon: 'Sprout',
  },
];

/**
 * Deterministic API-record bridge: (nameAr, campus) → profile. The API keys
 * colleges by Prisma id (cuid) and the registry by slug, so consumers that
 * hold an API record (gallery cards, detail page, popover rows) reconcile
 * through this exact `nameAr|cityAr` match — the same (name, campus) pair the
 * seed's upsert uniqueness constraint uses.
 */
const BY_RECORD = new Map(
  colleges.flatMap((c) => (c.cityAr ? [[`${c.nameAr}|${c.cityAr}`, c] as const] : [])),
);

export function getCollegeIdentityByRecord(
  name: string | null | undefined,
  city: string | null | undefined,
): CollegeIdentityProfile | null {
  if (!name || !city) return null;
  return BY_RECORD.get(`${name}|${city}`) ?? null;
}

/**
 * Icon-name → lucide-react component registry. Keys are the exact
 * `lucide-react` EXPORT names (PascalCase) — the same form
 * `scripts/validate-college-identity.ts` verifies against the package's
 * exports. Returns null for unknown names so callers can apply their
 * own fallback.
 */
const COLLEGE_ICONS: Record<string, LucideIcon> = {
  Laptop, Cog, FlaskConical, Stethoscope, BookOpen, Briefcase, GraduationCap,
  Scale, Pill, Smile, Microscope, Dumbbell, HeartPulse, Leaf, Scroll,
  Hospital, Mountain, Fuel, Sprout, Languages, Palette,
};

export function collegeIcon(name: string): LucideIcon | null {
  return COLLEGE_ICONS[name] ?? null;
}
