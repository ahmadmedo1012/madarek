/**
 * motion-media.ts — the shared media-query literals (R337 bundle
 * diet). Ten call sites carried '(prefers-reduced-motion: reduce)'
 * verbatim; one constant stops every chunk paying it twice. Plain
 * module (no React) so no hook runtime rides along.
 */
export const PREFERS_REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
