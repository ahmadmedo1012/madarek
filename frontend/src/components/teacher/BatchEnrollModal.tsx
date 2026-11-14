/**
 * R350 F2 (mode B UI) — «إرفاق طلاب بهذا المقرر»: the teacher's batch
 * enrolment modal, the owner's «ارفاق الطلاب دفعة واحدة».
 *
 * Two honest stages on one surface:
 *   1. المعاينة — paste the refs (reg-number / phone / national-id /
 *      exact unique name), one per line; POST /import/enroll/preview
 *      resolves each through the matching chain and reports matched /
 *      already-enrolled / unmatched + the capacity picture.
 *   2. التثبيت — POST /import/enroll/commit lands the chosen seats
 *      under the offering's row lock; the E3 confirmation mail rides
 *      the outbox (best-effort, never blocking).
 *
 * Scope: TEACHER → own offerings only (the server enforces it; the
 * modal is offered from a teacher-owned offering context).
 */
import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, UserPlus } from 'lucide-react';
import { Modal } from '../overlays/Modal';
import { api, unwrap } from '../../lib/api';
import { apiErrorMessage } from '../../lib/format';
import { toast } from '../../lib/toast';

interface EnrollPreviewOk {
  offeringId: string;
  capacity: { used: number; total: number; free: number };
  matched: { ref: string; studentId: string; name: string; universityId: string | null; method: string }[];
  alreadyEnrolled: { ref: string; studentId: string; name: string }[];
  unmatched: { ref: string; reason: string }[];
}

interface EnrollCommitOk {
  offeringId: string;
  created: number;
  skippedAlready: number;
  failedCapacity: number;
}

const METHOD_AR: Record<string, string> = {
  universityId: 'رقم القيد',
  phone: 'الهاتف',
  nationalId: 'الرقم الوطني',
  name: 'الاسم',
};

export function BatchEnrollModal({
  offeringId,
  courseName,
  onClose,
  onEnrolled,
}: {
  offeringId: string;
  courseName: string;
  onClose: () => void;
  onEnrolled?: () => void;
}) {
  const [refsText, setRefsText] = useState('');
  const [preview, setPreview] = useState<EnrollPreviewOk | null>(null);
  const [commit, setCommit] = useState<EnrollCommitOk | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refs = useMemo(
    () => refsText.split('\n').map((l) => l.trim()).filter((l) => l !== ''),
    [refsText],
  );

  const runPreview = async () => {
    if (refs.length === 0) {
      setError('الصق مرجعًا واحدًا على الأقل (رقم القيد أو الهاتف أو الاسم)');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = await unwrap<EnrollPreviewOk>(api.post('/import/enroll/preview', { offeringId, refs }));
      setPreview(payload);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذّرت المعاينة — أعد المحاولة'));
    } finally {
      setBusy(false);
    }
  };

  const runCommit = async () => {
    if (preview === null) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await unwrap<EnrollCommitOk>(api.post('/import/enroll/commit', {
        offeringId,
        studentIds: preview.matched.map((m) => m.studentId),
      }));
      setCommit(payload);
      toast.success(`أُرفق ${payload.created} طالبًا بالمقرر`);
      onEnrolled?.();
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذّر التثبيت — أعد المحاولة'));
    } finally {
      setBusy(false);
    }
  };

  const overCapacity = preview !== null && preview.matched.length > preview.capacity.free;

  return (
    <Modal
      open
      onClose={() => { if (!busy) onClose(); }}
      ariaLabel="إرفاق طلاب بهذا المقرر"
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
    >
      <div className="benr">
        <div className="modal-header">
          <div className="modal-title">إرفاق طلاب بـ«{courseName}»</div>
        </div>

        {commit === null ? (
          <>
            <p className="benr-lede">
              الصق قائمة المراجع — رقم القيد أو الهاتف أو الرقم الوطني أو الاسم الكامل —
              سطرًا لكل طالب. سيعرض النظام مطابقة كل مرجع قبل كتابة أي مقعد.
            </p>
            <textarea
              className="benr-area auth-input"
              dir="rtl"
              rows={6}
              placeholder={'9001234\n0925123456\nسالم الطاهر العماري'}
              value={refsText}
              onChange={(e) => { setRefsText(e.target.value); setPreview(null); }}
              aria-label="قائمة المراجع"
            />
            {preview === null ? (
              <>
                {error !== null && <p className="benr-error" role="alert">{error}</p>}
                <div className="benr-foot">
                  <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>إلغاء</button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy || refs.length === 0}
                    onClick={() => void runPreview()}
                  >
                    معاينة {refs.length > 0 ? `(${refs.length})` : ''}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="benr-capacity" role="status">
                  <span>السعة: {preview.capacity.used} / {preview.capacity.total}</span>
                  <span className={preview.capacity.free === 0 ? 'benr-bad' : undefined}>
                    متاح: {preview.capacity.free}
                  </span>
                </div>
                {overCapacity && (
                  <p className="benr-error" role="alert">
                    <AlertTriangle size={14} aria-hidden="true" />
                    القائمة أطول من المقاعد المتاحة — ستُثبَّت أول {preview.capacity.free} مقاعد فقط والبقية تُرفض.
                  </p>
                )}
                <div className="benr-table-wrap" tabIndex={0} role="region" aria-label="نتائج المطابقة">
                  <table className="benr-table">
                    <tbody>
                      {preview.matched.map((m) => (
                        <tr key={m.studentId} data-status="ok">
                          <td><CheckCircle2 size={14} aria-hidden="true" /></td>
                          <td>{m.name}</td>
                          <td dir="ltr">{m.universityId ?? m.ref}</td>
                          <td>{METHOD_AR[m.method] ?? m.method}</td>
                        </tr>
                      ))}
                      {preview.alreadyEnrolled.map((a) => (
                        <tr key={`e${a.studentId}`} data-status="skip">
                          <td>↩</td>
                          <td>{a.name}</td>
                          <td colSpan={2}>مسجَّل في المقرر مسبقًا — سيُتجاوز</td>
                        </tr>
                      ))}
                      {preview.unmatched.map((u) => (
                        <tr key={`x${u.ref}`} data-status="error">
                          <td><AlertTriangle size={14} aria-hidden="true" /></td>
                          <td dir="ltr">{u.ref}</td>
                          <td colSpan={2}>{u.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {error !== null && <p className="benr-error" role="alert">{error}</p>}
                <div className="benr-foot">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => { setPreview(null); }}
                    disabled={busy}
                  >تعديل القائمة</button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy || preview.matched.length === 0}
                    onClick={() => void runCommit()}
                  >
                    <UserPlus size={15} aria-hidden="true" />
                    تثبيت {preview.matched.length} مقعدًا
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="benr-summary" role="status">
              <span><CheckCircle2 size={14} aria-hidden="true" /> أُرفق {commit.created} طالبًا</span>
              {commit.skippedAlready > 0 && <span>{commit.skippedAlready} مسجَّل مسبقًا</span>}
              {commit.failedCapacity > 0 && <span className="benr-bad">{commit.failedCapacity} رُفض (السعة مكتملة)</span>}
            </div>
            <div className="benr-foot">
              <button type="button" className="btn primary" onClick={onClose}>تم</button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
