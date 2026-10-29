/**
 * index.ts — the R323 brand system's single public surface.
 *
 * Exports EXACTLY the R323 contract (the parallel work packages code
 * against this module):
 *
 *   export type LogoVariant = 'lockup' | 'mark' | 'wordmark' | 'stacked';
 *   export type LogoTone = 'auto' | 'ink' | 'paper' | 'orange';
 *   export function Logo(props: {
 *     variant?: LogoVariant;   // default 'lockup' (RTL: mark right, wordmark left)
 *     size?: number;           // mark height in px; lockup scales from it
 *     tone?: LogoTone;         // 'auto' = currentColor + var(--accent)
 *     className?: string;
 *     animated?: boolean;      // stroke-draw 600–900 ms, orange point LAST
 *   }): React.JSX.Element;
 *
 * Implementation lives in ./Logo (JSX needs .tsx); everything else —
 * mark geometry, lockup composition, generated wordmark sheets — is
 * internal to frontend/src/brand.
 */
export type { LogoVariant, LogoTone } from './Logo';
export { Logo } from './Logo';
