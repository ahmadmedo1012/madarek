/**
 * university-media — the R307 landing media registry.
 *
 * Single source of truth for WHAT renders: the machine-readable
 * provenance manifest is `frontend/public/media/manifest.json`
 * (rights, sources, verification); this module mirrors the display
 * registry (slots, crops, captions) so the landing composes typed
 * data instead of hand-written figures. The two are kept in sync by
 * `scripts/media/verify-media-registry.mjs` (CI-optional, runs in the
 * design-gates belt) — edit manifest.json + this file together.
 *
 * Honesty contracts (r168b/r188 lineage + R307):
 *  - Every university photo is Commons-licensed (PD / CC BY / CC
 *    BY-SA) with per-image attribution; derivatives are resized
 *    WebP renditions (changes disclosed in the rail footer).
 *  - Videos are embedded ONLY from official university channels via
 *    the permitted youtube-nocookie mechanism, click-to-load — the
 *    facade never pretends to be a product demo («توثيقي» is the
 *    label, and it is the truth).
 *  - Product captures are real UI from the seeded demo environment
 *    (fully synthetic «جامعة مدارك التجريبية» data) — disclosed on
 *    every frame.
 *  - A university appearing here is documentation, not endorsement:
 *    «مدارك مستقلّة» stays on the sheet.
 */

export interface UniversityPhoto {
  /** stable id (matches manifest.json photos[].id) */
  id: string;
  /** institution display name (Arabic) */
  institution: string;
  /** short name for the caption bar */
  nameAr: string;
  /** one-line Arabic caption */
  captionAr: string;
  altAr: string;
  /** object-position for narrow crops (mobile) */
  objectPosition: string;
  /** intrinsic ratio of the SOURCE rendition (w/h) for aspect boxes */
  ratio: number;
  /** srcset widths, ascending */
  widths: number[];
  /** sizes attribute */
  sizes: string;
  /** attribution: author string (Commons Artist) */
  author: string;
  /** license short name + deed URL */
  license: string;
  licenseUrl: string;
}

/** Helper: build the srcset string for /media/universities/{id}-{w}.webp */
function srcset(id: string, widths: number[]): string {
  return widths
    .map((w) => `/media/universities/${id}-${w}.webp ${w}w`)
    .join(', ');
}

