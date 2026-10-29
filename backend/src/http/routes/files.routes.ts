import path from 'node:path';
import express, { Router } from 'express';
import type { Request, Response } from 'express';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { AppError } from '../../lib/errors.js';
import { z } from 'zod';
import { logger } from '../../logger.js';
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';
import {
  buildStorageKey,
  generateStorageId,
  getStorage,
  isSafeVideoFilename,
  lectureFilenameToServingPath,
  paperFilenameToFileUrl,
  S3Driver,
} from '../../lib/storage.js';
import { MAX_PRESIGN_EXPIRES_SEC } from '../../lib/storage-presign.js';

const router = Router();

router.use(authMiddleware);

// ─── Pure guard layer (tests/modules/files-guard.test.ts) ──────────

/**
 * Traversal shape gate: `..` (relative escape) plus `/` and `\\`
 * (absolute or nested paths). Deliberately over-broad — a benign
 * `my..notes.pdf` is rejected too; for a file-serving endpoint the
 * safe side is the right side. NOTE on encoding: this gate sees the
 * DECODED param — express decodes route params before the handler
 * runs, so an encoded `%2e%2e` attack arrives here as a literal `..`
 * and is caught. The function never decodes anything itself
 * (double-decoding would be the bug).
 */
export function containsTraversalPatterns(filename: string): boolean {
  return filename.includes('..') || filename.includes('/') || filename.includes('\\');
}

/**
 * Control-character gate (r170c): ASCII C0 controls (0x00–0x1F) and DEL
 * (0x7F) never appear in a filename this platform serves — ids are
 * cuid-shaped server-side. The NUL byte is the security-relevant one:
 * `"\x00.pdf"` sails through every existing shape gate (it ends with
 * `.pdf`, has no traversal pattern), then detonates BOTH downstream
 * layers — Postgres rejects the byte inside the access-check query
 * (error 22021, invalid UTF-8) for non-oversight roles, and Node's fs
 * APIs reject null-byte paths (ERR_INVALID_ARG_VALUE) once the
 * oversight fast path reaches storage. Either way ANY authenticated
 * user could mint a 500 response (plus a fake HTTP_500 alert row) per
 * request — the exact class the error handler's client-reject mapping
 * exists to prevent. Rejected as a 400 shape error, like traversal.
 * Verified live on both namespaces and both gate paths (r170c probes).
 */
