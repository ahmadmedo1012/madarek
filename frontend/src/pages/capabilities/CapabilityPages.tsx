import { Link } from 'react-router-dom';
import { ArrowRight, Check, FlaskConical } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { Logo } from '../../brand';
import { useThemeSync } from '../../components/layout/ThemeToggle';
import { colleges } from '../../data/colleges.config';
import { LIVE_CAPABILITIES, LIVE_COUNT, VISION_STATUS } from '../../data/landing-ledger';
import { formatInt } from '../../utils/numbers';
import { RevealCssClass } from '../../hooks/useReveal';
/* c3-W6 (K-I extension): the guest sheet chrome — same grammar as
 * /auth + /campus (fixed frame + corner marks + grain film). */
import { GuestSheetChrome } from '../../components/layout/GuestSheetChrome';
// campus.css — R313 (WP-A1): the /capabilities guest sub-page shares
// the sub-pages' sheet (the landing grammar carried by campus.css): the
// honest capability matrix (ما يعمل اليوم) + the status pairs (إلى أين)
// moved here VERBATIM from the landing when D7 recomposed the sheet to
// Heron's 9 sections; the colleges registry links to /colleges (the
// real registry page).
import '../../styles/campus.css';

/** /capabilities — «السجلّ» (R313 · WP-A1).
 *
 * The landing's two honest-table sections live here as one ledger page:
 *   · ما يعمل اليوم — the capability matrix: every row is a real
 *     product truth (system feature state), numbered, checked, with the
 *     bracketed count in the footer line — no slab, no inversion;
 *   · إلى أين — the honest status pairs: live / simulated /
 *     in-development, mono-tagged, exactly as the system is today;
 *   · الجامعة التجريبية — the registry summary: the computed college
 *     count + the demo-data disclosure, linking to /colleges for the
 *     full registry (the interactive detail stays where it lives).
 */
export function CapabilitiesPage() {
  useThemeSync();

  const campusCount = new Set(colleges.map((c) => c.cityAr ?? '')).size;

  return (
    <div className="cu">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <GuestSheetChrome />

      <header className="cu-header">
        <div className="cu-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الصفحة الرئيسية
          </Link>
          <Link to="/" className="cu-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            مدارك
          </Link>
          <span className="cu-header-index fo-mono" dir="ltr">MADAREK · LEDGER SHEET · [C-02]</span>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="cu-main">
        {/* ── ما يعمل اليوم — the capability matrix ── */}
        <section aria-labelledby="cap-live-title">
          <div className="cu-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[01]</span> ما يعمل اليوم</span>
            <RevealCssClass as="h1" className="cu-title" delay={1} id="cap-live-title">
              قدرات <em>موثَّقة</em>، لا ادّعاءات
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              كل رقم يُحسب من حالة الميزات في النظام — يتغيّر مع التحديثات، لا مع الحملات.
            </RevealCssClass>
          </div>

          <RevealCssClass as="ol" className="lv-list" delay={2}>
            {LIVE_CAPABILITIES.map((cap, i) => (
              <li key={cap} className="lv-row">
                <span className="lv-num fo-mono" dir="ltr" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
                <span className="lv-text">{cap}</span>
                <span className="lv-check" aria-hidden><Icon icon={Check} size={14} /></span>
              </li>
            ))}
          </RevealCssClass>
          <p className="lv-foot fo-mono" dir="ltr">[{String(LIVE_COUNT).padStart(2, '0')}] live capabilities · source: system feature state</p>
        </section>

        {/* ── إلى أين — the honest status pairs ── */}
        <section aria-labelledby="cap-vision-title">
          <div className="cu-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[02]</span> إلى أين</span>
            <RevealCssClass as="h2" className="cu-title" delay={1} id="cap-vision-title">
              نحو تعليمٍ <em>يعرف كلَّ طالب</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              نبني منظومة تتذكّر ما شاهد الطالب وما أخطأ وما ينقصه —
              ثم تقترح الخطوة التالية. بلا أرقام مختلقة ولا وعود بلا تنفيذ:
              كل حالة أدناه كما هي في النظام اليوم.
            </RevealCssClass>
          </div>

          <RevealCssClass as="ul" className="vs-status" delay={3}>
            {VISION_STATUS.map((s) => (
              <li key={s.k} className={s.live ? 'is-live' : undefined}>
                <span className="vs-status-k"><Icon icon={s.live ? Check : FlaskConical} size={13} /> {s.k}</span>
                <span className="vs-status-v">{s.v}</span>
                <span className={`vs-status-tag${s.live ? ' is-live' : ''}`}>
                  {s.live ? 'يعمل الآن' : 'محاكاة/قيد التطوير'}
                </span>
              </li>
            ))}
          </RevealCssClass>
        </section>

        {/* ── الجامعة التجريبية — the registry summary ── */}
        <section aria-labelledby="cap-colleges-title">
          <div className="cu-head">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[03]</span> الجامعة التجريبية</span>
            <RevealCssClass as="h2" className="cu-title" delay={1} id="cap-colleges-title">
              {formatInt(colleges.length)} كلية في {formatInt(campusCount)} أحرام
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              بنية الكليات كاملة معروضة داخل المنصّة — والسجلّ التفاعلي في صفحة الكلّيّات.
            </RevealCssClass>
          </div>

          <RevealCssClass as="div" className="cu-registry" delay={2}>
            <dl className="cu-meta" aria-label="بيانات السجلّ">
              <div className="fo-meta-row">
                <dt className="fo-meta-k">السجلّ</dt>
                <dd className="fo-meta-v">جامعة مدارك التجريبية</dd>
              </div>
              <div className="fo-meta-row">
                <dt className="fo-meta-k">الكليات</dt>
                <dd className="fo-meta-v">
                  <span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> في{' '}
                  <span className="fo-mono" dir="ltr">{formatInt(campusCount)}</span> أحرام
                </dd>
              </div>
              <div className="fo-meta-row">
                <dt className="fo-meta-k">الحالة</dt>
                <dd className="fo-meta-v">بيانات اصطناعية بالكامل للعرض</dd>
              </div>
            </dl>
            <div className="cu-registry-row">
              <Link to="/colleges" className="btn ghost">تصفح الكليات التجريبية</Link>
              <Link to="/campus" className="cu-text-link">الحياة الجامعية — الصور والفيديو</Link>
            </div>
          </RevealCssClass>

          <p className="cu-foot">
            بيانات العرض تخصّ «جامعة مدارك التجريبية» — مؤسّسة اصطناعية بالكامل لأغراض العرض،
            ومدارك منصّة مستقلّة لا تنتمي إلى أيّ مؤسّسة تعليمية ولا تمثّلها.
          </p>
        </section>
      </main>
    </div>
  );
}
