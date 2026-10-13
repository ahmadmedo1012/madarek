/**
 * Testimonials content registry (r153k / r153-D) — the content model for
 * FUTURE authorized social proof on the landing page.
 *
 * ⚠️ INTENTIONALLY EMPTY. Real, named testimonials require real people
 * and documented consent (docs/16 هـ — the externally-blocked item).
 * Fabricating names, quotes, roles, or affiliations is FORBIDDEN by the
 * platform's honesty rules (audits 4-A1 praised the landing's
 * unattributed role-quotes for exactly this reason). The component that
 * renders this registry (`components/landing/TestimonialSection.tsx`)
 * renders NOTHING while the array is empty — unavailable content never
 * ships.
 *
 * When authorized content exists, add entries here (verbatim quotes
 * only) and record the consent trail. Long-term home: a backend table
 * + public endpoint via the CollegesPopover lazy-fetch pattern.
 */
export interface Testimonial {
  id: string;
  /** The quote, VERBATIM — never edited for tone or length. */
  quoteAr: string;
  /** Author's real, consented display name. */
  authorNameAr: string;
  /** e.g. «طالبة هندسة برمجيات — السنة الرابعة». */
  roleLabelAr: string;
  /** Optional college tie-in (registry slug). */
  facultySlug?: string;
  /** Documented consent trail — who obtained it, when, and its scope. */
  consent: {
    obtainedBy: string;
    date: string; // ISO
    scope: 'landing-page' | 'marketing' | 'public';
  };
  /** Optional avatar override; initials + token color otherwise. */
  avatar?: { initials: string; color?: string };
}

export const TESTIMONIALS: readonly Testimonial[] = [
  // EMPTY BY DESIGN — see the header. Do not add placeholder rows.
];
