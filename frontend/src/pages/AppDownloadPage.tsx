import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../components/Icon';
import { Logo } from '../brand';
import { useThemeSync } from '../components/layout/ThemeToggle';
import { GuestSheetChrome } from '../components/layout/GuestSheetChrome';
import { BACK_HOME, BRAND_WORD, CONTACT_CHANNEL, SKIP_LINK, useLegalMeta } from './legal/LegalSheet';
import { apiBaseURL } from '../lib/api';
/* R341 D4 — the distribution sheet rebuilt on the PATTERN LIBRARY (the
 * r340 T-D1a recipe, the D2 about / D3 help / D5 legal precedents):
 * pf-page/pf-page-header/pf-eyebrow/pf-page-actions carry the frame and
 * the app sheet's own ap-* grammar (styles/app.css) owns the rest.
 *
 * master/A1 — the official Android source is the GitHub Actions rolling
 * release `android-latest`. The primary CTA downloads the verified APK
 * directly (no sign-in, no EAS, no artifact ZIP); the build metadata
 * below it is read LIVE from the release's build-info.json and NEVER
 * blocks the download; iOS is an honest «قريبًا» — no TestFlight, no
 * SideStore, no unsigned IPA, no developer downloads. */
import '../styles/app.css';

/**
 * /app — «تطبيق مدارك: التنزيل والتحديث» (R327 D1 · M0.8 · master/A1).
 *
 * Every claim is honest:
 *   · the APK is the GitHub Actions rolling release asset — built,
 *     independently re-verified and published by CI (build → verify →
 *     publish), never an EAS artifact;
 *   · the minimum-version floor is read LIVE from /api/v1/status — the
 *     same endpoint the app's blocking gate consumes (M0.7);
 *   · iOS public distribution is «قريبًا» — internal engineering builds
 *     continue, but nothing public is claimed.
 *
 * This URL is already wired in the wild: the backend serves it as
 * `updateUrl` in /api/v1/status, so the app's «يلزم تحديث التطبيق»
 * screen lands here.
 */

/* The official distribution source (owner decision, master mission §4):
 * the rolling GitHub Release tag `android-latest`. Stable URLs — the
 * tag is maintained by CI, so these never go stale. */
const ANDROID_APK_URL =
  'https://github.com/ahmadmedo1012/madarek/releases/download/android-latest/Madarek.apk';
const RELEASE_PAGE_URL =
  'https://github.com/ahmadmedo1012/madarek/releases/tag/android-latest';
const BUILD_INFO_URL =
  'https://github.com/ahmadmedo1012/madarek/releases/download/android-latest/build-info.json';

interface StatusShape {
  ok: boolean;
  buildId?: string | null;
  minAppVersion?: string | null;
  updateUrl?: string | null;
}

/** The release's build-info.json (published by CI alongside the APK).
 * Everything optional — the page must render honestly without it. */
