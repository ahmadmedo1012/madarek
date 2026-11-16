/**
 * r357 L2 — the student's own media surface: profile photo (client
 * WebP) + important documents (signed-URL reads). Functional-first:
 * no visual polish beyond the existing primitives (that is the UI
 * agent's lane; findings welcome).
 *
 * Flow contracts (backend/src/http/routes/profiles.routes.ts):
 *   photo:  POST /me/profile/photo-ticket {contentType,sizeBytes}
 *           → PUT uploadUrl (client-direct, Blob)
 *           → POST /me/profile/photo-confirm {key}
 *   photo read: GET /me/profile/photo (bytes; <img> needs blob: URLs —
 *           the object is PRIVATE, there is no public URL by design)
 *   documents: ticket → PUT → confirm {key,titleAr,kind}; list; delete;
 *           GET /me/documents/:id/url → window.open(signed url, 5 min)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FileText, Trash2, ExternalLink, AlertCircle, Upload } from 'lucide-react';
import { Card } from '../primitives';
import { api, unwrap } from '../../lib/api';
import { apiErrorMessage } from '../../lib/format';
import { useAuthStore } from '../../stores/auth.store';

/* ── pure helpers (exported for tests) ─────────────────────────── */

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_MAX_EDGE = 640;

export interface ConvertedPhoto {
  blob: Blob;
  contentType: 'image/webp' | 'image/png';
}

/**
 * Client-side WebP conversion (canvas): downscale to ≤640px on the
 * long edge, re-encode at 0.82. Falls back to the ORIGINAL bytes as
 * PNG when the canvas cannot re-encode (old browsers, exotic inputs) —
 * the backend sniffs actual bytes and accepts both.
 */
export async function convertToWebP(
  file: File,
  canvasFactory: () => HTMLCanvasElement | null = () =>
    typeof document !== 'undefined' ? document.createElement('canvas') : null,
): Promise<ConvertedPhoto> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    if (file.size > 0 && file.size <= PHOTO_MAX_BYTES) {
      return { blob: file, contentType: file.type === 'image/png' ? 'image/png' : 'image/webp' };
    }
    throw new Error('تعذّر فتح الصورة');
  }
  const scale = Math.min(1, PHOTO_MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = canvasFactory();
  if (!canvas) return { blob: file, contentType: 'image/webp' };
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob: file, contentType: 'image/webp' };
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
  bitmap.close();
  if (blob && blob.size > 0 && blob.size <= PHOTO_MAX_BYTES) {
    return { blob, contentType: 'image/webp' };
  }
  return { blob: file, contentType: file.type === 'image/png' ? 'image/png' : 'image/webp' };
}

/* ── the section ───────────────────────────────────────────────── */

interface DocRow {
  id: string;
  titleAr: string;
  kind: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}

const DOC_KINDS_AR: Record<string, string> = {
  passport: 'جواز سفر',
  certificate: 'شهادة',
  'national-id': 'بطاقة هوية',
  transcript: 'كشف درجات',
  other: 'أخرى',
};

const kindOptions = Object.entries(DOC_KINDS_AR);

