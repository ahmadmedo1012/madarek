/**
 * authErrors — العرض الأمين لأخطاء المصادقة (r157 / F5).
 *
 * عقد D17-3 (docs/16-decisions-and-limitations.md): أكواد الأخطاء إنجليزية
 * UPPER_SNAKE، والرسائل الموجّهة للمستخدم عربية من الخلفية نفسها
 * (`backend/src/lib/errors.ts` → `{ error: { code, message } }`). رسالة الخلفية
 * العربية يجب أن تظهر للزائر حرفيًا — لا نصنع لها بديلًا عامًا يخفي السبب
 * الحقيقي (401 «البريد الإلكتروني أو كلمة المرور غير صحيحة»، 403 «هذا
 * الحساب معطّل — تواصل مع إدارة الجامعة»، 409 «البريد الإلكتروني مسجّل
 * مسبقاً»). الحارس العربي (apiErrorDetail / 15-j P0-1) يبقى خطّ الدفاع:
 * نصٌّ لاتينيّ خالص من طبقة النقل لا يظهر في الواجهة RTL أبدًا.
 *
 * الاستثناء الوحيد للرسالة العامة: لا يوجد `error.response` أصلًا (عطل شبكة)
 * — عندها لا توجد رسالة خلفية لنعرضها.
 */
import { apiErrorDetail } from './format';

export interface AuthErrorView {
  /**
   * رسالة الخلفية العربية كما كتبها الخادم (verbatim)، أو undefined حين
   * لا استجابة (شبكة) أو حين يرفضها الحارس العربي (نص لاتيني خالص).
   */
  serverMessage?: string;
  /** تعارض 409 (CONFLICT) — يحرّك رابط «سجِّل الدخول» في صفحة التسجيل. */
  isConflict: boolean;
}

/** هل للأخط استجابة HTTP (أي ليس فشل شبكة قبل بلوغ الخادم)؟ */
function hasResponse(error: unknown): boolean {
  return Boolean((error as { response?: unknown } | null)?.response);
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * طاقة عرض واحدة لكل استمارات المصادقة (تسجيل الدخول + إنشاء الحساب):
 * النص الحرفي للخلفية حين يكون عربيًا، وتبديل الحكم على تعارض 409.
 */
export function authErrorView(error: unknown): AuthErrorView {
  const responded = hasResponse(error);
  return {
    serverMessage: responded ? (apiErrorDetail(error) ?? undefined) : undefined,
    isConflict: statusOf(error) === 409,
  };
}
