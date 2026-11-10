/**
 * MediaFrame — the R307 sanctioned pattern for the documentary university
 * register on the landing sheet (DESIGN.md §6a, r307).
 *
 * A flat, hairline-framed figure in the drawing-sheet grammar: no
 * elevation, no chrome, radius 0→2 (`--r-xs`), 1px `--border` frame.
 * The caption bar carries the institution (Arabic) + a mono ORIGINAL
 * DRAWING micro-row — provenance is part of the composition.
 *
 * R345 F — the register is CARDS-ONLY: every documented university seat
 * renders its ORIGINAL typographic/architectural card (the R343 C-1
 * system, shared geometry, inline SVG, theme via the seat's tokens).
 * The retired Wikimedia photograph derivatives (`/media/universities/
 * *-800.webp`, the mobile-only renditions) are deleted — no `<img>`
 * fallback branch, no srcset, no license deed (original art). An id
 * without a card is a registry error and renders nothing (the r307
 * test holds the manifest ↔ registry parity).
 */
import { type UniversityPhoto } from '../../data/university-media';
import { cardById } from '@shared/media/university-cards';
import { UniversityCard } from '../illustrations/UniversityCard';

export interface MediaFrameProps {
  photo: UniversityPhoto;
  /** semantic slot class suffix, e.g. 'hero-lead' → .mf--hero-lead */
  variant?: string;
  /** reserved (the card is vector — no bytes to prioritize) */
  eager?: boolean;
  /** aspect-ratio fallback box (uses the source intrinsic ratio) */
  className?: string;
  /** R308 — an optional overlay; R343 C-1: ignored on card seats (the
   *  card IS the drawing). */
  overlay?: React.ReactNode;
}

export function MediaFrame({ photo, variant, className }: MediaFrameProps) {
  const card = cardById(photo.id);
  if (!card) return null;

  return (
    <figure
      className={['mf', variant ? `mf--${variant}` : null, className].filter(Boolean).join(' ')}
    >
      <div className="mf-photo mf-photo--card" style={{ aspectRatio: `${photo.ratio}` }}>
        <UniversityCard id={photo.id} alt={photo.altAr} />
      </div>
      <figcaption className="mf-caption">
        <span className="mf-caption-name">{photo.nameAr}</span>
        <span className="mf-caption-institution">{photo.institution}</span>
        <span className="mf-caption-credit fo-mono" dir="ltr">MADAREK · ORIGINAL DRAWING</span>
      </figcaption>
    </figure>
  );
}
