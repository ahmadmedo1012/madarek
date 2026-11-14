/**
 * master-F1 — the institutional import API (§9).
 *
 * The registrar's full migration system: parse (XLSX/CSV detection +
 * column intelligence), preview (an ImportJob with per-row verdicts +
 * the duplicate report), commit (chunked transactions, idempotent per
 * row, duplicate policy), progress polling, downloadable templates
 * (REAL .xlsx) and the per-line report workbook, plus saveable mapping
 * profiles. The r323 small CSV workflow (/users/bulk-import/*) stays
 * untouched and compatible — this module is the scalable successor.
 *
 * Conventions: the users.routes envelope (authMiddleware + requireRole
 * ADMIN/OWNER + zod validate + AppError), institution scoping mirrors
 * resolveCallerInstitutionScope, and NO raw SQL — prisma only.
 */
import { Router, type Request } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { createRouteLimiter } from '../middleware/rateLimit.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { resolveCallerInstitutionScope, institutionContextRequiredError } from '../../lib/profile-scoping.js';
// R350 E3 — import-created accounts with REAL emails get the activation
// mail; placeholder-domain rows keep the credentials sheet only.
import { sendEventMail, renderActivationInvite, isDeliverableEmail, loginUrl } from '../../lib/mail-events.js';
import { logger } from '../../logger.js';
import { hashPassword } from '../../lib/password.js';
import { generateTempPassword } from '../../lib/bulk-import.js';
import { detectFormat, readSheet, listSheets } from '../../lib/import/xlsx.js';
// R350 I-P1 — encoding recovery (cp1256/8859-6) + delimiter sniffing.
import { decodeCsvBuffer } from '../../lib/import/encoding.js';
import { sniffDelimiter, parseDelimited } from '../../lib/import/csv.js';
import {
  applyMappingProfile,
  buildColumnMap,
  toMappingProfile,
  type MappingProfile,
} from '../../lib/import/mapping.js';
import { validateRows, IMPORT_MAX_ROWS, type ImportEntity } from '../../lib/import/validate.js';
import { buildImportTemplate, buildImportReport } from '../../lib/import/templates.js';
// R350 I-P0 — faculty/department NAME resolution (exact → normalised →
// suggestion; never a silent fall-back-to-the-first-faculty).
import { resolveOrgName, orgResolutionErrorAr } from '../../lib/import/resolve.js';
// R350 I-P3 (mode B) — the batch-enrolment matching chain's helpers.
import { normalizeNationalId, hashNationalId } from '../../lib/profiles/national-id.js';
import { normalizePhone } from '../../lib/phones.js';
import { renderEnrollmentConfirmed } from '../../lib/mail-events.js';

const router = Router();
router.use(authMiddleware);

const importLimiter = createRouteLimiter({ max: 20 });

/* ── shared helpers ─────────────────────────────────────────────── */

const entitySchema = z.enum(['STUDENT', 'TEACHER']);

const fileBodySchema = z.object({
  fileBase64: z.string().min(16).max(14 * 1024 * 1024), // ≤ 14 MB encoded ≈ 10 MB raw (I1)
  institutionId: z.string().min(1).max(64).optional(),
  entity: entitySchema,
  /** R350 I-P1 — which XLSX sheet to read (default: the first). */
  sheetName: z.string().min(1).max(64).optional(),
});

/* The institution resolver (the r323 bulk-import pattern): ADMIN is
 * scoped by their own institution context; OWNER names the target. */
async function resolveInstitutionId(req: Request, bodyInstitutionId?: string): Promise<string> {
  if (req.user!.role === Role.ADMIN) {
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (scope === null) throw institutionContextRequiredError();
    return scope;
  }
  if (typeof bodyInstitutionId !== 'string' || bodyInstitutionId.length === 0) {
    throw AppError.badRequest('حدّد المؤسسة التي سيُستورد إليها السجل');
  }
  const inst = await prisma.institution.findFirst({
    where: { id: bodyInstitutionId, status: 'ACTIVE' },
    select: { id: true, kind: true },
  });
  if (!inst) throw AppError.badRequest('المؤسسة المحددة غير موجودة أو غير نشطة');
  return inst.id;
}

async function loadInstitution(id: string) {
  const inst = await prisma.institution.findUnique({ where: { id }, select: { id: true, kind: true } });
  if (!inst) throw AppError.notFound('المؤسسة غير موجودة');
  return inst;
}

function decodeFile(fileBase64: string): Buffer {
  const buf = Buffer.from(fileBase64, 'base64');
  if (buf.length === 0) throw AppError.badRequest('الملف فارغ أو غير مُرمَّز بشكل صحيح');
  return buf;
}

async function loadGrid(buf: Buffer, sheetName?: string): Promise<{ headers: string[]; rows: string[][]; encoding?: string; delimiter?: string }> {
  const format = detectFormat(buf);
  if (format === 'XLSX') {
    try {
      return await readSheet(buf, sheetName);
    } catch (err) {
      if (err instanceof Error && err.message === 'IMPORT_BUDGET_EXCEEDED') {
        throw AppError.badRequest('الملف أكبر من الميزانية المسموحة (٢٠ ألف صف × ٦٤ عمودًا) — قسّمه إلى ملفات أصغر');
      }
      throw err;
    }
  }
  if (format === 'CSV') {
    // R350 I-P1 — the encoding recovery + the delimiter sniff replace
    // the blind utf8/comma read: Windows-1256 exports decode cleanly,
    // semicolon/tab exports parse with THEIR delimiter.
    const { text, encoding } = decodeCsvBuffer(buf);
    const delimiter = sniffDelimiter(text);
    const grid = parseDelimited(text, delimiter);
    const [header, ...rows] = grid;
    return { headers: header ?? [], rows, encoding, delimiter };
  }
  throw AppError.badRequest('صيغة الملف غير مدعومة — المسموح: XLSX أو CSV');
}

/* The institution's custom-field definitions in BOTH shapes the pure
 * layer consumes: the full definition (validateFieldValue) and the
 * import-alias meta (mapImportHeader). */
async function customFields(institutionId: string, entity: ImportEntity) {
  const defs = await prisma.institutionFieldDefinition.findMany({
    where: { institutionId, entity },
    orderBy: { sortOrder: 'asc' },
  });
  const full = defs.map((d) => ({
    key: d.key,
    labelAr: d.labelAr,
    labelEn: d.labelEn ?? undefined,
    entity: d.entity,
    type: d.type,
    required: d.required,
    options: d.options ?? undefined,
    validation: d.validation ?? undefined,
  }));
  const metas = full.map((d) => ({
    key: d.key,
    labelAr: d.labelAr,
    labelEn: d.labelEn,
    importKeyAr: undefined,
    importKeyEn: undefined,
  }));
  return { full, metas };
}

/* ── POST /import/parse — structure detection + suggested mapping ── */

