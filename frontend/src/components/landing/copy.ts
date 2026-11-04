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
