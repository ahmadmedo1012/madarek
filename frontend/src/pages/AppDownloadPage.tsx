import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LegalSheet, LegalSectionBar, LegalCell, PendingTag } from './legal/LegalSheet';
import { useLegalMeta } from './legal/LegalSheet';
import { apiBaseURL } from '../lib/api';

/**
 * /app — «تطبيق مدارك: التنزيل والتحديث» (R327 D1 · M0.8).
 *
 * The distribution sheet in the public grammar (hairline cells · [nn]
 * bars · paper/ink). EVERY claim is honest:
 *   · the APK link is the REAL preview-channel artifact (EAS),
 *     regenerated per native build — the durable source is the project's
 *     builds page, linked beside it;
 *   · TestFlight is PENDING (needs the owner's Apple Developer account —
 *     RELEASE.md documents the exact owner steps);
 *   · the minimum-version floor is read LIVE from /api/v1/status — the
 *     same endpoint the app's blocking gate consumes (M0.7).
 *
 * This URL is already wired in the wild: the backend serves it as
 * `updateUrl` in /api/v1/status, so the app's «يلزم تحديث التطبيق»
 * screen lands here.
 */

/* The latest preview-channel artifacts (EAS Build, A3 evidence). The iOS
 * simulator tar.gz is for DEVELOPERS; the Android APK installs directly
 * on devices. Both regenerate on native-affecting merges — the builds
 * page is the durable source of truth. */
const ANDROID_APK_URL =
  'https://expo.dev/artifacts/eas/5XTynelLCXq0ihxCSSNxbl-r-iNDdEpfEFA4MCXj390.tar.gz';
const BUILDS_PAGE_URL =
  'https://expo.dev/accounts/rh2011/projects/madarek-mobile/builds';
const APP_VERSION = '1.0.0';

interface StatusShape {
  ok: boolean;
  buildId?: string | null;
  minAppVersion?: string | null;
  updateUrl?: string | null;
}

