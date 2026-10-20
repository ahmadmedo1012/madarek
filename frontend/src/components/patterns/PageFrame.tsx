import type { ReactNode } from 'react';

/**
 * PageFrame — عرض الصفحة والإيقاع الرأسي (عقد Agent S — r210).
 *
 * Column-width + vertical-rhythm wrapper. `.content-inner` (base.css)
 * already owns the outer gutters and the app's max width, so PageFrame
 * only NARROWS the column (`margin-inline: auto`) and spaces the page's
 * direct children (`--sp-6` desktop / `--sp-5` mobile). Never add
 * inline padding here — the gutters live in one place.
 *
 *   <PageFrame width="reading">…</PageFrame>
 *   ─────────────────────────────────
 *   <div class="pf-page" data-width="reading">…</div>
 */
export type PageFrameWidth = 'reading' | 'default' | 'wide' | 'full';

export function PageFrame({
  width = 'default',
  children,
}: {
  /** reading 760px · default 1080px · wide 1320px · full = whatever .content-inner allows. */
  width?: PageFrameWidth;
  children: ReactNode;
}) {
  return (
    <div className="pf-page" data-width={width}>
      {children}
    </div>
  );
}
