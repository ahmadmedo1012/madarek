/**
 * Backend unit test — the upload guard layer + wiring pins for the
 * P3-BE real-upload routes (STUDENT paper PDF upload, TEACHER material
 * PDF upload, gated material serving).
 *
 * Two layers, both DB-free (house pattern):
 *  1. Pure guards imported from the route modules: the %PDF- magic-byte
 *     validator, the 20 MB size gate, and the single-range parser.
 *  2. Source-scan wiring pins (the learning-logic.test.ts technique —
 *     the file is the contract): each route must exist with its exact
 *     middleware chain (role gate BEFORE body buffering, express.raw,
 *     createRouteLimiter, zod), the material gate must carry the
 *     enrollment grant predicate, and env.ts must keep the s3
 *     fail-closed superRefine. A helper passing its pure tests while
 *     the live route re-inlines (or drops) the guard is exactly the
 *     drift class these pins kill.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  containsPdfActiveContent,
  isPdfMagicBytes,
  isUploadSizeOk,
  isUploadWithinQuota,
  MAX_UPLOAD_PDF_BYTES,
  parseRangeHeader,
  USER_PAPER_QUOTA_BYTES,
} from '../../src/http/routes/files.routes.js';
import { materialFileQuerySchema } from '../../src/http/routes/offerings.routes.js';

const filesRouteSource = readFileSync(
  new URL('../../src/http/routes/files.routes.ts', import.meta.url),
  'utf8',
);
const offeringsRouteSource = readFileSync(
  new URL('../../src/http/routes/offerings.routes.ts', import.meta.url),
  'utf8',
);
const envSource = readFileSync(new URL('../../src/env.ts', import.meta.url), 'utf8');
const pdfSource = readFileSync(new URL('../../src/lib/pdf.ts', import.meta.url), 'utf8');

// ─── Pure guards ──────────────────────────────────────────────────

describe('isPdfMagicBytes (Content-Type lies; bytes do not)', () => {
  it('accepts real PDF headers (any version digits)', () => {
    expect(isPdfMagicBytes(Buffer.from('%PDF-1.7 rest of file'))).toBe(true);
    expect(isPdfMagicBytes(Buffer.from('%PDF-2.0…'))).toBe(true);
    expect(isPdfMagicBytes(Buffer.from('%PDF-'))).toBe(true);
  });

  it('rejects empty bodies and non-PDF signatures', () => {
    expect(isPdfMagicBytes(Buffer.from(''))).toBe(false);
    expect(isPdfMagicBytes(Buffer.from('GIF89a…'))).toBe(false);
    expect(isPdfMagicBytes(Buffer.from('pdf- looks like text'))).toBe(false);
    expect(isPdfMagicBytes(Buffer.from('%PDF1.7'))).toBe(false); // missing dash
    expect(isPdfMagicBytes(Buffer.from('%pdf-1.7'))).toBe(false); // case matters
  });
});

describe('isUploadSizeOk (20 MB cap)', () => {
  it('pins the cap constant to 20 MB', () => {
    expect(MAX_UPLOAD_PDF_BYTES).toBe(20 * 1024 * 1024);
  });

  it('accepts (0, 20MB] and rejects 0 / over-cap / negative / non-integer', () => {
    expect(isUploadSizeOk(0)).toBe(false); // empty upload → 413, per contract
    expect(isUploadSizeOk(1)).toBe(true);
    expect(isUploadSizeOk(MAX_UPLOAD_PDF_BYTES)).toBe(true); // boundary inclusive
    expect(isUploadSizeOk(MAX_UPLOAD_PDF_BYTES + 1)).toBe(false);
    expect(isUploadSizeOk(-5)).toBe(false);
    expect(isUploadSizeOk(3.5)).toBe(false);
  });
});

// ─── r170g: PDF active-content heuristic (poor-man's ASVS 12.4.2) ──

describe('containsPdfActiveContent (byte-scan for active PDF operators)', () => {
  // Minimal honest PDF skeleton — magic header + catalog + trailer, no
  // active markers anywhere. Synthetic buffers; no real files needed.
  const cleanPdf = Buffer.from(
    '%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Size 4 /Root 1 0 R >>\n%%EOF\n',
  );

  it('passes a clean PDF (valid header, catalog, trailer — no markers)', () => {
    expect(containsPdfActiveContent(cleanPdf)).toBe(false);
  });

  it('rejects a buffer embedding /JavaScript (embedded script)', () => {
    const hostile = Buffer.concat([cleanPdf, Buffer.from('/JavaScript (app.alert(1))')]);
    expect(containsPdfActiveContent(hostile)).toBe(true);
  });

  it('rejects /OpenAction (auto-run on open)', () => {
    const hostile = Buffer.concat([cleanPdf, Buffer.from('/OpenAction << /S /JavaScript >>')]);
    expect(containsPdfActiveContent(hostile)).toBe(true);
  });

  it('rejects /Launch (spawn an external application)', () => {
    const hostile = Buffer.concat([cleanPdf, Buffer.from('/Launch (calc.exe)')]);
    expect(containsPdfActiveContent(hostile)).toBe(true);
  });

  it('is case-sensitive: lowercase variants are not PDF operators — no false positive', () => {
    expect(containsPdfActiveContent(Buffer.concat([cleanPdf, Buffer.from('/javascript')]))).toBe(false);
    expect(containsPdfActiveContent(Buffer.concat([cleanPdf, Buffer.from('/openaction')]))).toBe(false);
    expect(containsPdfActiveContent(Buffer.concat([cleanPdf, Buffer.from('/launch')]))).toBe(false);
  });

  it('scans only the passed bytes, not surrounding pooled-buffer memory', () => {
    // The marker sits OUTSIDE the subarray view — must not be seen.
    const pooled = Buffer.from('/JavaScript..........clean-bytes');
    const view = new Uint8Array(pooled.buffer, pooled.byteOffset + 11, 5);
    expect(containsPdfActiveContent(view)).toBe(false);
    expect(containsPdfActiveContent(new Uint8Array(0))).toBe(false);
  });
});

// ─── r170g: per-user upload quota (ASVS 12.1.3) ───────────────────

describe('isUploadWithinQuota (per-user 200 MB paper quota)', () => {
  it('pins the quota constant to 200 MB (= 10 papers × the 20 MB per-file cap)', () => {
    expect(USER_PAPER_QUOTA_BYTES).toBe(200 * 1024 * 1024);
  });

  it('accepts a first upload, and the 10th max-size paper at the exact boundary', () => {
    expect(isUploadWithinQuota(0, MAX_UPLOAD_PDF_BYTES)).toBe(true);
    expect(isUploadWithinQuota(9, MAX_UPLOAD_PDF_BYTES)).toBe(true); // 9×20 + 20 = 200MB
    expect(isUploadWithinQuota(5, 512 * 1024)).toBe(true); // seed-shaped: 5 papers + small file
  });

  it('rejects when the projected footprint crosses the quota', () => {
    expect(isUploadWithinQuota(10, 1)).toBe(false); // 10 papers already = the whole quota
    expect(isUploadWithinQuota(9, MAX_UPLOAD_PDF_BYTES + 1)).toBe(false); // one byte over
    expect(isUploadWithinQuota(10, 512 * 1024)).toBe(false);
  });
});

describe('parseRangeHeader (single-range serving)', () => {
  it('no header / malformed / multi-range → null (serve full 200)', () => {
    expect(parseRangeHeader(undefined, 100)).toBeNull();
    expect(parseRangeHeader('bytes=0-1,3-4', 100)).toBeNull(); // multi-range unsupported
    expect(parseRangeHeader('nonsense', 100)).toBeNull();
    expect(parseRangeHeader('bytes=', 100)).toBeNull();
    expect(parseRangeHeader('bytes=-', 100)).toBeNull();
    expect(parseRangeHeader('bytes=80-79', 100)).toBeNull(); // end < start
  });

  it('parses start-end, open-ended, and suffix forms with clamping', () => {
    expect(parseRangeHeader('bytes=0-49', 100)).toEqual({ start: 0, end: 49 });
    expect(parseRangeHeader('bytes=50-', 100)).toEqual({ start: 50, end: 99 });
    expect(parseRangeHeader('bytes=-10', 100)).toEqual({ start: 90, end: 99 });
    expect(parseRangeHeader('bytes=-500', 100)).toEqual({ start: 0, end: 99 }); // clamped suffix
    expect(parseRangeHeader('bytes=5-999', 100)).toEqual({ start: 5, end: 99 }); // clamped end
  });

  it('flags unsatisfiable ranges (416 path)', () => {
    expect(parseRangeHeader('bytes=100-', 100)).toBe('unsatisfiable'); // start >= size
    expect(parseRangeHeader('bytes=250-300', 100)).toBe('unsatisfiable');
    expect(parseRangeHeader('bytes=-0', 100)).toBe('unsatisfiable'); // zero suffix
  });
});

describe('materialFileQuerySchema (metadata rides the query string)', () => {
  it('accepts and trims the PDF literal', () => {
    expect(materialFileQuerySchema.safeParse({ name: '  المحاضرة الأولى ', type: 'PDF' }).data).toEqual({
      name: 'المحاضرة الأولى',
      type: 'PDF',
    });
    expect(
      materialFileQuerySchema.safeParse({ name: 'x', description: ' ملاحظات ', type: 'PDF' }).data,
    ).toEqual({ name: 'x', description: 'ملاحظات', type: 'PDF' });
  });

  it('rejects empty/oversized names, wrong type, and extra keys (.strict)', () => {
    expect(materialFileQuerySchema.safeParse({ name: '   ', type: 'PDF' }).success).toBe(false); // trimmed-empty
    expect(materialFileQuerySchema.safeParse({ name: 'x', type: 'VIDEO' }).success).toBe(false);
    expect(materialFileQuerySchema.safeParse({ name: 'x', type: 'PDF', extra: 1 }).success).toBe(false);
    expect(materialFileQuerySchema.safeParse({ type: 'PDF' }).success).toBe(false); // name required
    expect(
      materialFileQuerySchema.safeParse({ name: 'x'.repeat(201), type: 'PDF' }).success,
    ).toBe(false);
  });
});

// ─── Wiring pins (source-scan — the file is the contract) ─────────

describe('POST /files/papers wiring (STUDENT upload)', () => {
  it('registers the route with role gate BEFORE raw body + limiter + express.raw(20mb)', () => {
    // Role first: a teacher's oversized body is 403'd before buffering.
    expect(filesRouteSource).toMatch(
      /router\.post\(\s*'\/papers',\s*requireRole\(Role\.STUDENT\),\s*paperUploadLimiter,\s*express\.raw\(\{ type: 'application\/pdf', limit: '20mb' \}\),/,
    );
  });

  it('consumes the shared limiter factory (createRouteLimiter), not a bespoke limiter', () => {
    expect(filesRouteSource).toContain('createRouteLimiter({ max: 10 })');
  });

  it('runs the Buffer/size/magic guards in order, then puts via the storage abstraction', () => {
    const handlerStart = filesRouteSource.indexOf("router.post(\n  '/papers',");
    const handlerEnd = filesRouteSource.indexOf("router.get('/papers/:filename'");
    const uploadRoute = filesRouteSource.slice(handlerStart, handlerEnd);
    const bufferCheck = uploadRoute.indexOf('Buffer.isBuffer(body)');
    const sizeCheck = uploadRoute.indexOf('!isUploadSizeOk(body.length)');
    const magicCheck = uploadRoute.indexOf('!isPdfMagicBytes(body)');
    const putCheck = uploadRoute.indexOf('getStorage().put(key, body)');
    expect([bufferCheck, sizeCheck, magicCheck, putCheck].every((i) => i >= 0)).toBe(true);
    expect(bufferCheck).toBeLessThan(sizeCheck);
    expect(sizeCheck).toBeLessThan(magicCheck);
    expect(magicCheck).toBeLessThan(putCheck);
    // Honest failure text on put (storage failure → 500 with Arabic message):
    expect(uploadRoute).toContain("AppError.internal('تعذّر حفظ الملف — حاول مرة أخرى')");
    // 201 + the fileUrl the paper row stores:
    expect(uploadRoute).toContain('res.status(201).json({ data: { fileUrl: paperFilenameToFileUrl(filename) } })');
    // And the no-row-here honesty comment (orphan upload is inert):
    expect(filesRouteSource).toContain('NO ResearchPaper row is created here');
  });

  it('r170g: active-content + quota guards sit between magic bytes and the put', () => {
    const handlerStart = filesRouteSource.indexOf("router.post(\n  '/papers',");
    const handlerEnd = filesRouteSource.indexOf("router.get('/papers/:filename'");
    const uploadRoute = filesRouteSource.slice(handlerStart, handlerEnd);
    const magicCheck = uploadRoute.indexOf('!isPdfMagicBytes(body)');
    const activeCheck = uploadRoute.indexOf('containsPdfActiveContent(body)');
    const quotaCount = uploadRoute.indexOf('prisma.researchPaper.count({');
    // r176d (F-05b): the quota counts only papers whose bytes live in
    // OUR storage — external-URL papers store nothing and no longer
    // eat the 20MB-per-row charge.
    const quotaWhere = uploadRoute.indexOf("where: {\n          studentId: req.user!.id,\n          fileUrl: { startsWith: '/api/v1/files/papers/' },\n        }".replace('\\n', '\n'));
    const quotaCheck = uploadRoute.indexOf('!isUploadWithinQuota(storedPaperCount, body.length)');
    const putCheck = uploadRoute.indexOf('getStorage().put(key, body)');
    expect([magicCheck, activeCheck, quotaCount, quotaWhere, quotaCheck, putCheck].every((i) => i >= 0))
      .toBe(true);
    expect(magicCheck).toBeLessThan(activeCheck); // byte gates before the DB query
    expect(activeCheck).toBeLessThan(quotaCount);
    expect(quotaCount).toBeLessThan(quotaCheck);
    expect(quotaCheck).toBeLessThan(putCheck); // quota BEFORE any byte is stored
    // Arabic rejection copy: active content → 400, quota → 413 envelope.
    expect(uploadRoute).toContain(
      "AppError.badRequest('ملف PDF يحتوي تضمينات برمجية نشطة — غير مسموح')",
    );
    expect(uploadRoute).toContain(
      "new AppError('PAYLOAD_TOO_LARGE', 'تجاوزت حصة التخزين الخاصة بك', 413)",
    );
    // One query, no transaction wrapper (the bound-not-invariant contract):
    expect(uploadRoute).not.toContain('$transaction');
  });
});

describe('POST /offerings/:id/materials/file wiring (TEACHER/ADMIN/OWNER upload)', () => {
  it('registers the route with role gate, limiter, zod query validation, and express.raw', () => {
    expect(offeringsRouteSource).toMatch(
      /router\.post\(\s*'\/:id\/materials\/file',\s*requireRole\(Role\.TEACHER, Role\.ADMIN, Role\.OWNER\),\s*materialUploadLimiter,\s*validate\(materialFileQuerySchema, 'query'\),\s*express\.raw\(\{ type: 'application\/pdf', limit: '20mb' \}\),/,
    );
  });

  it('gates with assertOfferingAccess BEFORE creating the row, and stores via the abstraction', () => {
    const routeStart = offeringsRouteSource.indexOf("'/:id/materials/file',");
    const routeSlice = offeringsRouteSource.slice(routeStart, routeStart + 2200);
    const accessCheck = routeSlice.indexOf('await assertOfferingAccess(offeringId, req.user!.id, req.user!.role);');
    const create = routeSlice.indexOf('prisma.material.create({');
    const put = routeSlice.indexOf("getStorage().put(buildStorageKey('materials', filename), body)");
    expect([accessCheck, create, put].every((i) => i >= 0)).toBe(true);
    expect(accessCheck).toBeLessThan(create);
    expect(create).toBeLessThan(put);
    // Row first with its generated id, url pointing at the serving route:
    expect(routeSlice).toContain("url: materialFilenameToServingPath(filename)");
    expect(routeSlice).toContain('sizeBytes: BigInt(body.length)');
  });

  it('deletes the row when the put fails (atomic-ish: no row without bytes) and rethrows 500', () => {
    const routeStart = offeringsRouteSource.indexOf("'/:id/materials/file',");
    const routeSlice = offeringsRouteSource.slice(routeStart, routeStart + 2600);
    expect(routeSlice).toContain('await prisma.material.delete({ where: { id } })');
    expect(routeSlice).toContain("AppError.internal('تعذّر حفظ الملف — حاول مرة أخرى')");
  });
});

describe('GET /files/materials/:filename wiring (gated material serving)', () => {
  it('registers the route with the traversal + pdf gates, then serves via the abstraction', () => {
    expect(filesRouteSource).toMatch(
      /router\.get\(\s*'\/materials\/:filename',\s*async \(req, res, next\) => \{/,
    );
    const routeStart = filesRouteSource.indexOf("router.get('/materials/:filename'");
    const routeSlice = filesRouteSource.slice(routeStart);
    expect(routeSlice).toContain('containsTraversalPatterns(filename)');
    expect(routeSlice).toContain('isPdfFilename(filename)');
    expect(routeSlice).toContain("buildStorageKey('materials', filename)");
  });

  it('carries the enrollment grant predicate inside the material query (teacher OR active enrollment)', () => {
    // Same findFirst-with-grant-predicate shape as the papers gate: a
    // shared filename can never push the authorizing row out of a
    // take-window, and dropped/completed enrollments never grant.
    expect(filesRouteSource).toMatch(
      /url: \{ endsWith: `\/\$\{filename\}` \},\s*OR: \[\s*\{ offering: \{ teacherId: uid \} \},\s*\{ offering: \{ enrollments: \{ some: \{ studentId: uid, status: 'active' \} \} \} \},\s*\],/,
    );
  });

  it('keeps the oversight bypass on the same isPaperOversightRole gate as papers', () => {
    const routeStart = filesRouteSource.indexOf("router.get('/materials/:filename'");
    const routeSlice = filesRouteSource.slice(routeStart);
    expect(routeSlice).toContain('if (!isPaperOversightRole(role)) {');
  });
});

describe('GET /files/papers/:filename wiring (unchanged gate, new source)', () => {
  it('still resolves the paper row with the grant predicate inside the query', () => {
    expect(filesRouteSource).toMatch(
      /fileUrl: \{ endsWith: `\/\$\{filename\}` \},\s*OR: \[\{ status: 'PUBLISHED' \}, \{ studentId: uid \}, \{ reviewerId: uid \}\],/,
    );
  });

  it('serves bytes through the storage abstraction, not direct fs', () => {
    const routeStart = filesRouteSource.indexOf("router.get('/papers/:filename'");
    const routeSlice = filesRouteSource.slice(routeStart, filesRouteSource.indexOf("router.get('/materials/:filename'"));
    expect(routeSlice).toContain("buildStorageKey('papers', filename)");
    expect(routeSlice).not.toContain('sendFile');
    // No direct filesystem access anywhere in the route file anymore:
    expect(filesRouteSource).not.toContain('existsSync');
    expect(filesRouteSource).not.toContain('statSync');
  });
});

describe('env fail-closed wiring (s3 requires its credentials)', () => {
  it('keeps the superRefine that names the missing s3 vars (skipped in test mode)', () => {
    expect(envSource).toContain('.superRefine((cfg, ctx) => {');
    expect(envSource).toContain("if (cfg.STORAGE_DRIVER !== 's3' || isTest) return;");
    expect(envSource).toContain('missing.push(\'S3_ENDPOINT\')');
    expect(envSource).toContain('missing.push(\'S3_BUCKET\')');
    expect(envSource).toContain('missing.push(\'S3_ACCESS_KEY_ID\')');
    expect(envSource).toContain("missing.push('S3_SECRET_ACCESS_KEY')");
    expect(envSource).toContain('STORAGE_DRIVER=s3 requires: ');
  });
});

describe('pdf.ts reads through the storage abstraction', () => {
  it('stat + get via getStorage() — no direct fs reads left', () => {
    expect(pdfSource).toContain('getStorage()');
    expect(pdfSource).toContain('storage.stat(key)');
    expect(pdfSource).toContain('storage.get(key)');
    expect(pdfSource).not.toContain('readFile(');
    expect(pdfSource).not.toContain('existsSync');
    // The old guards all survive:
    expect(pdfSource).toContain('decodeURIComponent(raw)');
    expect(pdfSource).toContain("filename.includes('..')");
    expect(pdfSource).toContain("MAX_PDF_BYTES = 10 * 1024 * 1024");
  });
});
