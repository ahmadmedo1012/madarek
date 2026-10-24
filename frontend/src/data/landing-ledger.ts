/**
 * landing-ledger — R313 (WP-A1) — the honest-content constants shared by
 * the landing sheet and its guest sub-pages.
 *
 * The landing re-composition (D7) moves two content families OFF the
 * sheet — the capability matrix and the honest status pairs now live on
 * `/capabilities` — while the landing keeps their computed counts (the
 * hero metadata + the capabilities ticker). ONE source module keeps the
 * two surfaces from drifting: the words are pinned by the funnel/honesty
 * belts on both pages, so a copy edit must be a deliberate act that
 * updates both render surfaces at once.
 *
 * Every line is a real product truth (see backend feature flags/routes):
 * no invented adoption, no marketing metrics — the r306 honest-ledger
 * contract, carried forward unchanged.
 */

/* ── The honest capability ledger (ما يعمل اليوم) — every line is a real
 * product truth (see backend feature flags / routes). Every number
 * below is computed from this table or hard product truth —
 * no invented adoption, no marketing metrics. */
export const LIVE_CAPABILITIES = [
  'المحاضرات التفاعلية بنقاط الفحص والحضور التلقائي',
  'الاختبارات بأربعة أنواع أسئلة وتصحيح تلقائي للموضوعي',
  'مصفوفة الإتقان وتتبّع التقدّم لكل مقرّر',
  'مكتبة البحوث برفع PDF ومراجعة معلَّمة من الأستاذ',
  'الرسائل المباشرة والإشعارات داخل المنصّة',
  'الجدول الأسبوعي ومواعيد التسليمات',
] as const;
export const LIVE_COUNT = LIVE_CAPABILITIES.length;

/* ── Honest status pairs (إلى أين) — natural wording for the ledger's
 * local/sim/soon rows; no operational jargon, no invented claims.
 * R313: rendered on /capabilities (the landing's «إلى أين» section
 * became the closing CTA — the status matrix keeps its honest home on
 * the ledger page). */
export const VISION_STATUS = [
  { k: 'المساعد الأكاديمي', v: 'يعمل الآن — داخل المنصّة بلا خدمات خارجية', live: true },
  { k: 'فحص نزاهة البحوث', v: 'محاكاة — النتائج معلَّمة بوضوح', live: false },
  { k: 'المعامل الافتراضية', v: 'قيد التطوير — فهرس للاستعراض دون تشغيل بعد', live: false },
  { k: 'مزامنة بيانات المؤسّسات', v: 'وضع محدود — قيد التوسعة', live: false },
] as const;
