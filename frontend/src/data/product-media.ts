/**
 * product-media — the generic product-capture registry (master/D1).
 *
 * Extracted verbatim from the retired `university-media.ts` (R307 landing
 * media registry) when the curated university section was removed: everything
 * here is product marketing on our OWN seeded demo surfaces — no
 * external institutions. The machine-readable provenance manifest is
 * `frontend/public/media/manifest.json` (rights, sources, verification);
 * this module mirrors the display registry (slots, crops, captions) so
 * the landing composes typed data instead of hand-written figures.
 *
 * Honesty contract (r168b/r188 lineage):
 *  - Product captures are real UI from the seeded demo environment
 *    (fully synthetic demo data) — disclosed on every frame.
 */

export interface ProductCapture {
  id: string;
  titleAr: string;
  captionAr: string;
  altAr: string;
  route: string;
  widths: number[];
  sizes: string;
}

export const PRODUCT_CAPTURES: [
  ProductCapture,
  ProductCapture,
  ProductCapture,
  ProductCapture,
] = [
  {
    id: 'student-dashboard',
    titleAr: 'لوحة الطالب',
    captionAr: 'نظرة الطالب على يومه: جدول اليوم، والمهام، والتقدّم',
    altAr: 'لقطة حقيقية من لوحة الطالب في مدارك — بيانات العرض التجريبية',
    route: '/student/dashboard',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 44rem, 100vw',
  },
  {
    id: 'student-library',
    titleAr: 'المكتبة الإلكترونية',
    captionAr: 'بحث عربي، وفهرس، وتصفّح الكتب والبحوث',
    altAr: 'لقطة حقيقية من المكتبة الإلكترونية في مدارك — بيانات العرض التجريبية',
    route: '/student/library',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 30rem, 100vw',
  },
  {
    id: 'student-lecture-player',
    titleAr: 'المحاضرة التفاعلية',
    captionAr: 'مشغّل المحاضرة مع نقطة فحص تُصحَّح فورًا',
    altAr: 'لقطة حقيقية من مشغّل المحاضرة التفاعلية في مدارك مع بطاقة نقطة الفحص — بيانات العرض التجريبية',
    route: '/student/courses',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 30rem, 100vw',
  },
  {
    id: 'student-matrix',
    titleAr: 'مصفوفة الإتقان',
    captionAr: 'درجة إتقان لكل مفهوم، وربطها بالدرس المناسب',
    altAr: 'لقطة حقيقية من مصفوفة الإتقان في مدارك — بيانات العرض التجريبية',
    route: '/student/matrix',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 30rem, 100vw',
  },
];

/* ── P-A2 R333 (INV-08 · heron-craft row 13) — the 2× capture seats ──
 * The same seeded surfaces re-captured @2880×1740 (the heron platform
 * frame's 1440×870 @1× — docs/redesign/r333/media-capture.md). These
 * ride the Vite asset pipeline (src/assets/product/*.webp → hashed
 * dist assets) through ProductFrame's `twoXSrc` override; the public
 * /media/product ladder above keeps serving the 1280×800 seats.
 * widths[0] states the 1× intrinsic width (the CLS box is 1440×870). */
export const CAPTURE_LECTURE_CHECKPOINT_2X: ProductCapture = {
  id: 'lecture-checkpoint',
  titleAr: 'المحاضرة التفاعلية',
  captionAr: 'مشغّل المحاضرة مع نقطة فحص تُصحَّح فورًا',
  altAr: 'لقطة حقيقية من مشغّل المحاضرة في مدارك أثناء محاضرة «هندسة البرمجيات»، مع بطاقة نقطة فحص مدمجة في الفيديو — بيانات العرض التجريبية',
  route: '/student/courses',
  widths: [1440],
  sizes: '(min-width: 992px) 30rem, 100vw',
};

export type RoleKey = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/* The four role-seat captures (r307): the non-student dashboards the
   role selector swaps in. ProductCapture shape (same loader); routes
   point at the real surfaces — the frames carry no funnel CTA. */
export interface RoleShowcase {
  key: RoleKey;
  roleAr: string;
  lineAr: string;
  captureId: string;
}

/** The five verified roles with their REAL dashboard capture (demo data). */
export const ROLE_SHOWCASES: [
  RoleShowcase,
  RoleShowcase,
  RoleShowcase,
  RoleShowcase,
  RoleShowcase,
] = [
  {
    key: 'STUDENT',
    roleAr: 'للطالب',
    lineAr: 'رحلة تعلم شخصية — من المحاضرة الأولى إلى الإتقان',
    captureId: 'student-dashboard',
  },
  {
    key: 'TEACHER',
    roleAr: 'للأستاذ',
    lineAr: 'بناء المحاضرات والاختبارات، وتصحيح بملاحظات، ومتابعة الطلاب',
    captureId: 'teacher-dashboard',
  },
  {
    key: 'ADMIN',
    /* R320 §B: the role strip names the role — «المسجل العام». The
       definite form (no leading ل) is deliberate: LandingPage renders
       the card title as `roleAr.replace(/^ل/, '')`, so a «للمسجل العام»
       entry would strip to the dangling «لمسجل العام»; this entry
       renders the clean «المسجل العام» (same clean-noun shape as the
       «ضمان الجودة» / «مالك المنصّة» entries). */
    roleAr: 'المسجل العام',
    lineAr: 'الكليات والأقسام والمقرّرات والصلاحيات، وتقارير حيّة',
    captureId: 'admin-dashboard',
  },
  {
    key: 'QUALITY',
    roleAr: 'لضمان الجودة',
    lineAr: 'مجالس الجودة والمعايرة وتقارير الالتزام',
    captureId: 'quality-dashboard',
  },
  {
    key: 'OWNER',
    roleAr: 'لمالك المنصّة',
    lineAr: 'الحاكمية والمؤسّسات وسجلّ التدقيق',
    captureId: 'owner-dashboard',
  },
];
