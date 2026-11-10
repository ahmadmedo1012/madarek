/* ═══════════════════════════════════════════════════════════════════
 * illustrations.generated.ts — GENERATED FILE — DO NOT EDIT BY HAND.
 * Generator: scripts/media/sync-illustrations.mjs (from
 * frontend/public/media/manifest.json → illustrations[]; drift-gated
 * by `npm run illus:check`).
 *
 * The R342 original-illustration register (19 pieces, light + dark
 * twins, Arabic alt text from the asset contract). Mobile seats (empty
 * states, auth) resolve an id + theme here and load the image from the
 * web origin (expo-image) — the art is never forked.
 * ═══════════════════════════════════════════════════════════════════ */

export interface IllustrationSpec {
  /** the light twin's public path on the web origin */
  light: string;
  /** the dark twin's public path */
  dark: string;
  /** the contract's Arabic alt (empty for decorative pieces) */
  altAr: string;
  /** intrinsic px of the light twin */
  w: number;
  h: number;
  /** decorative pieces render with empty a11y labels */
  decorative: boolean;
}

export const ILLUSTRATIONS: Readonly<Record<string, IllustrationSpec>> = {
  "r342/footer-skyline": { light: "/media/illustrations/r342/footer/footer-skyline-light.webp", dark: "/media/illustrations/r342/footer/footer-skyline-dark.webp", altAr: "أفق حرم جامعي متخيّل بخط رفيع: رواق وقاعة وبرج وأشجار على خط أرض واحد", w: 1440, h: 384, decorative: true },
  "r342/hero-campus": { light: "/media/illustrations/r342/hero/hero-campus-light.webp", dark: "/media/illustrations/r342/hero/hero-campus-dark.webp", altAr: "المنظور الأكسونومتري المقطوع لمجمّع التعلّم في مدارك: قاعة محاضرات مدرّجة، فناء داخلي بشجرة المعرفة، معارض مكتبة على طابقين، وأروقة مقوسة — بمدخلٍ بلون العلامة النحاسي", w: 1440, h: 704, decorative: false },
  "r342/hero-campus-mobile": { light: "/media/illustrations/r342/hero/hero-campus-mobile-light.webp", dark: "/media/illustrations/r342/hero/hero-campus-mobile-dark.webp", altAr: "تركيب رأسي مخصّص للجوّال من مجمّع التعلّم: قاعة المحاضرات أعلى، معرض المكتبة في الوسط، وفناء الأروقة بأسفل — رسم حبر معماري أصلي", w: 768, h: 1440, decorative: false },
  "r342/journey-assessment": { light: "/media/illustrations/r342/journey/journey-assessment-light.webp", dark: "/media/illustrations/r342/journey/journey-assessment-dark.webp", altAr: "مخطط قاعة الاختبار من الأعلى: شبكة مكاتب منتظمة ومكتب الملاحظ", w: 1200, h: 1200, decorative: false },
  "r342/journey-lecture": { light: "/media/illustrations/r342/journey/journey-lecture-light.webp", dark: "/media/illustrations/r342/journey/journey-lecture-dark.webp", altAr: "مخطط قاعة المحاضرات من الأعلى: صفوف متدرجة ومسرح المناقشة", w: 1200, h: 1200, decorative: false },
  "r342/journey-library": { light: "/media/illustrations/r342/journey/journey-library-light.webp", dark: "/media/illustrations/r342/journey/journey-library-dark.webp", altAr: "مخطط طابق المكتبة من الأعلى: صفوف الرفوف وطاولات المطالعة", w: 1200, h: 1200, decorative: false },
  "r342/journey-mastery": { light: "/media/illustrations/r342/journey/journey-mastery-light.webp", dark: "/media/illustrations/r342/journey/journey-mastery-dark.webp", altAr: "مخطط غرفة الإتقان من الأعلى: طاولة دائرية وجدار تقدّم مقسّم", w: 1200, h: 1200, decorative: false },
  "r342/journey-route": { light: "/media/illustrations/r342/journey/journey-route-light.webp", dark: "/media/illustrations/r342/journey/journey-route-dark.webp", altAr: "المسار الأكاديمي من اليمين إلى اليسار: قاعة المحاضرات فالاختبار فالمكتبة فالإتقان على ممرّ واحد", w: 1600, h: 813, decorative: false },
  "r342/problem-01-lecture": { light: "/media/illustrations/r342/problems/problem-01-lecture-light.webp", dark: "/media/illustrations/r342/problems/problem-01-lecture-dark.webp", altAr: "مقطع قاعة محاضرات مدرّجة: موجات الشرح تتلاشى قبل الصفوف الأخيرة — لا قياس للفهم داخل القاعة", w: 1200, h: 1200, decorative: false },
  "r342/problem-02-feedback": { light: "/media/illustrations/r342/problems/problem-02-feedback-light.webp", dark: "/media/illustrations/r342/problems/problem-02-feedback-dark.webp", altAr: "جناحان بينهما جسر مكسور: أوراق الاختبارات تتساقط في الفجوة — تغذية راجعة متأخرة أو منفصلة", w: 1200, h: 1200, decorative: false },
  "r342/problem-03-mastery": { light: "/media/illustrations/r342/problems/problem-03-mastery-light.webp", dark: "/media/illustrations/r342/problems/problem-03-mastery-dark.webp", altAr: "برج التقدّم: طابقان فارغان بخطوط أخف تمرّ منها خطوط النظر — إتقان غير مرئي", w: 1200, h: 1200, decorative: false },
  "r342/problem-04-research": { light: "/media/illustrations/r342/problems/problem-04-research-light.webp", dark: "/media/illustrations/r342/problems/problem-04-research-dark.webp", altAr: "خزانة أرشيف متاهية: رسالة بحثية تُدفن خلف أدراج مغلقة — بحث مُودَع لا يُعثر عليه", w: 1200, h: 1200, decorative: false },
  "r342/role-owner": { light: "/media/illustrations/r342/roles/role-owner-light.webp", dark: "/media/illustrations/r342/roles/role-owner-dark.webp", altAr: "مخطط المالك على طاولة الرسم: غرفة مظلّلة وفرجار — الحاكمية وسجلّ التدقيق", w: 1200, h: 1200, decorative: true },
  "r342/role-quality": { light: "/media/illustrations/r342/roles/role-quality-light.webp", dark: "/media/illustrations/r342/roles/role-quality-dark.webp", altAr: "جدار ضمان الجودة: مؤشّر دائري ولائحة التزام — مجالس ومؤشرات", w: 1200, h: 1200, decorative: true },
  "r342/role-registrar": { light: "/media/illustrations/r342/roles/role-registrar-light.webp", dark: "/media/illustrations/r342/roles/role-registrar-dark.webp", altAr: "شبّاك المسجّل العام: أرشيف وسجلّ مفتوح — الكليات والمقرّرات والصلاحيات", w: 1200, h: 1200, decorative: true },
  "r342/role-student": { light: "/media/illustrations/r342/roles/role-student-light.webp", dark: "/media/illustrations/r342/roles/role-student-dark.webp", altAr: "مقعد الطالب: مكتب دراسة ورف كتب ودرج صاعد — رحلة التعلّم الفردية", w: 1200, h: 1200, decorative: true },
  "r342/role-teacher": { light: "/media/illustrations/r342/roles/role-teacher-light.webp", dark: "/media/illustrations/r342/roles/role-teacher-dark.webp", altAr: "منصّة الأستاذ: لوح شبكي وصفوف مقاعد — بناء المحاضرات والاختبارات", w: 1200, h: 1200, decorative: true },
  "r342/statement-courtyard": { light: "/media/illustrations/r342/statement/statement-courtyard-light.webp", dark: "/media/illustrations/r342/statement/statement-courtyard-dark.webp", altAr: "المقطع المعماري لقلب الحرم الجامعي: فناء داخلي تُحيط به أروقة مقوسة وفي مركزه شجرة المعرفة — رسم حبر أصلي لمنصّة مدارك", w: 1200, h: 1200, decorative: false },
  "r342/why-cycle": { light: "/media/illustrations/r342/why/why-cycle-light.webp", dark: "/media/illustrations/r342/why/why-cycle-dark.webp", altAr: "دورة المنصّة من اليمين إلى اليسار: مرصد التعلّم، جدار الفجوات، ممر التدريب، وسلّم التقدّم الصاعد", w: 1600, h: 813, decorative: false },
};
