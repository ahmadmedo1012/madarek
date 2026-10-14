/**
 * Backend unit test — the pure guard layer of
 * `backend/src/http/routes/files.routes.ts` (audit 15-i TOP-6, wave 16-B11).
 *
 * GET /papers/:filename is the platform's only file-serving endpoint and
 * defends against path traversal in layers, all extracted as pure
 * functions and pinned here:
 *  · shape gate — traversal substrings (`..` / `/` / `\`) plus the
 *    `.pdf` extension (containsTraversalPatterns / isPdfFilename,
 *    aggregated by isSafePaperFilename);
 *  · role gate — oversight roles (ADMIN/OWNER/QUALITY) bypass the
 *    paper-row lookup everyone else must pass (isPaperOversightRole);
 *  · directory pin — the resolved path must sit directly inside
 *    <storage>/papers (isWithinPapersDir), compared against
 *    expectedDir + path.sep so sibling directories like
 *    storage/papers-evil/ can never slip through a bare startsWith.
 *
 * The DB access gate (fileUrl → ResearchPaper row, audit 11-b P2-5's
 * findFirst-with-grant-predicate fix) and the fs probes need a
 * DB/runtime harness the project does not have — out of scope here.
 */
import path from 'node:path';
import { Role } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  containsTraversalPatterns,
  isPaperOversightRole,
  isPdfFilename,
  isSafePaperFilename,
  isWithinPapersDir,
} from '../../src/http/routes/files.routes';

describe('containsTraversalPatterns', () => {
  it('flags relative escape and path separators', () => {
    expect(containsTraversalPatterns('../secret.pdf')).toBe(true);
    expect(containsTraversalPatterns('..\\secret.pdf')).toBe(true);
    expect(containsTraversalPatterns('/etc/passwd.pdf')).toBe(true);
    expect(containsTraversalPatterns('reports/report.pdf')).toBe(true);
    expect(containsTraversalPatterns('..')).toBe(true);
  });

  it('passes plain names and encoded traversal — this gate never decodes', () => {
    expect(containsTraversalPatterns('final-report.pdf')).toBe(false);
    // %2e%2e is NOT decoded here: express decodes route params BEFORE
    // the handler runs, so a real encoded attack arrives as a literal
    // '..' and is caught above. Double-decoding would be the bug.
    expect(containsTraversalPatterns('paper%2e%2e.pdf')).toBe(false);
  });

  it('is deliberately over-broad — a benign double dot is rejected too', () => {
    // Documented safe-side false positive: rejecting my..notes.pdf
    // costs nothing; accepting a traversal costs a file.
    expect(containsTraversalPatterns('my..notes.pdf')).toBe(true);
  });
});

describe('isPdfFilename (extension gate)', () => {
  it('accepts .pdf case-insensitively', () => {
    expect(isPdfFilename('report.pdf')).toBe(true);
    expect(isPdfFilename('REPORT.PDF')).toBe(true);
    expect(isPdfFilename('Report.PdF')).toBe(true);
  });

  it('rejects other extensions, bare names, and empty strings', () => {
    expect(isPdfFilename('report.pdf.exe')).toBe(false);
    expect(isPdfFilename('report.docx')).toBe(false);
    expect(isPdfFilename('report')).toBe(false);
    expect(isPdfFilename('pdf')).toBe(false);
    expect(isPdfFilename('')).toBe(false);
  });

  it('accepts the hidden-file edge `.pdf` (dir pin + DB gate still apply)', () => {
    expect(isPdfFilename('.pdf')).toBe(true);
  });
});

describe('isSafePaperFilename (aggregate gate)', () => {
  it('passes a plain name and an uppercase extension', () => {
    expect(isSafePaperFilename('paper-abc123.pdf')).toBe(true);
    expect(isSafePaperFilename('PAPER.PDF')).toBe(true);
  });

  it('rejects traversal, separators, and non-pdf names', () => {
    expect(isSafePaperFilename('../paper.pdf')).toBe(false);
    expect(isSafePaperFilename('a/b.pdf')).toBe(false);
    expect(isSafePaperFilename('a\\b.pdf')).toBe(false);
    expect(isSafePaperFilename('paper.txt')).toBe(false);
    expect(isSafePaperFilename('')).toBe(false);
  });

  it('treats the literal encoded traversal as safe input (framework decodes upstream)', () => {
    // The gate sees the DECODED param: a request for /papers/%2e%2e%2fx.pdf
    // reaches it as '../x.pdf' (rejected by the traversal gate). The
    // literal encoded string contains no traversal shape — pin that the
    // function does not decode anything itself.
    expect(isSafePaperFilename('%2e%2e%2fx.pdf')).toBe(true);
  });
});

