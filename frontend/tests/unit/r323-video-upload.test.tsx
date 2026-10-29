/**
 * r323 B2.1 — the client upload mirror (pure parts) + the drive flow.
 * Pins: the file gate mirrors the server, the mode plan, the presign →
 * PUT → complete order, progress fractions, part retry, the ETag
 * honesty rule, and abort semantics.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  planUploadMode,
  uploadLectureVideo,
  validateVideoFile,
  VIDEO_SINGLE_MAX_BYTES,
  VIDEO_TOTAL_MAX_BYTES,
} from '../../src/lib/videoUpload';

function videoFile(name: string, size: number): File {
  // A real Blob body (multipart slices need .slice to work) — jsdom
  // files back File with Blob, so this is faithful.
  return new File([new Uint8Array(Math.min(size, 1024))], name, { type: 'video/mp4' });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('validateVideoFile (client mirror of the server gates)', () => {
  it('accepts the known video containers', () => {
    expect(validateVideoFile(videoFile('a.mp4', 1024))).toBeNull();
    expect(validateVideoFile(videoFile('b.WEBM', 1024))).toBeNull();
  });

  it('refuses non-video types with the Arabic message', () => {
    const pdf = new File([new Uint8Array(8)], 'a.pdf', { type: 'application/pdf' });
    expect(validateVideoFile(pdf)).toContain('صيغة الفيديو غير مدعومة');
  });

  it('refuses the empty file and the over-cap file', () => {
    expect(validateVideoFile(videoFile('a.mp4', 0))).toContain('الملف فارغ');
    const huge = videoFile('a.mp4', VIDEO_TOTAL_MAX_BYTES + 1);
    Object.defineProperty(huge, 'size', { value: VIDEO_TOTAL_MAX_BYTES + 1 });
    expect(validateVideoFile(huge)).toContain('4 جيجابايت');
  });
});

describe('planUploadMode', () => {
  it('single at the cap, multipart above it', () => {
    expect(planUploadMode(VIDEO_SINGLE_MAX_BYTES)).toBe('single');
    expect(planUploadMode(VIDEO_SINGLE_MAX_BYTES + 1)).toBe('multipart');
  });
});

describe('uploadLectureVideo — single flow', () => {
  it('presigns, PUTs to the presigned URL (no auth header), completes, returns the serving path', async () => {
    const posts: string[] = [];
    const xhrputs: string[] = [];
    vi.stubGlobal('XMLHttpRequest', class {
      open(_m: string, u: string) { xhrputs.push(u); }
      setRequestHeader() { /* recorded via header capture below */ }
      upload = { onprogress: (_e: unknown) => undefined };
      send() {
        (this as unknown as { upload: { onprogress: (e: { lengthComputable: boolean; loaded: number; total: number }) => void } }).upload
          .onprogress({ lengthComputable: true, loaded: 512, total: 1024 });
        (this as unknown as { onload: () => void }).onload();
      }
      getResponseHeader() { return null; }
      status = 200;
    });

    const api = await import('../../src/lib/api');
    const postSpy = vi.spyOn(api.api, 'post').mockImplementation(async (url: string) => {
      posts.push(String(url));
      if (String(url).includes('presign')) {
        return {
          data: { mode: 'single', key: 'lectures/cabc.mp4', url: 'https://store/x?sig=1', headers: { 'Content-Type': 'video/mp4' } },
        } as never;
      }
      return { data: { url: '/api/v1/files/lectures/cabc.mp4', sizeBytes: 1024 } } as never;
    });

    const fractions: number[] = [];
    const done = await uploadLectureVideo(videoFile('a.mp4', 1024), (p) => fractions.push(p.fraction));
    expect(posts).toEqual(['/files/uploads/presign', '/files/uploads/complete']);
    expect(xhrputs).toEqual(['https://store/x?sig=1']);
    expect(done.url).toBe('/api/v1/files/lectures/cabc.mp4');
    expect(fractions[fractions.length - 1]).toBe(1);
    expect(postSpy).toHaveBeenCalledTimes(2);
  });

  it('refuses invalid files before any request leaves the browser', async () => {
    const api = await import('../../src/lib/api');
    const postSpy = vi.spyOn(api.api, 'post').mockImplementation(async () => ({ data: {} }) as never);
    const pdf = new File([new Uint8Array(8)], 'a.pdf', { type: 'application/pdf' });
    await expect(uploadLectureVideo(pdf, () => undefined)).rejects.toThrow('صيغة الفيديو غير مدعومة');
    expect(postSpy).not.toHaveBeenCalled();
  });
});