export function containsControlChars(filename: string): boolean {
  for (let i = 0; i < filename.length; i += 1) {
    const code = filename.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** The endpoint serves papers only — extension gate, case-insensitive. */
export function isPdfFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith('.pdf');
}

/** Aggregate filename gate: no traversal shape, no control characters, .pdf extension. */
export function isSafePaperFilename(filename: string): boolean {
  return !containsTraversalPatterns(filename) && !containsControlChars(filename) && isPdfFilename(filename);
}

/**
 * Role gate for the DB access check: oversight roles may fetch a
 * paper without a per-row grant (owner/reviewer). QUALITY mirrors the
 * paper-annotation route's oversight model (audit 11-b P2-5): a role
 * that can read annotations on any paper can also fetch the artifact
 * it audits. The same trio gates material serving — oversight is
 * role-shaped, not namespace-shaped.
 *
 * r179b (phase-5): "oversight" no longer means "skip the row lookup
 * entirely". ADMIN/QUALITY oversight is INSTITUTION-BOUND — their
 * serving gates require an authorizing row whose institution matches
 * the caller's verified context (see accessiblePaperWhere /
 * accessibleMaterialWhere). Only OWNER keeps the platform-wide fast
 * path (deliberate cross-institution oversight, per the shared
 * contract).
 */
export function isPaperOversightRole(role: Role): boolean {
  return role === Role.ADMIN || role === Role.OWNER || role === Role.QUALITY;
}

// ─── Institution gate (r179b — files + persistent-storage isolation) ──

/** Which institution rule a file byte-stream operation falls under. */
export type FileInstitutionGateDecision =
  | 'platform_wide'
  | 'context_required'
  | 'institution_scoped';

/**
 * Pure decision — which institution rule applies to a file operation?
 *  - OWNER → 'platform_wide': the ONE role allowed to oversee files
 *    across institutions (deliberate, per the shared contract — never
 *    an auto-selected institution).
 *  - any other role with NO verified context → 'context_required':
 *    fail closed with 403 INSTITUTION_CONTEXT_REQUIRED. The contract
 *    forbids falling back to an oldest/first membership, and a
 *    storage namespace is not institution-partitioned — without a
 *    context there is nothing to compare the authorizing row's
 *    institution against, so the bytes stay unread.
 *  - otherwise → 'institution_scoped': the authorizing row must live
 *    in the caller's VERIFIED institution (STUDENT/TEACHER via the
 *    per-row grant predicate, ADMIN/QUALITY via same-institution
 *    oversight).
 *
 * Pinned DB-free by tests/modules/files-institution-gate.test.ts.
 */
export function decideFileInstitutionGate(
  role: Role,
  callerInstitutionId: string | null,
): FileInstitutionGateDecision {
  if (role === Role.OWNER) return 'platform_wide';
  if (callerInstitutionId === null) return 'context_required';
  return 'institution_scoped';
}

/**
 * Resolve + verify the caller's institution context for a file
 * operation (the serving routes, the paper upload, and the
 * file-adjacent paper scan all share this gate).
 *
 * Returns the VERIFIED institution id for institutional roles, or
 * `null` for OWNER (platform-wide — callers skip the authorizing-row
 * check on that path). Throws:
 *  - 403 INSTITUTION_CONTEXT_INVALID when the token's `inst` claim is
 *    forged/stale/revoked (resolveCallerInstitutionScope re-verifies
 *    against the DB — the claim is never trusted alone);
 *  - 403 INSTITUTION_CONTEXT_REQUIRED when an institutional caller
 *    carries no context at all (decideFileInstitutionGate).
 */
export async function requireFileInstitutionScope(
  userId: string,
  role: Role,
  tokenInstitutionId: string | null | undefined,
): Promise<string | null> {
  const callerInstitutionId = await resolveCallerInstitutionScope(userId, tokenInstitutionId);
  const decision = decideFileInstitutionGate(role, callerInstitutionId);
  if (decision === 'context_required') {
    throw new AppError(
      'INSTITUTION_CONTEXT_REQUIRED',
      'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
      403,
    );
  }
  return decision === 'platform_wide' ? null : callerInstitutionId;
}

/**
 * The institution-aware grant predicate for serving a paper file
 * (r179b). The filename resolves through the ResearchPaper table with
 * the grant predicate INSIDE the query (findFirst stops at the first
 * row that both matches the filename AND grants access — a shared
 * filename can never push the authorizing row past a take window).
 *
 * Institution binding (phase 5): the paper row carries `institutionId`
 * directly (the membership context the paper was submitted under), and
 * EVERY branch — owner-student, reviewer, PUBLISHED archive, and
 * ADMIN/QUALITY oversight — is constrained to the caller's VERIFIED
 * institution. A published paper is readable cross-USER but never
 * cross-INSTITUTION.
 *
 * Exported for DB-free unit tests (tests/modules/files-institution-gate.test.ts).
 */
export function accessiblePaperWhere(
  filename: string,
  role: Role,
  userId: string,
  callerInstitutionId: string,
): Prisma.ResearchPaperWhereInput {
  return {
    fileUrl: { endsWith: `/${filename}` },
    institutionId: callerInstitutionId,
    ...(isPaperOversightRole(role)
      ? // ADMIN/QUALITY: same-institution oversight — the row check
        // carries no per-row grant, but the institution still binds.
        {}
      : {
          OR: [
            { status: 'PUBLISHED' },
            { studentId: userId },
            { reviewerId: userId },
          ],
        }),
  };
}

/**
 * The institution-aware grant predicate for serving a material file
 * (r179b). Material keeps the ownership chain (NO denormalized
 * institutionId column — frozen schema): Material → offering →
 * course → department → faculty → institution. The chain comparison
 * rides INSIDE the same findFirst, so a filename whose authorizing
 * row sits in another institution simply matches nothing → 404,
 * indistinguishable from a missing file (no existence oracle).
 *
 * Role rules: the offering's teacher, or an actively enrolled student
 * (status 'active' — dropped/completed never grant), or ADMIN/QUALITY
 * oversight of the SAME institution.
 *
 * Exported for DB-free unit tests (tests/modules/files-institution-gate.test.ts).
 */
export function accessibleMaterialWhere(
  filename: string,
  role: Role,
  userId: string,
  callerInstitutionId: string,
): Prisma.MaterialWhereInput {
  return {
    url: { endsWith: `/${filename}` },
    offering: {
      course: { department: { faculty: { institutionId: callerInstitutionId } } },
      ...(isPaperOversightRole(role)
        ? {} // ADMIN/QUALITY: same-institution oversight, no per-row grant.
        : {
            OR: [
              { teacherId: userId },
              { enrollments: { some: { studentId: userId, status: 'active' } } },
            ],
          }),
    },
  };
}

/**
 * Material upload institution gate (r179b): the offering a material
 * file is attached to must sit inside the caller's VERIFIED
 * institution for every non-OWNER uploader — ADMIN oversight is
 * institution-bound (an institution-B admin can no longer drop bytes
 * into an institution-A offering), and a TEACHER additionally passes
 * assertOfferingAccess's teaches-this-offering check at the call site.
 * OWNER keeps the platform-wide bypass (deliberate oversight).
 *
 * Throws 403 INSTITUTION_CONTEXT_REQUIRED (contextless), 404 for an
 * unknown offering (same wording as assertOfferingAccess), and 403
 * FORBIDDEN on a cross-institution offering.
 */
export async function assertOfferingInstitutionForUpload(
  offeringId: string,
  userId: string,
  role: Role,
  tokenInstitutionId: string | null | undefined,
): Promise<void> {
  const callerInstitutionId = await requireFileInstitutionScope(userId, role, tokenInstitutionId);
  if (callerInstitutionId === null) return; // OWNER — platform-wide.
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: {
      course: { select: { department: { select: { faculty: { select: { institutionId: true } } } } } },
    },
  });
  if (!offering) throw AppError.notFound('المقرر المطلوب غير موجود');
  if (offering.course.department.faculty.institutionId !== callerInstitutionId) {
    throw AppError.forbidden('لا تملك صلاحية الوصول إلى هذا المقرر');
  }
}