export default function MyMedia() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docKind, setDocKind] = useState<string>('passport');

  const photoUrlRef = useRef<string | null>(null);

  const refreshPhoto = useCallback(async () => {
    // Binary read: the object is PRIVATE (no public URL by design) and
    // the JSON pipeline must never touch the bytes — a direct fetch with
    // the session token, then a blob: URL for <img>.
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    try {
      const res = await fetch('/api/v1/me/profile/photo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
        const next = URL.createObjectURL(blob);
        photoUrlRef.current = next;
        setPhotoUrl(next);
      } else {
        if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
        photoUrlRef.current = null;
        setPhotoUrl(null);
      }
    } catch {
      setPhotoUrl(null);
    }
  }, []);

  const refreshDocs = useCallback(async () => {
    try {
      const rows = await unwrap<DocRow[]>(api.get('/me/documents'));
      setDocs(rows);
    } catch (e) {
      setError(apiErrorMessage(e, 'تعذّر تحميل الوثائق — أعد المحاولة'));
    }
  }, []);

  useEffect(() => {
    void refreshPhoto();
    void refreshDocs();
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, [refreshPhoto, refreshDocs]);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setPhotoBusy(true);
    try {
      const conv = await convertToWebP(file);
      const ticket = await unwrap<{ mode: string; key: string; uploadUrl: string }>(
        api.post('/me/profile/photo-ticket', { contentType: conv.contentType, sizeBytes: conv.blob.size }),
      );
      if (ticket.mode !== 'client-upload') throw new Error('الرفع المباشر غير مهيّأ');
      const put = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': conv.contentType },
        body: conv.blob,
      });
      if (!put.ok) throw new Error('فشل رفع الصورة');
      await unwrap(api.post('/me/profile/photo-confirm', { key: ticket.key }));
      await refreshPhoto();
    } catch (e) {
      setError(apiErrorMessage(e, 'تعذّر رفع الصورة — أعد المحاولة'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const pickDoc = async (file: File | undefined) => {
    if (!file) return;
    if (docTitle.trim().length < 2) {
      setError('اكتب عنوانًا للوثيقة أولًا');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const contentType = file.type === 'application/pdf' ? 'application/pdf'
        : file.type === 'image/png' ? 'image/png' : 'image/webp';
      const ticket = await unwrap<{ mode: string; key: string; uploadUrl: string }>(
        api.post('/me/documents/ticket', {
          titleAr: docTitle.trim(), kind: docKind, contentType, sizeBytes: file.size,
        }),
      );
      if (ticket.mode !== 'client-upload') throw new Error('الرفع المباشر غير مهيّأ');
      const put = await fetch(ticket.uploadUrl, {
        method: 'PUT', headers: { 'Content-Type': contentType }, body: file,
      });
      if (!put.ok) throw new Error('فشل رفع الوثيقة');
      await unwrap(api.post('/me/documents/confirm', { key: ticket.key, titleAr: docTitle.trim(), kind: docKind }));
      setDocTitle('');
      await refreshDocs();
    } catch (e) {
      setError(apiErrorMessage(e, 'العملية لم تكتمل — أعد المحاولة'));
    } finally {
      setBusy(false);
    }
  };

  const openDoc = async (id: string) => {
    setError(null);
    try {
      const { url } = await unwrap<{ url: string; expiresAt: string }>(api.get(`/me/documents/${id}/url`));
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setError(apiErrorMessage(e, 'تعذّر فتح الوثيقة — اطلب رابطًا جديدًا'));
    }
  };

  const removeDoc = async (id: string) => {
    setError(null);
    setBusy(true);
    try {
      await unwrap(api.delete(`/me/documents/${id}`));
      await refreshDocs();
    } catch (e) {
      setError(apiErrorMessage(e, 'العملية لم تكتمل — أعد المحاولة'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="my-media r357-l2" data-testid="my-media">
      <div className="my-media-photo">
        {photoUrl
          ? <img src={photoUrl} alt="صورة الملف" data-testid="my-media-photo" />
          : <div className="my-media-photo-empty" data-testid="my-media-photo-empty">لا صورة بعد</div>}
        <button
          type="button" onClick={() => photoInput.current?.click()} disabled={photoBusy}
          aria-label="تغيير صورة الملف"
        >
          <Camera size={16} aria-hidden /> {photoBusy ? '…جارٍ الرفع' : 'تغيير الصورة'}
        </button>
        <input
          ref={photoInput} type="file" accept="image/*" hidden
          onChange={(e) => { void pickPhoto(e.target.files?.[0]); e.currentTarget.value = ''; }}
        />
      </div>

      <div className="my-media-docs">
        <label htmlFor="doc-title">عنوان الوثيقة</label>
        <input
          id="doc-title" value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)} maxLength={160} placeholder="مثال: جواز السفر"
        />
        <label htmlFor="doc-kind">النوع</label>
        <select id="doc-kind" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
          {kindOptions.map(([k, ar]) => <option key={k} value={k}>{ar}</option>)}
        </select>
        <button
          type="button" onClick={() => docInput.current?.click()} disabled={busy}
          aria-label="رفع وثيقة"
        >
          <Upload size={16} aria-hidden /> رفع وثيقة
        </button>
        <input
          ref={docInput} type="file" accept="application/pdf,image/png,image/webp" hidden
          onChange={(e) => { void pickDoc(e.target.files?.[0]); e.currentTarget.value = ''; }}
        />

        {error && (
          <p role="alert" className="my-media-error" data-testid="my-media-error">
            <AlertCircle size={14} aria-hidden /> {error}
          </p>
        )}

        <ul data-testid="my-media-docs-list">
          {docs === null ? <li>…</li> : docs.length === 0
            ? <li className="my-media-docs-empty">لا وثائق بعد</li>
            : docs.map((d) => (
              <li key={d.id}>
                <FileText size={14} aria-hidden />
                <span>{d.titleAr}</span>
                <span className="my-media-doc-kind">{DOC_KINDS_AR[d.kind] ?? d.kind}</span>
                <button type="button" onClick={() => void openDoc(d.id)} aria-label={`فتح ${d.titleAr}`}>
                  <ExternalLink size={14} aria-hidden />
                </button>
                <button type="button" onClick={() => void removeDoc(d.id)} aria-label={`حذف ${d.titleAr}`}>
                  <Trash2 size={14} aria-hidden />
                </button>
              </li>
            ))}
        </ul>
        <p className="my-media-note">
          روابط الوثائق صالحة خمس دقائق فقط، ولا يوجد عنوان عام لأي وثيقة.
        </p>
      </div>
    </Card>
  );
}
