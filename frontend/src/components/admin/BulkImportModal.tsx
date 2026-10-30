/**
 * BulkImportModal — the registrar's r323 B3.1 «استيراد طلاب» flow.
 *
 * Three honest states, one surface:
 *   1. INPUT  — paste the CSV or pick a file; the template header is
 *      shown and a one-click download ships the exact template.
 *   2. PREVIEW — POST /users/bulk-import/preview returns per-line
 *      verdicts against the REAL institution (existing emails,
 *      reg-numbers, faculty/department names). Every bad line shows
 *      its Arabic reason; nothing is written.
 *   3. COMMIT — POST /users/bulk-import/commit lands the whole cohort
 *      in one transaction; the response's temp-password sheet becomes
 *      a downloadable CSV the registrar prints and hands out.
 *
 * CSV only (Excel → حفظ باسم CSV documented inline) — honest scope,
 * mirrors the backend's parser contract.
 */
import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Printer, UploadCloud } from 'lucide-react';
import { Modal } from '../overlays/Modal';
import { api, unwrap } from '../../lib/api';
import { apiErrorMessage } from '../../lib/format';
import { toast } from '../../lib/toast';

const TEMPLATE_CSV =
  'الاسم الأول,اسم العائلة,البريد الإلكتروني,الرقم الجامعي,الكلية,القسم,السنة\n' +
  'أحمد,المصري,ahmed@example.ly,20240001,كلية الهندسة,قسم الحاسبات,1\n' +
  'سارة,علي,sara@example.ly,20240002,كلية الهندسة,قسم الحاسبات,1\n';

interface PreviewRow {
  line: number;
  status: 'ok' | 'error';
  message?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  universityId?: string;
  faculty?: string;
  department?: string;
  year?: number;
}

interface PreviewOk {
  rows: PreviewRow[];
  summary: { total: number; ok: number; error: number; rowErrors: { line: number; message: string }[] };
}

interface CommitResponse {
  created: number;
  sheet: { name: string; email: string; universityId: string; tempPassword: string }[];
  skipped: number;
}

type Stage = 'input' | 'preview' | 'done';

