/**
 * R350 F2 — «استيراد الطلاب»: the 5-step import wizard.
 *
 * The registrar's full migration flow on ONE page, replacing the r323
 * BulkImportModal (which stays for its own small-CSV route until Z):
 *
 *   1. رفع          — drag-drop/pick an XLSX or CSV (≤10MB); /import/parse
 *                      reports the format, encoding, delimiter, sheets,
 *                      the suggested mapping and the I-P4 preset fits.
 *   2. مطابقة       — the mapping table: source column → target with
 *                      confidence badges + LIVE sample values; preset
 *                      chips (I-P4) + saved mapping profiles apply in
 *                      one tap; the XLSX sheet is switchable.
 *   3. مراجعة       — /import/preview's per-row verdicts with status
 *                      chips + filters; duplicates carry the I-P2 field
 *                      diff (from → to) and a per-row policy verdict.
 *   4. تأكيد        — the honest summary (counts, policy, createIfMissing)
 *                      on a sticky action bar; commit is one deliberate
 *                      act.
 *   5. النتيجة      — counts, the one-time credentials sheet (download +
 *                      print), the report workbook, and the I-P2
 *                      rollback (72h window, confirm-gated).
 *
 * Auth: the ADMIN route gate rides App.tsx. OWNER names the target
 * institution when the session has none. RTL-first, light/dark via the
 * house tokens, 390/768/1440 (the mapping/review tables scroll within
 * their region — the page never scrolls horizontally).
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Check, CheckCircle2,
  Download, FileUp, RotateCcw, UploadCloud,
} from 'lucide-react';
import { Card } from '../../components/primitives';
import { EmptyState } from '../../components/primitives/States';
import { PageHeader } from '../../components/patterns';
import { api, unwrap } from '../../lib/api';
import { apiErrorMessage } from '../../lib/format';
import { toast } from '../../lib/toast';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';

import '../../styles/admin.css';
import '../../styles/shared/heron-admin-owner.css';

/* ── wire types (mirrors import.routes.ts) ────────────────────────── */

interface ParseOk {
  format: 'XLSX' | 'CSV';
  sheets: string[];
  encoding: string;
  delimiter: string;
  headers: string[];
  rowCount: number;
  sampleRows: string[][];
  detectedLanguage: 'ar' | 'en' | 'mixed';
  suggestedMap: { version: 1; columns: { source: string; target: string }[] };
  unknownColumns: string[];
  presetSuggestions: PresetSuggestion[];
}

interface PreviewRow {
  line: number;
  status: 'ok' | 'error';
  errorsAr: string[];
  warningsAr: string[];
  existing?: { universityId: string; nameAr: string };
  diff?: { field: string; fieldAr: string; from: string; to: string }[];
  fillable?: string[];
}

interface PreviewOk {
  jobId: string;
  counts: { total: number; ok: number; error: number; warningCount: number };
  duplicateReport: { withinFile?: number; againstDb?: number } & Record<string, unknown>;
  rows: PreviewRow[];
}

interface CommitOk {
  jobId: string;
  succeeded: number;
  skipped: number;
  failed: number;
  activationMailQueued: number;
  credentials: { name: string; universityId: string; email: string; tempPassword: string }[];
}

interface RollbackOk {
  deletedUsers: number; restoredUpdates: number; keptActive: number;
  removedEmptyOrgs: number; missingRows: number;
}

interface PresetSuggestion {
  id: string;
  labelAr: string;
  coverage: number;
  verified: boolean;
  placedColumns: number;
  noteAr?: string;
  missingTargets: string[];
}

/* The canonical targets, compact-encoded (value:label pairs — the
 * bundle ceiling is a ratchet, and an 18-entry object literal is
 * heavier than the data it carries). */
const TARGET_OPTIONS: { value: string; label: string }[] =
  ('nameAr:الاسم الكامل,firstName:الاسم الأول,lastName:اسم العائلة,' +
   'universityId:رقم القيد,email:البريد الإلكتروني,year:السنة الدراسية,' +
   'faculty:الكلية,department:القسم,stage:المرحلة,grade:الصف,section:الفصل,' +
   'studentPhone:هاتف الطالب,guardianName:اسم ولي الأمر,' +
   'guardianPhone:هاتف ولي الأمر,dateOfBirth:تاريخ الميلاد,gender:الجنس,' +
   'city:المدينة,employeeId:الرقم الوظيفي,unknown:— تجاهل العمود —')
    .split(',')
    .map((pair) => {
      const i = pair.indexOf(':');
      return { value: pair.slice(0, i), label: pair.slice(i + 1) };
    });

