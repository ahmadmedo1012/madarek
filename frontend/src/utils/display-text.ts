// display-text.ts — R319 C1-C (§B2 data-leak line + §E-10 foundations).
//
// The visible-text hygiene layer for authenticated screens: never a raw
// revision code / seed id, ONE numeral system, real ar-LY dates. Every
// helper is PURE STRING-IN/STRING-OUT so the leak gate (§E-10) and the
// pages share one truth.
//
// NUMERAL CONVENTION (decided from the codebase, not preference): Latin
// (Western) digits 0-9 EVERYWHERE — prose and mono labels alike.
// Evidence:
//   - utils/numbers.ts formatNum pins 'ar-LY-u-nu-latn' — "ONE number
//     convention platform-wide: Latin (Western) digits 0-9" (r197 §7,
//     15-h P1-3 / D16-2); tests/unit/numbers.test.ts pins "emits Latin
//     digits only — never Arabic-Indic".
//   - lib/format.ts countAr renders `${n}` Latin inside Arabic prose
//     («3 كتب», pinned in format.test.ts) — the majority prose shape.
//   - formatDate('ar-LY') renders Arabic month names with Latin digits
//     («5 مارس 2026») — ar-LY's CLDR default numbering IS latn.
//   - toWestern (numbers.ts) exists precisely to fold Arabic-Indic
//     input back to Latin.
// So oneNumeralSystem normalizes ٠-٩ (and ۰-۹) → 0-9. Arabic-Indic
// digits in VISIBLE text are always a data leak, never a style choice.

import { formatDate } from './numbers';

/* ── revision codes / seed ids ─────────────────────────────────── */

/**
 * Revision-code-like tokens: `r` + 2–3 digits on word boundaries
 * (`r19`, `r180`, `r305`). These are repo/seed bookkeeping (the R-series
 * rounds) that must NEVER reach a rendered surface — the owner's real
 * screenshot carried «· r180» in the student dashboard header.
 *
 * Exported so the §E-10 gate (Agent D) scans with the SAME pattern.
 */
export const REVISION_CODE_RE = /\br\d{2,3}\b/g;

/** Stringified-JS-junk inputs that mean "no data" — never rendered. */
const JUNK_VALUES = new Set(['', 'undefined', 'null', 'NaN']);

/** Joinery glyphs: separators that are punctuation between two content
 *  words — when one ends up at an EDGE (after a code strip, bad join)
 *  it is orphaned and must go, so «… · r180» never leaves «… ·». */
const EDGE_JOINERY_RE = /^[·•—–|\s]+|[·•—–|\s]+$/g;

/**
 * Hygiene pass for any string about to become VISIBLE text:
 *  - strips revision-code-like tokens (`r180`, `r305`…);
 *  - collapses whitespace runs to single spaces and trims;
 *  - drops joinery glyphs orphaned at the edges by the strip (the
 *    photographed «… · r180» tail must never leave a dangling «·»);
 *  - returns '' for null/undefined inputs and the stringified junk
 *    values ('undefined' / 'null' / 'NaN') that leak from bad joins.
 *
 * NOT a general-purpose sanitizer: it never removes real words —
 * «اختبار» (exam) is a legitimate Arabic word and stays (see
 * sanitizeInstitutionName for the placeholder-name guard).
 */
export function sanitizeVisibleText(s: string | null | undefined): string {
  if (typeof s !== 'string') return '';
  const clean = s
    .replace(REVISION_CODE_RE, ' ')
    .replace(/\s+/g, ' ')
    .replace(EDGE_JOINERY_RE, '');
  return JUNK_VALUES.has(clean) ? '' : clean;
}

/* ── placeholder institution names ─────────────────────────────── */

/**
 * Seed/test placeholder institution names. A real faculty/department is
 * never named «اختبار» (exam) — these exact shapes are seed artifacts
 * (the owner's screenshot carried «قسم اختبار» as a department).
 *
 * «قاعة الاختبار» and every other exam-context use of the WORD اختبار
 * is unaffected: this pattern only matches the placeholder NAME shapes
 * (optionally prefixed كلية/قسم, after code-stripping), not the word in
 * prose.
 */
export const PLACEHOLDER_INSTITUTION_RE = /^(?:(?:كلية|قسم)\s+)?اختبار$/;

/**
 * Institution-name guard for the NAME slots (faculty/department
 * segments in identity lines): sanitizeVisibleText + drop the known
 * placeholder shapes. Returns '' when the segment must be OMITTED
 * entirely — callers join listwise so an empty name never leaves a
 * dangling « · ».
 */
export function sanitizeInstitutionName(s: string | null | undefined): string {
  const clean = sanitizeVisibleText(s);
  return PLACEHOLDER_INSTITUTION_RE.test(clean) ? '' : clean;
}

/* ── one numeral system ────────────────────────────────────────── */

/**
 * Enforce the platform's ONE numeral system (Latin 0-9 — see the file
 * header) on a mixed string: Arabic-Indic ٠-٩ and Persian ۰-۹ fold to
 * their Latin counterparts. Latin digits, Arabic letters and
 * punctuation pass through untouched, so it is safe to run on any
 * rendered run («٣٦% من الفصل» → «36% من الفصل»).
 */
export function oneNumeralSystem(s: string | null | undefined): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48))
    .replace(/[\u06F0-\u06F9]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48));
}

/* ── real ar-LY dates ──────────────────────────────────────────── */

/**
 * Real Arabic-locale date for VISIBLE prose: Intl.DateTimeFormat on the
 * ar-LY chain with the calendar and numbering system PINNED
 * (gregory + latn) so the output is deterministic across ICU builds —
 * «1 فبراير», «24 مايو 2026» (Arabic month names, Latin digits, per
 * the platform numeral convention).
 *
 * Replaces the numeric `{ day: '2-digit', month: '2-digit' }` shape
 * (which renders «01‏/02» — Latin digits in an odd order with an
 * invisible RLM, the exact defect the owner photographed) with real
 * dates an Arabic sentence can carry. Invalid input → '' (rendered as
 * nothing, never "Invalid Date").
 */
export function arDate(iso: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return formatDate(iso, { calendar: 'gregory', numberingSystem: 'latn', ...opts });
}

/* ── bidi isolation contract ───────────────────────────────────── */

/**
 * HOW to isolate mixed runs (R319 §E-10): wrap the run in a plain
 * `<bdi>` element in JSX — the UA stylesheet already applies
 * `unicode-bidi: isolate; direction: auto` to it, so NO css hook is
 * needed (and Agent A owns the css this cycle). No wrapper component:
 * `<bdi>{value}</bdi>` is the whole contract.
 *
 * Which shapes NEED <bdi> (digits/Latin inside an Arabic sentence):
 *   - numbers with a trailing symbol: «<bdi>36%</bdi> من الفصل»;
 *   - Latin codes/ids: «<bdi>CS-201</bdi>», «<bdi>19:00</bdi>»;
 *   - date phrases: «يبدأ <bdi>1 فبراير</bdi> وينتهي …»;
 *   - names/rooms that may carry Latin: «— <bdi>قاعة A2</bdi>».
 * Safe WITHOUT <bdi> (single European-number token between Arabic
 * words — the bidi algorithm keeps these in flow): «السنة 3»,
 * «بعد 3 أيام», «المركز 12 من 180». When in doubt, wrap: an extra
 * <bdi> is free; a scrambled sentence is not.
 */
