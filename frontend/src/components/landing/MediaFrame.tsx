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

export interface MediaFrameProps {
  photo: UniversityPhoto;
  /** semantic slot class suffix, e.g. 'hero-lead' → .mf--hero-lead */
  variant?: string;
  /** eager + high fetch priority for the LCP candidate only */
  eager?: boolean;
  /** aspect-ratio fallback box (uses the source intrinsic ratio) */
  className?: string;
}

export function MediaFrame({ photo, variant, eager = false, className }: MediaFrameProps) {
  const widths = photo.widths;
  const w = widths[widths.length - 1] ?? widths[0] ?? 480;
  // Intrinsic box at the LARGEST derivative width; aspect ratio from the
  // source rendition — the box reserves exact space at every responsive
  // width (no layout shift while the bytes arrive).
  const heightAt = (width: number): number => Math.round(width / photo.ratio);

  return (
    <figure
      className={['mf', variant ? `mf--${variant}` : null, className].filter(Boolean).join(' ')}
    >
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
      </a>
      <figcaption className="mf-caption">
        <span className="mf-caption-name">{photo.nameAr}</span>
        <span className="mf-caption-institution">{photo.institution}</span>
        <span className="mf-caption-credit fo-mono" dir="ltr">
          {photo.author} ·{' '}
          <a href={photo.licenseUrl} target="_blank" rel="noreferrer license">
            {photo.license}
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