const STEP_LABELS = ['رفع الملف', 'مطابقة الأعمدة', 'المراجعة', 'التأكيد', 'النتيجة'] as const;

const POLICY_LABELS: Record<string, string> = {
  SKIP: 'تجاوز الموجود',
  UPDATE: 'تحديث كامل',
  FILL_EMPTY: 'إكمال الفراغات فقط',
  ERROR: 'رفض الصف',
};

type RowPolicy = 'SKIP' | 'UPDATE' | 'FILL_EMPTY';

const MAX_BYTES = 10 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result ?? '');
      resolve(s.slice(s.indexOf(',') + 1)); // strip the data: prefix
    };
    reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8'): void {
  const blob = new Blob(['\uFEFF' + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportWizardPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* step 1 — the file */
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  /* step 1→2 — parse (a presetId applies the named preset server-side —
   * the placement logic has ONE home, this page just renders) */
  const [parsed, setParsed] = useState<ParseOk | null>(null);
  const [sheetName, setSheetName] = useState<string | undefined>(undefined);
  const [appliedPreset, setAppliedPreset] = useState<string | undefined>(undefined);

  /* step 2 — the mapping (source header → target) */
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [confidences, setConfidences] = useState<Record<string, number>>({});

  /* step 3 — the preview */
  const [preview, setPreview] = useState<PreviewOk | null>(null);
  const [rowFilter, setRowFilter] = useState<'all' | 'ok' | 'warning' | 'error' | 'duplicate'>('all');
  const [rowPolicies, setRowPolicies] = useState<Record<string, RowPolicy>>({});

  /* step 4 — the policy */
  const [duplicatePolicy, setDuplicatePolicy] = useState<'SKIP' | 'UPDATE' | 'FILL_EMPTY' | 'ERROR'>('SKIP');
  const [createIfMissing, setCreateIfMissing] = useState(false);

  /* step 5 — the result + rollback */
  const [committed, setCommitted] = useState<CommitOk | null>(null);
  const [rollback, setRollback] = useState<RollbackOk | null>(null);
  const [rollbackConfirm, setRollbackConfirm] = useState(false);

  const runParse = useCallback(async (b64: string, sheet?: string, presetId?: string) => {
    setBusy(true);
    setError(null);
    try {
      const payload = await unwrap<ParseOk>(api.post('/import/parse', {
        entity: 'STUDENT',
        fileBase64: b64,
        ...(sheet ? { sheetName: sheet } : {}),
        ...(presetId ? { presetId } : {}),
      }));
      setParsed(payload);
      setSheetName(sheet);
      setAppliedPreset(presetId);
      const m: Record<string, string> = {};
      const c: Record<string, number> = {};
      for (const col of payload.suggestedMap.columns) {
        m[col.source] = col.target;
        c[col.source] = col.target === 'unknown' ? 0 : 1;
      }
      setMapping(m);
      setConfidences(c);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذّر تحليل الملف — تأكد من الصيغة (XLSX أو CSV) وحجمه (≤ ١٠ م.ب)'));
      setParsed(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const acceptFile = useCallback(async (file: File) => {
    if (file.size > MAX_BYTES) {
      setError('حجم الملف يتجاوز ١٠ ميغابايت — قسّمه إلى ملفات أصغر');
      return;
    }
    setError(null);
    setFileName(file.name);
    const b64 = await fileToBase64(file);
    setFileBase64(b64);
    await runParse(b64);
  }, [runParse]);

  /* step 2 → 3 */
  const runPreview = useCallback(async () => {
    if (parsed === null || fileBase64 === null) return;
    setBusy(true);
    setError(null);
    try {
      const columns = parsed.headers
        .map((h) => ({ source: h, target: mapping[h] ?? 'unknown' }))
        .filter((c) => c.source !== '' && c.target !== 'unknown');
      if (columns.length === 0) {
        setError('لم تُطابَق أي أعمدة — خصّص عمودًا واحدًا على الأقل قبل المتابعة');
        return;
      }
      const payload = await unwrap<PreviewOk>(api.post('/import/preview', {
        entity: 'STUDENT',
        fileBase64,
        columnMap: { version: 1, columns },
        createIfMissing,
        ...(sheetName ? { sheetName } : {}),
      }));
      setPreview(payload);
      setRowPolicies({});
      setRowFilter('all');
      setStep(3);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذّر تجهيز المعاينة — أعد المحاولة'));
    } finally {
      setBusy(false);
    }
  }, [parsed, fileBase64, mapping, createIfMissing, sheetName]);

  /* step 4 → 5 */
  const runCommit = useCallback(async () => {
    if (preview === null || fileBase64 === null) return;
    setBusy(true);
    setError(null);
    try {
      const payload = await unwrap<CommitOk>(api.post(`/import/jobs/${preview.jobId}/commit`, {
        duplicatePolicy,
        chunkSize: 200,
        fileBase64,
        rowPolicies,
        ...(sheetName ? { sheetName } : {}),
      }));
      setCommitted(payload);
      setStep(5);
      toast.success(`تم تثبيت الاستيراد: ${payload.succeeded} صفًا`);
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذّر تثبيت الاستيراد — راجع المعاينة وأعد المحاولة'));
    } finally {
      setBusy(false);
    }
  }, [preview, fileBase64, duplicatePolicy, rowPolicies, sheetName]);

  const runRollback = useCallback(async () => {
    if (committed === null) return;
    setBusy(true);
    try {
      const payload = await unwrap<RollbackOk>(api.post(`/import/jobs/${committed.jobId}/rollback`, {}));
      setRollback(payload);
      setRollbackConfirm(false);
      toast.success('تم التراجع عن الاستيراد');
    } catch (err) {
      setError(apiErrorMessage(err, 'تعذّر التراجع — حاول مجددًا'));
    } finally {
      setBusy(false);
    }
  }, [committed]);

  const mappedCount = useMemo(
    () => Object.values(mapping).filter((t) => t !== 'unknown' && t !== '').length,
    [mapping],
  );

  const visibleRows = useMemo(() => {
    if (preview === null) return [];
    return preview.rows.filter((r) => {
      if (rowFilter === 'all') return true;
      if (rowFilter === 'error') return r.status === 'error';
      if (rowFilter === 'warning') return r.status === 'ok' && r.warningsAr.length > 0;
      if (rowFilter === 'duplicate') return r.existing !== undefined;
      return r.status === 'ok' && r.warningsAr.length === 0;
    });
  }, [preview, rowFilter]);

  const duplicateRows = preview?.rows.filter((r) => r.existing !== undefined) ?? [];

  /* R350 I-P4/F2 — a preset chip re-parses with presetId: the placement
   * runs SERVER-side (one source of truth); the returned suggestedMap
   * becomes the editable mapping. Manual edits since are replaced — the
   * chip is an explicit restart of the mapping step. */
  const applyPreset = (presetId: string, labelAr: string) => {
    if (fileBase64 === null) return;
    void runParse(fileBase64, sheetName, presetId).then(() => {
      toast.success(`طُبق «${labelAr}» — راجع الأعمدة ثم عدّل ما تشاء`);
    });
  };

  return (
    <div className="r305ao">
      <PageHeader
        title="استيراد الطلاب"
        description="معالج الاستيراد الكامل: رفع ← مطابقة ← مراجعة ← تأكيد ← نتيجة. لا شيء يُكتب قبل تأكيدك، وكل مهمة قابلة للتراجع خلال ٧٢ ساعة."
        breadcrumbs={[{ label: 'لوحة المسجل العام', to: '/admin/dashboard' }, { label: 'استيراد الطلاب' }]}
      />

      {/* the stepper */}
      <ol className="iw-steps" aria-label="خطوات الاستيراد">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3 | 4 | 5;
          const state = step === n ? 'now' : step > n ? 'done' : 'todo';
          return (
            <li key={label} data-state={state} aria-current={step === n ? 'step' : undefined}>
              <span className="iw-step-num" aria-hidden="true">{state === 'done' ? <Check size={12} /> : n}</span>
              <span className="iw-step-label">{label}</span>
            </li>
          );
        })}
      </ol>

      {error !== null && (
        <p className="iw-error" role="alert">
          <AlertTriangle size={15} aria-hidden="true" /> {error}
        </p>
      )}

      {/* ── step 1: upload ─────────────────────────────────────────── */}
      {step === 1 && (
        <Card title="ارفع ملف الطلاب" icon={FileUp}>
          <div
            className={`iw-drop${dragOver ? ' over' : ''}`}
            role="button"
            tabIndex={0}
            aria-label="اسحب الملف هنا أو اضغط للاختيار"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) void acceptFile(f);
            }}
          >
            <UploadCloud size={28} aria-hidden="true" />
            <p className="iw-drop-title">اسحب ملف Excel أو CSV هنا</p>
            <p className="iw-drop-sub">أو اضغط للاختيار · XLSX / CSV · حتى ١٠ ميغابايت · حتى ٢٠ ألف صف</p>
            {fileName !== null && <p className="iw-drop-file" dir="ltr">{fileName}</p>}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.csv"
            className="visually-hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void acceptFile(f);
              e.target.value = '';
            }}
          />
          <p className="iw-hint">
            <a href="/api/v1/import/templates/STUDENT" download>تحميل القالب الرسمي (Excel)</a>
            {' '}— يدعم النظام ترميز Windows-1256 وفواصل الأعمدة المختلفة تلقائيًا.
          </p>
          {busy && parsed === null && <p className="iw-busy" role="status">جارٍ تحليل الملف…</p>}
          {parsed !== null && (
            <div className="iw-parse-facts" role="status">
              <span><FileUp size={14} aria-hidden="true" /> {parsed.format}</span>
              <span>{parsed.rowCount.toLocaleString('ar-LY')} صفًا</span>
              <span>{parsed.headers.length} عمودًا</span>
              {parsed.format === 'CSV' && <span dir="ltr">{parsed.encoding} · «{parsed.delimiter}»</span>}
              {parsed.sheets.length > 1 && (
                <span>{parsed.sheets.length} أوراق — تُختار في الخطوة التالية</span>
              )}
              {parsed.unknownColumns.length > 0 && (
                <span className="iw-warn">{parsed.unknownColumns.length} أعمدة غير متعرَّف عليها — ستُراجع في المطابقة</span>
              )}
            </div>
          )}
          <div className="iw-actions">
            <button
              type="button"
              className="btn primary"
              disabled={busy || parsed === null}
              onClick={() => setStep(2)}
            >
              متابعة إلى المطابقة <ArrowLeft size={15} aria-hidden="true" />
            </button>
          </div>
        </Card>
      )}

      {/* ── step 2: mapping ────────────────────────────────────────── */}
      {step === 2 && parsed !== null && (
        <>
          <Card title="مطابقة الأعمدة">
            {parsed.presetSuggestions.length > 0 && (
              <div className="iw-presets">
                <p className="iw-presets-title">قوالب جاهزة — طبّقها بلمسة واحدة ثم عدّل ما تشاء:</p>
                <div className="iw-preset-chips">
                  {parsed.presetSuggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`iw-preset-chip${s.verified ? '' : ' unverified'}${appliedPreset === s.id ? ' now' : ''}`}
                      title={s.noteAr ?? (s.coverage === 1 ? 'تطابق كامل مع المتطلبات' : `ينقص: ${s.missingTargets.join('، ')}`)}
                      onClick={() => applyPreset(s.id, s.labelAr)}
                    >
                      {s.labelAr}
                      <span className="iw-preset-cov">{Math.round(s.coverage * 100)}٪</span>
                      {!s.verified && <span className="iw-preset-unverified">غير موثّق</span>}
                    </button>
                  ))}
                </div>
                {parsed.presetSuggestions.some((s) => !s.verified) && (
                  <p className="iw-hint">
                    «منظومة الغويل» قالب غير موثّق — لم نتمكن من التحقق من صيغة ملفاتها. طبّقه بحذر وراجع كل عمود قبل التثبيت.
                  </p>
                )}
              </div>
            )}
            {parsed.sheets.length > 1 && (
              <div className="iw-sheet field">
                <label htmlFor="iw-sheet">ورقة العمل</label>
                <select
                  id="iw-sheet"
                  className="auth-input"
                  value={sheetName ?? parsed.sheets[0] ?? ''}
                  onChange={(e) => { if (fileBase64) void runParse(fileBase64, e.target.value); }}
                >
                  {parsed.sheets.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="iw-table-wrap" tabIndex={0} role="region" aria-label="مطابقة الأعمدة">
              <table className="iw-table">
                <thead>
                  <tr>
                    <th scope="col">عمود الملف</th>
                    <th scope="col">الحقل في مدارك</th>
                    <th scope="col">الثقة</th>
                    {parsed.sampleRows.map((_, i) => (
                      <th key={i} scope="col">عينة {i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.headers.map((header, idx) => (
                    <tr key={`${header}-${idx}`} data-known={mapping[header] !== 'unknown'}>
                      <th scope="row">{header === '' ? `عمود ${idx + 1} (بلا ترويسة)` : header}</th>
                      <td>
                        <select
                          className="auth-input iw-map-select"
                          value={mapping[header] ?? 'unknown'}
                          aria-label={`هدف العمود «${header}»`}
                          onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                        >
                          {TARGET_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td>
                        {mapping[header] === 'unknown'
                          ? <span className="pill danger">غير مطابق</span>
                          : confidences[header] === 1
                            ? <span className="pill on">تلقائي</span>
                            : <span className="pill">يدوي</span>}
                      </td>
                      {parsed.sampleRows.map((row, i) => (
                        <td key={i} className="iw-sample" title={row[idx] ?? ''}>{row[idx] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="iw-hint">{mappedCount} عمودًا مطابقًا — الحد الأدنى: الاسم الكامل ورقم القيد.</p>
          </Card>
          <div className="iw-stickybar">
            <button type="button" className="btn ghost" onClick={() => setStep(1)} disabled={busy}>
              رجوع
            </button>
            <button type="button" className="btn primary" disabled={busy} onClick={() => void runPreview()}>
              {busy ? 'جارٍ التحضير…' : 'عرض المراجعة'} <ArrowLeft size={15} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {/* ── step 3: review ─────────────────────────────────────────── */}
      {step === 3 && preview !== null && (
        <>
          <Card title="المراجعة — نتيجة كل صف قبل الكتابة">
            <div className="iw-counts" role="status">
              <span className="pill on"><CheckCircle2 size={13} aria-hidden="true" /> {preview.counts.ok} صالحًا</span>
              {preview.counts.warningCount > 0 && (
                <span className="pill"><AlertTriangle size={13} aria-hidden="true" /> {preview.counts.warningCount} تحذيرًا</span>
              )}
              {preview.counts.error > 0 && (
                <span className="pill danger"><AlertTriangle size={13} aria-hidden="true" /> {preview.counts.error} مرفوضًا</span>
              )}
              <span className="iw-counts-total">من أصل {preview.counts.total} صفًا</span>
            </div>
            <div className="iw-filters" role="group" aria-label="تصفية الصفوف">
              {([
                ['all', `الكل (${preview.rows.length})`],
                ['ok', `صالح (${preview.rows.filter((r) => r.status === 'ok' && r.warningsAr.length === 0).length})`],
                ['warning', `تحذير (${preview.rows.filter((r) => r.status === 'ok' && r.warningsAr.length > 0).length})`],
                ['duplicate', `موجود مسبقًا (${duplicateRows.length})`],
                ['error', `مرفوض (${preview.rows.filter((r) => r.status === 'error').length})`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`iw-filter${rowFilter === key ? ' now' : ''}`}
                  aria-pressed={rowFilter === key}
                  onClick={() => setRowFilter(key)}
                >{label}</button>
              ))}
            </div>
            {visibleRows.length === 0 ? (
              <EmptyState title="لا صفوف بهذا التصنيف" description="غيّر التصفية لمشاهدة بقية الصفوف." illustration="empty-list" />
            ) : (
              <div className="iw-table-wrap iw-rows" tabIndex={0} role="region" aria-label="نتائج المعاينة">
                <table className="iw-table">
                  <thead>
                    <tr>
                      <th scope="col">السطر</th>
                      <th scope="col">الحالة</th>
                      <th scope="col">التفاصيل</th>
                      <th scope="col">سياسة الصف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((r) => (
                      <tr key={r.line} data-status={r.status === 'error' ? 'error' : r.warningsAr.length > 0 ? 'warn' : 'ok'}>
                        <td>{r.line}</td>
                        <td>
                          {r.status === 'error'
                            ? <span className="pill danger">مرفوض</span>
                            : r.existing !== undefined
                              ? <span className="pill">موجود مسبقًا</span>
                              : r.warningsAr.length > 0
                                ? <span className="pill">تحذير</span>
                                : <span className="pill on">جديد</span>}
                        </td>
                        <td>
                          {r.status === 'error' && <p className="iw-row-msg bad">{r.errorsAr[0]}</p>}
                          {r.warningsAr.map((w) => <p key={w} className="iw-row-msg">{w}</p>)}
                          {r.existing !== undefined && (
                            <div className="iw-diff">
                              <p className="iw-diff-head">
                                «{r.existing.nameAr}» (رقم القيد {r.existing.universityId}) موجود — التغييرات المقترحة:
                              </p>
                              {(r.diff ?? []).length === 0
                                ? <p className="iw-row-msg">لا اختلافات — الملف يطابق بيانات الملف الشخصي.</p>
                                : (
                                  <ul className="iw-diff-list">
                                    {(r.diff ?? []).map((d) => (
                                      <li key={d.field}>
                                        <span className="iw-diff-field">{d.fieldAr}:</span>
                                        <span className="iw-diff-from">{d.from || '— فارغ —'}</span>
                                        <ArrowLeft size={12} aria-hidden="true" />
                                        <span className="iw-diff-to">{d.to}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              {(r.fillable ?? []).length > 0 && (
                                <p className="iw-row-msg">سياسة «إكمال الفراغات» ستضيف: {r.fillable!.join('، ')}</p>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          {r.existing !== undefined && r.status === 'ok' ? (
                            <select
                              className="auth-input iw-map-select"
                              value={rowPolicies[String(r.line)] ?? ''}
                              aria-label={`سياسة السطر ${r.line}`}
                              onChange={(e) => {
                                const v = e.target.value as RowPolicy | '';
                                setRowPolicies((p) => {
                                  const next = { ...p };
                                  if (v === '') delete next[String(r.line)];
                                  else next[String(r.line)] = v;
                                  return next;
                                });
                              }}
                            >
                              <option value="">السياسة العامة</option>
                              {(['SKIP', 'UPDATE', 'FILL_EMPTY'] as const).map((p) => (
                                <option key={p} value={p}>{POLICY_LABELS[p]}</option>
                              ))}
                            </select>
                          ) : <span className="iw-muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <div className="iw-stickybar">
            <button type="button" className="btn ghost" onClick={() => setStep(2)} disabled={busy}>
              تعديل المطابقة
            </button>
            <button type="button" className="btn primary" disabled={busy || preview.counts.ok === 0} onClick={() => setStep(4)}>
              متابعة إلى التأكيد <ArrowLeft size={15} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {/* ── step 4: confirm ────────────────────────────────────────── */}
      {step === 4 && preview !== null && (
        <>
          <Card title="التأكيد — ما الذي سيحدث بالضبط؟">
            <ul className="iw-confirm-list">
              <li>سيُعالَج <strong>{preview.counts.ok} صفًا صالحًا</strong> من أصل {preview.counts.total}.</li>
              <li>الصفوف المرفوضة ({preview.counts.error}) لن تُكتب إطلاقًا.</li>
              <li>
                سياسة التكرار العامة:{' '}
                <select
                  className="auth-input iw-map-select"
                  value={duplicatePolicy}
                  aria-label="سياسة التكرار العامة"
                  onChange={(e) => setDuplicatePolicy(e.target.value as typeof duplicatePolicy)}
                >
                  {(['SKIP', 'UPDATE', 'FILL_EMPTY', 'ERROR'] as const).map((p) => (
                    <option key={p} value={p}>{POLICY_LABELS[p]}</option>
                  ))}
                </select>
              </li>
              {Object.keys(rowPolicies).length > 0 && (
                <li>قرارات خاصة بـ {Object.keys(rowPolicies).length} صفوف موجودة مسبقًا (تتفوق على السياسة العامة).</li>
              )}
              <li>
                <label className="iw-check">
                  <input
                    type="checkbox"
                    checked={createIfMissing}
                    onChange={(e) => setCreateIfMissing(e.target.checked)}
                  />
                  {' '}إنشاء الكليات/الأقسام غير الموجودة بأسمائها (تُسجَّل في التدقيق)
                </label>
              </li>
              <li>الحسابات الجديدة بلا بريد ستُنشأ بكلمات مرور مؤقتة تُعرض مرة واحدة في الخطوة التالية.</li>
              <li className="iw-muted">يمكنك التراجع عن كل المهمة خلال ٧٢ ساعة من التثبيت (ما لم يسجّل الطالب دخوله).</li>
            </ul>
          </Card>
          <div className="iw-stickybar">
            <button type="button" className="btn ghost" onClick={() => setStep(3)} disabled={busy}>
              رجوع للمراجعة
            </button>
            <button type="button" className="btn accent" disabled={busy} onClick={() => void runCommit()}>
              {busy ? 'جارٍ التثبيت…' : 'تثبيت الاستيراد نهائيًا'}
            </button>
          </div>
        </>
      )}

      {/* ── step 5: result ─────────────────────────────────────────── */}
      {step === 5 && committed !== null && (
        <Card title="النتيجة" icon={CheckCircle2}>
          <div className="iw-counts" role="status">
            <span className="pill on">{committed.succeeded} نجح</span>
            <span className="pill">{committed.skipped} تجاوز</span>
            {committed.failed > 0 && <span className="pill danger">{committed.failed} فشل</span>}
            {committed.activationMailQueued > 0 && (
              <span className="pill">دعوات تفعيل بالبريد: {committed.activationMailQueued}</span>
            )}
          </div>

          {rollback === null ? (
            <>
              {committed.credentials.length > 0 && (
                <>
                  <p className="iw-lede">
                    كلمات المرور المؤقتة أدناه تُعرض <strong>مرة واحدة</strong> — نزّل الورقة واطبعها ووزّعها؛
                    يُطلب من الطلاب تغييرها عند أول دخول.
                  </p>
                  <div className="iw-table-wrap iw-rows" tabIndex={0} role="region" aria-label="ورقة كلمات المرور المؤقتة">
                    <table className="iw-table">
                      <thead>
                        <tr>
                          <th scope="col">الاسم</th>
                          <th scope="col">الرقم الجامعي</th>
                          <th scope="col">البريد</th>
                          <th scope="col">كلمة المرور المؤقتة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {committed.credentials.map((c) => (
                          <tr key={c.universityId}>
                            <td>{c.name}</td>
                            <td dir="ltr">{c.universityId}</td>
                            <td dir="ltr">{c.email}</td>
                            <td dir="ltr" className="iw-pass">{c.tempPassword}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <div className="iw-actions">
                {committed.credentials.length > 0 && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => downloadText(
                      'كلمات-المرور-المؤقتة.csv',
                      'الاسم,الرقم الجامعي,البريد,كلمة المرور المؤقتة\n' +
                        committed.credentials.map((c) => `${c.name},${c.universityId},${c.email},${c.tempPassword}`).join('\n'),
                    )}
                  >
                    <Download size={14} aria-hidden="true" /> تنزيل الورقة
                  </button>
                )}
                <button type="button" className="btn ghost sm" onClick={() => window.print()}>
                  طباعة
                </button>
                <a
                  className="btn ghost sm"
                  href={`/api/v1/import/jobs/${committed.jobId}/report.xlsx`}
                  download
                >
                  <Download size={14} aria-hidden="true" /> تقرير كل صف (Excel)
                </a>
                <button type="button" className="btn ghost sm" onClick={() => setRollbackConfirm(true)} disabled={busy}>
                  <RotateCcw size={14} aria-hidden="true" /> التراجع عن المهمة
                </button>
                <Link className="btn primary sm" to="/admin/students">العودة إلى قائمة الطلاب</Link>
              </div>
              {rollbackConfirm && (
                <ConfirmDialog
                  open
                  title="التراجع عن الاستيراد؟"
                  message="سيُحذف كل حساب أُنشئ بهذه المهمة ولم يسجّل الدخول بعد، وتُستعاد قيم الحقول كما كانت قبل التحديثات. المهمة المتابعة لا تُمسّ."
                  confirmLabel="نعم، تراجع"
                  onConfirm={() => void runRollback()}
                  onCancel={() => setRollbackConfirm(false)}
                />
              )}
            </>
          ) : (
            <div className="iw-rollback-done" role="status">
              <p><RotateCcw size={15} aria-hidden="true" /> تم التراجع:</p>
              <ul>
                <li>حُذف {rollback.deletedUsers} حسابًا لم يُستخدم</li>
                <li>استُعيدت قيم {rollback.restoredUpdates} صفوف محدَّثة</li>
                {rollback.keptActive > 0 && <li>بقي {rollback.keptActive} حسابًا نشطًا (سجّل دخوله — لا يُمسّ)</li>}
                {rollback.removedEmptyOrgs > 0 && <li>حُذفت {rollback.removedEmptyOrgs} كلية/قسمًا فارغًا أنشأتها المهمة</li>}
              </ul>
              <Link className="btn primary sm" to="/admin/students">العودة إلى قائمة الطلاب</Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