interface BuildInfoShape {
  version?: string;
  version_code?: number;
  built_at?: string;
  commit?: string;
  verified?: boolean;
  signing_mode?: string;
  size_bytes?: number;
  package?: string;
  min_sdk?: number;
  target_sdk?: number;
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/** «قريبًا» — the honest, non-clickable iOS status pill. */
/* R366 L4 copy diet: the repeated action/metadata labels — one home
 * each (the CollegePages COLLEGES_LABEL precedent). */
const PAGE_TITLE = 'تطبيق مدارك — التنزيل والتحديث';
const DOWNLOAD_LABEL = 'تنزيل لأندرويد';
const LAST_BUILD_LABEL = 'آخر بناء:';

function IosSoonTag() {
  return <span className="ap-pending">[قريبًا]</span>;
}

export function AppDownloadPage() {
  useThemeSync();
  useLegalMeta({
    title: PAGE_TITLE,
    path: '/app',
    description: 'تنزيل أندرويد وحالة iOS والتحديث.',
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

  // The published build's metadata — purely informational, never blocks
  // the download CTA (renders before this resolves; degrades honestly).
  const [info, setInfo] = useState<BuildInfoShape | null>(null);
  const [infoState, setInfoState] = useState<'loading' | 'ok' | 'error'>('loading');
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(BUILD_INFO_URL, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('build-info'))))
      .then((data: BuildInfoShape) => {
        setInfo(data ?? null);
        setInfoState('ok');
      })
      .catch(() => setInfoState('error'));
    return () => ctrl.abort();
  }, []);

  return (
    <div className="ap">
      <a href="#main" className="skip-link">{SKIP_LINK}</a>
      <GuestSheetChrome />

      <header className="ap-header">
        <div className="ap-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            {BACK_HOME}
          </Link>
          <Link to="/" className="ap-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            {BRAND_WORD}
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="ap-main">
        <div className="pf-page" data-width="reading">
          <div className="pf-page-header">
            <div className="pf-page-header-text">
              <p className="pf-eyebrow">وثيقة التوزيع</p>
              <h1 className="pf-page-title">{PAGE_TITLE}</h1>
            </div>
            <div className="pf-page-actions">
              <a className="ap-cta-primary" href={ANDROID_APK_URL} dir="ltr">
                {DOWNLOAD_LABEL}
              </a>
            </div>
          </div>

          <section aria-labelledby="app-android">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-android">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[01]</span>
                <span className="ap-bar-title">تنزيل أندرويد — المصدر</span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">
                اسمح بالتثبيت من مصادر غير معروفة أول مرة.
              </p>
              <p className="ap-p ap-actions">
                <a className="btn primary sm" href={ANDROID_APK_URL} dir="ltr">
                  {DOWNLOAD_LABEL}
                </a>
                <a className="btn ghost sm" href={RELEASE_PAGE_URL} target="_blank" rel="noreferrer" dir="ltr">
                  صفحة الإصدار والتحقّق
                </a>
              </p>
              {infoState === 'loading' ? (
                <p className="ap-p ap-p-note">جارٍ القراءة…</p>
              ) : infoState === 'error' ? (
                <p className="ap-p ap-p-note">
                  تعذّر قراءة البناء.
                </p>
              ) : (
                <p className="ap-p ap-p-note">
                  {LAST_BUILD_LABEL}{' '}
                  <span className="ap-mono" dir="ltr">{info?.version ?? '—'}</span>
                  {info?.built_at ? (
                    <>
                      {' '}· بتاريخ{' '}
                      <span className="ap-mono" dir="ltr">{info.built_at.slice(0, 10)}</span>
                    </>
                  ) : null}
                  {info?.commit ? (
                    <>
                      {' '}· من المصدر{' '}
                      <span className="ap-mono" dir="ltr">{info.commit.slice(0, 8)}</span>
                    </>
                  ) : null}
                  {info?.size_bytes ? (
                    <>
                      {' '}· الحجم{' '}
                      <span className="ap-mono" dir="ltr">{formatBytes(info.size_bytes)}</span>
                    </>
                  ) : null}
                  {' '}· التحقق:{' '}
                  <span className="ap-mono" dir="ltr">{info?.verified ? 'PASS' : '—'}</span>
                  {' '}· التوقيع:{' '}
                  <span className="ap-mono" dir="ltr">{info?.signing_mode === 'release' ? 'release' : '—'}</span>
                </p>
              )}
            </div>
          </section>

          <section aria-labelledby="app-ios">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-ios">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[02]</span>
                <span className="ap-bar-title">تطبيق iPhone <IosSoonTag /></span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">تطبيق iPhone قريبًا.</p>
            </div>
          </section>

          <section aria-labelledby="app-qr">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-qr">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[03]</span>
                <span className="ap-bar-title">رمز QR</span>
              </h2>
            </div>
            <div className="ap-cell">
              <div className="ap-qr">
                <img
                  src="/media/app/qr-app-page.svg"
                  alt="رمز QR لتنزيل التطبيق"
                  width={168}
                  height={168}
                  loading="lazy"
                />
                <p className="ap-p ap-p-note">
                  امسحه بكاميرا هاتفك.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="app-ota">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-ota">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[04]</span>
                <span className="ap-bar-title">قنوات التحديث</span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">
                الشاشات تتحدّث فوريًا (OTA)؛ والأذونات ومكتبات النظام كتثبيت جديد.
              </p>
              <p className="ap-p">
                ثلاث قنوات: <span className="ap-mono" dir="ltr">production</span> و
                <span className="ap-mono" dir="ltr">preview</span> و
                <span className="ap-mono" dir="ltr">development</span> — كل جهاز من قناته.
              </p>
            </div>
          </section>

          <section aria-labelledby="app-min-version">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-min-version">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[05]</span>
                <span className="ap-bar-title">الحد الأدنى للإصدار</span>
              </h2>
            </div>
            <div className="ap-cell">
              {statusState === 'loading' ? (
                <p className="ap-p">جارٍ القراءة…</p>
              ) : statusState === 'error' ? (
                <p className="ap-p">
                  تعذّر قراءة الحالة — حدّث الصفحة.
                </p>
              ) : (
                <>
                  <p className="ap-p">
                    {status?.minAppVersion ? (
                      <>
                        الحد الأدنى الآن{' '}
                        <span className="ap-mono" dir="ltr">{status.minAppVersion}</span> — والأقدم
                        يُعاد هنا حتى التحديث.
                      </>
                    ) : (
                      <>
                        لا حدّ أدنى مفروض — أي نسخة تعمل.
                      </>
                    )}
                  </p>
                  <p className="ap-p ap-p-note">
                    إصدار الخادم: <span className="ap-mono" dir="ltr">{status?.buildId ?? '—'}</span>

                  </p>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="app-requirements">
            <div className="pf-section-header">
              <h2 className="ap-bar" id="app-requirements">
                <span className="ap-bar-index ap-mono" dir="ltr" aria-hidden="true">[06]</span>
                <span className="ap-bar-title">المتطلبات والدعم</span>
              </h2>
            </div>
            <div className="ap-cell">
              <p className="ap-p">
                أندرويد 7.0+ وiOS 15+، بواجهة عربية فاتحة وداكنة.
                للبلاغ عن مشكلة:
                {' '}<Link to="/contact" className="ap-link">{CONTACT_CHANNEL}</Link>.
              </p>
            </div>
          </section>

          <footer className="ap-colophon">
            <p className="ap-colophon-line">منصّة مستقلّة · عربية أولًا · المصدر: GitHub Actions</p>
            <p className="ap-colophon-stamp">
              {LAST_BUILD_LABEL}{' '}
              <span className="ap-mono" dir="ltr">
                {info?.built_at ? info.built_at.slice(0, 10) : 'انظر صفحة الإصدار'}
              </span>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
