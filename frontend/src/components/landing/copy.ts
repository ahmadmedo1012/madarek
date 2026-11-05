/**
 * copy.ts — the landing surface's shared Arabic strings (R336 · the
 * bundle-diet fix for the 776.2 > 776 KB ceiling break).
 *
 * The P2-0 section split duplicated a handful of copy constants across
 * hero / vision / footer / nav / journey / product — each duplicate
 * rode the LandingPage chunk a second (third, fourth) time. The chunk
 * grew ~1 KB gz on a 205-byte margin and broke the pinned ceiling.
 * One named constant per string, imported everywhere it renders; the
 * rendered DOM is byte-identical.
 */
export const BRAND_LABEL = 'مدارك — منصّة التعليم الذكي';
export const LOGIN = 'تسجيل الدخول';
export const REGISTER = 'أنشئ حسابك الجامعي';
export const START_NOW = 'ابدأ الآن';
export const WORKS_TODAY = 'ما يعمل اليوم';

/** R337 — the media-accordion copy (JourneyScene + WhyScene carry it
 *  verbatim; the mastery line is the spec's own answer text). */
export const MASTERY_SCORE_LINE = 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب.';
export const LECTURE_INTERACTIVE = 'المحاضرة التفاعلية';
export const MASTERY_MATRIX = 'مصفوفة الإتقان';


/** R337 — the blueprint drawing classes (StatementArt/SectionDrawing/
 *  ElevationDrawing repeat these ladders 100+ times; one constant per
 *  ladder keeps the chunk from paying them every line). */
export const BP_DRAWABLE_HAIR = 'bp-drawable bp-hair';
export const BP_DRAWABLE = 'bp-drawable';
export const BP_HAIR_PM_DRAW = 'bp-hair pm-draw';