function downloadCsv(filename: string, content: string): void {
  // BOM first: Excel opens Arabic CSVs correctly only with it.
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkImportModal({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>('input');
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewOk | null>(null);
  const [sheet, setSheet] = useState<CommitResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pickFile = (file: File) => {
    if (file.size > 512 * 1024) {
      setError('حجم الملف يتجاوز 512 كيلوبايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result ?? ''));
      setFileName(file.name);
      setError(null);
    };
    reader.readAsText(file, 'utf-8');
  };

  const runPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      /* r325 F1: the raw axios instance answers the `{ data }` envelope —
       * the payload rides `res.data.data`. The old `setPreview(res.data)`
       * stored the ENVELOPE, so `preview.rows` was undefined and the
       * preview stage crashed the page (found live by the F1 flow spec).
       * unwrap() is the house helper for exactly this. */
      const payload = await unwrap<PreviewOk | { fileError: string }>(
        api.post('/users/bulk-import/preview', { csv }),
      );
      if ('fileError' in payload) {
        setError(payload.fileError);
        return;
      }
      setPreview(payload);
      setStage('preview');
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر تجهيز العرض المسبق — أعد المحاولة'));
    } finally {
      setBusy(false);
    }
  };

  const runCommit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = await unwrap<CommitResponse>(api.post('/users/bulk-import/commit', { csv }));
      setSheet(payload);
      setStage('done');
      toast.success(`تم إنشاء ${payload.created} حساب طالب`);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذر إتمام الاستيراد — راجع العرض المسبق وأعد المحاولة'));
    } finally {
      setBusy(false);
    }
  };

  const okRows = preview?.rows.filter((r) => r.status === 'ok') ?? [];
  const errRows = preview?.rows.filter((r) => r.status === 'error') ?? [];

  return (
    <Modal
      open
      onClose={() => { if (!busy) onClose(); }}
      ariaLabel="استيراد طلاب من ملف"
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
    >
      <div className="modal-header">
        <div className="modal-title">استيراد طلاب من ملف</div>
      </div>
      {stage === 'input' && (
        <div className="bimp">
          <p className="bimp-lede">
            ارفع قائمة الطلاب كملف CSV (من Excel: «حفظ باسم» ← CSV UTF-8). سيعرض النظام
            كل سطر مع نتيجته قبل إنشاء أي حساب — لا شيء يُكتب قبل تأكيدك.
          </p>
          <div className="bimp-actions">
            <button type="button" className="btn ghost sm" onClick={() => downloadCsv('قالب-استيراد-الطلاب.csv', TEMPLATE_CSV)}>
              <Download size={14} aria-hidden="true" />
              تحميل القالب
            </button>
            <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>
              <FileSpreadsheet size={14} aria-hidden="true" />
              اختيار ملف
            </button>
            {fileName !== null && <span className="bimp-file">{fileName}</span>}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="visually-hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) pickFile(f);
                e.target.value = '';
              }}
            />
          </div>
          <textarea
            className="bimp-area auth-input"
            dir="ltr"
            rows={8}
            placeholder="الصق محتوى CSV هنا…"
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setFileName(null); }}
            aria-label="محتوى ملف CSV"
          />
          {error !== null && <p className="bimp-error" role="alert">{error}</p>}
          <div className="bimp-foot">
            <button type="button" className="btn ghost" onClick={onClose}>إلغاء</button>
            <button type="button" className="btn primary" disabled={busy || csv.trim() === ''} onClick={() => void runPreview()}>
              <UploadCloud size={15} aria-hidden="true" />
              عرض النتائج قبل التنفيذ
            </button>
          </div>
        </div>
      )}

      {stage === 'preview' && preview !== null && (
        <div className="bimp">
          <div className="bimp-summary" role="status">
            <span><CheckCircle2 size={14} aria-hidden="true" /> {okRows.length} صفاً صالحاً</span>
            <span className={errRows.length > 0 ? 'bimp-bad' : undefined}>
              <AlertTriangle size={14} aria-hidden="true" /> {errRows.length} صفاً مرفوضاً
            </span>
          </div>
          <div className="bimp-table-wrap" tabIndex={0} role="region" aria-label="نتائج العرض المسبق">
            <table className="bimp-table">
              <thead>
                <tr>
                  <th scope="col">السطر</th>
                  <th scope="col">الاسم</th>
                  <th scope="col">البريد</th>
                  <th scope="col">الرقم الجامعي</th>
                  <th scope="col">الكلية / القسم</th>
                  <th scope="col">النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.line} data-status={r.status}>
                    <td>{r.line}</td>
                    <td>{r.status === 'ok' ? `${r.firstName} ${r.lastName}` : '—'}</td>
                    <td dir="ltr">{r.email ?? '—'}</td>
                    <td dir="ltr">{r.universityId ?? '—'}</td>
                    <td>{r.status === 'ok' ? `${r.faculty} · ${r.department}` : '—'}</td>
                    <td className="bimp-verdict">{r.status === 'ok' ? 'جاهز' : (r.message ?? 'خطأ')}</td>
                  </tr>
                ))}
                {preview.summary.rowErrors.map((e) => (
                  <tr key={`x${e.line}`} data-status="error">
                    <td>{e.line}</td>
                    <td colSpan={5} className="bimp-verdict">{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error !== null && <p className="bimp-error" role="alert">{error}</p>}
          <div className="bimp-foot">
            <button type="button" className="btn ghost" onClick={() => setStage('input')} disabled={busy}>رجوع</button>
            <button type="button" className="btn primary" disabled={busy || okRows.length === 0} onClick={() => void runCommit()}>
              إنشاء {okRows.length} حساباً
            </button>
          </div>
        </div>
      )}

      {stage === 'done' && sheet !== null && (
        <div className="bimp">
          <div className="bimp-summary" role="status">
            <span><CheckCircle2 size={14} aria-hidden="true" /> تم إنشاء {sheet.created} حساباً</span>
            {sheet.skipped > 0 && <span className="bimp-bad">{sheet.skipped} صفاً تجاوزناه (أخطاء العرض المسبق)</span>}
          </div>
          <p className="bimp-lede">
            كلمات المرور المؤقتة أدناه تُعرض مرة واحدة — نزّل الورقة واطبعها ووزّعها
            على الطلاب؛ يُطلب منهم تغيير كلمة المرور عند أول دخول.
          </p>
          <div className="bimp-table-wrap" tabIndex={0} role="region" aria-label="ورقة كلمات المرور المؤقتة">
            <table className="bimp-table">
              <thead>
                <tr>
                  <th scope="col">الاسم</th>
                  <th scope="col">البريد</th>
                  <th scope="col">الرقم الجامعي</th>
                  <th scope="col">كلمة المرور المؤقتة</th>
                </tr>
              </thead>
              <tbody>
                {sheet.sheet.map((s) => (
                  <tr key={s.email}>
                    <td>{s.name}</td>
                    <td dir="ltr">{s.email}</td>
                    <td dir="ltr">{s.universityId}</td>
                    <td dir="ltr" className="bimp-pass">{s.tempPassword}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bimp-foot">
            <button type="button" className="btn ghost" onClick={() => window.print()}>
              <Printer size={14} aria-hidden="true" />
              طباعة
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => downloadCsv(
                'كلمات-المرور-المؤقتة.csv',
                'الاسم,البريد الإلكتروني,الرقم الجامعي,كلمة المرور المؤقتة\n' +
                  sheet.sheet.map((s) => `${s.name},${s.email},${s.universityId},${s.tempPassword}`).join('\n'),
              )}
            >
              <Download size={14} aria-hidden="true" />
              تنزيل الورقة
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