router.post(
  '/parse',
  importLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  validate(fileBodySchema, 'body'),
  async (req, res, next) => {
    try {
      const { fileBase64, institutionId, entity, sheetName } = req.body as z.infer<typeof fileBodySchema>;
      const instId = await resolveInstitutionId(req, institutionId);
      const buf = decodeFile(fileBase64);
      const sheets = detectFormat(buf) === 'XLSX' ? await listSheets(buf) : [];
      const grid = await loadGrid(buf, sheetName);
      if (grid.headers.length === 0) throw AppError.badRequest('الملف بلا ترويسة — الصف الأول يجب أن يحمل أسماء الأعمدة');
      if (grid.rows.length > IMPORT_MAX_ROWS) {
        throw AppError.badRequest(`عدد الصفوف يتجاوز الحد (${IMPORT_MAX_ROWS}) — قسّم الملف`);
      }
      const { metas } = await customFields(instId, entity);
      const map = buildColumnMap(grid.headers, metas);
      res.json({
        data: {
          format: detectFormat(buf),
          sheets,
          encoding: grid.encoding ?? 'utf-8',
          delimiter: grid.delimiter ?? ',',
          headers: grid.headers,
          rowCount: grid.rows.length,
          detectedLanguage: map.detectedLanguage,
          suggestedMap: toMappingProfile(map),
          unknownColumns: map.unknownColumns,
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

/* ── POST /import/preview — create the job + per-row verdicts ────── */

const previewBodySchema = fileBodySchema.extend({
  columnMap: z.object({
    version: z.literal(1),
    columns: z.array(z.object({ source: z.string(), target: z.string() })).min(1),
  }),
  /** R350 I-P0 — unknown faculty/department names: create them at
   * commit (audited) instead of erroring the rows. */
  createIfMissing: z.boolean().default(false),
});

router.post(
  '/preview',
  importLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  validate(previewBodySchema, 'body'),
  async (req, res, next) => {
    try {
      const { fileBase64, institutionId, entity, columnMap, createIfMissing, sheetName } = req.body as z.infer<typeof previewBodySchema>;
      const instId = await resolveInstitutionId(req, institutionId);
      const buf = decodeFile(fileBase64);
      const grid = await loadGrid(buf, sheetName);
      const { full, metas } = await customFields(instId, entity);
      const map = applyMappingProfile(grid.headers, columnMap as unknown as MappingProfile, metas);
      const inst = await loadInstitution(instId);
      const mode = inst.kind === 'SCHOOL' ? 'SCHOOL' : 'UNIVERSITY';
      const result = validateRows(grid.rows, map, { entity, mode, customFields: full });

      /* R350 I-P0/I4 — the DB-side truths the pure layer cannot know:
       * faculty/department names, reg-numbers that already exist, and
       * emails already taken. The silent first-faculty fallback and the
       * email P2002 abort both die here — at PREVIEW, where the
       * registrar can still fix the file. */
      const [faculties, departments] = await Promise.all([
        prisma.faculty.findMany({ where: { institutionId: instId }, select: { id: true, name: true } }),
        prisma.department.findMany({ where: { faculty: { institutionId: instId } }, select: { id: true, name: true } }),
      ]);
      const okUniIds = result.rows.filter((r) => r.status === 'ok').map((r) => (r.mapped as { universityId?: string }).universityId).filter((v): v is string => typeof v === 'string');
      const okEmails = result.rows
        .filter((r) => r.status === 'ok')
        .map((r) => (r.mapped as { email?: string }).email)
        .filter((e): e is string => typeof e === 'string' && e.length > 3)
        .map((e) => e.toLowerCase());
      const [existingUniIds, takenEmails] = await Promise.all([
        okUniIds.length
          ? prisma.studentProfile.findMany({ where: { institutionId: instId, universityId: { in: okUniIds } }, select: { universityId: true } })
          : Promise.resolve([]),
        okEmails.length
          ? prisma.user.findMany({ where: { email: { in: okEmails } }, select: { email: true } })
          : Promise.resolve([]),
      ]);
      const knownUniIds = new Set(existingUniIds.map((r) => r.universityId));
      const takenEmailSet = new Set(takenEmails.map((u) => u.email.toLowerCase()));
      /* R350 I-P2 — the DIFF VIEW: rows whose reg-number exists carry the
       * field-level before→after picture (what UPDATE would change, what
       * FILL_EMPTY would add) so the registrar judges duplicates with
       * evidence, not trust. */
      const existingProfiles = okUniIds.length
        ? await prisma.studentProfile.findMany({
            where: { institutionId: instId, universityId: { in: okUniIds } },
            select: {
              id: true, universityId: true, nameAr: true, stage: true, grade: true, section: true,
              studentPhone: true, guardianName: true, guardianPhone: true,
            },
          })
        : [];
      const existingByUniId = new Map(existingProfiles.map((p) => [p.universityId, p]));
      type DiffTarget = { nameAr: string; stage?: string | null; grade?: string | null; section?: string | null; studentPhone?: string | null; guardianName?: string | null; guardianPhone?: string | null };
      const DIFF_FIELDS: [keyof DiffTarget, string][] = [
        ['nameAr', 'الاسم'],
        ['stage', 'المرحلة'],
        ['grade', 'الصف'],
        ['section', 'الشعبة'],
        ['studentPhone', 'هاتف الطالب'],
        ['guardianName', 'اسم ولي الأمر'],
        ['guardianPhone', 'هاتف ولي الأمر'],
      ];
      const rowDiffs = new Map<number, { existing: { universityId: string; nameAr: string }; diff: { field: string; fieldAr: string; from: string; to: string }[]; fillable: string[] }>();
      for (const row of result.rows) {
        if (row.status !== 'ok') continue;
        const m = row.mapped as { universityId?: string; firstName: string; lastName: string; nameAr?: string } & DiffTarget;
        const existing = m.universityId ? existingByUniId.get(m.universityId) : undefined;
        if (!existing) continue;
        const file: DiffTarget = {
          nameAr: m.nameAr ?? `${m.firstName} ${m.lastName}`.trim(),
          stage: m.stage ?? null, grade: m.grade ?? null, section: m.section ?? null,
          studentPhone: m.studentPhone ?? null, guardianName: m.guardianName ?? null, guardianPhone: m.guardianPhone ?? null,
        };
        const diff: { field: string; fieldAr: string; from: string; to: string }[] = [];
        const fillable: string[] = [];
        for (const [field, fieldAr] of DIFF_FIELDS) {
          const from = (existing[field] as string | null | undefined) ?? '';
          const to = (file[field] as string | null | undefined) ?? '';
          if (from === to) continue;
          diff.push({ field, fieldAr, from, to });
          if (from === '' && to !== '') fillable.push(fieldAr);
        }
        rowDiffs.set(row.line, {
          existing: { universityId: existing.universityId, nameAr: existing.nameAr ?? '' },
          diff,
          fillable,
        });
      }
      for (const row of result.rows) {
        if (row.status !== 'ok') continue;
        const m = row.mapped as { faculty?: string; department?: string; universityId?: string; email?: string };
        if (m.faculty) {
          const res = resolveOrgName(m.faculty, faculties);
          if (res.kind !== 'exact' && res.kind !== 'normalised') {
            if (createIfMissing) row.warningsAr.push(`ستُنشأ كلية جديدة باسم «${m.faculty.trim()}» عند التأكيد`);
            else {
              row.status = 'error';
              row.errorsAr.push(orgResolutionErrorAr('faculty', m.faculty, res));
            }
          }
        }
        if (m.department) {
          const res = resolveOrgName(m.department, departments);
          if (res.kind !== 'exact' && res.kind !== 'normalised') {
            if (createIfMissing) row.warningsAr.push(`ستُنشأ قسم جديد باسم «${m.department.trim()}» عند التأكيد`);
            else {
              row.status = 'error';
              row.errorsAr.push(orgResolutionErrorAr('department', m.department, res));
            }
          }
        }
        if (m.universityId && knownUniIds.has(m.universityId)) {
          row.warningsAr.push(`رقم القيد «${m.universityId}» موجود مسبقًا — ستُطبَّق سياسة التكرار`);
        }
        if (m.email && takenEmailSet.has(m.email.toLowerCase())) {
          row.status = 'error';
          row.errorsAr.push(`البريد «${m.email}» مستخدم بحساب آخر — لا يمكن إنشاء حساب ثانٍ به`);
        }
      }
      result.counts.ok = result.rows.filter((r) => r.status === 'ok').length;
      result.counts.error = result.rows.filter((r) => r.status === 'error').length;
      result.counts.warningCount = result.rows.reduce((a, r) => a + (r.status === 'ok' ? r.warningsAr.length : 0), 0);

      const job = await prisma.importJob.create({
        data: {
          institutionId: instId,
          createdByUserId: req.user!.id,
          entity,
          fileName: `upload.${detectFormat(buf) === 'XLSX' ? 'xlsx' : 'csv'}`,
          format: detectFormat(buf) === 'XLSX' ? 'XLSX' : 'CSV',
          status: 'VALIDATED',
          totalRows: result.counts.total,
          columnMap: toMappingProfile(map) as unknown as object,
          summary: {
            ok: result.counts.ok,
            error: result.counts.error,
            warningCount: result.counts.warningCount,
            duplicateReport: result.duplicateReport as unknown as object,
            mode,
            createIfMissing,
          } as unknown as object,
          rows: {
            create: result.rows.slice(0, 2000).map((r) => ({
              line: r.line,
              status: r.status === 'ok' ? 'PENDING' : 'ERROR',
              rawData: {},
              mappedData: r.status === 'ok' ? (r.mapped as object) : undefined,
              errorAr: r.errorsAr[0] ?? null,
            })),
          },
        },
      });

      res.json({
        data: {
          jobId: job.id,
          counts: result.counts,
          duplicateReport: result.duplicateReport,
          rows: result.rows.slice(0, 100).map((r) => ({
            line: r.line,
            status: r.status,
            errorsAr: r.errorsAr,
            warningsAr: r.warningsAr,
            // R350 I-P2 — the duplicate diff (only rows the DB matched).
            ...(rowDiffs.get(r.line) ?? {}),
          })),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

/* ── POST /import/jobs/:id/commit — chunked, idempotent ──────────── */

const commitBodySchema = z.object({
  duplicatePolicy: z.enum(['SKIP', 'UPDATE', 'FILL_EMPTY', 'ERROR']).default('SKIP'),
  chunkSize: z.number().int().min(20).max(500).default(200),
  fileBase64: z.string().min(16).max(14 * 1024 * 1024), // ≤ 14 MB encoded ≈ 10 MB raw (I1)
  sheetName: z.string().min(1).max(64).optional(),
  /** R350 I-P2 — per-row policy overrides, keyed by the data line
   * number: the wizard's per-row verdict beats the global policy for
   * duplicates (SKIP | UPDATE | FILL_EMPTY). */
  rowPolicies: z.record(z.string().regex(/^\d+$/), z.enum(['SKIP', 'UPDATE', 'FILL_EMPTY'])).default({}),
});

router.post(
  '/jobs/:id/commit',
  importLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  validate(commitBodySchema, 'body'),
  async (req, res, next) => {
    try {
      const { duplicatePolicy, chunkSize, fileBase64, sheetName, rowPolicies } = req.body as z.infer<typeof commitBodySchema>;
      const job = await prisma.importJob.findUnique({ where: { id: req.params.id } });
      if (!job) throw AppError.notFound('مهمة الاستيراد غير موجودة');
      await resolveInstitutionId(req, job.institutionId);
      if (job.status === 'COMPLETED') {
        throw AppError.badRequest('المهمة مكتملة بالفعل');
      }
      // R350 I-P0 — COMMITTING is RESUMABLE, not stuck: every row write is
      // idempotent (existing reg-numbers take the duplicate policy), so a
      // crashed commit re-runs safely from the top of the remaining rows.
      if (job.status === 'COMMITTING') {
        logger.warn({ jobId: job.id, processedRows: job.processedRows }, 'import: resuming a COMMITTING job (idempotent re-entry)');
      }
      // R350 I-P0 — honest refusal: the commit path persists STUDENT
      // profiles only today; a TEACHER job answers clearly instead of
      // crashing mid-transaction on a student-shaped write.
      if (job.entity === 'TEACHER') {
        throw AppError.badRequest('مسار تثبيت استيراد المدرّسين قيد الإعداد — المسار المفعّل حاليًا لاستيراد الطلاب فقط');
      }

      // Re-read the source file and re-validate against the SAVED map —
      // the commit is grounded in the same bytes the preview judged.
      const buf = decodeFile(fileBase64);
      const grid = await loadGrid(buf, sheetName);
      const { full, metas } = await customFields(job.institutionId, job.entity as ImportEntity);
      const map = applyMappingProfile(grid.headers, job.columnMap as unknown as MappingProfile, metas);
      const mode = (await loadInstitution(job.institutionId)).kind === 'SCHOOL' ? 'SCHOOL' : 'UNIVERSITY';
      const result = validateRows(grid.rows, map, { entity: job.entity as ImportEntity, mode, customFields: full });
      const okRows = result.rows.filter((r) => r.status === 'ok');

      await prisma.importJob.update({ where: { id: job.id }, data: { status: 'COMMITTING', totalRows: result.counts.total } });

      /* R350 I-P2 — resume-exactness: a crashed-and-resumed commit must
       * never LOSE what the first attempt did. Rows the first attempt
       * CREATED will read as "existing" now — their ledger action stays
       * CREATED (rollback still undoes them). Rows the first attempt
       * UPDATED keep their FIRST before-image (the resume's before is
       * post-first-update state — restoring that would leave the first
       * attempt's changes applied). */
      const priorLedger = await prisma.importRow.findMany({
        where: { jobId: job.id, action: { not: null } },
        select: { line: true, action: true },
      });
      const priorCreated = new Set(priorLedger.filter((r) => r.action === 'CREATED').map((r) => r.line));
      const priorUpdated = new Set(priorLedger.filter((r) => r.action === 'UPDATED').map((r) => r.line));

      // Resolve the faculty/department NAME references ONCE (the
      // registrar's file speaks names, the DB speaks ids) — through the
      // R350 resolver: exact → normalised → suggestion, with an explicit
      // createIfMissing path (preview flagged the rows, the commit
      // honours the promise). The silent faculties[0] fallback is DEAD.
      const jobSummary = (job.summary ?? {}) as { createIfMissing?: boolean };
      const createIfMissing = jobSummary.createIfMissing === true;
      const faculties = await prisma.faculty.findMany({ where: { institutionId: job.institutionId }, select: { id: true, name: true } });
      const departments = await prisma.department.findMany({
        where: { faculty: { institutionId: job.institutionId } },
        select: { id: true, name: true, facultyId: true },
      });
      /** R350 I-P0 — created orgs, audited once at completion. I-P2:
       * the id rides along so a rollback can sweep the ones that ended
       * up empty (old summaries without ids are simply skipped). */
      const createdOrgs: { kind: 'faculty' | 'department'; name: string; id: string }[] = [];

      let succeeded = 0;
      let skipped = 0;
      let failed = 0;
      // R350 E3 — one activation payload per created account that has a
      // REAL email (placeholder-domain rows are sheet-only by design).
      const activation: { userId: string; email: string; name: string; tempPassword: string }[] = [];
      /* R350 I-P0 — the ONE-TIME credentials sheet: created rows with NO
       * deliverable email return their temp password HERE (never stored
       * raw anywhere — this response is its only existence), so the
       * registrar can hand them out. The old flow hashed and discarded
       * them: unloginable accounts. */
      const credentials: { name: string; universityId: string; email: string; tempPassword: string }[] = [];
      /** R350 I-P0 — the per-row ledger updates for this chunk (applied
       * inside the same transaction as the writes they describe).
       * I-P2: action (CREATED|UPDATED|SKIPPED) + before (the update's
       * before-image) ride along so the rollback knows what to undo. */
      const rowOutcomes: { line: number; status: 'OK' | 'SKIPPED' | 'ERROR'; resultRef?: string; errorAr?: string; action?: 'CREATED' | 'UPDATED' | 'SKIPPED'; before?: object }[] = [];
      for (let i = 0; i < okRows.length; i += chunkSize) {
        const chunk = okRows.slice(i, i + chunkSize);
        rowOutcomes.length = 0;

        await prisma.$transaction(async (tx) => {
          for (const row of chunk) {
            const m = row.mapped as {
              firstName: string; lastName: string; nameAr?: string; email?: string; emailPlaceholder: boolean;
              universityId: string; year: number; faculty?: string; department?: string;
              stage?: string; grade?: string; section?: string;
              studentPhone?: string; studentPhoneNormalized?: string;
              guardianName?: string; guardianPhone?: string; guardianPhoneNormalized?: string;
            };
            // Idempotency: an existing institution-scoped reg-number honors the policy.
            // R350 I-P2 — the wizard's per-row verdict beats the global one.
            const rowPolicy = rowPolicies[String(row.line)] ?? duplicatePolicy;
            const existing = await tx.studentProfile.findFirst({
              where: { institutionId: job.institutionId, universityId: m.universityId },
              select: { id: true, nameAr: true, stage: true, grade: true, section: true, studentPhone: true, studentPhoneNormalized: true, guardianName: true, guardianPhone: true, guardianPhoneNormalized: true },
            });
            if (existing) {
              if (rowPolicy === 'SKIP') {
                skipped += 1;
                rowOutcomes.push({ line: row.line, status: 'SKIPPED', resultRef: existing.id, action: priorCreated.has(row.line) ? 'CREATED' : 'SKIPPED' });
                continue;
              }
              if (rowPolicy === 'ERROR') { failed += 1; rowOutcomes.push({ line: row.line, status: 'ERROR', errorAr: 'رقم قيد موجود مسبقًا وسياسة التكرار رفضته' }); continue; }
              const fileUpdates = {
                nameAr: m.nameAr ?? `${m.firstName} ${m.lastName}`.trim(),
                stage: m.stage, grade: m.grade, section: m.section,
                studentPhone: m.studentPhone, studentPhoneNormalized: m.studentPhoneNormalized,
                guardianName: m.guardianName, guardianPhone: m.guardianPhone, guardianPhoneNormalized: m.guardianPhoneNormalized,
              };
              if (rowPolicy === 'FILL_EMPTY') {
                /* R350 I-P2 — FILL_EMPTY: only the fields the profile does
                 * NOT carry yet; existing values are untouchable. A row
                 * with nothing to fill reports as SKIPPED (nothing
                 * changed), never as a hollow success. */
                const fill: Record<string, string | null | undefined> = {};
                for (const [k, v] of Object.entries(fileUpdates)) {
                  if (v == null || v === '') continue;
                  const cur = (existing as Record<string, unknown>)[k];
                  if (cur == null || cur === '') fill[k] = v as string;
                }
                if (Object.keys(fill).length === 0) {
                  skipped += 1;
                  rowOutcomes.push({ line: row.line, status: 'SKIPPED', resultRef: existing.id, action: priorCreated.has(row.line) ? 'CREATED' : 'SKIPPED' });
                  continue;
                }
                const beforeFill: Record<string, unknown> = {};
                for (const k of Object.keys(fill)) beforeFill[k] = (existing as Record<string, unknown>)[k] ?? null;
                await tx.studentProfile.update({ where: { id: existing.id }, data: fill });
                succeeded += 1;
                rowOutcomes.push({ line: row.line, status: 'OK', resultRef: existing.id, action: 'UPDATED', before: beforeFill });
                continue;
              }
              // UPDATE: refresh the permitted profile fields only — the
              // before-image of every field touched rides the ledger (I-P2).
              const beforeImage = {
                nameAr: existing.nameAr ?? null, stage: existing.stage ?? null, grade: existing.grade ?? null, section: existing.section ?? null,
                studentPhone: existing.studentPhone ?? null, studentPhoneNormalized: existing.studentPhoneNormalized ?? null,
                guardianName: existing.guardianName ?? null, guardianPhone: existing.guardianPhone ?? null, guardianPhoneNormalized: existing.guardianPhoneNormalized ?? null,
              };
              await tx.studentProfile.update({
                where: { id: existing.id },
                data: {
                  nameAr: m.nameAr ?? `${m.firstName} ${m.lastName}`.trim(),
                  stage: m.stage, grade: m.grade, section: m.section,
                  studentPhone: m.studentPhone, studentPhoneNormalized: m.studentPhoneNormalized,
                  guardianName: m.guardianName, guardianPhone: m.guardianPhone, guardianPhoneNormalized: m.guardianPhoneNormalized,
                },
              });
              succeeded += 1;
              rowOutcomes.push({ line: row.line, status: 'OK', resultRef: existing.id, action: 'UPDATED', before: beforeImage });
              continue;
            }
            const email = m.email ?? `${m.universityId}@students.import.madarek.local`;
            /* R350 I-P0 — the email-collision guard: a taken address
             * fails THIS row honestly (the preview already flagged it;
             * a race between preview and commit still dies here instead
             * of aborting the whole chunk via P2002). */
            const emailTaken = await tx.user.findUnique({ where: { email }, select: { id: true } });
            if (emailTaken) {
              failed += 1;
              rowOutcomes.push({ line: row.line, status: 'ERROR', errorAr: `البريد «${email}» مستخدم بحساب آخر` });
              continue;
            }
            const tempPassword = generateTempPassword();
            const user = await tx.user.create({
              data: {
                email,
                firstName: m.firstName,
                lastName: m.lastName,
                passwordHash: await hashPassword(tempPassword),
                role: Role.STUDENT,
              },
            });
            const membership = await tx.membership.create({
              data: { userId: user.id, institutionId: job.institutionId, role: Role.STUDENT },
            });
            if (m.email && isDeliverableEmail(m.email)) {
              activation.push({
                userId: user.id,
                email: m.email,
                name: m.nameAr ?? `${m.firstName} ${m.lastName}`.trim(),
                tempPassword,
              });
            } else {
              credentials.push({
                name: m.nameAr ?? `${m.firstName} ${m.lastName}`.trim(),
                universityId: m.universityId,
                email,
                tempPassword,
              });
            }
            /* R350 I-P0 — the resolver: exact/normalised hit, or an
             * explicit audited create (preview promised it); unknown +
             * !createIfMissing is impossible here (preview errored the
             * row) but still guarded honestly. */
            let facultyId: string | undefined;
            if (m.faculty) {
              const res = resolveOrgName(m.faculty, faculties);
              if (res.kind === 'exact' || res.kind === 'normalised') {
                facultyId = res.ref.id;
              } else if (createIfMissing) {
                const created = await tx.faculty.create({ data: { name: m.faculty.trim(), institutionId: job.institutionId, city: 'غير محدد' }, select: { id: true, name: true } });
                faculties.push(created);
                createdOrgs.push({ kind: 'faculty', name: created.name, id: created.id });
                facultyId = created.id;
              }
            }
            let departmentId: string | undefined;
            if (m.department) {
              const res = resolveOrgName(m.department, departments);
              if (res.kind === 'exact' || res.kind === 'normalised') {
                departmentId = res.ref.id;
              } else if (createIfMissing) {
                const created = await tx.department.create({
                  data: { name: m.department.trim(), facultyId: facultyId ?? faculties[0]!.id },
                  select: { id: true, name: true },
                });
                departments.push({ ...created, facultyId: null as never });
                createdOrgs.push({ kind: 'department', name: created.name, id: created.id });
                departmentId = created.id;
              }
            }
            const profile = await tx.studentProfile.create({
              data: {
                userId: user.id,
                membershipId: membership.id,
                institutionId: job.institutionId,
                universityId: m.universityId,
                facultyId: facultyId ?? faculties[0]!.id,
                departmentId: departmentId ?? departments[0]!.id,
                year: m.year,
                nameAr: m.nameAr ?? `${m.firstName} ${m.lastName}`.trim(),
                stage: m.stage, grade: m.grade, section: m.section,
                studentPhone: m.studentPhone, studentPhoneNormalized: m.studentPhoneNormalized,
                guardianName: m.guardianName, guardianPhone: m.guardianPhone, guardianPhoneNormalized: m.guardianPhoneNormalized,
              },
              select: { id: true },
            });
            succeeded += 1;
            rowOutcomes.push({ line: row.line, status: 'OK', resultRef: profile.id, action: 'CREATED' });
          }
          // R350 I-P0 — the per-row ledger rides the SAME transaction:
          // the report.xlsx stops lying (all-PENDING) and a resumed job
          // shows exactly what happened per line. I-P2: action + before
          // ride too, and the write is updateMany — jobs beyond the
          // 2000-row ledger cap no longer crash on a missing row (the
          // counters stay honest, the ledger stays best-effort).
          for (const o of rowOutcomes) {
            await tx.importRow.updateMany({
              where: { jobId: job.id, line: o.line },
              data: {
                status: o.status, resultRef: o.resultRef ?? null, errorAr: o.errorAr ?? null,
                action: o.action ?? null,
                // the FIRST before-image stands across resumes (I-P2)
                before: priorUpdated.has(o.line) ? undefined : ((o.before ?? undefined) as object | undefined),
              },
            });
          }
        });

        await prisma.importJob.update({
          where: { id: job.id },
          data: { processedRows: i + chunk.length, succeededRows: succeeded, skippedRows: skipped, failedRows: failed },
        });
      }

      // R350 E3 — the activation invites ride the COMMITTED import
      // (best-effort, outbox-owned; the response/sheet stays the
      // registrar's fallback for placeholder/emailless rows).
      void (async () => {
        try {
          for (const a of activation) {
            await sendEventMail({
              userId: a.userId,
              to: a.email,
              category: 'account',
              template: 'activation-invite',
              ...renderActivationInvite(a.name, loginUrl(), a.tempPassword),
              dedupeKey: `import-activation:${a.userId}`,
              institutionId: job.institutionId,
            });
          }
        } catch (err) {
          logger.warn({ err, jobId: job.id }, 'import: activation mail failed (non-blocking)');
        }
      })();

      const completed = await prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          processedRows: okRows.length,
          succeededRows: succeeded,
          skippedRows: skipped,
          failedRows: failed + result.counts.error,
          summary: {
            ...(job.summary as object),
            duplicatePolicy,
            emailPlaceholder: okRows.some((r) => (r.mapped as { emailPlaceholder: boolean }).emailPlaceholder),
            activationMailQueued: activation.length,
            createdOrgs,
          },
        },
      });
      /* R350 I-P0 — the import commit becomes an AUDITED act (the r323
       * path always was): one row with the counts, the policy, and the
       * created organisations. */
      await prisma.auditLog.create({
        data: {
          action: 'IMPORT_COMMITTED',
          resourceType: 'ImportJob',
          resourceId: job.id,
          userId: req.user!.id,
          institutionId: job.institutionId,
          metadata: {
            fileName: job.fileName,
            duplicatePolicy,
            createIfMissing,
            succeeded,
            skipped,
            failed: failed + result.counts.error,
            activationMailQueued: activation.length,
            credentialsIssued: credentials.length,
            createdOrgs,
          },
        },
      });
      /* The one-time credentials sheet: ONLY rows without a deliverable
       * email (emailless/placeholder) — deliverable ones get the
       * activation mail. Never persisted raw; shown once. */
      res.json({
        data: {
          jobId: completed.id,
          status: completed.status,
          succeeded,
          skipped,
          failed: completed.failedRows,
          activationMailQueued: activation.length,
          credentials: credentials.map((c) => ({ ...c, tempPassword: c.tempPassword })),
        },
      });
    } catch (e) {
      next(e);
    }
  },
);

/* ── GET /import/jobs — the institution's job list ───────────────── */

router.get(
  '/jobs',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(z.object({ institutionId: z.string().optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) }), 'query'),
  async (req, res, next) => {
    try {
      const instId = await resolveInstitutionId(req, (req.query as { institutionId?: string }).institutionId);
      const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
      const [jobs, total] = await Promise.all([
        prisma.importJob.findMany({
          where: { institutionId: instId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: { id: true, entity: true, fileName: true, format: true, status: true, totalRows: true, processedRows: true, succeededRows: true, skippedRows: true, failedRows: true, rolledBackAt: true, createdAt: true },
        }),
        prisma.importJob.count({ where: { institutionId: instId } }),
      ]);
      res.json({ data: { jobs, page, pageSize, total } });
    } catch (e) {
      next(e);
    }
  },
);

/* ── GET /import/jobs/:id — progress polling ─────────────────────── */

router.get(
  '/jobs/:id',
  requireRole(Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const job = await prisma.importJob.findUnique({ where: { id: req.params.id } });
      if (!job) throw AppError.notFound('مهمة الاستيراد غير موجودة');
      await resolveInstitutionId(req, job.institutionId);
      res.json({ data: job });
    } catch (e) {
      next(e);
    }
  },
);

/* ── POST /import/jobs/:id/rollback — undo a committed import ──────
 * R350 I-P2 — the time-boxed, audited undo:
 *  · CREATED rows: the account is deleted (profile + membership +
 *    user) ONLY if it never logged in and carries no activity
 *    (enrolments/submissions); an active account is KEPT and counted
 *    (never destroy a student's real life to undo a spreadsheet).
 *  · UPDATED rows: the before-image recorded at commit time is
 *    restored verbatim.
 *  · orgs this job created: removed only when now empty.
 *  · Window: 72h from completion; one rollback per job; the act is
 *    audited (IMPORT_ROLLED_BACK) and the summary JSON keeps the
 *    counts forever. */

const ROLLBACK_WINDOW_MS = 72 * 60 * 60 * 1000;

router.post(
  '/jobs/:id/rollback',
  importLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const job = await prisma.importJob.findUnique({ where: { id: req.params.id } });
      if (!job) throw AppError.notFound('مهمة الاستيراد غير موجودة');
      await resolveInstitutionId(req, job.institutionId);
      if (job.status !== 'COMPLETED') throw AppError.badRequest('التراجع متاح للمهام المكتملة فقط');
      if (job.rolledBackAt) throw AppError.badRequest('هذه المهمة مردودة بالفعل — لا يمكن التراجع مرتين');
      if (Date.now() - job.updatedAt.getTime() > ROLLBACK_WINDOW_MS) {
        throw AppError.badRequest('انقضت نافذة التراجع (٧٢ ساعة من إتمام المهمة) — أنشئ مهمة تصحيح بدلًا من ذلك');
      }
      if (job.entity === 'TEACHER') {
        throw AppError.badRequest('مسار تراجع استيراد المدرّسين قيد الإعداد — المسار المفعّل لاستيراد الطلاب فقط');
      }

      const rows = await prisma.importRow.findMany({
        where: { jobId: job.id, action: { in: ['CREATED', 'UPDATED'] } },
        orderBy: { line: 'asc' },
      });

      let deletedUsers = 0;
      let restoredUpdates = 0;
      let keptActive = 0;
      let removedEmptyOrgs = 0;
      let missingRows = 0;

      for (const row of rows) {
        if (!row.resultRef) continue;
        if (row.action === 'UPDATED') {
          const before = (row.before ?? {}) as Record<string, unknown>;
          if (Object.keys(before).length > 0) {
            await prisma.studentProfile.update({ where: { id: row.resultRef }, data: before }).catch(() => {
              missingRows += 1; // the profile vanished since (deleted by hand?) — nothing to restore
            });
          }
          restoredUpdates += 1;
          continue;
        }
        // CREATED — undo only a never-activated account.
        const profile = await prisma.studentProfile.findUnique({
          where: { id: row.resultRef },
          select: { id: true, userId: true, membershipId: true },
        });
        if (!profile) { missingRows += 1; continue; }
        const [login, enrollments, submissions] = await Promise.all([
          prisma.loginEvent.findFirst({ where: { userId: profile.userId, success: true }, select: { id: true } }),
          prisma.enrollment.count({ where: { studentId: profile.userId } }),
          prisma.submission.count({ where: { studentId: profile.userId } }),
        ]);
        if (login || enrollments > 0 || submissions > 0) { keptActive += 1; continue; }
        await prisma.studentProfile.delete({ where: { id: profile.id } });
        await prisma.membership.delete({ where: { id: profile.membershipId } });
        await prisma.user.delete({ where: { id: profile.userId } });
        deletedUsers += 1;
      }

      // Orgs this job created: sweep only the ones that ended up empty.
      const summary = (job.summary ?? {}) as { createdOrgs?: { kind: 'faculty' | 'department'; name: string; id?: string }[] };
      for (const org of summary.createdOrgs ?? []) {
        if (!org.id) continue; // pre-I-P2 summary — no id, no safe sweep
        if (org.kind === 'faculty') {
          const [profiles, deps] = await Promise.all([
            prisma.studentProfile.count({ where: { facultyId: org.id } }),
            prisma.department.count({ where: { facultyId: org.id } }),
          ]);
          if (profiles === 0 && deps === 0) {
            await prisma.faculty.delete({ where: { id: org.id } }).then(() => { removedEmptyOrgs += 1; }).catch(() => {});
          }
        } else {
          const profiles = await prisma.studentProfile.count({ where: { departmentId: org.id } });
          if (profiles === 0) {
            await prisma.department.delete({ where: { id: org.id } }).then(() => { removedEmptyOrgs += 1; }).catch(() => {});
          }
        }
      }

      const rollbackSummary = {
        deletedUsers,
        restoredUpdates,
        keptActive,
        removedEmptyOrgs,
        missingRows,
        at: new Date().toISOString(),
      };
      await prisma.importJob.update({
        where: { id: job.id },
        data: { rolledBackAt: new Date(), rollbackSummary },
      });
      await prisma.auditLog.create({
        data: {
          action: 'IMPORT_ROLLED_BACK',
          resourceType: 'ImportJob',
          resourceId: job.id,
          userId: req.user!.id,
          institutionId: job.institutionId,
          metadata: { fileName: job.fileName, ...rollbackSummary },
        },
      });
      res.json({ data: { jobId: job.id, ...rollbackSummary } });
    } catch (e) {
      next(e);
    }
  },
);

/* ── GET /import/templates/:entity.xlsx — REAL workbooks ─────────── */

router.get(
  '/templates/:entity',
  importLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const entity = entitySchema.parse(req.params.entity);
      const buf = await buildImportTemplate(entity);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="madarek-import-${entity.toLowerCase()}.xlsx"`);
      res.send(buf);
    } catch (e) {
      next(e);
    }
  },
);

/* ── GET /import/jobs/:id/report.xlsx — the per-line result sheet ─── */

router.get(
  '/jobs/:id/report.xlsx',
  requireRole(Role.ADMIN, Role.OWNER),
  async (req, res, next) => {
    try {
      const job = await prisma.importJob.findUnique({ where: { id: req.params.id } });
      if (!job) throw AppError.notFound('مهمة الاستيراد غير موجودة');
      await resolveInstitutionId(req, job.institutionId);
      const rows = await prisma.importRow.findMany({ where: { jobId: job.id }, orderBy: { line: 'asc' } });
      const buf = await buildImportReport(
        rows.map((r) => {
          const m = (r.mappedData ?? {}) as { nameAr?: string; firstName?: string; lastName?: string; universityId?: string };
          const statusMap = { OK: 'ok', SKIPPED: 'skipped', ERROR: 'error', PENDING: 'pending' } as const;
          return {
            line: r.line,
            status: statusMap[r.status as keyof typeof statusMap] ?? 'pending',
            detail: r.errorAr ?? undefined,
            name: (m.nameAr ?? [m.firstName, m.lastName].filter(Boolean).join(' ')) || `السطر ${r.line}`,
            identifier: m.universityId ?? '—',
          };
        }),
        { entity: job.entity as ImportEntity, fileName: job.fileName, counts: { total: job.totalRows, succeeded: job.succeededRows, skipped: job.skippedRows, failed: job.failedRows } },
      );
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="madarek-import-report-${job.id.slice(-8)}.xlsx"`);
      res.send(buf);
    } catch (e) {
      next(e);
    }
  },
);

/* ── mapping profiles — save + list reusable mappings ────────────── */

const profileBodySchema = z.object({
  institutionId: z.string().min(1).max(64).optional(),
  name: z.string().min(1).max(80),
  entity: entitySchema,
  profile: z.object({ version: z.literal(1), columns: z.array(z.object({ source: z.string(), target: z.string() })).min(1) }),
});

router.post(
  '/mapping-profiles',
  importLimiter,
  requireRole(Role.ADMIN, Role.OWNER),
  validate(profileBodySchema, 'body'),
  async (req, res, next) => {
    try {
      const { institutionId, name, entity, profile } = req.body as z.infer<typeof profileBodySchema>;
      const instId = await resolveInstitutionId(req, institutionId);
      const saved = await prisma.importMappingProfile.upsert({
        where: { institutionId_name: { institutionId: instId, name } },
        create: { institutionId: instId, name, entity, profile: profile as object, createdById: req.user!.id },
        update: { entity, profile: profile as object },
      });
      res.json({ data: saved });
    } catch (e) {
      next(e);
    }
  },
);

router.get(
  '/mapping-profiles',
  requireRole(Role.ADMIN, Role.OWNER),
  validate(z.object({ institutionId: z.string().optional() }), 'query'),
  async (req, res, next) => {
    try {
      const instId = await resolveInstitutionId(req, (req.query as { institutionId?: string }).institutionId);
      const profiles = await prisma.importMappingProfile.findMany({
        where: { institutionId: instId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: profiles });
    } catch (e) {
      next(e);
    }
  },
);



/* ── R350 I-P3 — MODE B: batch enrolment (إرفاق الطلاب دفعة واحدة) ──
 *
 * The owner's «ارفاق الطلاب دفعة واحدة»: attach EXISTING students to a
 * course offering in one batch. Each ref (a pasted reg-number / phone /
 * national-id / exact name) resolves through the chain
 * universityId → phone → nationalIdHash → exact-unique-name; already-
 * enrolled students report as such (never a duplicate error); the
 * commit honours the offering's capacity with the SAME row-lock the
 * single-enrolment route uses, audits every seat, and queues the E3
 * enrolment-confirmed mail per created seat.
 *
 * Scope: TEACHER → own offerings only; ADMIN → their institution;
 * OWNER → any active offering. */

const enrollPreviewSchema = z.object({
  offeringId: z.string().cuid(),
  refs: z.array(z.string().trim().min(1).max(120)).min(1).max(500),
});

const enrollCommitSchema = z.object({
  offeringId: z.string().cuid(),
  studentIds: z.array(z.string().cuid()).min(1).max(500),
});

type EnrolScope = { offeringId: string; institutionId: string; capacity: number };

async function assertBatchEnrolScope(req: Request, offeringId: string): Promise<EnrolScope> {
  const offering = await prisma.courseOffering.findUnique({
    where: { id: offeringId },
    select: { teacherId: true, capacity: true, course: { select: { institutionId: true } } },
  });
  if (!offering) throw AppError.notFound('المقرر المحدد غير موجود');
  if (req.user!.role === Role.TEACHER) {
    if (offering.teacherId !== req.user!.id) {
      throw AppError.forbidden('يمكنك الإرفاق في المقررات التي تُدرّسها فقط');
    }
  } else if (req.user!.role === Role.ADMIN) {
    const scope = await resolveCallerInstitutionScope(req.user!.id, req.user!.institutionId);
    if (scope === null) throw institutionContextRequiredError();
    if (offering.course.institutionId !== scope) {
      throw AppError.forbidden('هذا المقرر ينتمي إلى مؤسسة أخرى');
    }
  }
  return { offeringId, institutionId: offering.course.institutionId, capacity: offering.capacity };
}

/** The matching chain: reg-number → phone → nationalId → exact-unique
 *  name. Returns the student's user id + how it matched, or why not. */
async function matchStudentRef(
  institutionId: string,
  ref: string,
): Promise<{ studentId: string; name: string; universityId: string | null; method: 'universityId' | 'phone' | 'nationalId' | 'name' } | { reason: string }> {
  const base = { institutionId };
  // 1. reg-number (the registrar's canonical key)
  const byUniId = await prisma.studentProfile.findFirst({
    where: { ...base, universityId: ref },
    select: { userId: true, nameAr: true, universityId: true },
  });
  if (byUniId) return { studentId: byUniId.userId, name: byUniId.nameAr ?? '', universityId: byUniId.universityId, method: 'universityId' };
  // 2. phone (the student's own, normalized)
  const phone = normalizePhone(ref);
  if (phone) {
    const byPhone = await prisma.studentProfile.findFirst({
      where: { ...base, studentPhoneNormalized: phone.normalized },
      select: { userId: true, nameAr: true, universityId: true },
    });
    if (byPhone) return { studentId: byPhone.userId, name: byPhone.nameAr ?? '', universityId: byPhone.universityId, method: 'phone' };
  }
  // 3. national id (hash — exact only, by design)
  const nid = normalizeNationalId(ref);
  if (nid) {
    const byNid = await prisma.studentProfile.findFirst({
      where: { ...base, nationalIdHash: hashNationalId(nid) },
      select: { userId: true, nameAr: true, universityId: true },
    });
    if (byNid) return { studentId: byNid.userId, name: byNid.nameAr ?? '', universityId: byNid.universityId, method: 'nationalId' };
  }
  // 4. exact name — only when UNIQUE in the institution (an ambiguous
  // name is a reason, never a silent pick)
  if (ref.includes(' ')) {
    const byName = await prisma.studentProfile.findMany({
      where: { ...base, nameAr: ref.trim() },
      select: { userId: true, nameAr: true, universityId: true },
      take: 2,
    });
    if (byName.length === 1) {
      const only = byName[0]!;
      return { studentId: only.userId, name: only.nameAr ?? '', universityId: only.universityId, method: 'name' };
    }
    if (byName.length > 1) {
      return { reason: `الاسم «${ref}» يحمله أكثر من طالب — استخدم الرقم الجامعي أو الهاتف` };
    }
  }
  return { reason: `لم يُعثر على طالب يطابق «${ref}» في هذه المؤسسة` };
}

router.post('/enroll/preview', importLimiter, requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), validate(enrollPreviewSchema, 'body'), async (req, res, next) => {
  try {
    const { offeringId, refs } = req.body as z.infer<typeof enrollPreviewSchema>;
    const scope = await assertBatchEnrolScope(req, offeringId);

    const [enrolled, activeCount] = await Promise.all([
      prisma.enrollment.findMany({ where: { offeringId, status: 'active' }, select: { studentId: true } }),
      prisma.enrollment.count({ where: { offeringId, status: 'active' } }),
    ]);
    const enrolledSet = new Set(enrolled.map((e) => e.studentId));

    const matched: ({ ref: string } & Awaited<ReturnType<typeof matchStudentRef>>)[] = [];
    const matchedIds = new Set<string>();
    const alreadyEnrolled: { ref: string; studentId: string; name: string }[] = [];
    const unmatched: { ref: string; reason: string }[] = [];
    for (const ref of refs) {
      const m = await matchStudentRef(scope.institutionId, ref);
      if ('reason' in m) {
        unmatched.push({ ref, reason: m.reason });
        continue;
      }
      if (enrolledSet.has(m.studentId)) {
        alreadyEnrolled.push({ ref, studentId: m.studentId, name: m.name });
        continue;
      }
      // one ref per student: a second ref matching the SAME student reports as a duplicate ref
      if (matchedIds.has(m.studentId)) {
        unmatched.push({ ref, reason: `طالب مطابق لمرجع آخر في القائمة نفسها (${m.name})` });
        continue;
      }
      matchedIds.add(m.studentId);
      matched.push({ ref, ...m });
    }

    res.json({
      data: {
        offeringId,
        capacity: { used: activeCount, total: scope.capacity, free: Math.max(0, scope.capacity - activeCount) },
        matched,
        alreadyEnrolled,
        unmatched,
      },
    });
  } catch (e) {
    next(e);
  }
});

router.post('/enroll/commit', importLimiter, requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), validate(enrollCommitSchema, 'body'), async (req, res, next) => {
  try {
    const { offeringId, studentIds } = req.body as z.infer<typeof enrollCommitSchema>;
    await assertBatchEnrolScope(req, offeringId);

    const created: string[] = [];
    let skippedAlready = 0;
    let failedCapacity = 0;

    const result = await prisma.$transaction(async (tx) => {
      // the SAME per-offering row lock the single-enrolment route uses —
      // a batch can never race itself or the single path past capacity.
      await tx.$queryRaw`SELECT id FROM "CourseOffering" WHERE id = ${offeringId} FOR UPDATE`;
      const activeCount = await tx.enrollment.count({ where: { offeringId, status: 'active' } });
      const offering = await tx.courseOffering.findUnique({ where: { id: offeringId }, select: { capacity: true, course: { select: { name: true } } } });
      if (!offering) throw AppError.notFound('المقرر المحدد غير موجود');
      // one batched read of the existing seats (idempotent skips)
      const existing = await tx.enrollment.findMany({
        where: { offeringId, studentId: { in: studentIds } },
        select: { studentId: true },
      });
      const existingSet = new Set(existing.map((e) => e.studentId));

      let seats = activeCount;
      for (const studentId of studentIds) {
        if (existingSet.has(studentId)) {
          skippedAlready += 1;
          continue;
        }
        if (seats >= offering.capacity) {
          failedCapacity += 1;
          continue;
        }
        const enrollment = await tx.enrollment.create({ data: { studentId, offeringId }, select: { id: true } });
        await tx.auditLog.create({
          data: {
            action: 'ENROLLMENT_CREATED',
            resourceType: 'Enrollment',
            resourceId: enrollment.id,
            userId: req.user!.id,
            metadata: { studentId, offeringId, batch: true },
          },
        });
        created.push(studentId);
        seats += 1;
      }
      return { courseName: offering.course.name };
    });

    // R350 E3 — the enrolment-confirmation fan-out (never-throw, outbox)
    void (async () => {
      try {
        const students = created.length
          ? await prisma.user.findMany({ where: { id: { in: created }, isActive: true }, select: { id: true, email: true, firstName: true } })
          : [];
        for (const st of students) {
          if (!isDeliverableEmail(st.email)) continue;
          await sendEventMail({
            userId: st.id,
            to: st.email,
            category: 'courses',
            template: 'enrollment-confirmed',
            ...renderEnrollmentConfirmed(result.courseName, null),
            ctaLabel: 'مقرراتي',
            dedupeKey: `enroll-batch:${offeringId}:${st.id}`,
          });
        }
      } catch (err) {
        logger.warn({ err, offeringId }, 'import: enrol-batch confirmation mail failed (non-blocking)');
      }
    })();

    res.json({
      data: {
        offeringId,
        created: created.length,
        skippedAlready,
        failedCapacity,
      },
    });
  } catch (e) {
    next(e);
  }
});

export const importRoutes = router;
