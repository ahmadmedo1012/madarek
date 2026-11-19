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
/* R366 L4 copy diet: the shared public-sheet chrome copy (skip link,
 * back-home link, brand word) — one home per string, in LegalSheet. */
import { BACK_HOME, BRAND_WORD, SKIP_LINK, useLegalMeta } from '../legal/LegalSheet';
/* R366 L4: the registry link's label — the CTA and the section lede
 * said the same two words. */
const COLLEGES_GATE = 'بوابة الكليات';
// patterns.css §10 (r341/D9) — the guest sub-page sheet (ex
// campus.css, deleted): the honest capability matrix (ما يعمل اليوم) +
// the status pairs (إلى أين) moved here VERBATIM from the landing when
// D7 recomposed the sheet to Heron's 9 sections; the colleges registry
// links to /colleges (the real registry page).

/** /capabilities — «السجلّ» (R313 · WP-A1).
 *
 * The landing's two honest-table sections live here as one ledger page:
 *   · ما يعمل اليوم — the capability matrix: every row is a real
 *     product truth (system feature state), numbered, checked, with the
 *     bracketed count in the footer line — no slab, no inversion;
 *   · إلى أين — the honest status pairs: live / simulated /
 *     in-development, mono-tagged, exactly as the system is today;
 *   · المؤسسة النموذجية — the registry summary: the computed college
 *     count + the demo-data disclosure, linking to /colleges for the
 *     full registry (the interactive detail stays where it lives).
 */
export function CapabilitiesPage() {
  useThemeSync();
  /* R368 T5 — the ledger sheet owns its head like every other public
   * sheet: without this the tab title, description, canonical and
   * og:url all stayed the LANDING's (canonical pointed at `/`, which
   * de-indexes /capabilities). The words are the page's own. */
  useLegalMeta({
    title: 'سجلّ القدرات',
    path: '/capabilities',
    description: 'ما يعمل اليوم وما هو محاكاة — من حالة الميزات في النظام.',
  });

  const campusCount = new Set(colleges.map((c) => c.cityAr ?? '')).size;

  return (
    <div className="cu">
      <a href="#main" className="skip-link">{SKIP_LINK}</a>
      <GuestSheetChrome />

      <header className="cu-header">
        <div className="cu-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            {BACK_HOME}
          </Link>
          <Link to="/" className="cu-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            {BRAND_WORD}
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="cu-main pf-page">
        {/* ── ما يعمل اليوم — the capability matrix ── */}
        <section aria-labelledby="cap-live-title">
          <div className="cu-head pf-page-header-text">
            <span className="fo-eyebrow"><span className="fo-mono" dir="ltr">[01]</span> ما يعمل اليوم</span>
            <RevealCssClass as="h1" className="cu-title" delay={1} id="cap-live-title">
              قدرات <em>موثَّقة</em>، لا ادّعاءات
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              كل رقم من حالة الميزات في النظام.
            </RevealCssClass>
            {/* D9: the honest CTA pair at the page head (the D7c measured
                seat) — the sister public page + the real registry page; the
                registry section below keeps the data + the disclosure. */}
            <RevealCssClass as="div" className="pf-page-actions" delay={3}>
              <Link to="/competitions" className="btn accent" aria-label="المسابقات — تحديات مدارك">المسابقات</Link>
              <Link to="/colleges" className="btn ghost">{COLLEGES_GATE}</Link>
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
          <div className="cu-head pf-page-header-text">
            <span className="fo-eyebrow"><span className="fo-mono" dir="ltr">[02]</span> إلى أين</span>
            <RevealCssClass as="h2" className="cu-title" delay={1} id="cap-vision-title">
              تعليمٌ <em>يعرف كلَّ طالب</em>
            </RevealCssClass>
            <RevealCssClass as="p" className="cu-lede" delay={2}>
              كل حالة كما في النظام.
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

        {/* ── المؤسسة النموذجية — the registry summary ── */}
        <section aria-labelledby="cap-colleges-title">
          <div className="cu-head pf-page-header-text">
            <span className="fo-eyebrow"><span className="fo-mono" dir="ltr">[03]</span> المؤسسة النموذجية</span>
            <RevealCssClass as="h2" className="cu-title" delay={1} id="cap-colleges-title">
              {formatInt(colleges.length)} كلية في {formatInt(campusCount)} أحرام
            </RevealCssClass>
          </div>

          <RevealCssClass as="div" className="cu-registry" delay={2}>
            <dl className="cu-meta" aria-label="بيانات السجلّ">
              <div className="fo-meta-row">
                <dt className="fo-meta-k">السجلّ</dt>
                <dd className="fo-meta-v">مؤسسة مدارك النموذجية</dd>
              </div>
              <div className="fo-meta-row">
                <dt className="fo-meta-k">الحالة</dt>
                <dd className="fo-meta-v">بيانات اصطناعية للعرض</dd>
              </div>
            </dl>
            {/* D9: the registry actions moved UP to the page head (the
                pf-page-actions pair above) — this block keeps the data
                registry + the demo-data disclosure. */}
          </RevealCssClass>

          <p className="cu-foot">
            مدارك منصّة مستقلّة لا تنتمي لمؤسّسة تعليمية.
          </p>
        </section>
      </main>
    </div>
  );
}
