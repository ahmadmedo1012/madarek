/**
 * useBottomStackLayer — Y6 (R325) — the React binding for
 * lib/bottomStack.ts (the bottom-stack manager).
 *
 * Returns a CALLBACK REF: spread it onto the layer's root element and
 * the manager tracks it for its whole mounted life —
 *
 *   const stackRef = useBottomStackLayer('toast');
 *   <div ref={stackRef} className="toast-stack" …>
 *
 * Why a callback ref (not an effect + object ref): a layer can vanish
 * WITHOUT unmounting its component — the consent gate renders `null`
 * the moment the visitor answers, so the object ref would keep the
 * detached node registered. React calls a callback ref with `null` on
 * unmount, which flows through state here and re-runs the effect, so
 * register/unregister stay in lockstep with what is actually on screen
 * (StrictMode's double-invoked mount is absorbed by the manager's
 * idempotent register). Height changes (toasts entering, the consent
 * bar expanding) need no re-render: the manager's ResizeObserver owns
 * the measurement.
 */
import { useEffect, useState } from 'react';
import {
  registerBottomLayer,
  unregisterBottomLayer,
  type BottomStackLayerId,
} from '../lib/bottomStack';

export function useBottomStackLayer(id: BottomStackLayerId) {
  const [el, setEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    registerBottomLayer(id, el);
    return () => unregisterBottomLayer(id);
  }, [id, el]);

  return setEl;
}
