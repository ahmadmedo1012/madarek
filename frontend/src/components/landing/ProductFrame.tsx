/**
 * ProductFrame — the R307 sanctioned pattern for REAL product captures
 * on the landing sheet (DESIGN.md §6c, r307).
 *
 * A flat hairline frame around an authentic capture of the running
 * application (seeded demo environment — fully synthetic «جامعة مدارك
 * التجريبية» data). Every frame carries:
 *   · the mono type tag «لقطة حقيقية» + the demo-data disclosure —
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

export interface ProductFrameProps {
  capture: ProductCapture;
  variant?: 'lead' | 'std' | 'role';
  ctaAr?: string;
  ctaTo?: string;
  ctaAnchor?: boolean;
}

function productSrcset(id: string, widths: number[]): string {
  return widths.map((w) => `/media/product/${id}-${w}.webp ${w}w`).join(', ');
}

export function ProductFrame({
  capture,
  variant = 'std',
  ctaAr,
  ctaTo,
  ctaAnchor = false,
}: ProductFrameProps) {
  const widths = capture.widths;
  const w = widths[widths.length - 1] ?? widths[0] ?? 720;
  const h = Math.round((w * 800) / 1280); // captures are 1280×800

  return (
    <figure className={['prf', `prf--${variant}`].join(' ')}>
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