export const HERO_PHOTOS: [UniversityPhoto, UniversityPhoto, UniversityPhoto] = [
  {
    id: 'uob-wide',
    institution: 'جامعة بنغازي',
    nameAr: 'مقرّ إدارة جامعة بنغازي',
    captionAr: 'الإدارة المركزية بالقبّة — تصوير بانورامي',
    altAr: 'صورة بانورامية لواجهة مبنى الإدارة المركزية لجامعة بنغازي بقبّتها',
    objectPosition: '50% 45%',
    ratio: 2689 / 827,
    widths: [480, 800, 1200, 1600],
    sizes: '(min-width: 992px) 46rem, 100vw',
    author: 'WisiW',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    id: 'uob-science',
    institution: 'جامعة بنغازي',
    nameAr: 'كلية العلوم — جامعة بنغازي',
    captionAr: 'واجهة كلية العلوم بهندستها المتكرّرة',
    altAr: 'صورة لواجهة كلية العلوم بجامعة بنغازي بنمط النوافذ الهندسي المتكرّر',
    objectPosition: '50% 50%',
    ratio: 4000 / 3000,
    widths: [480, 800, 1200],
    sizes: '(min-width: 992px) 24rem, 100vw',
    author: 'WisiW',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    id: 'tripoli-science',
    institution: 'جامعة طرابلس',
    nameAr: 'كلية العلوم — جامعة طرابلس',
    captionAr: 'مبنى كلية العلوم من داخل الحرم',
    altAr: 'صورة لمبنى كلية العلوم بجامعة طرابلس من داخل الحرم الجامعي',
    objectPosition: '50% 40%',
    ratio: 3024 / 4032,
    widths: [480, 800, 1000],
    sizes: '(min-width: 992px) 18rem, 60vw',
    author: 'Atoo77',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
];

export const RAIL_PHOTOS: [
  UniversityPhoto,
  UniversityPhoto,
  UniversityPhoto,
  UniversityPhoto,
  UniversityPhoto,
  UniversityPhoto,
] = [
  {
    id: 'uob-garden',
    institution: 'جامعة بنغازي',
    nameAr: 'حديقة الجامعة — جامعة بنغازي',
    captionAr: 'جادة الحديقة بخطّ النخيل',
    altAr: 'صورة بانورامية لجادة حديقة جامعة بنغازي المكسوّة بأشجار النخيل',
    objectPosition: '50% 50%',
    ratio: 4912 / 1080,
    widths: [800, 1200, 1600],
    sizes: '(min-width: 992px) 72rem, 100vw',
    author: 'WisiW',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
  {
    id: 'garyounis-classic',
    institution: 'جامعة بنغازي (قاريونس)',
    nameAr: 'حرم قاريونس من الجوّ',
    captionAr: 'منظر جوّي للحرم الجامعي',
    altAr: 'صورة جوّية لحرم جامعة بنغازي (قاريونس سابقًا) بمبانيه الأسطوانية',
    objectPosition: '50% 40%',
    ratio: 1509 / 1275,
    widths: [480, 800, 1200],
    sizes: '(min-width: 992px) 44rem, 100vw',
    author: 'Munsha’at al Akhdar lil Alwan, Benghazi',
    license: 'Public domain',
    licenseUrl: 'https://commons.wikimedia.org/wiki/Public_domain',
  },
  {
    id: 'garyounis-1',
    institution: 'جامعة بنغازي (قاريونس)',
    nameAr: 'مدخل الحرم — قاريونس',
    captionAr: 'بوابة الحرم الجامعي',
    altAr: 'صورة لمدخل حرم جامعة بنغازي (قاريونس) باللافتة',
    objectPosition: '50% 45%',
    ratio: 3648 / 2736,
    widths: [480, 800, 1200],
    sizes: '(min-width: 992px) 26rem, 100vw',
    author: 'Maher A. A. Abdussalam',
    license: 'Public domain',
    licenseUrl: 'https://commons.wikimedia.org/wiki/Public_domain',
  },
  {
    id: 'omu-agri',
    institution: 'جامعة عمر المختار',
    nameAr: 'كلية الزراعة — البيضاء',
    captionAr: 'مجمّع الكلية بطرازه المعماري',
    altAr: 'صورة لمجمّع كلية الزراعة بجامعة عمر المختار في البيضاء',
    objectPosition: '50% 45%',
    ratio: 1310 / 908,
    widths: [480, 800, 1200],
    sizes: '(min-width: 992px) 26rem, 100vw',
    author: 'Munsha’at al Akhdar lil Alwan, Benghazi',
    license: 'Public domain',
    licenseUrl: 'https://commons.wikimedia.org/wiki/Public_domain',
  },
  {
    id: 'fateh-science',
    institution: 'جامعة طرابلس',
    nameAr: 'ممرّ كلية العلوم — جامعة طرابلس',
    captionAr: 'ممرّ داخلي من حياة الحرم',
    altAr: 'صورة لممرّ داخلي في كلية العلوم بجامعة طرابلس',
    objectPosition: '50% 40%',
    ratio: 1280 / 960,
    widths: [480, 800, 1200],
    sizes: '(min-width: 992px) 26rem, 100vw',
    author: 'Tarek Siala',
    license: 'CC BY 2.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
  },
  {
    id: 'uob',
    institution: 'جامعة بنغازي',
    nameAr: 'تفصيلة من مبنى الإدارة',
    captionAr: 'زوايا معمارية من الإدارة المركزية',
    altAr: 'صورة معمارية لجزء من مبنى إدارة جامعة بنغازي',
    objectPosition: '50% 35%',
    ratio: 4000 / 3000,
    widths: [480, 800, 1200, 1600],
    sizes: '(min-width: 992px) 26rem, 100vw',
    author: 'WisiW',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
];

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

export type RoleKey = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/* The four role-seat captures (r307): the non-student dashboards the
   role selector swaps in. ProductCapture shape (same loader); routes
   point at the real surfaces — the frames carry no funnel CTA. */
export const ROLE_CAPTURES: ProductCapture[] = [
  {
    /* the student seat mirrors PRODUCT_CAPTURES' student-dashboard row —
       the registry is per-slot, the lookup stays single-source. */
    id: 'student-dashboard',
    titleAr: 'لوحة الطالب',
    captionAr: 'نظرة الطالب على يومه: جدول اليوم، والمهام، والتقدّم',
    altAr: 'لقطة حقيقية من لوحة الطالب في مدارك — بيانات العرض التجريبية',
    route: '/student/dashboard',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 40rem, 100vw',
  },
  {
    id: 'teacher-dashboard',
    titleAr: 'لوحة الأستاذ',
    captionAr: 'متابعة الأقسام والطلاب والمقرّرات',
    altAr: 'لقطة حقيقية من لوحة الأستاذ في مدارك — بيانات العرض التجريبية',
    route: '/teacher/dashboard',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 40rem, 100vw',
  },
  {
    id: 'admin-dashboard',
    titleAr: 'لوحة الإدارة',
    captionAr: 'مؤشرات الكليات والطلاب والأساتذة',
    altAr: 'لقطة حقيقية من لوحة الإدارة في مدارك — بيانات العرض التجريبية',
    route: '/admin/dashboard',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 40rem, 100vw',
  },
  {
    id: 'quality-dashboard',
    titleAr: 'لوحة ضمان الجودة',
    captionAr: 'مجالس الجودة ومؤشرات الالتزام',
    altAr: 'لقطة حقيقية من لوحة ضمان الجودة في مدارك — بيانات العرض التجريبية',
    route: '/quality/dashboard',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 40rem, 100vw',
  },
  {
    id: 'owner-dashboard',
    titleAr: 'لوحة المالك',
    captionAr: 'الحاكمية والمؤسّسات وسجلّ التدقيق',
    altAr: 'لقطة حقيقية من لوحة مالك المنصّة في مدارك — بيانات العرض التجريبية',
    route: '/owner/dashboard',
    widths: [720, 1280],
    sizes: '(min-width: 992px) 40rem, 100vw',
  },
];

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
    roleAr: 'للإدارة',
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

export interface UniversityVideo {
  id: string;
  institution: string;
  titleAr: string;
  kindAr: string;
  durationAr: string;
  videoId: string;
  channelAr: string;
}

/** Official-channel documentaries — embedded via youtube-nocookie, click-to-load. */
export const UNIVERSITY_VIDEOS: [UniversityVideo, UniversityVideo] = [
  {
    id: 'misurata-exams',
    institution: 'جامعة مصراتة',
    titleAr: 'أجواء امتحانات نهاية الفصل بكليات جامعة مصراتة',
    kindAr: 'فيديو توثيقي من القناة الرسمية للجامعة',
    durationAr: '5:11',
    videoId: 'qM67yDknM0U',
    channelAr: 'القناة الرسمية لجامعة مصراتة',
  },
  {
    id: 'sebha-graduation',
    institution: 'جامعة سبها',
    titleAr: 'حفل خريجي جامعة سبها — الدفعة 40',
    kindAr: 'فيديو توثيقي من القناة الرسمية للجامعة',
    durationAr: '3:13',
    videoId: 'dz_t7yOOZMc',
    channelAr: 'القناة الرسمية لجامعة سبها',
  },
];

export { srcset as mediaSrcset };