export function AppDownloadPage() {
  useLegalMeta({
    title: 'تطبيق مدارك — التنزيل والتحديث',
    path: '/app',
    description:
      'تنزيل تطبيق مدارك لأندرويد، حالة iOS، قنوات التحديث التلقائي، والحد الأدنى للإصدار — مباشرة وبدون وسيط.',
  });

  // The live floor — the same status the app's version gate reads (M0.7).
  const [status, setStatus] = useState<StatusShape | null>(null);
  const [statusState, setStatusState] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${apiBaseURL}/status`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('status'))))
      .then((body) => {
        const data = (body?.data ?? body) as StatusShape;
        setStatus(data ?? null);
        setStatusState('ok');
      })
      .catch(() => setStatusState('error'));
    return () => ctrl.abort();
  }, []);

  return (
    <LegalSheet
      title="تطبيق مدارك — التنزيل والتحديث"
      lede="صفحة واحدة لكل ما يخصّ تطبيق الجوال: تنزيل أندرويد المباشر، حالة iOS، كيف تصل التحديثات إلى هاتفك، والحد الأدنى للإصدار الذي تفرضه المنصّة الآن — قراءة حيّة من الخادم."
      updated="2026-10-31"
    >
      <LegalSectionBar index={1} title="تنزيل أندرويد (APK)" id="app-android" />
      <LegalCell>
        <p className="lg-p">
          النسخة الحالية <span className="lg-mono" dir="ltr">{APP_VERSION}</span> من قناة
          المعاينة — ملفّ APK واحد يُثبَّت مباشرة (اسمح بـ«التثبيت من مصادر غير معروفة» عند
          سؤال النظام أول مرة).
        </p>
        <p className="lg-p lg-p-actions">
          <a className="btn primary sm" href={ANDROID_APK_URL} dir="ltr">
            تنزيل APK
          </a>
          <a className="btn ghost sm" href={BUILDS_PAGE_URL} target="_blank" rel="noreferrer" dir="ltr">
            كلّ البناءات (EAS)
          </a>
        </p>
        <p className="lg-p lg-p-note">
          ملاحظة صادقة: رابط APK أعلاه يتجدّد مع كلّ بناء أصلي جديد — إن لم يعمل، فالصفحة
          الدائمة للبناءات بجانبه هي المرجع. نسخة متجر Google Play (AAB) قيد الإعداد
          وتحتاج خطوة واحدة من المالك (مفتاح الخدمة — موثّقة في RELEASE.md).
        </p>
      </LegalCell>

      <LegalSectionBar index={2} title="iOS — TestFlight" id="app-ios" />
      <LegalCell>
        <p className="lg-p">
          نشر TestFlight يحتاج حساب Apple Developer ومفتاح App Store Connect من المالك
          <PendingTag /> — كلّ ما لا يحتاجه جاهز: البنية، الأيقونات، الأذونات بالعربية،
          ووصف المتجر. خطوات المالك بالضبط (سطرين لكلّ خطوة) في صفحة الإصدار الداخلية.
        </p>
        <p className="lg-p lg-p-note">
          للمطوّرين فقط: نسخة محاكي iOS تُبنى من نفس الفرع — تجدها في صفحة البناءات أعلاه
          (توزيع داخلي، تُثبَّت عبر أداة التطوير لا عبر المتجر).
        </p>
      </LegalCell>

      <LegalSectionBar index={3} title="رمز QR — افتح هذه الصفحة من جوالك" id="app-qr" />
      <LegalCell>
        <div className="lg-qr">
          <img
            src="/media/app/qr-app-page.svg"
            alt="رمز QR يؤدي إلى صفحة تنزيل تطبيق مدارك"
            width={168}
            height={168}
            loading="lazy"
          />
          <p className="lg-p lg-p-note">
            امسح الرمز بكاميرا الهاتف — تفتح هذه الصفحة نفسها على الجوال، ومنها رابط APK
            مباشرة. الرمز مرسوم بألوان الهوية (حبر على ورق) ولا يمرّ بأي خدمة خارجية.
          </p>
        </div>
      </LegalCell>

      <LegalSectionBar index={4} title="كيف تصل التحديثات؟ (القنوات)" id="app-ota" />
      <LegalCell>
        <p className="lg-p">
          التطبيق يفحص التحديث تلقائيًا عند كلّ فتح: تغيّرات الواجهة والشاشات تصل
          <strong> دون إعادة تثبيت</strong> (تحديث فوري — OTA)، بينما التغيّرات الأصلية
          (أذونات، مكتبات النظام) تصلك كملف تثبيت جديد من هذه الصفحة.
        </p>
        <p className="lg-p">
          ثلاث قنوات مفتوحة اليوم: <span className="lg-mono" dir="ltr">production</span> للنسخة
          العامة، <span className="lg-mono" dir="ltr">preview</span> للمعاينة قبل النشر،
          و<span className="lg-mono" dir="ltr">development</span> للتطوير — تحديث كلّ قناة
          مستقلّ، وجهازك يسحب من قناته فقط.
        </p>
      </LegalCell>

      <LegalSectionBar index={5} title="الحد الأدنى للإصدار — قراءة حيّة" id="app-min-version" />
      <LegalCell>
        {statusState === 'loading' ? (
          <p className="lg-p">جارٍ قراءة حالة الخادم…</p>
        ) : statusState === 'error' ? (
          <p className="lg-p">
            تعذّر قراءة الحالة الآن — الخادم المجاني قد يكون نائمًا؛ حدّث الصفحة بعد لحظات.
          </p>
        ) : (
          <>
            <p className="lg-p">
              {status?.minAppVersion ? (
                <>
                  الخادم يفرض الآن حدًا أدنى{' '}
                  <span className="lg-mono" dir="ltr">{status.minAppVersion}</span> — إن كان
                  تطبيقك أقدم، يمنعك من المتابعة ويعيدك إلى هذه الصفحة حتى تُحدّث.
                </>
              ) : (
                <>
                  لا يوجد حدّ أدنى مفروض حاليًا — كلّ نسخة مثبَّتة تعمل. عند فرض حدٍّ مستقبلًا
                  تظهر قيمة هنا فورًا (قراءة حيّة من{' '}
                  <span className="lg-mono" dir="ltr">/api/v1/status</span>).
                </>
              )}
            </p>
            <p className="lg-p lg-p-note">
              إصدار الخادم الحالي: <span className="lg-mono" dir="ltr">{status?.buildId ?? '—'}</span>
              {status?.updateUrl ? (
                <>
                  {' '}· رابط التحديث الرسمي: {' '}
                  <span className="lg-mono" dir="ltr">{status.updateUrl}</span>
                </>
              ) : null}
            </p>
          </>
        )}
      </LegalCell>

      <LegalSectionBar index={6} title="المتطلبات والدعم" id="app-requirements" />
      <LegalCell>
        <p className="lg-p">
          أندرويد 8.0 أو أحدث، وiOS 15 أو أحدث للتطبيق الأصلي. الواجهة عربية بالكامل من
          اليمين لليسار، وتعمل بالوضعين الفاتح والداكن. للبلاغ عن مشكلة في التطبيق:
          {' '}<Link to="/contact" className="lg-link">قناة التواصل</Link>.
        </p>
      </LegalCell>
    </LegalSheet>
  );
}