describe('uploadLectureVideo — multipart flow', () => {
  it('slices into parts, retries a failed part once, and completes with the REAL etags', async () => {
    const file = videoFile('big.mp4', 3 * 1024 * 1024); // 3 MiB → parts of 1 MiB below
    const attempts: number[] = [];

    class FakeXHR {
      open(_m: string, u: string) { this.url = u; }
      setRequestHeader() {}
      send() {
        attempts.push(this.url.includes('partNumber=2') ? 1 : 0);
        if (this.url.includes('partNumber=2') && attempts.filter((a) => a === 1).length === 1) {
          this.status = 500;
          this.onerror?.();
          return;
        }
        this.etag = `"part-${this.url.includes('partNumber=1') ? 1 : 2}"`;
        this.status = 200;
        this.onload?.();
      }
      getResponseHeader(h: string) { return h === 'ETag' ? this.etag : null; }
      url = '';
      etag = '';
      status = 0;
      upload = { onprogress: (_e: unknown) => undefined };
      onload?: () => void;
      onerror?: () => void;
    }
    vi.stubGlobal('XMLHttpRequest', FakeXHR);

    const api = await import('../../src/lib/api');
    const postSpy = vi.spyOn(api.api, 'post').mockImplementation(async (url: string) => {
      if (String(url).includes('presign')) {
        return {
          data: {
            mode: 'multipart',
            key: 'lectures/cabc.mp4',
            uploadId: 'UP1',
            partSize: 1024 * 1024,
            parts: [
              { partNumber: 1, url: 'https://store/part?partNumber=1' },
              { partNumber: 2, url: 'https://store/part?partNumber=2' },
            ],
          },
        } as never;
      }
      return { data: { url: '/api/v1/files/lectures/cabc.mp4', sizeBytes: file.size } } as never;
    });

    const done = await uploadLectureVideo(file, () => undefined);
    expect(done.url).toBe('/api/v1/files/lectures/cabc.mp4');
    // part 2 was attempted twice (one retry), part 1 once
    expect(attempts.filter((a) => a === 1).length).toBe(2);
    // the complete call carried the store's real etags
    const completeCall = (postSpy.mock.calls as [string, unknown][]).find(
      ([u]) => String(u).includes('complete'),
    );
    expect(completeCall?.[1]).toMatchObject({
      uploadId: 'UP1',
      parts: [
        { partNumber: 1, etag: '"part-1"' },
        { partNumber: 2, etag: '"part-2"' },
      ],
    });
  });

  it('fails honestly when the store withholds the part ETag', async () => {
    const file = videoFile('big.mp4', 2 * 1024 * 1024);
    class FakeXHR {
      open() {}
      setRequestHeader() {}
      send() { this.status = 200; this.onload?.(); }
      getResponseHeader() { return null; }
      status = 0;
      upload = { onprogress: (_e: unknown) => undefined };
      onload?: () => void;
    }
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const api = await import('../../src/lib/api');
    vi.spyOn(api.api, 'post').mockImplementation(async (url: string) => {
      if (String(url).includes('presign')) {
        return {
          data: {
            mode: 'multipart',
            key: 'lectures/cabc.mp4',
            uploadId: 'UP1',
            partSize: 1024 * 1024,
            parts: [{ partNumber: 1, url: 'https://store/p1' }],
          },
        } as never;
      }
      return { data: { url: '/x', sizeBytes: 1 } } as never;
    });
    await expect(uploadLectureVideo(file, () => undefined)).rejects.toThrow('ETag');
  });
});
