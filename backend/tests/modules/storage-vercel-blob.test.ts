/**
 * R351 X2d — the Vercel Blob driver, unit belt (the @vercel/blob SDK
 * mocked at its boundary; no store, no network).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';

const blobMocks = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  head: vi.fn(),
  del: vi.fn(),
  issueSignedToken: vi.fn(),
  presignUrl: vi.fn(),
}));

vi.mock('@vercel/blob', () => blobMocks);

import { VercelBlobDriver, buildDriver } from '../../src/lib/storage.js';

const TOKEN = 'vercel_blob_rw_token_0123456789';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VercelBlobDriver', () => {
  it('put writes PRIVATE objects with the token (never public)', async () => {
    blobMocks.put.mockResolvedValue({ url: 'https://x' });
    const d = new VercelBlobDriver(TOKEN);
    await d.put('imports/c0123456789abcdef0123456789abcdef.csv', Buffer.from('a,b'));
    expect(blobMocks.put).toHaveBeenCalledWith(
      'imports/c0123456789abcdef0123456789abcdef.csv',
      expect.any(Buffer),
      expect.objectContaining({ access: 'private', token: TOKEN, allowOverwrite: true, addRandomSuffix: false }),
    );
  });

  it('get returns the bytes from the private stream; null when absent', async () => {
    const stream = new Response('name,reg').body!;
    blobMocks.get.mockResolvedValue({ statusCode: 200, stream });
    const d = new VercelBlobDriver(TOKEN);
    const buf = await d.get('imports/c0123456789abcdef0123456789abcdef.csv');
    expect(buf?.toString()).toBe('name,reg');
    expect(blobMocks.get).toHaveBeenCalledWith('imports/c0123456789abcdef0123456789abcdef.csv', {
      access: 'private',
      token: TOKEN,
    });

    blobMocks.get.mockResolvedValue(null);
    await expect(d.get('imports/missing')).resolves.toBeNull();
  });

  it('stat maps the head result; null when absent', async () => {
    blobMocks.head.mockResolvedValue({ size: 1234 });
    blobMocks.head.mockResolvedValueOnce({ size: 1234 });
    const d = new VercelBlobDriver(TOKEN);
    await expect(d.stat('imports/k')).resolves.toEqual({ size: 1234 });
    blobMocks.head.mockResolvedValue(null);
    await expect(d.stat('imports/k')).resolves.toBeNull();
  });

  it('getRange slices the full read (Blob has no ranged reads)', async () => {
    // A fresh stream per call — a Response body is single-use.
    blobMocks.get.mockImplementation(async () => ({ statusCode: 200, stream: new Response('0123456789').body }));
    const d = new VercelBlobDriver(TOKEN);
    const slice = await d.getRange('imports/k', 2, 5);
    expect(slice?.toString()).toBe('2345');
    await expect(d.getRange('imports/k', 99, 120)).resolves.toBeNull();
  });

  it('delete is best-effort (a failure never throws)', async () => {
    blobMocks.del.mockRejectedValue(new Error('store down'));
    const d = new VercelBlobDriver(TOKEN);
    await expect(d.delete('imports/k')).resolves.toBeUndefined();
  });

  it('presignClientPut mints a scoped, single-content-type, size-capped PUT URL', async () => {
    blobMocks.issueSignedToken.mockResolvedValue({ clientSigningToken: 'cst', delegationToken: 'dt' });
    blobMocks.presignUrl.mockResolvedValue({ presignedUrl: 'https://blob.vercel-storage.com/put?sig=abc' });
    const d = new VercelBlobDriver(TOKEN);
    const validUntilMs = Date.now() + 600_000;
    const { uploadUrl } = await d.presignClientPut('imports/c0123456789abcdef0123456789abcdef.xlsx', {
      allowedContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      maximumSizeInBytes: 10 * 1024 * 1024,
      validUntilMs,
    });
    expect(uploadUrl).toContain('sig=abc');
    expect(blobMocks.issueSignedToken).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: 'imports/c0123456789abcdef0123456789abcdef.xlsx', operations: ['put'], token: TOKEN }),
    );
    expect(blobMocks.presignUrl).toHaveBeenCalledWith(
      { clientSigningToken: 'cst', delegationToken: 'dt' },
      expect.objectContaining({
        operation: 'put',
        pathname: 'imports/c0123456789abcdef0123456789abcdef.xlsx',
        access: 'private',
        allowedContentTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
        maximumSizeInBytes: 10 * 1024 * 1024,
      }),
    );
  });
});

describe('buildDriver: the vercel-blob fail-closed law', () => {
  it('throws without BLOB_READ_WRITE_TOKEN', () => {
    expect(() => buildDriver({ STORAGE_DRIVER: 'vercel-blob', S3_REGION: 'auto' })).toThrow(/BLOB_READ_WRITE_TOKEN/);
  });

  it('builds the blob driver with the token', () => {
    const d = buildDriver({ STORAGE_DRIVER: 'vercel-blob', S3_REGION: 'auto', BLOB_READ_WRITE_TOKEN: TOKEN });
    expect(d).toBeInstanceOf(VercelBlobDriver);
  });
});
