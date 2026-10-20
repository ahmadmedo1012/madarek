/**
 * mk-ill — Madarek state-graphics kit: the piece registry names.
 *
 * This kit is the r270+ state-illustration family for the redesign
 * (Superlist-era states): original two-colour scenes — ink + signal on
 * transparent, at most one soft tint per piece, gold reserved for the
 * achievement piece. It is INDEPENDENT of the legacy 012 scene system
 * (`frontend/src/lib/illustrations` + `components/Illustration.tsx`);
 * no name, type or module is shared with it, so both can coexist while
 * the integration agent (Agent Z) migrates call sites.
 *
 * Every name here maps 1:1 to a default-exported component in
 * `./pieces/<name>.tsx`, loaded lazily by the <Illustration> dispatcher
 * so unused pieces cost zero bytes in the consuming chunk.
 */
export const MK_ILLUSTRATION_NAMES = [
  'empty-list',
  'empty-search',
  'empty-notifications',
  'empty-library',
  'empty-research',
  'empty-courses',
  'empty-community',
  'error-generic',
  'offline',
  'forbidden',
  'not-found',
  'success-submitted',
  'exam-complete',
  'achievement',
  'welcome-first-run',
  'server-waking',
] as const;

export type MkIllustrationName = (typeof MK_ILLUSTRATION_NAMES)[number];
