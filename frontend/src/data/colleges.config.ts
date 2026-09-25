// College identity profiles — see contracts/college-identity-profile.md
// Source of truth (this PR): static config. Long-term: backend College table.
//
// ═══════════════════════════════════════════════════════════════════
// COVERAGE (wave 6-c, ruling #6): all 25 University of Zawia faculties,
// transcribed exactly from the canonical seed list
// (backend/prisma/seed.ts — 13 الزاوية + 8 العجيلات + 1 زوارة + 3 أخرى).
// The structured list in zu.edu.ly.md agrees on 25; its prose header
// ("26") and the README ("29") are both wrong. THE TRUE COUNT IS 25.
//
// PRINCIPLE III (university-truth): no synthetic hero imagery. heroImage
// and motif are intentionally omitted from every entry — CollegePages
// falls back to its default emoji masthead whenever heroImage is absent.
// When real UoZ photography lands under `frontend/public/colleges/<slug>/`,
// add `heroImage` (and optionally `motif`) to the entry following
// `specs/001-premium-motion-system/contracts/college-identity-profile.md`
// ("Adding a New College") — the page consumes them with zero further
// code change.
//
// SLUG SCHEME: `<facultyKey>-<cityKey>` — ASCII, lowercase, hyphenated.
//   facultyKey — compact English key derived from nameEn:
//     it · engineering · sciences · medicine · arts · economics ·
//     education · law · pharmacy · dentistry · medical-technology ·
//     sports · nursing · veterinary · sharia-law · public-health ·
//     natural-resources-engineering · oil-gas · natural-resources
//   cityKey — transliterated city:
//     الزاوية→zawiya · العجيلات→ajlulat · زوارة→zuwara ·
//     أبو عيسى→abu-isa · ناصر→naser · مناطق أخرى→other
//   e.g. 'it-zawiya', 'engineering-zawiya', 'economics-ajlulat'.
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
  Hospital, Mountain, Fuel, Sprout,
} from 'lucide-react';

