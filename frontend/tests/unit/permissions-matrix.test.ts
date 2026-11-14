/**
 * permissions-matrix.test.ts — R353 E3: the matrix contract tests.
 *
 * 1. Seat validity: every seat named in the table is a real seat
 *    (MATRIX_SEATS) — no invented identifiers.
 * 2. Overlap detector: no two seats share an IDENTICAL permission set
 *    (same set of resource+action rows) without a documented reason on
 *    every row where the twins both appear. The exact-Libyan-roles
 *    requirement (the owner's #3) means two seats that can do exactly
 *    the same things are ONE seat with two names.
 * 3. Doc sync: docs/PERMISSIONS.md carries the current rule count and
 *    every seat label (regenerate with gen-permissions-doc.mjs).
 *
 * The table is parsed from source (the same regex discipline as the
 * roleLabels belt tests) so the backend never enters the runner's
 * module graph.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const matrixSrc = readFileSync(path.join(repoRoot, 'shared', 'permissions-matrix.ts'), 'utf8');
const docSrc = readFileSync(path.join(repoRoot, 'docs', 'PERMISSIONS.md'), 'utf8');

interface Row { resource: string; action: string; seats: string[]; note: string | null }

function parseRows(source: string): Row[] {
  const rows: Row[] = [];
  const arrayBody = source.match(/export const PERMISSIONS_MATRIX[^=]*=\s*\[([\s\S]*?)\n\]\s*as const;/)?.[1] ?? '';
  const rowRe = /\{\s*resource:\s*'([^']*)',\s*resourceAr:\s*'([^']*)',\s*action:\s*'([^']*)',\s*seats:\s*\[([^\]]*)\],\s*scope:\s*'([^']*)'(?:,\s*note:\s*'((?:[^'\\]|\\.)*)')?\s*\}/g;
  for (const m of arrayBody.matchAll(rowRe)) {
    rows.push({
      resource: m[1]!,
      action: m[3]!,
      seats: [...m[4]!.matchAll(/'([^']*)'/g)].map((x) => x[1]!),
      note: m[6] ? m[6].replace(/\\'/g, "'") : null,
    });
  }
  return rows;
}

function parseSeatList(source: string): string[] {
  const body = source.match(/export const MATRIX_SEATS[^=]*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1] ?? '';
  return [...body.matchAll(/'([^']*)'/g)].map((m) => m[1]!);
}

const rows = parseRows(matrixSrc);
const seats = parseSeatList(matrixSrc);

describe('R353 E3 — the permission matrix table', () => {
  it('parses (a broken table must fail loudly, not silently pass)', () => {
    expect(rows.length).toBeGreaterThanOrEqual(20);
    expect(seats.length).toBe(10);
  });

  it('every seat named in a row is a declared seat', () => {
    const declared = new Set(seats);
    for (const r of rows) {
      for (const s of r.seats) {
        expect(declared.has(s), `unknown seat «${s}» on ${r.resource}/${r.action}`).toBe(true);
      }
    }
  });

  it('every row carries at least one seat or an explicit by-design note', () => {
    for (const r of rows) {
      if (r.seats.length === 0) {
        expect(r.note, `${r.resource}/${r.action} allows nobody but carries no note`).toBeTruthy();
      }
    }
  });

  it('the overlap detector: no two seats are permission-identical without a documented reason', () => {
    // The seat → set of "resource:action" keys it may perform.
    const sets = new Map<string, Set<string>>();
    for (const r of rows) {
      for (const s of r.seats) {
        if (!sets.has(s)) sets.set(s, new Set());
        sets.get(s)!.add(`${r.resource}:${r.action}`);
      }
    }
    const seatKeys = [...sets.keys()];
    const documentedIdentical: Array<[string, string]> = [];
    for (let i = 0; i < seatKeys.length; i++) {
      for (let j = i + 1; j < seatKeys.length; j++) {
        const a = seatKeys[i]!;
        const b = seatKeys[j]!;
        const sa = sets.get(a)!;
        const sb = sets.get(b)!;
        if (sa.size !== sb.size) continue;
        let same = true;
        for (const k of sa) if (!sb.has(k)) { same = false; break; }
        if (!same) continue;
        // Identical sets: allowed ONLY when documented (per-row notes OR
        // the explicit SEAT_EQUIVALENCE_NOTES table).
        const sharedRows = rows.filter((r) => r.seats.includes(a) && r.seats.includes(b));
        const allDocumented = sharedRows.every((r) => Boolean(r.note));
        const equivalenceDoc = readFileSync(path.join(repoRoot, 'shared', 'permissions-matrix.ts'), 'utf8')
          .match(/export const SEAT_EQUIVALENCE_NOTES[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '';
        const pairDocumented =
          equivalenceDoc.includes(`'${a}≡${b}'`) || equivalenceDoc.includes(`'${b}≡${a}'`);
        if (allDocumented || pairDocumented) documentedIdentical.push([a, b]);
        else {
          expect(
            `${a} ≡ ${b}`,
            `two seats with IDENTICAL permissions and no documented reason: ${a} and ${b} — merge them or document the difference`,
          ).toBe('documented');
        }
      }
    }
    // Identical-but-documented twins are legal (they differ on data
    // planes the matrix cannot see, e.g. the +fac guard).
    expect(documentedIdentical.length).toBeLessThanOrEqual(seatKeys.length);
  });

  it('exams moderation belongs to the exams office, NOT the quality office', () => {
    const row = rows.find((r) => r.resource === 'exam-moderation');
    expect(row, 'the exam-moderation row exists').toBeTruthy();
    expect(row!.seats).toContain('QUALITY+EXAMS_CONTROLLER');
    expect(row!.seats).not.toContain('QUALITY+QUALITY_OFFICER');
  });

  it('the registrar never grades; the teacher never imports user files', () => {
    const gradeRows = rows.filter((r) => r.action === 'grade');
    for (const g of gradeRows) {
      expect(g.seats, `${g.resource} grading`).not.toContain('ADMIN+REGISTRAR_GENERAL');
      expect(g.seats, `${g.resource} grading`).not.toContain('ADMIN+COLLEGE_REGISTRAR');
    }
    const bulk = rows.find((r) => r.resource === 'bulk-import');
    expect(bulk!.seats).not.toContain('TEACHER');
  });

  it('docs/PERMISSIONS.md is in sync with the table (regenerate if this fails)', () => {
    expect(docSrc).toContain(`(${rows.length} rules)`);
    for (const label of ['المسجل العام', 'مسجل الكلية', 'مراقب الامتحانات', 'موظف الجودة']) {
      expect(docSrc).toContain(label);
    }
  });
});
