/**
 * R351 X2d — the import upload-ticket route + the storage-read helpers.
 *
 * Belts:
 *  · the ticket answers mode:'inline' on non-blob drivers (dev/Render);
 *  · the ticket answers mode:'client-upload' on the blob driver with a
 *    server-minted imports/ key, a row in ImportUpload, and the
 *    presigned URL from the (mocked) SDK;
 *  · readUploadByKey: only server-minted keys (shape belt + row must
 *    exist + not consumed), the 10 MB bound, the honest Arabic errors;
 *  · pruneImportUploads: the 24 h horizon, object + row cleanup.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

const blobMocks = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  head: vi.fn(),
  del: vi.fn(),
  issueSignedToken: vi.fn(),
  presignUrl: vi.fn(),
}));

vi.mock('@vercel/blob', () => blobMocks);

vi.mock('../../src/db.js', () => ({
  prisma: {
    importUpload: {
      findUnique: vi.fn(),
      create: vi.fn(async ({ data }: { data: { key: string } }) => ({ id: `row-${data.key}`, ...data })),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      findMany: vi.fn(async () => []),
    },
    institution: { findFirst: vi.fn(), findUnique: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
  withRetry: vi.fn(),
}));

// The blob driver for the ticket route (env parsed before the app).
process.env.STORAGE_DRIVER = 'vercel-blob';
process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_token_0123456789';

// The app + the route under test import DYNAMICALLY (after the env
// assignment above) — a static import would hoist above it and env.ts
// would parse STORAGE_DRIVER=local (the tick-route-test lesson).
let baseUrl: string;
let createApp: typeof import('../../src/app.js')['createApp'];
let prisma: typeof import('../../src/db.js')['prisma'];
let readUploadByKey: typeof import('../../src/http/routes/import.routes.js')['readUploadByKey'];
let pruneImportUploads: typeof import('../../src/http/routes/import.routes.js')['pruneImportUploads'];
let IMPORT_UPLOAD_TTL_MS: typeof import('../../src/http/routes/import.routes.js')['IMPORT_UPLOAD_TTL_MS'];
let signAccessToken: typeof import('../../src/lib/jwt.js')['signAccessToken'];

beforeAll(async () => {
  ({ createApp } = await import('../../src/app.js'));
  ({ prisma } = await import('../../src/db.js'));
  ({ readUploadByKey, pruneImportUploads, IMPORT_UPLOAD_TTL_MS } = await import('../../src/http/routes/import.routes.js'));
  ({ signAccessToken } = await import('../../src/lib/jwt.js'));
  const server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  afterAll(async () => {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  });
});

const post = (path: string, body: unknown, token: string) =>
  fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

describe('POST /api/v1/import/upload-ticket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blobMocks.issueSignedToken.mockResolvedValue({ clientSigningToken: 'cst', delegationToken: 'dt' });
    blobMocks.presignUrl.mockResolvedValue({ presignedUrl: 'https://put.example/signed' });
  });

  it('mints a client-direct ticket with a server-chosen key + a bookkeeping row', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', null);
    const res = await post('/api/v1/import/upload-ticket', { filename: 'roster.xlsx', sizeBytes: 1_234 }, token);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { mode: string; key: string; uploadUrl: string } };
    expect(body.data.mode).toBe('client-upload');
    expect(body.data.key).toMatch(/^imports\/c[0-9a-f]{32}\.xlsx$/);
    expect(body.data.uploadUrl).toBe('https://put.example/signed');
    // The presign carried the content type + the 10 MB ceiling.
    expect(blobMocks.presignUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        allowedContentTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        maximumSizeInBytes: 10 * 1024 * 1024,
        access: 'private',
      }),
    );
    // The row exists (the read path will require it).
    expect(prisma.importUpload.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ key: body.data.key, sizeBytes: 1_234, mintedBy: 'admin-1' }) }),
    );
  });

  it('refuses non-spreadsheet extensions and oversized files', async () => {
    const token = signAccessToken('admin-1', 'ADMIN', null);
    const bad = await post('/api/v1/import/upload-ticket', { filename: 'virus.exe', sizeBytes: 10 }, token);
    expect(bad.status).toBe(400);
    const big = await post('/api/v1/import/upload-ticket', { filename: 'r.csv', sizeBytes: 11 * 1024 * 1024 }, token);
    expect(big.status).toBe(400);
  });

  it('403s students (the registrar owns imports)', async () => {
    const token = signAccessToken('student-1', 'STUDENT', null);
    const res = await post('/api/v1/import/upload-ticket', { filename: 'r.csv', sizeBytes: 10 }, token);
    expect(res.status).toBe(403);
  });
});

describe('readUploadByKey (the storage read path)', () => {
  const KEY = 'imports/c0123456789abcdef0123456789abcdef.csv';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads a minted, unconsumed ticket from the store', async () => {
    vi.mocked(prisma.importUpload.findUnique).mockResolvedValue({ key: KEY, consumedAt: null } as never);
    blobMocks.get.mockImplementation(async () => ({ statusCode: 200, stream: new Response('name,reg').body }));
    const buf = await readUploadByKey(KEY);
    expect(buf.toString()).toBe('name,reg');
  });

  it('rejects keys this server never minted (shape belt)', async () => {
    await expect(readUploadByKey('imports/../etc/passwd')).rejects.toMatchObject({ status: 400 });
    await expect(readUploadByKey('papers/c0123456789abcdef0123456789abcdef.pdf')).rejects.toMatchObject({ status: 400 });
    await expect(readUploadByKey('imports/not-an-id.csv')).rejects.toMatchObject({ status: 400 });
  });

  it('rejects unknown + consumed tickets (never a store-wide read primitive)', async () => {
    vi.mocked(prisma.importUpload.findUnique).mockResolvedValue(null as never);
    await expect(readUploadByKey(KEY)).rejects.toMatchObject({ status: 400 });
    vi.mocked(prisma.importUpload.findUnique).mockResolvedValue({ key: KEY, consumedAt: new Date() } as never);
    await expect(readUploadByKey(KEY)).rejects.toMatchObject({ status: 400 });
  });

  it('rejects objects beyond the 10 MB bound', async () => {
    vi.mocked(prisma.importUpload.findUnique).mockResolvedValue({ key: KEY, consumedAt: null } as never);
    const big = 'x'.repeat(10 * 1024 * 1024 + 1);
    blobMocks.get.mockResolvedValue({ statusCode: 200, stream: new Response(big).body });
    await expect(readUploadByKey(KEY)).rejects.toMatchObject({ status: 400 });
  });
});

describe('pruneImportUploads (the daily tick)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes stale objects + rows past the 24 h horizon, never throws on store errors', async () => {
    vi.mocked(prisma.importUpload.findMany).mockResolvedValue([{ key: 'imports/c0123456789abcdef0123456789abcdef.csv' }] as never);
    blobMocks.del.mockRejectedValue(new Error('store down')); // best-effort
    const res = await pruneImportUploads();
    expect(res.pruned).toBe(1);
    expect(blobMocks.del).toHaveBeenCalled();
    expect(prisma.importUpload.deleteMany).toHaveBeenCalledWith({
      where: { key: { in: ['imports/c0123456789abcdef0123456789abcdef.csv'] } },
    });
    // The horizon is 24 h.
    expect(IMPORT_UPLOAD_TTL_MS).toBe(24 * 3_600_000);
  });
});
