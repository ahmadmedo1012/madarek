/**
 * useOverlayRegistration — stack membership for overlay primitives
 * (audit 11-e P1-2; see lib/overlayStack.ts for the contract).
 *
 * Registers the overlay in the global stack while `open` and removes it
 * on close/unmount, so Escape coordination always ranks the actually
 * open layers. The returned id is stable per component instance and is
 * what the overlay's Escape handler checks via `overlayStack.isTop`.
 */
import { useEffect, useId } from 'react';
import { overlayStack } from '../../lib/overlayStack';

export function useOverlayRegistration(open: boolean, kind: string): string {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    overlayStack.register(id, kind);
    return () => overlayStack.unregister(id);
  }, [open, id, kind]);
  return id;
}
