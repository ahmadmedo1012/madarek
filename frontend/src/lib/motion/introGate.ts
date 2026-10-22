/**
 * introGate — R308 — the pure loader-gating logic, extracted for
 * honest testing (no DOM inside the decision).
 *
 * The entrance plays ONCE per session, only when motion is allowed,
 * only in a real visual environment. Everything else — internal
 * navigation, returning to the homepage within the session, reduced
 * motion, non-visual test runners — gets the complete page instantly.
 */

export const INTRO_SEEN_KEY = 'madarek-intro-seen';

export interface SessionLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Should the entrance sequence play for this visitor? */
export function shouldPlayIntro(
  session: SessionLike | null,
  prefersReducedMotion: boolean,
): boolean {
  if (prefersReducedMotion) return false;
  if (!session) return false; /* non-visual environments get the page */
  try {
    return session.getItem(INTRO_SEEN_KEY) !== '1';
  } catch {
    /* storage can throw (privacy modes) — degrade to no intro */
    return false;
  }
}

/** Record that this session has seen the entrance. */
export function markIntroSeen(session: SessionLike | null = null): void {
  const store = session ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
  if (!store) return;
  try {
    store.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* best effort only */
  }
}
