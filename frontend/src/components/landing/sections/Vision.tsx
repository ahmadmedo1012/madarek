/* P2-0 (r335 split) — [8] الخاتمة (the reference's cta) — the resolve.
 * R323 (A3 · defect 8): the empty plus-marked sketch placeholder box
 * and the «المشروع / اللغة / القدرات» metadata ledger (with its
 * Latin «RTL» cell) are REMOVED — one statement + two real
 * buttons close the sheet; the true numbers (colleges,
 * campuses, live capabilities) ride the registry strip below,
 * computed from the real config. R322 V1: the [R313] revision
 * row + the r308 corner-coordinate readout stay deleted —
 * debug text is not content.
 *
 * The composer passes the render year (one clock for the whole
 * sheet — the footer's © row reads the same value). */
import { Link } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Icon } from '../../Icon';
import { colleges } from '../../../data/colleges.config';
import { LIVE_COUNT } from '../../../data/landing-ledger';
import { formatInt } from '../../../utils/numbers';
import { LOGIN, REGISTER } from '../copy';

/* ── Computed truths (BLUEPRINT §6 sources): 25 colleges in 3 campuses
 * from the real registry. R315 (K-E): the training-track, quality-board
 * and institution-isolation counts moved to /capabilities with their
 * ledger rows — the landing keeps painting only the campus count. */
const CAMPUS_COUNT = new Set(colleges.map((c) => c.cityAr ?? '')).size;

/* T-13: the registry cloud's ordinal binding — the frozen spec's cta
 * hover records (ordinals 2·14 + the mobile-only set). Each seat links
 * the registry's own /colleges page under the college's real name. */
const CTA_CLOUD_ORD = [2, 14, 3, 5, 7, 8, 10, 11, 12, 13, 15, 16, 17, 18];

export function Vision({ year }: { year: number }) {
  return (
    <section className="fo-cta" id="vision" aria-label="ابدأ رحلتك — أنشئ حسابك">
      <div className="fo-cta-inner">
        <h2 className="fo-cta-title" data-mdrk-reveal="lines">
          جاهز لبدء <em>رحلتك</em>؟
        </h2>
        <p className="fo-cta-lede" data-mdrk-reveal="item">
          أنشئ حسابك الجامعي في دقائق — ببريدك الإلكتروني ورقم قيدك،
          وتابع تقدّمك من أول محاضرة.
        </p>
        <div className="fo-cta-actions" data-mdrk-reveal="item" id="cta">
          <Link to="/auth/register" className="btn accent lg" data-spec-hover="1">
            {REGISTER}
            <Icon icon={ArrowLeft} size={16} />
          </Link>
          <Link to="/auth" className="btn ghost lg" data-spec-hover="4">{LOGIN}</Link>
        </div>
        <p className="fo-cta-meta" data-mdrk-reveal="item">
          <Icon icon={Check} size={13} />
          مدارك · {year} · منصّة تعليمية مستقلّة
        </p>
      </div>

      {/* [9] the colleges registry strip — the ruled hairline row
          linking the public registry (the funnel's 5th login
          affordance lives here; the demo-data disclosure rides the
          row, never a tooltip). R323 (A3 · defect 8): the TRUE
          numbers the old metadata ledger carried (colleges,
          campuses, the live-capability count) ride HERE, computed
          from the real config/data — never invented. */}
      <div className="cg-strip" id="colleges">
        {/* R328 (H5): the index renumbers [09]→[08] — the footer's
            old [08] drawn-mark cell retired in R323, so the sheet's
            own ladder ran hero[01]…roles[07] then skipped to [09];
            the registry strip IS the eighth band. */}
        <span className="cg-strip-label fo-mono" dir="ltr">[08] · REGISTRY</span>
        <p className="cg-strip-text">
          <strong><span className="fo-mono" dir="ltr">{formatInt(colleges.length)}</span> كلية</strong> في{' '}
          <span className="fo-mono" dir="ltr">{formatInt(CAMPUS_COUNT)}</span> أحرام —{' '}
          <span className="fo-mono" dir="ltr">[{String(LIVE_COUNT).padStart(2, '0')}]</span> قدرات تعمل اليوم.
          بيانات «جامعة مدارك التجريبية»: اصطناعية بالكامل لأغراض العرض.
        </p>
        <div className="cg-strip-links">
          <Link to="/colleges" className="btn ghost sm" data-spec-hover="6">تصفح الكليات التجريبية</Link>
          <Link to="/auth" className="fo-text-link" data-spec-hover="9">سجل الدخول لاستعراض كليتك داخل المنصّة</Link>
        </div>
        {/* T-13: the registry index cloud — the recorded cta interaction
            seats. Honest counterparts: the registry's OWN college names,
            each a real door to /colleges (no invented labels). */}
        <div className="cg-cloud" aria-label="فهرس الكليات التجريبية">
          {colleges.slice(0, 14).map((c, i) => (
            <Link key={c.slug} to="/colleges" className="cg-cloud-link" data-spec-hover={CTA_CLOUD_ORD[i]}>
              {c.nameAr}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
