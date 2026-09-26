import { useEffect, useState } from 'react';

/**
 * GridOverlay — design QA tool (docs/immersive-redesign-plan.md §8.7).
 *
 * Adds `?grid=1` to any URL to overlay the 12-column layout grid with
 * tokens-driven guides (RTL-native: the overlay container inherits
 * direction, columns flow right→left automatically). Zero cost when
 * the flag is absent — nothing mounts, nothing listens.
 *
 * Toggle is sticky per session (sessionStorage) so navigating between
 * pages keeps the grid up during a design review. Removed entirely
 * from production bundles is NOT possible for a runtime flag, but the
 * mounted cost is one passive listener + a fixed overlay div; the
 * component renders null until the flag is seen.
 */
const FLAG = 'madarek.grid';

function readFlag(): boolean {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('grid') === '1' || sessionStorage.getItem(FLAG) === '1';
  } catch {
    return false;
  }
}

export function GridOverlay(): JSX.Element | null {
  const [on, setOn] = useState<boolean>(() =>
    typeof window === 'undefined' ? false : readFlag(),
  );

  useEffect(() => {
    if (!on) return;
    try {
      sessionStorage.setItem(FLAG, '1');
    } catch {
      /* private mode — flag lives only for this page view */
    }
    // Escape hatch: press "g" to drop the overlay without editing the URL.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G' || e.key === 'ج') {
        setOn(false);
        try {
          sessionStorage.removeItem(FLAG);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [on]);

  if (!on || typeof document === 'undefined') return null;

  return (
    <div className="grid-overlay" aria-hidden="true">
      <div className="grid-overlay-columns">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="grid-overlay-col" />
        ))}
      </div>
      <div className="grid-overlay-baseline">
        {Array.from({ length: 200 }, (_, i) => (
          <span key={i} className="grid-overlay-rowline" />
        ))}
      </div>
      <span className="grid-overlay-hint">
        شبكة ١٢ عمودًا · لإخفائها اضغط G
      </span>
    </div>
  );
}
