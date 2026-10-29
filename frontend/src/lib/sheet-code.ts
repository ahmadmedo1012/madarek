/**
 * sheet-code — r324 X10 residue.
 *
 * The R319/R320 «drawing-sheet» mono identity lines (`SHEET S-01 ·
 * STUDENT` on page headers, `[MDRK-AUTH] · SHEET 01/01` on the auth
 * doors, `MADAREK · LEGAL SHEET · [L-01]` on the public sheets,
 * `[SHEET · FIELD 06]`, `SHEET 05 · SCALE 1:100`, the error pages'
 * `ERR [nnn]` + `[0,0] · …` coordinates) are RETIRED — coordinates,
 * scale and revision tags are not content, and the owner's red team
 * reads them as debug jargon. The PageHeader families, the AppShell
 * provider, the auth doors and the public sheets all dropped their
 * lines; the role's name and the page's own Arabic headings carry the
 * identity now.
 *
 * What remains is the PUBLIC-SHEET key type the nine public document
 * pages pass to <LegalSheet code=…> for route legibility.
 */

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
