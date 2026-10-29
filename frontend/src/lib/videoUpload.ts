/**
 * videoUpload — the client side of the r323 B2.1 presigned lecture
 * upload (mirrors the backend's files.routes.ts contract exactly).
 *
 * Flow (s3 driver):
 *   1. POST /files/uploads/presign  { filename, sizeBytes, multipart }
 *      → { mode:'single', key, url, headers } or
 *        { mode:'multipart', key, uploadId, partSize, parts:[{partNumber,url}] }
 *   2. The browser PUTs the bytes STRAIGHT to the object store through
 *      those presigned URLs (progress via XHR upload.onprogress; the
 *      Authorization header NEVER rides these requests — it belongs to
 *      the platform API, not the store).
 *   3. POST /files/uploads/complete { key, uploadId?, parts? }
 *      → { url: '/api/v1/files/lectures/<id>.<ext>', sizeBytes }
 *
 * Pure-logic split: validateVideoFile + planUploadMode are sync and
 * unit-testable; uploadLectureVideo drives the network and reports
 * progress fractions (0…1) the uploader UI renders.
 */
import { api } from './api.js';
import { apiErrorMessage } from './format.js';

/** ≤ 100 MiB rides one presigned PUT; larger goes multipart. */
export const VIDEO_SINGLE_MAX_BYTES = 100 * 1024 * 1024;
/** The honest server-side multipart ceiling (4 GiB). */
export const VIDEO_TOTAL_MAX_BYTES = 4 * 1024 * 1024 * 1024;

const VIDEO_EXT = ['.mp4', '.webm', '.m4v', '.ogv', '.ogg'] as const;

/** The exact Arabic refusal surfaces the server sends for a wrong type. */
export function isVideoFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return VIDEO_EXT.some((ext) => lower.endsWith(ext));
}

/**
 * Sync client gate — rejects the same files the server rejects BEFORE any
 * request leaves the browser. Returns null when uploadable, or the
 * Arabic message to render inline (role=alert).
 */
export function validateVideoFile(file: File): string | null {
  if (!isVideoFile(file)) {
    return 'صيغة الفيديو غير مدعومة — المسموح: mp4، webm، m4v، ogv، ogg.';
  }
  if (file.size <= 0) {
    return 'الملف فارغ.';
  }
  if (file.size > VIDEO_TOTAL_MAX_BYTES) {
    return 'حجم الملف يتجاوز الحد الأقصى (4 جيجابايت).';
  }
  return null;
}

/** Which mode the server will pick for this size (mirror of the route). */
export function planUploadMode(sizeBytes: number): 'single' | 'multipart' {
  return sizeBytes <= VIDEO_SINGLE_MAX_BYTES ? 'single' : 'multipart';
}

export interface UploadProgress {
  /** 0…1 — the fraction of TOTAL bytes confirmed by the store. */
  fraction: number;
  /** Human line the UI may show («الجزء 3 من 12»). */
  label?: string;
}

interface SinglePresignResponse {
  mode: 'single';
  key: string;
  url: string;
  headers: Record<string, string>;
}

interface MultipartPresignResponse {
  mode: 'multipart';
  key: string;
  uploadId: string;
  partSize: number;
  parts: { partNumber: number; url: string }[];
}

type PresignResponse = SinglePresignResponse | MultipartPresignResponse;

/** XHR PUT of one Blob/whole file with 0…1 progress; resolves the store's ETag. */
function putWithProgress(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onFraction: (fraction: number) => void,
  signal: AbortSignal,
): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url, true);
    for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && ev.total > 0) onFraction(ev.loaded / ev.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.getResponseHeader('ETag'));
      } else {
        reject(new Error(`فشل رفع البيانات إلى التخزين (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('تعذر الاتصال بالتخزين'));
    xhr.onabort = () => reject(new DOMException('أُلغيت عملية الرفع', 'AbortError'));
    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

/**
 * Drive the whole upload. `onProgress` receives the global 0…1 fraction
 * across all parts. Throws Arabic-first errors; the AbortSignal kills
 * both the presigned PUTs and (via the caller) the flow itself.
 */
export async function uploadLectureVideo(
  file: File,
  onProgress: (p: UploadProgress) => void,
  signal: AbortSignal = new AbortController().signal,
): Promise<{ url: string; sizeBytes: number }> {
  const validation = validateVideoFile(file);
  if (validation !== null) throw new Error(validation);

  const presign = await api
    .post<PresignResponse>('/files/uploads/presign', {
      filename: file.name,
      sizeBytes: file.size,
      multipart: planUploadMode(file.size) === 'multipart',
    }, { signal })
    .then((r) => r.data)
    .catch((err: unknown) => {
      throw new Error(apiErrorMessage(err, 'تعذر تجهيز الرفع — أعد المحاولة'));
    });

  if (presign.mode === 'single') {
    await putWithProgress(presign.url, file, presign.headers ?? {}, (f) => onProgress({ fraction: f }), signal);
    const done = await api
      .post<{ url: string; sizeBytes: number }>('/files/uploads/complete', { key: presign.key }, { signal })
      .then((r) => r.data)
      .catch((err: unknown) => {
        throw new Error(apiErrorMessage(err, 'تعذر إتمام الرفع — أعد المحاولة'));
      });
    onProgress({ fraction: 1 });
    return done;
  }

  // Multipart: sequential parts (pilot-honest: one connection, real
  // progress, no part-ordering races); each part retries ONCE — a
  // transient store blip must not kill a 1 GB upload at part 11/12.
  const parts = presign.parts;
  const total = file.size;
  let completedBytes = 0;
  const confirmed: { partNumber: number; etag: string }[] = [];

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i]!;
    const start = (part.partNumber - 1) * presign.partSize;
    const blob = file.slice(start, Math.min(start + presign.partSize, total));
    let etag: string | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        etag = await putWithProgress(
          part.url,
          blob,
          {},
          (f) => onProgress({
            fraction: Math.min(1, (completedBytes + f * blob.size) / total),
            label: parts.length > 1 ? `الجزء ${part.partNumber} من ${parts.length}` : undefined,
          }),
          signal,
        );
        break;
      } catch (err) {
        if (signal.aborted) throw err;
        if (attempt === 1) throw err instanceof Error ? err : new Error('تعذر رفع جزء من الملف');
      }
    }
    // The manifest needs the REAL store-issued ETags (S3 compares them
    // byte-exactly). A store that withholds ETag headers gets an honest
    // failure at complete — never a fabricated manifest entry.
    if (etag === null || etag === '') {
      throw new Error('لم يُعد التخزين توقيع الجزء (ETag) — أعد المحاولة');
    }
    completedBytes += blob.size;
    confirmed.push({ partNumber: part.partNumber, etag });
  }

  const done = await api
    .post<{ url: string; sizeBytes: number }>(
      '/files/uploads/complete',
      { key: presign.key, uploadId: presign.uploadId, parts: confirmed },
      { signal },
    )
    .then((r) => r.data)
    .catch((err: unknown) => {
      throw new Error(apiErrorMessage(err, 'تعذر إتمام الرفع — أعد المحاولة'));
    });
  onProgress({ fraction: 1 });
  return done;
}