/**
 * Directory pin: the resolved file path must sit DIRECTLY inside
 * `<storageRoot>/papers`. Comparing against `expectedDir + path.sep`
 * (not a bare `startsWith(expectedDir)`) is what rejects sibling
 * directories like `storage/papers-evil/` — the classic prefix-check
 * bug. `resolved` must be a normalized absolute path: this function
 * does not normalize and judges the literal string, so an un-normalized
 * `..` segment fails conservatively.
 *
 * Since the storage abstraction landed, the live serving path no longer
 * builds local paths here — the pin is enforced one layer down (LocalDriver
 * resolves `<root>/<namespace>/<filename>` and rejects anything outside
 * `root + path.sep`; storageKeyIsValid rejects traversal keys first).
 * The function remains the pure, test-pinned statement of those
 * semantics (tests/modules/files-guard.test.ts).
 */
export function isWithinPapersDir(resolved: string, storageRoot: string): boolean {
  const expectedDir = path.resolve(storageRoot, 'papers');
  return resolved.startsWith(expectedDir + path.sep);
}

// ─── Upload guard layer (tests/modules/upload-guard.test.ts) ──────

/** Hard ceiling for one uploaded PDF — matches the express.raw limit. */
export const MAX_UPLOAD_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Magic-byte gate: every PDF starts with the literal `%PDF-` header.
 * Content-Type alone is client-controlled and happily lies; the first
 * five bytes cannot. latin1 so the byte comparison is exact.
 */