describe('isPaperOversightRole (role gate)', () => {
  it('bypasses the paper-row lookup for oversight roles only', () => {
    expect(isPaperOversightRole(Role.ADMIN)).toBe(true);
    expect(isPaperOversightRole(Role.OWNER)).toBe(true);
    // QUALITY mirrors the paper-annotation route's oversight model
    // (audit 11-b P2-5): a role that audits annotations can fetch the
    // artifact it audits.
    expect(isPaperOversightRole(Role.QUALITY)).toBe(true);
  });

  it('requires the DB access gate for the working roles', () => {
    expect(isPaperOversightRole(Role.STUDENT)).toBe(false);
    expect(isPaperOversightRole(Role.TEACHER)).toBe(false);
  });
});

describe('isWithinPapersDir (directory pin)', () => {
  const root = path.resolve('/srv/madarek/storage');
  const papersDir = path.join(root, 'papers');

  it('accepts a file directly inside papers/', () => {
    expect(isWithinPapersDir(path.join(papersDir, 'a.pdf'), root)).toBe(true);
  });

  it('rejects sibling directories — the bare-startsWith bug, pinned', () => {
    // storage/papers-evil/x.pdf must NOT pass: the pin compares against
    // <root>/papers + separator, so a directory that merely shares the
    // "papers" prefix fails. The route already did this right; the test
    // keeps it that way.
    expect(isWithinPapersDir(path.join(root, 'papers-evil', 'x.pdf'), root)).toBe(false);
    expect(isWithinPapersDir(path.join(root, 'papers-backup', 'x.pdf'), root)).toBe(false);
  });

  it('rejects the papers directory itself and anything outside it', () => {
    // No trailing child segment → no separator → not "inside".
    expect(isWithinPapersDir(papersDir, root)).toBe(false);
    expect(isWithinPapersDir(path.join(root, 'assignments', 'a.pdf'), root)).toBe(false);
    expect(isWithinPapersDir(path.resolve('/srv/elsewhere/papers', 'a.pdf'), root)).toBe(false);
  });

  it('judges the literal string — callers must pass resolved paths', () => {
    // The route always passes path.resolve() output. An un-normalized
    // '..' segment that WOULD resolve inside papers fails the literal
    // prefix check — conservative, never permissive.
    const unresolved = `${root}${path.sep}..${path.sep}storage${path.sep}papers${path.sep}a.pdf`;
    expect(isWithinPapersDir(unresolved, root)).toBe(false);
  });
});

/* ─── r164f — the orphan-404 honesty pin ──────────────────────────
 * Both gate layers (row lookup + storage stat/read) refuse a missing
 * file with ONE wording: «الملف غير موجود». It is deliberately
 * identical for "no authorizing row" and "bytes absent" (existence
 * must not leak) while staying distinct from auth refusals (401
 * UNAUTHENTICATED) and shape refusals (400 «اسم الملف غير صالح»).
 * The frontend viewer classifies pdf.js's 404 mapping onto the same
 * wording (components/pdf/loadError.ts) — this pin keeps both sides
 * of that contract from drifting apart. */
describe('FILE_NOT_FOUND_MESSAGE (r164f honesty pin)', () => {
  it('is the exact Arabic missing-file refusal both gate layers throw', async () => {
    const { FILE_NOT_FOUND_MESSAGE } = await import('../../src/http/routes/files.routes');
    expect(FILE_NOT_FOUND_MESSAGE).toBe('الملف غير موجود');
    // Arabic user copy (D17-3), non-empty, single line.
    expect(FILE_NOT_FOUND_MESSAGE).toMatch(/[\u0600-\u06FF]/);
    expect(FILE_NOT_FOUND_MESSAGE).not.toContain('\n');
  });

  it('is NOT an auth or shape refusal — the three wordings stay disjoint', async () => {
    const { FILE_NOT_FOUND_MESSAGE } = await import('../../src/http/routes/files.routes');
    // Auth (authMiddleware 401s: TOKEN_EXPIRED / unauthenticated) and
    // traversal (this route's own 400) wordings, mirrored from their
    // owning modules for the disjointness pin only.
    const authWordingExpired = 'انتهت صلاحية الجلسة — سجّل الدخول من جديد';
    const authWordingInvalid = 'جلسة غير صالحة — سجّل الدخول من جديد';
    const shapeWording = 'اسم الملف غير صالح';
    expect(FILE_NOT_FOUND_MESSAGE).not.toBe(authWordingExpired);
    expect(FILE_NOT_FOUND_MESSAGE).not.toBe(authWordingInvalid);
    expect(FILE_NOT_FOUND_MESSAGE).not.toBe(shapeWording);
    expect(FILE_NOT_FOUND_MESSAGE).not.toContain('صلاحية');
    expect(FILE_NOT_FOUND_MESSAGE).not.toContain('جلسة');
  });
});
