import { createContext, useContext } from 'react';
import type { AppRole } from '../stores/auth.store';

/**
 * sheet-code — the authenticated sheet's mono identity line (R319 · C2-G2).
 *
 * The Heron drawing-sheet grammar opens every sheet with a mono
 * registration line (`[MDRK-AUTH] · SHEET 01/01` on the auth door —
 * auth.css §3). The authenticated shell joins the same register: each
 * ROLE is its own numbered sheet in the product's drawing set, so
 * every page's header can carry `S-01 · STUDENT` without any page
 * declaring it.
 *
 * · `sheetCodeForRole(role)` — the pure map (STUDENT→`S-01 · STUDENT`,
 *   TEACHER→`T-01 · TEACHER`, ADMIN→`A-01 · ADMIN`,
 *   QUALITY→`Q-01 · QUALITY`, OWNER→`O-01 · OWNER`). Latin mono runs,
 *   dir=ltr, tabular digits — the drafting-instrument voice.
 * · `SheetCodeContext` — AppShell is the ONE provider (it already
 *   owns the authed role); both PageHeader families consume it when
 *   their `sheetCode` prop is absent, so the code lands on every page
 *   for free and a page can still override (or pass '' to opt out).
 *
 * Lives in lib/ (not nav.ts) so the shell primitives never depend on
 * the nav graph; nav.ts is a shared fleet file with other owners.
 */

const SHEET_CODES: Record<AppRole, string> = {
  STUDENT: 'S-01 · STUDENT',
  TEACHER: 'T-01 · TEACHER',
  ADMIN: 'A-01 · ADMIN',
  QUALITY: 'Q-01 · QUALITY',
  OWNER: 'O-01 · OWNER',
};

export function sheetCodeForRole(role: AppRole): string {
  return SHEET_CODES[role];
}

/* ═══ R320 §D — the PUBLIC sheet codes (c2-LEGAL) ════════════════════
 *
 * The nine public document sheets (six /legal/* policies + /about ·
 * /help · /contact) join the drawing-set register: each page's corner
 * mono line derives its bracketed code from THIS map — one source, so
 * the header, the unit belt and the footer row can never drift apart.
 * Family prefixes ride the /capabilities precedent (`MADAREK · LEDGER
 * SHEET · [C-02]`): L-nn for the policy sheets, C-nn for the public
 * sheets. The label half of each corner line lives beside the pages
 * (pages/legal/LegalSheet.tsx) — the code is the shared identity, the
 * family word is each page's own voice. */
export const PUBLIC_SHEET_CODES = {
  privacy: 'L-01',
  terms: 'L-02',
  cookies: 'L-03',
  accessibility: 'L-04',
  security: 'L-05',
  data: 'L-06',
  contact: 'C-03',
  about: 'C-04',
  help: 'C-05',
} as const;

export type PublicSheetKey = keyof typeof PUBLIC_SHEET_CODES;

/**
 * The ambient sheet code for the mounted shell. `undefined` = no shell
 * (guest surfaces, unit tests) → headers render no code line.
 */
export const SheetCodeContext = createContext<string | undefined>(undefined);

export function useSheetCode(): string | undefined {
  return useContext(SheetCodeContext);
}