export function isPdfMagicBytes(body: Buffer): boolean {
  return body.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** Size gate: non-empty and within the 20 MB cap (0 → rejected as 413). */
export function isUploadSizeOk(length: number): boolean {
  return Number.isInteger(length) && length > 0 && length <= MAX_UPLOAD_PDF_BYTES;
}

/**
 * Active-content PDF operator names (case-sensitive). Each announces
 * scripting or auto-execution inside the document.
 */
const PDF_ACTIVE_CONTENT_MARKERS: readonly string[] = ['/JavaScript', '/OpenAction', '/Launch'];

/**
 * Poor-man's ASVS 12.4.2 active-content heuristic (r170g): reject PDFs
 * that carry executable/active payloads BEFORE they are stored or served
 * to another user's viewer. Scans the raw bytes for the case-sensitive
 * PDF operator names above. A sandboxed AV pass is out of scope for this
 * codebase — this is an honest byte-scan heuristic, not a guarantee
 * (e.g. markers hidden inside a compressed stream slip through; the
 * serving-side gates still apply). latin1 maps 1 byte ↔ 1 code point,
 * so string `includes` is exact byte-sequence matching.
 */
export function containsPdfActiveContent(body: Uint8Array): boolean {
  // View (no copy) over the exact bytes: body may be a Buffer sharing a
  // pooled ArrayBuffer, so byteOffset/byteLength must be honored.
  const latin1 = Buffer.from(body.buffer, body.byteOffset, body.byteLength).toString('latin1');
  return PDF_ACTIVE_CONTENT_MARKERS.some((marker) => latin1.includes(marker));
}

/**
 * Per-user storage quota (ASVS 12.1.3, r170g): 200 MB of uploaded paper
 * PDFs per student. Rationale for the number: the ResearchPaper row does
 * NOT store a file size, so the worst-case stored footprint of a user's
 * existing papers is count × MAX_UPLOAD_PDF_BYTES (each upload is already
 * capped at 20 MB by isUploadSizeOk) — 200 MB therefore means "at most 10
 * papers". The demo seed student carries 5 papers (worst-case 100 MB) and
 * stays comfortably inside; no single account can pin unbounded storage.
 */
export const USER_PAPER_QUOTA_BYTES = 200 * 1024 * 1024;

/**
 * Pure quota decision: would storing `incomingBytes` ON TOP of the user's
 * existing STORED papers exceed the per-user quota? Papers without
 * stored sizes are charged at the 20 MB per-file cap (conservative — the
 * real footprint can only be smaller). r176d (F-05b): the caller counts
 * only papers whose fileUrl points into OUR storage — external-URL
 * papers store zero bytes on the platform and must not eat the cap
 * (11 link-only papers used to permanently block every real upload).
 */
export function isUploadWithinQuota(existingPaperCount: number, incomingBytes: number): boolean {
  const projectedBytes = existingPaperCount * MAX_UPLOAD_PDF_BYTES + incomingBytes;
  return projectedBytes <= USER_PAPER_QUOTA_BYTES;
}

/**
 * Single-range parser for the serving routes.
 *  - `null` → no Range header / malformed / multi-range: serve the full
 *    body as 200 (single-range support only, honestly).
 *  - `'unsatisfiable'` → a well-formed range beyond the file: 416.
 *  - `{ start, end }` → inclusive window clamped to size-1.
 * Suffix form `bytes=-N` means "last N bytes"; `bytes=-0` is unsatisfiable.
 */
export function parseRangeHeader(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | 'unsatisfiable' {
  if (typeof header !== 'string') return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (match === null) return null;
  const [, startRaw = '', endRaw = ''] = match;
  if (startRaw === '' && endRaw === '') return null; // 'bytes=-' is malformed
  if (startRaw === '') {
    const suffix = Number(endRaw);
    if (suffix <= 0) return 'unsatisfiable';
    const start = Math.max(0, size - suffix);
    const end = size - 1;
    if (end < start) return null; // only reachable for a zero-length file
    return { start, end };
  }
  const start = Number(startRaw);
  if (start < 0 || start >= size) return 'unsatisfiable';
  const end = endRaw === '' ? size - 1 : Math.min(Number(endRaw), size - 1);
  if (end < start) return null; // malformed ordering — ignore, serve full
  return { start, end };
}

/**
 * The honest missing-file refusal (r164f export, pinned by
 * tests/modules/files-guard.test.ts). Used by BOTH gate layers and
 * BOTH namespaces, deliberately indistinguishable between «no
 * authorizing row» and «bytes absent» so file EXISTENCE never leaks
 * to a requester who cannot read it — while staying clearly distinct
 * from auth refusals (401 UNAUTHENTICATED via authMiddleware) and
 * from shape refusals (400 «اسم الملف غير صالح»): a 404 with THIS
 * message always reads as «الملف غير موجود», never as a permission
 * or connection problem. The viewer classifies pdf.js's 404 mapping
 * on the same wording (frontend components/pdf/loadError.ts).
 */
export const FILE_NOT_FOUND_MESSAGE = 'الملف غير موجود';

// ─── Serving through the storage abstraction ──────────────────────

/**
 * Serve one PDF (papers or materials namespace) from the storage driver.
 * stat → 404 when absent; single-range requests get 206 + Content-Range;
 * everything else is a full 200. A driver failure (e.g. S3 transport)
 * throws and maps to 500 through the error handler — never a fake 404.
 */
async function servePdfFromStorage(
  req: Request,
  res: Response,
  key: string,
): Promise<void> {
  const storage = getStorage();
  const info = await storage.stat(key);
  if (info === null) throw AppError.notFound(FILE_NOT_FOUND_MESSAGE);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'private, max-age=3600');

  const range = parseRangeHeader(req.headers.range, info.size);
  if (range === 'unsatisfiable') {
    res.setHeader('Content-Range', `bytes */${info.size}`);
    res.status(416).end();
    return;
  }
  const slice = range === null ? await storage.get(key) : await storage.getRange(key, range.start, range.end);
  if (slice === null) throw AppError.notFound(FILE_NOT_FOUND_MESSAGE);
  if (range !== null) {
    res.status(206);
    res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${info.size}`);
  }
  // Buffer length (not stat.size) — the truth about the bytes actually
  // served if the object changed between stat and read.
  res.setHeader('Content-Length', String(slice.length));
  res.end(slice);
}

// ─── POST /papers — STUDENT-only research-paper PDF upload ────────

/** 10 uploads / min / user — same factory shape as the scan/chat routes. */
const paperUploadLimiter = createRouteLimiter({ max: 10 });

/**
 * Upload a research-paper PDF as a RAW application/pdf body (no
 * multipart dependency — express.raw buffers the bytes, 20 MB cap).
 *
 * Guards, in order: role (STUDENT only — 403 before a byte is read),
 * Buffer.isBuffer (a mismatched Content-Type leaves req.body as the
 * express.json leftover {}), size (413), the %PDF- magic bytes, the
 * active-content heuristic (400, r170g), and the per-user storage quota
 * (413 count query, r170g). Responds 201 with the fileUrl the paper row
 * should store.
 *
 * The quota count runs OUTSIDE any transaction, deliberately: one extra
 * query, and the limit is a bound (eventual consistency is fine), not an
 * invariant — two racing uploads can at worst both land under a stale
 * count.
 *
 * NO ResearchPaper row is created here, on purpose: the row is minted
 * by the existing POST /api/v1/me/research with this fileUrl — and that
 * row binds the paper to the student's VERIFIED institution
 * (paperInstitutionId, r179 minimal lead fix). Until then the uploaded
 * bytes are an inert orphan — the serving gate below 404s any filename
 * without an authorizing paper row, so an orphan can never be read.
 * (A storage put failure is a 500; the bytes are the only side effect
 * and no row references them.)
 *
 * r179b: the upload itself is fail-closed on the institution context
 * (requireFileInstitutionScope AFTER the byte gates) — an orphan can
 * only ever become an institution-bound row minted under the SAME
 * verified context, so a contextless student has no business storing
 * bytes here in the first place.
 */
router.post(
  '/papers',
  requireRole(Role.STUDENT),
  paperUploadLimiter,
  express.raw({ type: 'application/pdf', limit: '20mb' }),
  async (req, res, next) => {
    try {
      const body = req.body;
      if (!Buffer.isBuffer(body)) {
        throw AppError.badRequest('أرسل ملف PDF واحدًا بترميز application/pdf');
      }
      if (!isUploadSizeOk(body.length)) {
        throw new AppError('PAYLOAD_TOO_LARGE', 'حجم الملف يتجاوز الحد المسموح (20 ميجابايت)', 413);
      }
      if (!isPdfMagicBytes(body)) {
        throw AppError.badRequest('الملف المرفق ليس ملف PDF صالحاً');
      }
      if (containsPdfActiveContent(body)) {
        throw AppError.badRequest('ملف PDF يحتوي تضمينات برمجية نشطة — غير مسموح');
      }
      // r179b: fail closed without a VERIFIED institution context —
      // the bytes are only useful as the file side of an institution-
      // bound ResearchPaper row (POST /me/research mints it under this
      // same verified context), so a contextless student stores nothing.
      await requireFileInstitutionScope(req.user!.id, req.user!.role, req.user!.institutionId);
      // One extra query, no transaction — the quota is a bound, not an
      // invariant (see the route doc above). r176d (F-05b): only papers
      // whose bytes actually live in OUR storage count against the quota
      // — external https:// fileUrls store zero bytes on the platform,
      // and charging them at the 20MB cap meant 11 link-only papers
      // permanently blocked every real PDF upload (413 with nothing
      // stored).
      const storedPaperCount = await prisma.researchPaper.count({
        where: {
          studentId: req.user!.id,
          fileUrl: { startsWith: '/api/v1/files/papers/' },
        },
      });
      if (!isUploadWithinQuota(storedPaperCount, body.length)) {
        throw new AppError('PAYLOAD_TOO_LARGE', 'تجاوزت حصة التخزين الخاصة بك', 413);
      }
      const filename = `${generateStorageId()}.pdf`;
      const key = buildStorageKey('papers', filename);
      try {
        await getStorage().put(key, body);
      } catch (err) {
        logger.error({ err, key }, 'paper PDF upload: storage put failed');
        throw AppError.internal('تعذّر حفظ الملف — حاول مرة أخرى');
      }
      res.status(201).json({ data: { fileUrl: paperFilenameToFileUrl(filename) } });
    } catch (e) {
      next(e);
    }
  },
);

// ─── GET /papers/:filename — serve research PDFs (gated) ──────────

/**
 * Serve a paper PDF from the storage abstraction (local disk or
 * S3-compatible object store — the driver is env-selected, local keeps
 * the exact `backend/storage/papers/` layout).
 * Auth-required. Path traversal is blocked by the filename gates; the
 * directory pin lives inside LocalDriver now (see isWithinPapersDir).
 * The filename / role gates are extracted as pure functions above and
 * pinned DB-free by tests/modules/files-guard.test.ts (audit 15-i
 * TOP-6, wave 16-B11).
 *
 * Access gate (r179b — institution-bound): the filename is resolved
 * through the ResearchPaper table, and the authorizing row's
 * institution must match the caller's VERIFIED institution context.
 * Access is granted when the paper is PUBLISHED, the requester is the
 * paper's owner (student) or its reviewer, or the requester is
 * ADMIN/QUALITY (oversight of the SAME institution — QUALITY mirrors
 * the paper-annotation route's model: a role that can read annotations
 * on any paper can also fetch the artifact it audits). A stored file
 * with no matching paper row is an orphan and is not served. Only the
 * platform OWNER keeps the row-less fast path (deliberate
 * cross-institution oversight).
 */
router.get('/papers/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename!;
    // Reject anything that smells like traversal. The aggregate gate is
    // isSafePaperFilename; the two checks stay split so each rejection
    // carries its own message.
    if (containsTraversalPatterns(filename) || containsControlChars(filename)) {
      throw AppError.badRequest('اسم الملف غير صالح');
    }
    if (!isPdfFilename(filename)) {
      throw AppError.badRequest('تُقدَّم الملفات من هذه الخدمة بصيغة PDF فقط');
    }

    // ── Access gate: the authorizing row must live in the caller's ──
    // verified institution (OWNER alone serves platform-wide).
    const uid = req.user!.id;
    const role = req.user!.role;
    const callerInstitutionId = await requireFileInstitutionScope(uid, role, req.user!.institutionId);
    if (callerInstitutionId !== null) {
      // The grant predicate lives inside the query (findFirst stops at
      // the first row that matches the filename AND institution AND
      // grants access, no matter how many non-granting papers share it).
      const accessible = await prisma.researchPaper.findFirst({
        where: accessiblePaperWhere(filename, role, uid, callerInstitutionId),
        select: { id: true },
      });
      if (!accessible) throw AppError.notFound(FILE_NOT_FOUND_MESSAGE);
    }

    await servePdfFromStorage(req, res, buildStorageKey('papers', filename));
  } catch (e) { next(e); }
});

// ─── GET /materials/:filename — serve material PDFs (gated) ───────

/**
 * Serve a course-material PDF uploaded via
 * POST /api/v1/offerings/:id/materials/file.
 *
 * Same filename gates as papers (traversal + .pdf). Access gate
 * (r179b — institution-bound): the filename is resolved through the
 * Material table (url endsWith) with the grant predicate inside the
 * query — allowed when the requester teaches the material's offering,
 * or is actively enrolled in it, or is ADMIN/QUALITY oversight of the
 * SAME institution (isPaperOversightRole — the same trio, mirroring
 * the papers gate). The offering→course→department→faculty→institution
 * chain is compared against the caller's VERIFIED institution context,
 * so an institution-B student enrolled in an institution-B offering
 * can never read institution-A material bytes even with the exact
 * filename. A material row with no stored bytes (row created, put
 * failed and cleanup raced) 404s honestly through the same stat probe.
 * Only the platform OWNER keeps the row-less fast path.
 */
router.get('/materials/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename!;
    if (containsTraversalPatterns(filename) || containsControlChars(filename)) {
      throw AppError.badRequest('اسم الملف غير صالح');
    }
    if (!isPdfFilename(filename)) {
      throw AppError.badRequest('تُقدَّم الملفات من هذه الخدمة بصيغة PDF فقط');
    }

    const uid = req.user!.id;
    const role = req.user!.role;
    const callerInstitutionId = await requireFileInstitutionScope(uid, role, req.user!.institutionId);
    if (callerInstitutionId !== null) {
      const accessible = await prisma.material.findFirst({
        where: accessibleMaterialWhere(filename, role, uid, callerInstitutionId),
        select: { id: true },
      });
      if (!accessible) throw AppError.notFound(FILE_NOT_FOUND_MESSAGE);
    }

    await servePdfFromStorage(req, res, buildStorageKey('materials', filename));
  } catch (e) { next(e); }
});

// ─── r323 B2.1: lecture VIDEO direct upload (presigned) ───────────
// The browser PUTs bytes straight to the S3-compatible store through
// short-lived presigned URLs; the backend never buffers a video-sized
// payload (Render's ephemeral disk + memory stay out of the path).
// Drivers without presigning (local/postgres) refuse HONESTLY with 501
// — the small-file fallback is the existing materials-style flow, and
// the UI surfaces the exact Arabic message below.

/** Single presigned PUT cap (browser streams it in one request). */
export const MAX_SINGLE_UPLOAD_BYTES = 100 * 1024 * 1024;
/** Multipart object cap — 4 GB is a pilot-honest bound, far below S3's 5 TB. */
export const MAX_MULTIPART_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;
/** Part size for multipart: 8 MiB (≥ 5 MiB S3 floor, keeps part counts sane). */
export const MULTIPART_PART_SIZE = 8 * 1024 * 1024;
/** S3 allows 10 000 parts per upload — never reachable under our caps. */
export const MAX_MULTIPART_PARTS = 10_000;

const VIDEO_CONTENT_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.webm': 'video/webm',
  '.ogv': 'video/ogg',
  '.ogg': 'video/ogg',
  // r323 B2.3 — the lecture's TEXT sidecar rides the same namespace
  // (the <track> + the knowledge indexer both read it back).
  '.vtt': 'text/vtt; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8',
};

/**
 * The serving gate for /files/lectures/:filename — video containers OR
 * the transcript sidecar (the UPLOAD gates stay strictly video: only
 * the server's own transcript writer mints .vtt keys).
 */
export function isServableLectureFile(filename: string): boolean {
  if (isSafeVideoFilename(filename)) return true;
  // The sidecar branch: SAME bare-filename shape gate, .vtt extension.
  if (!filename.toLowerCase().endsWith('.vtt')) return false;
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) return false;
  for (let i = 0; i < filename.length; i += 1) {
    const code = filename.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return false;
  }
  return true;
}

export function videoContentTypeFor(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const ext = dot === -1 ? '' : filename.slice(dot).toLowerCase();
  return VIDEO_CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

/**
 * The key shape the presign route mints and complete re-validates:
 * `lectures/c<uuid-no-dashes>.<ext>` — server-minted id, bare filename.
 * A complete request for ANY other shape is refused (a hostile client
 * cannot complete-or-verify an arbitrary key it did not get presigned).
 */
export function mintedLectureKeyIsValid(key: string): boolean {
  if (!key.startsWith('lectures/')) return false;
  const filename = key.slice('lectures/'.length);
  if (!isSafeVideoFilename(filename)) return false;
  const dot = filename.lastIndexOf('.');
  const stem = dot === -1 ? filename : filename.slice(0, dot);
  return /^c[0-9a-f]{32}$/.test(stem);
}

/**
 * Honest driver refusal: presigned direct upload needs an S3-compatible
 * store. The Arabic message is what the teacher's uploader renders.
 * 503 (SERVICE_UNAVAILABLE is not in ErrorCode — BAD_REQUEST would lie;
 * the honest shape is a 503 with a client-safe message, carried as an
 * INTERNAL-class AppError with an explicit 503 status).
 */
export const PRESIGN_UNSUPPORTED_MESSAGE =
  'الرفع المباشر للفيديو يتطلب تخزينًا متوافقًا مع S3 — الوضع الحالي لا يدعمه. استخدم رابط فيديو خارجيًا أو تواصل مع مالك المنصة.';

function presignUnsupported(): AppError {
  return new AppError('INTERNAL', PRESIGN_UNSUPPORTED_MESSAGE, 503);
}

/** 30 presigns / min / user — each mints bounded-lifetime store URLs. */
const uploadPresignLimiter = createRouteLimiter({ max: 30 });

const presignBodySchema = z.object({
  filename: z.string().min(1).max(255),
  sizeBytes: z.number().int().positive(),
  multipart: z.boolean().optional(),
});

router.post('/uploads/presign', uploadPresignLimiter, requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const parsed = presignBodySchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest('بيانات الطلب غير صالحة');
    const { filename, sizeBytes, multipart = false } = parsed.data;

    // Bare-name gate: the client sends an ORIGINAL filename for the
    // extension check only — the stored key always uses a server-minted
    // id, so hostile path shapes die here before anything is signed.
    const baseName = filename.split(/[\\/]/).pop() ?? '';
    if (!isSafeVideoFilename(baseName)) {
      throw AppError.badRequest('صيغة الفيديو غير مدعومة — المسموح: mp4، webm، m4v، ogv، ogg');
    }
    if (multipart) {
      if (sizeBytes > MAX_MULTIPART_UPLOAD_BYTES) {
        throw AppError.badRequest('حجم الملف يتجاوز الحد الأقصى (4 جيجابايت)');
      }
    } else if (sizeBytes > MAX_SINGLE_UPLOAD_BYTES) {
      throw AppError.badRequest('الملف أكبر من 100 ميجابايت — استخدم الرفع متعدد الأجزاء');
    }

    const storage = getStorage();
    if (!(storage instanceof S3Driver)) {
      throw presignUnsupported();
    }

    const ext = baseName.slice(baseName.lastIndexOf('.')).toLowerCase();
    const id = generateStorageId();
    const key = buildStorageKey('lectures', `${id}${ext}`);

    if (multipart) {
      const partCount = Math.min(Math.ceil(sizeBytes / MULTIPART_PART_SIZE), MAX_MULTIPART_PARTS);
      const uploadId = await storage.createMultipartUpload(key);
      const parts = Array.from({ length: partCount }, (_, i) => ({
        partNumber: i + 1,
        url: storage.presignPartUrl(key, uploadId, i + 1, MAX_PRESIGN_EXPIRES_SEC),
      }));
      res.json({
        mode: 'multipart' as const,
        key,
        uploadId,
        partSize: MULTIPART_PART_SIZE,
        parts,
      });
      return;
    }

    res.json({
      mode: 'single' as const,
      key,
      url: storage.presignPutUrl(key, MAX_PRESIGN_EXPIRES_SEC),
      headers: { 'Content-Type': videoContentTypeFor(baseName) },
    });
  } catch (e) { next(e); }
});

const completeBodySchema = z.object({
  key: z.string().min(1).max(512),
  uploadId: z.string().min(1).max(1024).optional(),
  parts: z
    .array(z.object({ partNumber: z.number().int().min(1).max(MAX_MULTIPART_PARTS), etag: z.string().min(1).max(256) }))
    .max(MAX_MULTIPART_PARTS)
    .optional(),
});

router.post('/uploads/complete', uploadPresignLimiter, requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const parsed = completeBodySchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest('بيانات الطلب غير صالحة');
    const { key, uploadId, parts } = parsed.data;
    if (!mintedLectureKeyIsValid(key)) throw AppError.badRequest('مفتاح التخزين غير صالح');

    const storage = getStorage();
    if (!(storage instanceof S3Driver)) {
      throw presignUnsupported();
    }
    if (uploadId !== undefined) {
      if (parts === undefined || parts.length === 0) {
        throw AppError.badRequest('أجزاء الرفع غير مكتملة');
      }
      await storage.completeMultipartUpload(key, uploadId, parts);
    }
    // Single mode (no uploadId): HEAD proves the bytes really landed —
    // the client never gets a lecture URL for an absent object.
    const info = await storage.stat(key);
    if (info === null) throw AppError.notFound('لم يُعثر على الملف المرفوع');

    res.json({
      url: lectureFilenameToServingPath(key.slice('lectures/'.length)),
      sizeBytes: info.size,
    });
  } catch (e) { next(e); }
});

/**
 * GET /lectures/:filename — the lecture video serving route.
 * Any authenticated user (course-level visibility stays enforced where it
 * exists today — the same stance the platform's public video URLs took;
 * the route exists so pilot uploads survive the ephemeral disk).
 *  - s3 driver → 302 to a 10-minute presigned GET (the browser then
 *    streams WITH range support straight from the store).
 *  - local/postgres → streamed through the backend, single-range aware
 *    (the same contract servePdfFromStorage gives PDFs, with video
 *    Content-Type + inline disposition).
 */
router.get('/lectures/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename!;
    if (!isServableLectureFile(filename)) throw AppError.badRequest('اسم الملف غير صالح');
    const key = buildStorageKey('lectures', filename);
    const storage = getStorage();

    if (storage instanceof S3Driver) {
      // The redirect URL is itself the access control window (short
      // lifetime, single method, single key). no-store: a cached 302
      // would outlive its presigned target.
      res.setHeader('Cache-Control', 'private, no-store');
      res.redirect(302, storage.presignGetUrl(key, 600));
      return;
    }

    const info = await storage.stat(key);
    if (info === null) throw AppError.notFound(FILE_NOT_FOUND_MESSAGE);
    res.setHeader('Content-Type', videoContentTypeFor(filename));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Disposition', 'inline');

    const range = parseRangeHeader(req.headers.range, info.size);
    if (range === 'unsatisfiable') {
      res.setHeader('Content-Range', `bytes */${info.size}`);
      res.status(416).end();
      return;
    }
    const slice = range === null ? await storage.get(key) : await storage.getRange(key, range.start, range.end);
    if (slice === null) throw AppError.notFound(FILE_NOT_FOUND_MESSAGE);
    if (range !== null) {
      res.status(206);
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${info.size}`);
    }
    res.setHeader('Content-Length', String(slice.length));
    res.end(slice);
  } catch (e) { next(e); }
});

export default router;