export type CollegeIdentityProfile = {
  /** Stable college slug; `<facultyKey>-<cityKey>` per the scheme above. */
  slug: string;
  nameAr: string;
  nameEn: string;
  /**
   * Arabic city name exactly as the API/seed records it (e.g. 'الزاوية').
   * The deterministic API-record bridge (`getCollegeIdentityByRecord`)
   * keys on `nameAr|cityAr`; entries without it match no API record.
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
// Same-name colleges in different cities share a hue family with a
// shade step (documented in the table): Education ×4 rust→copper→
// bronze→tan, Economics ×2 green→emerald, Sciences ×2 teal→deep teal,
// Arts ×2 plum→mauve.
//
// slug                                accent    vs #FBFAF9  vs #191918
// ─────────────────────────────────── ────────  ─────────  ─────────
// it-zawiya                           #236BC8     5.03:1      3.36:1
// engineering-zawiya                  #46708F     5.07:1      3.33:1
// sciences-zawiya                     #2D776F     5.06:1      3.33:1
// medicine-zawiya                     #CA2F44     5.03:1      3.35:1
// arts-zawiya                         #9948BA     5.05:1      3.34:1
// economics-zawiya                    #2E7A3B     5.08:1      3.32:1
// education-zawiya                    #975F28     5.06:1      3.34:1
// law-zawiya                          #4963CF     5.08:1      3.33:1
// pharmacy-zawiya                     #2A7861     5.09:1      3.32:1
// dentistry-zawiya                    #277591     4.99:1      3.38:1
// medical-technology-zawiya           #AA4599     5.01:1      3.37:1
// sports-zawiya                       #B54C20     5.01:1      3.37:1
// nursing-zawiya                      #B6407B     5.03:1      3.36:1
// economics-ajlulat                   #327951     5.05:1      3.34:1
// veterinary-ajlulat                  #4A7833     5.00:1      3.37:1
// education-ajlulat                   #8C652A     5.02:1      3.36:1
// sharia-law-ajlulat                  #785BBC     5.01:1      3.37:1
// sciences-ajlulat                    #27777C     5.02:1      3.36:1
// public-health-ajlulat               #675EC6     5.04:1      3.35:1
// natural-resources-engineering-ajlulat #626C82   5.05:1      3.34:1
// oil-gas-ajlulat                     #8D6513     5.03:1      3.35:1
// arts-zuwara                         #9D4BA7     5.04:1      3.35:1
// education-abu-isa                   #A25926     5.04:1      3.35:1
// education-naser                     #7C6B32     5.03:1      3.36:1
// natural-resources-other             #657233     5.03:1      3.36:1
// ═══════════════════════════════════════════════════════════════════

export const colleges: CollegeIdentityProfile[] = [
  // ── الزاوية (main campus, 13 faculties) ──────────────────
  {
    slug: 'it-zawiya', nameAr: 'كلية تقنية المعلومات', nameEn: 'Information Technology',
    cityAr: 'الزاوية', accent: '#236BC8', icon: 'Laptop',
  },
  {
    slug: 'engineering-zawiya', nameAr: 'كلية الهندسة', nameEn: 'Engineering',
    cityAr: 'الزاوية', accent: '#46708F', icon: 'Cog',
  },
  {
    slug: 'sciences-zawiya', nameAr: 'كلية العلوم', nameEn: 'Sciences',
    cityAr: 'الزاوية', accent: '#2D776F', icon: 'FlaskConical',
  },
  {
    slug: 'medicine-zawiya', nameAr: 'كلية الطب البشري', nameEn: 'Human Medicine',
    cityAr: 'الزاوية', accent: '#CA2F44', icon: 'Stethoscope',
  },
  {
    slug: 'arts-zawiya', nameAr: 'كلية الآداب', nameEn: 'Arts',
    cityAr: 'الزاوية', accent: '#9948BA', icon: 'BookOpen',
  },
  {
    slug: 'economics-zawiya', nameAr: 'كلية الاقتصاد', nameEn: 'Economics',
    cityAr: 'الزاوية', accent: '#2E7A3B', icon: 'Briefcase',
  },
  {
    slug: 'education-zawiya', nameAr: 'كلية التربية', nameEn: 'Education',
    cityAr: 'الزاوية', accent: '#975F28', icon: 'GraduationCap',
  },
  {
    slug: 'law-zawiya', nameAr: 'كلية القانون', nameEn: 'Law',
    cityAr: 'الزاوية', accent: '#4963CF', icon: 'Scale',
  },
  {
    slug: 'pharmacy-zawiya', nameAr: 'كلية الصيدلة', nameEn: 'Pharmacy',
    cityAr: 'الزاوية', accent: '#2A7861', icon: 'Pill',
  },
  {
    slug: 'dentistry-zawiya', nameAr: 'كلية طب وجراحة الفم والأسنان', nameEn: 'Dentistry & Oral Surgery',
    cityAr: 'الزاوية', accent: '#277591', icon: 'Smile',
  },
  {
    slug: 'medical-technology-zawiya', nameAr: 'كلية التقنية الطبية', nameEn: 'Medical Technology',
    cityAr: 'الزاوية', accent: '#AA4599', icon: 'Microscope',
  },
  {
    slug: 'sports-zawiya', nameAr: 'كلية الرياضة والتربية البدنية', nameEn: 'Physical Education & Sports',
    cityAr: 'الزاوية', accent: '#B54C20', icon: 'Dumbbell',
  },
  {
    slug: 'nursing-zawiya', nameAr: 'كلية التمريض', nameEn: 'Nursing',
    cityAr: 'الزاوية', accent: '#B6407B', icon: 'HeartPulse',
  },
  // ── العجيلات (8 faculties) ────────────────────────────────
  {
    slug: 'economics-ajlulat', nameAr: 'كلية الاقتصاد', nameEn: 'Economics',
    cityAr: 'العجيلات', accent: '#327951', icon: 'Briefcase',
  },
  {
    slug: 'veterinary-ajlulat', nameAr: 'كلية البيطرة والعلوم الزراعية', nameEn: 'Veterinary & Agricultural Sciences',
    cityAr: 'العجيلات', accent: '#4A7833', icon: 'Leaf',
  },
  {
    slug: 'education-ajlulat', nameAr: 'كلية التربية', nameEn: 'Education',
    cityAr: 'العجيلات', accent: '#8C652A', icon: 'GraduationCap',
  },
  {
    slug: 'sharia-law-ajlulat', nameAr: 'كلية الشريعة والقانون', nameEn: 'Sharia & Law',
    cityAr: 'العجيلات', accent: '#785BBC', icon: 'Scroll',
  },
  {
    slug: 'sciences-ajlulat', nameAr: 'كلية العلوم', nameEn: 'Sciences',
    cityAr: 'العجيلات', accent: '#27777C', icon: 'FlaskConical',
  },
  {
    slug: 'public-health-ajlulat', nameAr: 'كلية الصحة العامة', nameEn: 'Public Health',
    cityAr: 'العجيلات', accent: '#675EC6', icon: 'Hospital',
  },
  {
    slug: 'natural-resources-engineering-ajlulat', nameAr: 'كلية هندسة الموارد الطبيعية', nameEn: 'Natural Resources Engineering',
    cityAr: 'العجيلات', accent: '#626C82', icon: 'Mountain',
  },
  {
    slug: 'oil-gas-ajlulat', nameAr: 'كلية هندسة النفط والغاز', nameEn: 'Oil & Gas Engineering',
    cityAr: 'العجيلات', accent: '#8D6513', icon: 'Fuel',
  },
  // ── زوارة ────────────────────────────────────────────────
  {
    slug: 'arts-zuwara', nameAr: 'كلية الآداب', nameEn: 'Arts',
    cityAr: 'زوارة', accent: '#9D4BA7', icon: 'BookOpen',
  },
  // ── مناطق أخرى ───────────────────────────────────────────
  {
    slug: 'education-abu-isa', nameAr: 'كلية التربية', nameEn: 'Education',
    cityAr: 'أبو عيسى', accent: '#A25926', icon: 'GraduationCap',
  },
  {
    slug: 'education-naser', nameAr: 'كلية التربية', nameEn: 'Education',
    cityAr: 'ناصر', accent: '#7C6B32', icon: 'GraduationCap',
  },
  {
    slug: 'natural-resources-other', nameAr: 'كلية الموارد الطبيعية', nameEn: 'Natural Resources',
    cityAr: 'مناطق أخرى', accent: '#657233', icon: 'Sprout',
  },
];

/**
 * Deterministic API-record bridge: (nameAr, city) → profile. The API keys
 * colleges by Prisma id (cuid) and the registry by slug, so consumers that
 * hold an API record (gallery cards, detail page, popover rows) reconcile
 * through this exact `nameAr|cityAr` match — the same (name, city) pair the
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
 * exports (verified for every name in wave 6-c). Returns null for unknown
 * names so callers can apply their own fallback.
 */
const COLLEGE_ICONS: Record<string, LucideIcon> = {
  Laptop, Cog, FlaskConical, Stethoscope, BookOpen, Briefcase, GraduationCap,
  Scale, Pill, Smile, Microscope, Dumbbell, HeartPulse, Leaf, Scroll,
  Hospital, Mountain, Fuel, Sprout,
};

export function collegeIcon(name: string): LucideIcon | null {
  return COLLEGE_ICONS[name] ?? null;
}
