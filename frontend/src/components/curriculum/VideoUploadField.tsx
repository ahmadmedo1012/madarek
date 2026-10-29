/**
 * VideoUploadField — the r323 B2.1 «رفع محاضرة» source picker.
 *
 * Two modes, one contract: the form field `videoUrl` ends up with a
 * working value either way.
 *   · «رابط» — the original paste-URL field (https:// or a platform path).
 *   · «رفع ملف» — presigned direct upload (single PUT ≤ 100 MB, multipart
 *     with per-part retry above that), progress on the paper/ink ruler,
 *     cancellable; the completed serving path lands in `videoUrl`.
 *
 * Honest scope: when the backend's storage driver is not S3, the presign
 * call fails with the server's Arabic 503 message and the component shows
 * it inline — the URL mode stays available (that is the documented pilot
 * fallback, not an error state to hide).
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CircleStop, FileVideo, Link2, UploadCloud } from 'lucide-react';
import { uploadLectureVideo, validateVideoFile } from '../../lib/videoUpload';

export type VideoSourceMode = 'url' | 'upload';

export function VideoUploadField({
  mode,
  onModeChange,
  value,
  onChange,
  inputId,
  urlHint,
}: {
  mode: VideoSourceMode;
  onModeChange: (mode: VideoSourceMode) => void;
  value: string;
  onChange: (value: string) => void;
  inputId: string;
  urlHint: string;
}) {
  const [busy, setBusy] = useState(false);
  const [fraction, setFraction] = useState(0);
  const [partLabel, setPartLabel] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pickFile = async (file: File) => {
    setError(null);
    const invalid = validateVideoFile(file);
    if (invalid !== null) {
      setError(invalid);
      return;
    }
    setFileName(file.name);
    setBusy(true);
    setFraction(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { url } = await uploadLectureVideo(
        file,
        (p) => {
          setFraction(p.fraction);
          setPartLabel(p.label);
        },
        controller.signal,
      );
      onChange(url);
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'تعذر الرفع — أعد المحاولة');
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const pct = Math.round(fraction * 100);
  const done = mode === 'upload' && value.startsWith('/api/v1/files/lectures/');

  return (
    <div className="vid-up" data-busy={busy || undefined}>
      {/* the mode toggle — a two-cell hairline tab row */}
      <div className="vid-up-tabs" role="tablist" aria-label="اختيار مصدر الفيديو">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'upload'}
          className={mode === 'upload' ? 'is-active' : undefined}
          onClick={() => onModeChange('upload')}
        >
          <UploadCloud size={15} aria-hidden="true" />
          رفع ملف
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'url'}
          className={mode === 'url' ? 'is-active' : undefined}
          onClick={() => onModeChange('url')}
        >
          <Link2 size={15} aria-hidden="true" />
          رابط
        </button>
      </div>

      {mode === 'url' ? (
        <input
          id={inputId}
          type="text"
          dir="ltr"
          className="auth-input"
          placeholder="https://…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="vid-up-body">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="video/mp4,video/webm,video/x-m4v,video/ogg,.mp4,.webm,.m4v,.ogv,.ogg"
            className="visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void pickFile(file);
              e.target.value = '';
            }}
          />
          {!busy && !done && (
            <button type="button" className="vid-up-pick" onClick={() => inputRef.current?.click()}>
              <FileVideo size={18} aria-hidden="true" />
              <span>{fileName ?? 'اختر ملف فيديو (mp4 أو webm — حتى 4 جيجابايت)'}</span>
            </button>
          )}
          {busy && (
            <div className="vid-up-progress" role="status">
              <div className="vid-up-meter" aria-hidden="true">
                <div
                  className="vid-up-meter-fill"
                  /* 5-C1-style (23-b .progress-fill pattern): the VALUE rides
                     --fill-scale (0..1) — the CSS paints the full track and
                     scales it with transform: scaleX() (composited, no
                     reflow-per-tick; transform-origin follows the writing
                     direction). */
                  style={{ '--fill-scale': pct / 100 } as CSSProperties}
                />
              </div>
              <span className="vid-up-pct">
                {pct}%{partLabel ? ` · ${partLabel}` : ''}
              </span>
              <button
                type="button"
                className="vid-up-stop"
                onClick={() => abortRef.current?.abort()}
                aria-label="إلغاء الرفع"
              >
                <CircleStop size={16} aria-hidden="true" />
                إلغاء
              </button>
            </div>
          )}
          {done && !busy && (
            <p className="vid-up-done" role="status">
              <FileVideo size={15} aria-hidden="true" />
              تم رفع الفيديو — سيُحفظ مع المحاضرة
              {' '}
              <button type="button" className="vid-up-again" onClick={() => inputRef.current?.click()}>
                استبدال
              </button>
            </p>
          )}
        </div>
      )}

      {mode === 'url' && <p className="vid-up-hint">{urlHint}</p>}
      {error !== null && (
        <p className="vid-up-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
