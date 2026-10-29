/**
 * FeedbackWidget — r323 B3.6 — the floating «أبلغ عن مشكلة / اقتراح».
 *
 * The pilot's ears: a bug report ships the route it was filed from,
 * the sender's role, the browser line, the LAST console errors (the
 * consoleTape ring), and an OPTIONAL downscaled screenshot — then the
 * registrar/owner inbox works the status. One tap to open, honest
 * about every field it sends.
 */
import { useEffect, useRef, useState } from 'react';
import { Bug, CheckCircle2, Image as ImageIcon, Lightbulb, MessageSquarePlus, X } from 'lucide-react';
import { Modal } from '../overlays/Modal';
import { Icon } from '../Icon';
import { useSendFeedback } from '../../hooks/resources/feedback';
import { consoleTapeEntries } from '../../lib/consoleTape';

/** Downscale a picked image to ≤ 1280px-wide JPEG (≤ 0.6 quality when
 *  the first pass exceeds the 600 KB ceiling) — a data URL the server's
 *  guard admits. Refuses (returns null) when even that cannot fit:
 *  honest failure beats a silently-clipped shot. */
async function downscaleScreenshot(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('image decode failed'));
      el.src = url;
    });
    const scale = Math.min(1, 1280 / (img.naturalWidth || 1280));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((img.naturalWidth || 1280) * scale);
    canvas.height = Math.round((img.naturalHeight || 720) * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let out = canvas.toDataURL('image/jpeg', 0.8);
    if (out.length > 600_000) out = canvas.toDataURL('image/jpeg', 0.6);
    return out.length <= 600_000 ? out : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function FeedbackWidget() {
  const send = useSendFeedback();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<'BUG' | 'IDEA'>('BUG');
  const [note, setNote] = useState('');
  const [shot, setShot] = useState<string | null>(null);
  const [shotName, setShotName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      // reset AFTER the close window so the next open is clean
      const t = setTimeout(() => {
        setNote('');
        setShot(null);
        setShotName(null);
        setError(null);
        setSent(false);
        setKind('BUG');
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const pickShot = async (f: File | undefined | null) => {
    if (!f) return;
    const data = await downscaleScreenshot(f);
    if (!data) {
      setError('تعذّر تجهيز اللقطة — جرّب صورة أصغر أو أرسل بغيرها.');
      return;
    }
    setError(null);
    setShot(data);
    setShotName(f.name);
  };

  const submit = () => {
    if (note.trim().length < 10) {
      setError('الوصف قصير جدًا — 10 أحرف على الأقل.');
      return;
    }
    setError(null);
    send.mutate(
      {
        kind,
        note: note.trim(),
        route: window.location.pathname,
        console: consoleTapeEntries(),
        ...(shot ? { screenshot: shot } : {}),
      },
      {
        onSuccess: () => setSent(true),
        onError: () => setError('تعذّر الإرسال — تحقّق من اتصالك ثم أعد المحاولة.'),
      },
    );
  };

  return (
    <>
      <button
        type="button"
        className="fb-fab"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="أبلغ عن مشكلة أو اقترح"
      >
        <Icon icon={MessageSquarePlus} size={16} />
        <span>أبلغ عن مشكلة / اقتراح</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} ariaLabel="تغذية راجعة">
        <div className="fb-sheet">
          <header className="fb-head">
            <h2 className="fb-title">أبلغ عن مشكلة / اقتراح</h2>
            <button type="button" className="fb-close" onClick={() => setOpen(false)} aria-label="إغلاق">
              <Icon icon={X} size={16} />
            </button>
          </header>

          {sent ? (
            <div className="fb-done" role="status">
              <Icon icon={CheckCircle2} size={22} />
              <p>وصلنا — شكرًا لك. يراجعها فريق المنصّة ويعمل على حالتها.</p>
              <button type="button" className="btn primary sm" onClick={() => setOpen(false)}>
                تم
              </button>
            </div>
          ) : (
            <div className="fb-body">
              <div className="fb-kinds" role="radiogroup" aria-label="نوع التقرير">
                <button
                  type="button"
                  role="radio"
                  aria-checked={kind === 'BUG'}
                  className="fb-kind"
                  data-active={kind === 'BUG'}
                  onClick={() => setKind('BUG')}
                >
                  <Icon icon={Bug} size={14} /> مشكلة
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={kind === 'IDEA'}
                  className="fb-kind"
                  data-active={kind === 'IDEA'}
                  onClick={() => setKind('IDEA')}
                >
                  <Icon icon={Lightbulb} size={14} /> اقتراح
                </button>
              </div>

              <label className="fb-field">
                <span>الوصف — ماذا حدث؟ وماذا كنت تتوقّع؟</span>
                <textarea
                  className="fb-textarea"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="اكتب وصفًا واضحًا — الخطوات التي أدّت إلى المشكلة تساعدنا على إصلاحها أسرع."
                />
              </label>

              <div className="fb-shot-row">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(e) => void pickShot(e.target.files?.[0])}
                />
                <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>
                  <Icon icon={ImageIcon} size={13} /> إرفاق لقطة شاشة (اختياري)
                </button>
                {shotName && (
                  <span className="fb-shot-name">
                    {shotName}
                    <button
                      type="button"
                      className="fb-shot-x"
                      onClick={() => {
                        setShot(null);
                        setShotName(null);
                      }}
                      aria-label="إزالة اللقطة"
                    >
                      <Icon icon={X} size={11} />
                    </button>
                  </span>
                )}
              </div>

              <p className="fb-meta">
                يُرسل مع تقريرك: الصفحة الحالية، نوع حسابك، نوع المتصفّح، وآخر أخطاء
                لوحة التطوير (حتى 20) — لتشخيص أسرع. بلا بيانات شخصية.
              </p>

              {error && (
                <p className="fb-error" role="alert">
                  {error}
                </p>
              )}

              <div className="fb-actions">
                <button type="button" className="btn ghost sm" onClick={() => setOpen(false)}>
                  إلغاء
                </button>
                <button type="button" className="btn primary sm" onClick={submit} disabled={send.isPending}>
                  {send.isPending ? 'جارٍ الإرسال…' : 'إرسال'}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
