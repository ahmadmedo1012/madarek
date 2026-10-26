/**
 * Paper lifecycle status → badge tone — the ONE platform ladder.
 *
 * r149 (R3-A1 #1): كانت الخريطة منقسمة بين الأدوار — الطالب يرى
 * «مُقيَّم» أخضر و«منشور» بنفسجيًا بينما المسجل العام يرى العكس تمامًا
 * لنفس الورقة البحثية. السلّم الكنوني هنا (اعتماد خريطة المسجل
 * العام — الأغنى دلاليًا: كل حالة لها لون مميز بدل انهيار حالتين
 * على اللون نفسه): الرحلة تتدرج amber (رفع) → brand (فحص آلي) → purple
 * (اجتياز الفحوص) → gold (تقييم الأستاذ) → green (النشر النهائي).
 *
 * صفحة مراجعة الأستاذ تبقى عمدًا على ثنائية amber/red — إنها طابور
 * عمل (قابل للتقييم/مرفوض) وليست عرض دورة حياة كاملة.
 */
import type { PaperStatus } from '../hooks/useResources';

export const PAPER_STATUS_TONE: Record<
  PaperStatus,
  'brand' | 'green' | 'amber' | 'red' | 'gold' | 'purple'
> = {
  UPLOADED: 'amber',
  SCANNING: 'brand',
  CHECKS_PASSED: 'purple',
  CHECKS_FAILED: 'red',
  GRADED: 'gold',
  PUBLISHED: 'green',
};
