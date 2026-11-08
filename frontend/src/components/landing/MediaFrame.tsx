/**
 * MediaFrame — the R307 sanctioned pattern for documentary university
 * photography on the landing sheet (DESIGN.md §6a, r307).
 *
 * A flat, hairline-framed figure in the drawing-sheet grammar: no
 * elevation, no chrome, radius 0→2 (`--r-xs`), 1px `--border` frame.
 * The caption bar carries the institution (Arabic) + a mono license
 * micro-row (author · license deed link) — attribution is part of the
 * composition, never an afterthought.
 *
 * Image engineering (Phase 4.5): explicit intrinsic dimensions on
 * every render (CLS=0 by construction), responsive srcset from the
 * manifest derivative widths, deliberate object-position per photo
 * (mobile crops keep the subject), lazy by default — the caller opts
 * the above-fold hero lead into eager + fetchpriority.
 */
import { type UniversityPhoto, mediaSrcset } from '../../data/university-media';
import { cardById } from '@shared/media/university-cards';
import { UniversityCard } from '../media/UniversityCard';

export interface MediaFrameProps {
  photo: UniversityPhoto;
  /** semantic slot class suffix, e.g. 'hero-lead' → .mf--hero-lead */
  variant?: string;
  /** eager + high fetch priority for the LCP candidate only */
  eager?: boolean;
  /** aspect-ratio fallback box (uses the source intrinsic ratio) */
  className?: string;
  /** R308 — an optional overlay riding INSIDE the photo box (the ink
   *  sketch): covers the photograph only, never the caption row.
   *  R343 C-1: ignored on card seats (the card IS the drawing). */
  overlay?: React.ReactNode;
}

export function MediaFrame({ photo, variant, eager = false, className, overlay }: MediaFrameProps) {
  const widths = photo.widths;
  const w = widths[widths.length - 1] ?? widths[0] ?? 480;
  // Intrinsic box at the LARGEST derivative width; aspect ratio from the
  // source rendition — the box reserves exact space at every responsive
  // width (no layout shift while the bytes arrive).
  const heightAt = (width: number): number => Math.round(width / photo.ratio);

  /* R343 C-1 — the card seat: the retired Wikimedia photograph becomes
   * the ORIGINAL typographic/architectural card (shared geometry, inline
   * SVG, theme via the seat's tokens). No license deed (original art),
   * no srcset (vector), CLS-safe by the same intrinsic aspect box. */
  const card = cardById(photo.id);

  return (
    <figure
      className={['mf', variant ? `mf--${variant}` : null, className].filter(Boolean).join(' ')}
    >
      {card ? (
        <div className="mf-photo mf-photo--card" style={{ aspectRatio: `${photo.ratio}` }}>
          <UniversityCard id={photo.id} alt={photo.altAr} />
        </div>
      ) : (
        <a
          className="mf-photo"
          href={photo.licenseUrl}
          target="_blank"
          rel="noreferrer license"
          /* The photo links to its license deed — the caption row below
             carries the context; the link is a documented credit affordance. */
          aria-label={`${photo.nameAr} — رخصة ${photo.license}`}
        >
          <img
            src={`/media/universities/${photo.id}-${widths[0]}.webp`}
            srcSet={mediaSrcset(photo.id, widths)}
            sizes={photo.sizes}
            width={w}
            height={heightAt(w)}
            alt={photo.altAr}
            loading={eager ? 'eager' : 'lazy'}
            {...(eager ? ({ fetchpriority: 'high' } as never) : {})}
            decoding={eager ? 'sync' : 'async'}
            style={{ objectPosition: photo.objectPosition }}
          />
          {overlay}
        </a>
      )}
      <figcaption className="mf-caption">
        <span className="mf-caption-name">{photo.nameAr}</span>
        <span className="mf-caption-institution">{photo.institution}</span>
        {card ? (
          <span className="mf-caption-credit fo-mono" dir="ltr">MADAREK · ORIGINAL DRAWING</span>
        ) : (
          <span className="mf-caption-credit fo-mono" dir="ltr">
            {photo.author} ·{' '}
            <a href={photo.licenseUrl} target="_blank" rel="noreferrer license">
              {photo.license}
            </a>
          </span>
        )}
      </figcaption>
    </figure>
  );
}
