/**
 * ProductFrame — the R307 sanctioned pattern for REAL product captures
 * on the landing sheet (DESIGN.md §6c, r307).
 *
 * A flat hairline frame around an authentic capture of the running
 * application (seeded demo environment — fully synthetic «جامعة مدارك
 * التجريبية» data). Every frame carries:
 *   · the mono «real-ui» tag + the demo-data disclosure —
 *     a real interface, honestly labelled, never a fabricated mockup;
 *   · explicit intrinsic dimensions (CLS-safe by construction);
 *   · lazy loading (the landing never ships these bytes eagerly).
 *
 * The optional `to` affordance routes INSIDE the platform (an anchor
 * or an app route) — never a funnel link: the r164b/r188 funnel
 * counts stay exact (5 register + 5 login).
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../Icon';
import type { ProductCapture } from '../../data/university-media';
import '../../styles/r314-productframe.css';

export interface ProductFrameProps {
  capture: ProductCapture;
  variant?: 'lead' | 'std' | 'role';
  ctaAr?: string;
  ctaTo?: string;
  ctaAnchor?: boolean;
  /**
   * R315 cycle-4 (c4-B): the drafting VIEWPORT TAG — mono chrome on
   * the capture's top inline-start corner (e.g. «VIEW-A · 1280×800»),
   * the reference's CAD viewport label. Desktop platform band only
   * (scoped .pr-section ≥992 in landing.css; hidden elsewhere). Pure
   * chrome: decorative, aria-hidden — the honest title/caption stay
   * in the figcaption.
   */
  viewTag?: string;
}

function productSrcset(id: string, widths: number[]): string {
  return widths.map((w) => `/media/product/${id}-${w}.webp ${w}w`).join(', ');
}

/**
 * ProductMockCards — R314 (B5) the decorative mock-UI card collage.
 *
 * The reference's platform section composes OVERLAPPING flat UI
 * fragments over its floor-plan cell (chat widget · mastery dots ·
 * attendance chip — hairline borders, dark title bars, radius 0,
 * zero shadows). These are honest GENERIC states of REAL surfaces
 * («مساعد الفهم» = the live /student/ai assistant · «مصفوفة الإتقان»
 * = the real mastery matrix · «الحضور» = the player's auto-counted
 * attendance): qualitative labels only, NEUTRAL unlabeled bars, and
 * the attendance readout states the real MECHANISM («تلقائي» — the
 * player counts attendance automatically on completion) — R318 §A5:
 * the old «--%» empty-state read as a placeholder and is retired; a
 * fabricated number was never an option — and the demo disclosure
 * («عرض توضيحي») stays in every title bar, the same honesty grammar
 * as the caption's «بيانات العرض التجريبية».
 *
 * Decorative by contract: aria-hidden + pointer-transparent, laid
 * out inside .prf-stage (the photo box) so the overlap never reaches
 * the caption row or the funnel CTA. Layout/geometry lives in
 * styles/r314-productframe.css (the gate-clean composition sheet).
 */
function ProductMockCards({ variant }: { variant: 'lead' | 'std' | 'role' }) {
  const lead = variant === 'lead';
  return (
    <div
      className={lead ? 'prf-cards prf-cards--lead' : 'prf-cards prf-cards--side'}
      aria-hidden="true"
    >
      {/* Card C — الحضور (attendance chip; lead only, ≥1200px via CSS) */}
      {lead && (
        <div className="prf-card prf-card--attend">
          <div className="prf-card-bar">
            <span className="prf-card-dot" />
            <span className="prf-card-note">عرض توضيحي</span>
          </div>
          <div className="prf-attend-row">
            <span className="prf-attend-label">الحضور</span>
            {/* R318 §A5 — the honest mechanism, not a placeholder: the
                player counts attendance automatically on completion
                (the real live capability). «--%» read as a literal
                placeholder and is retired. */}
            <span className="prf-attend-read">تلقائي</span>
          </div>
        </div>
      )}

      {/* Card A — مساعد الفهم (the live assistant, generic state) */}
      <div className="prf-card prf-card--chat">
        <div className="prf-card-bar">
          <span className="prf-card-dot" />
          <span className="prf-card-title">مساعد الفهم</span>
          <span className="prf-card-note">عرض توضيحي</span>
        </div>
        <div className="prf-chat-body">
          <p className="prf-chat-line">أهلاً — اسألني عن أي مفهوم.</p>
          <p className="prf-chat-line">أشرح بخطوات واضحة.</p>
          <span className="prf-chat-input">اكتب سؤالك هنا…</span>
        </div>
      </div>

      {/* Card B — مصفوفة الإتقان (qualitative rows, neutral bars) */}
      {lead && (
        <div className="prf-card prf-card--mastery">
          <div className="prf-card-bar">
            <span className="prf-card-dot" />
            <span className="prf-card-title">مصفوفة الإتقان</span>
            <span className="prf-card-note">عرض توضيحي</span>
          </div>
          <div className="prf-mastery-body">
            <div className="prf-m-row">
              <span className="prf-m-dot prf-m-dot--signal" />
              <span className="prf-m-label">المفهوم</span>
              <span className="prf-m-bar"><span className="prf-m-fill prf-m-fill--a" /></span>
            </div>
            <div className="prf-m-row">
              <span className="prf-m-dot prf-m-dot--ink" />
              <span className="prf-m-label">المهارة</span>
              <span className="prf-m-bar"><span className="prf-m-fill prf-m-fill--b" /></span>
            </div>
            <div className="prf-m-row">
              <span className="prf-m-dot" />
              <span className="prf-m-label">التطبيق</span>
              <span className="prf-m-bar"><span className="prf-m-fill prf-m-fill--c" /></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductFrame({
  capture,
  variant = 'std',
  ctaAr,
  ctaTo,
  ctaAnchor = false,
  viewTag,
}: ProductFrameProps) {
  const widths = capture.widths;
  const w = widths[widths.length - 1] ?? widths[0] ?? 720;
  const h = Math.round((w * 800) / 1280); // captures are 1280×800

  return (
    <figure className={['prf', `prf--${variant}`].join(' ')}>
      <div className="prf-stage">
        <div className="prf-photo">
          <img
            src={`/media/product/${capture.id}-${widths[0]}.webp`}
            srcSet={productSrcset(capture.id, widths)}
            sizes={capture.sizes}
            width={w}
            height={h}
            alt={capture.altAr}
            loading="lazy"
            decoding="async"
          />
        </div>
        <ProductMockCards variant={variant} />
        {viewTag && (
          <span className="prf-viewtag" dir="ltr" aria-hidden="true">
            {viewTag}
          </span>
        )}
      </div>
      <figcaption className="prf-caption">
        <span className="prf-caption-tag fo-mono" dir="ltr">
          real-ui
        </span>
        <span className="prf-caption-body">
          <span className="prf-caption-title">{capture.titleAr}</span>
          <span className="prf-caption-line">{capture.captionAr}</span>
        </span>
        <span className="prf-caption-demo">بيانات العرض التجريبية</span>
        {ctaAr && ctaTo && !ctaAnchor && (
          <Link to={ctaTo} className="prf-cta fo-text-link">
            {ctaAr}
            <Icon icon={ArrowLeft} size={13} />
          </Link>
        )}
        {ctaAr && ctaTo && ctaAnchor && (
          <a href={ctaTo} className="prf-cta fo-text-link">
            {ctaAr}
            <Icon icon={ArrowLeft} size={13} />
          </a>
        )}
      </figcaption>
    </figure>
  );
}
