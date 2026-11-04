/* P2-0 (r335 split) — [1] HERO. The Heron-mechanics rebuild already
 * lives in its own folder (R331 · A-Web-Hero — components/landing/hero/
 * Hero.tsx, which rides styles/landing/hero-mechanics.css and the
 * r331 motion program of docs/redesign/r331/heron-program.md §4), so
 * this seat re-exports it: the page composer (pages/LandingPage.tsx)
 * mounts every section from landing/sections/, the guest surface's
 * file set stays enumerable in one directory, and the Phase-2 hero
 * agent owns this seat (and, through it, the hero folder's contract)
 * without a second hero tree. NO behaviour or DOM change — the same
 * component, one indirection. */
export { Hero } from '../hero/Hero';
