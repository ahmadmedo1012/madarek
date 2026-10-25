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

/**
 * The ambient sheet code for the mounted shell. `undefined` = no shell
 * (guest surfaces, unit tests) → headers render no code line.
 */
export const SheetCodeContext = createContext<string | undefined>(undefined);

export function useSheetCode(): string | undefined {
  return useContext(SheetCodeContext);
}
