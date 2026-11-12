import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Phone, MessageCircle, Copy, Check, Download, FileSpreadsheet,
  Search, User, GraduationCap, ShieldCheck, Clock, Eye,
  Settings2, Pencil, Trash2, Plus, X, ListPlus,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, UserAvatar, Tabs } from '../../components/primitives';
import { ErrorState, Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader, StatLine } from '../../components/patterns';
import { Icon } from '../../components/Icon';
import { EmptyCell, SectionBar } from '../../components/student';
import {
  useDirectory, usePerson, usePatchPerson, useContactRequest,
  useFieldDefinitions, useCreateFieldDefinition, useUpdateFieldDefinition,
  useDeleteFieldDefinition,
  downloadDirectoryExport,
  type StudentPerson, type TeacherPerson,
  type DirectoryParams, type FieldDefinition, type PatchPersonInput,
} from '../../hooks/resources/people';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope, useAuthStore } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { checkLibyanPhone } from '../../lib/phone-validation';
import '../../styles/student/profile-data.css';

/**
 * r349-P3b — the staff surfaces of LANE P:
 *
 *  · PeopleDirectoryPage (الصفحة العامة للطاقم): the contact sheet —
 *    students/teachers, server-side search, the P1 filters (وضع
 *    الدراسة/الحالة), the phone column with the LIVE contact verbs
 *    (call · WhatsApp · copy — or طلب تواصل when PRIVATE), and the
 *    audited xlsx/csv exports.
 *  · StudentFilePage (ملف الطالب): the registrar's five tabs —
 *    الملف (view + the registrar edit form) · المقررات · الدرجات ·
 *    الحضور · الملاحظات (the file's own audit trail).
 *
 * Access decisions are SERVER-SIDE (privacy.ts); this layer renders
 * exactly what the shaped payloads carry — a masked phone renders
 * masked, a hidden nationalId never renders at all.
 */

const STUDY_TYPE_LABELS: Record<string, string> = {
  MORNING: 'صباحي', EVENING: 'مسائي', PARALLEL: 'موازي',
};
const ENROLLMENT_LABELS: Record<string, string> = {
  ACTIVE: 'مقيّد', SUSPENDED: 'موقوف', DEFERRED: 'مؤجّل',
  GRADUATED: 'متخرّج', WITHDRAWN: 'منسحب',
};
const ENROLLMENT_TONES: Record<string, 'green' | 'amber' | 'red' | undefined> = {
  ACTIVE: 'green', SUSPENDED: 'red', DEFERRED: 'amber',
  GRADUATED: undefined, WITHDRAWN: undefined,
};

/** Normalize a phone for tel:/wa: links (digits with country code). */
function telHref(display: string | null): string | null {
  if (!display) return null;
  const c = checkLibyanPhone(display);
  return c.ok ? `+${c.normalized}` : null;
}

/** Arabic labels for the custom-field types (P3b's FieldDefinition.type). */
const FIELD_TYPE_LABELS: Record<FieldDefinition['type'], string> = {
  TEXT: 'نص', NUMBER: 'رقم', DATE: 'تاريخ', BOOLEAN: 'نعم/لا',
  SELECT: 'اختيار', MULTI_SELECT: 'اختيار متعدد',
};
const FIELD_ENTITY_LABELS: Record<FieldDefinition['entity'], string> = {
  STUDENT: 'الطالب', TEACHER: 'المدرّس',
};

/** The admin/owner seat — mirrors the POST/PATCH/DELETE role guards. */
function useCanEditFields(): boolean {
  const role = useAuthStore((s) => s.user?.role);
  return role === 'ADMIN' || role === 'OWNER';
}

/* ════════════════════════════════════════════════════════════════
   PeopleDirectoryPage
   ════════════════════════════════════════════════════════════════ */

export function PeopleDirectoryPage() {
  const [searchParams] = useSearchParams();
  const [kind, setKind] = useState<'student' | 'teacher'>(
    searchParams.get('kind') === 'teacher' ? 'teacher' : 'student',
  );
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ] = useState(searchParams.get('q') ?? '');
  const [studyType, setStudyType] = useState('');
  const [enrollmentStatus, setEnrollmentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<'xlsx' | 'csv' | null>(null);
  const [exportError, setExportError] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const canEditFields = useCanEditFields();

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const filters: DirectoryParams = {
    kind,
    q: debouncedQ || undefined,
    studyType: (studyType || undefined) as DirectoryParams['studyType'],
    enrollmentStatus: (enrollmentStatus || undefined) as DirectoryParams['enrollmentStatus'],
    page,
    limit: 25,
  };
  const directory = useDirectory(filters);

  const rows = directory.data?.data ?? [];
  const meta = directory.data?.meta;

  const doExport = async (format: 'xlsx' | 'csv') => {
    setExporting(format);
    setExportError(false);
    try {
      await downloadDirectoryExport(
        { ...filters, page: undefined, limit: undefined },
        format,
      );
    } catch {
      setExportError(true);
    } finally {
      setExporting(null);
    }
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title="الدليل"
        description="دليل التواصل المؤسسي: الطلاب والمدرّسون مع أرقام التواصل — وفق إعدادات الظهور لكل ملف."
        actions={(
          <>
            {canEditFields && (
              <button
                type="button" className="btn ghost sm"
                aria-expanded={fieldsOpen}
                onClick={() => setFieldsOpen((v) => !v)}
              >
                <Icon icon={Settings2} size={13} />
                {fieldsOpen ? 'إخفاء الحقول' : 'الحقول المخصصة'}
              </button>
            )}
            <button
              type="button" className="btn primary sm" disabled={exporting !== null}
              onClick={() => void doExport('xlsx')}
            >
              <Icon icon={FileSpreadsheet} size={13} />
              {exporting === 'xlsx' ? '…' : 'تصدير Excel'}
            </button>
            <button
              type="button" className="btn ghost sm" disabled={exporting !== null}
              onClick={() => void doExport('csv')}
            >
              <Icon icon={Download} size={13} />
              {exporting === 'csv' ? '…' : 'CSV'}
            </button>
          </>
        )}
      />

      {exportError && (
        <p className="r349p-error" role="alert">تعذّر تجهيز ملف التصدير — أعد المحاولة.</p>
      )}

      {fieldsOpen && canEditFields && <FieldEditorPanel />}

      <Tabs
        value={kind}
        onChange={(k) => { setKind(k as 'student' | 'teacher'); setPage(1); }}
        items={[
          { value: 'student', label: 'الطلاب' },
          { value: 'teacher', label: 'المدرّسون' },
        ]}
      />

      <div className="admin-filter-bar" role="search">
        <div className="admin-students-search">
          <Icon icon={Search} size={14} aria-hidden />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={kind === 'student' ? 'ابحث بالاسم أو رقم القيد أو الهاتف…' : 'ابحث بالاسم أو الرقم الوظيفي…'}
            aria-label="بحث الدليل"
          />
        </div>
        {kind === 'student' && (
          <>
            <select
              className="admin-students-input" value={studyType}
              onChange={(e) => { setStudyType(e.target.value); setPage(1); }}
              aria-label="تصفية حسب وضع الدراسة"
            >
              <option value="">كل أوضاع الدراسة</option>
              <option value="MORNING">صباحي</option>
              <option value="EVENING">مسائي</option>
              <option value="PARALLEL">موازي</option>
            </select>
            <select
              className="admin-students-input" value={enrollmentStatus}
              onChange={(e) => { setEnrollmentStatus(e.target.value); setPage(1); }}
              aria-label="تصفية حسب الحالة"
            >
              <option value="">كل الحالات</option>
              <option value="ACTIVE">مقيّد</option>
              <option value="SUSPENDED">موقوف</option>
              <option value="DEFERRED">مؤجّل</option>
              <option value="GRADUATED">متخرّج</option>
              <option value="WITHDRAWN">منسحب</option>
            </select>
          </>
        )}
      </div>

      <Card>
        {directory.isPending && <ListSkeleton rows={6} />}
        {directory.isError && (
          <ErrorState error={directory.error} message="تعذّر تحميل الدليل" onRetry={() => directory.refetch()} />
        )}
        {directory.data && rows.length === 0 && (
          <EmptyCell label="لا نتائج" note="جرّب تعديل البحث أو التصفية." />
        )}
        {directory.data && rows.length > 0 && (
          <div className="r349p-dir-list">
            {rows.map((r) => (
              <DirectoryRow key={r.id} person={r} kind={kind} />
            ))}
          </div>
        )}
        {meta && meta.totalPages > 1 && (
          <nav className="admin-pagination" aria-label="تصفح الدليل">
            <button type="button" className="btn ghost sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              السابق
            </button>
            <span className="text-xs text-subtle">صفحة {page} من {meta.totalPages} · {meta.total} سجل</span>
            <button type="button" className="btn ghost sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
              التالي
            </button>
          </nav>
        )}
      </Card>
    </PageFrame>
  );
}

function DirectoryRow({ person, kind }: { person: StudentPerson | TeacherPerson; kind: 'student' | 'teacher' }) {
  const contact = useContactRequest(person.id);
  const [requested, setRequested] = useState(false);
  const name = person.nameAr ?? `${person.user.firstName} ${person.user.lastName}`;

  const requestContact = () => {
    contact.mutate(
      { channel: kind === 'student' ? 'student' : 'student' },
      { onSuccess: () => setRequested(true) },
    );
  };

  return (
    <div className="r349p-dir-row">
      <UserAvatar
        initials={person.user.avatarInitials ?? '؟'}
        color={person.user.avatarColor ?? undefined}
        size={40}
      />
      <div className="r349p-dir-id">
        <Link to={`/admin/people/${person.id}`} className="r349p-dir-name">
          {name}
        </Link>
        <div className="r349p-dir-meta">
          {kind === 'student' ? (
            <>
              <span className="font-mono" dir="ltr">{(person as StudentPerson).universityId}</span>
              {(person as StudentPerson).faculty && <span>· {(person as StudentPerson).faculty?.name}</span>}
              {(person as StudentPerson).academic.studyType && (
                <span>· {STUDY_TYPE_LABELS[(person as StudentPerson).academic.studyType!]}</span>
              )}
              <Badge color={ENROLLMENT_TONES[(person as StudentPerson).academic.enrollmentStatus]}>
                {ENROLLMENT_LABELS[(person as StudentPerson).academic.enrollmentStatus]}
              </Badge>
            </>
          ) : (
            <>
              <span>{(person as TeacherPerson).specialty}</span>
              {(person as TeacherPerson).department?.name && <span>· {(person as TeacherPerson).department?.name}</span>}
              {(person as TeacherPerson).officialEmail && (
                <span dir="ltr" className="font-mono">{(person as TeacherPerson).officialEmail}</span>
              )}
            </>
          )}
        </div>
      </div>
      <PhoneActions
        phone={person.phone.display}
        masked={person.phone.access === 'MASKED'}
        canRequest={person.phone.canRequestContact}
        onRequest={requestContact}
        requested={requested || contact.isSuccess}
        pending={contact.isPending}
      />
    </div>
  );
}

function PhoneActions({
  phone, masked, canRequest, onRequest, requested, pending,
}: {
  phone: string | null; masked: boolean; canRequest: boolean;
  onRequest: () => void; requested: boolean; pending: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const tel = telHref(phone);
  const copy = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — the buttons above still work */ }
  };
  if (!phone) {
    return <span className="r349p-dir-phone r349p-dir-phone--none">لا هاتف</span>;
  }
  if (masked) {
    return (
      <div className="r349p-dir-phone">
        <span className="font-mono" dir="ltr">{phone}</span>
        {canRequest && (
          <button
            type="button" className="btn ghost sm" onClick={onRequest}
            disabled={pending || requested}
          >
            <Icon icon={MessageCircle} size={12} />
            {requested ? 'أُرسل الطلب' : 'طلب تواصل'}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="r349p-dir-phone">
      <bdi className="font-mono" dir="ltr">{phone}</bdi>
      {tel && (
        <>
          <a className="btn ghost sm" href={`tel:${tel}`} aria-label="اتصال">
            <Icon icon={Phone} size={12} />
          </a>
          <a
            className="btn ghost sm" href={`https://wa.me/${tel.replace('+', '')}`}
            target="_blank" rel="noreferrer" aria-label="واتساب"
          >
            <Icon icon={MessageCircle} size={12} />
          </a>
        </>
      )}
      <button type="button" className="btn ghost sm" onClick={() => void copy()} aria-label="نسخ الرقم">
        <Icon icon={copied ? Check : Copy} size={12} />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   FieldEditorPanel — الحقول المخصصة (the registrar's editor)
   P3b shipped the CRUD API; this is the seat on the directory page.
   ADMIN/OWNER only (the header button is role-gated; the backend
   guards POST/PATCH/DELETE with the same roles — the UI gate is
   affordance, the server is the authority).
   ════════════════════════════════════════════════════════════════ */

const FIELD_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function FieldEditorPanel() {
  const defs = useFieldDefinitions();
  const [editing, setEditing] = useState<{ id: string } | { isNew: true; entity: FieldDefinition['entity'] } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const del = useDeleteFieldDefinition();

  if (defs.isPending) {
    return <Card><ListSkeleton rows={3} /></Card>;
  }
  if (defs.isError) {
    return (
      <Card>
        <ErrorState error={defs.error} message="تعذّر تحميل الحقول المخصصة" onRetry={() => defs.refetch()} />
      </Card>
    );
  }

  const rows = defs.data?.data ?? [];
  const byEntity = (entity: FieldDefinition['entity']) =>
    rows.filter((r) => r.entity === entity);

  const doDelete = (id: string) => {
    del.mutate(id, {
      onSuccess: () => setConfirmDelete(null),
    });
  };

  return (
    <section className="r349p-fe" aria-label="الحقول المخصصة">
      <div className="r349p-fe-head">
        <div>
          <b className="text-sm">الحقول المخصصة للمؤسسة</b>
          <p className="text-xxs text-subtle">
            حقول إضافية يظهر ملؤها في ملفات الطلاب والمدرّسين — تُدار هنا وتُعرض حيث صُمّمت.
          </p>
        </div>
        <div className="r349p-fe-actions">
          <button type="button" className="btn ghost sm" onClick={() => setEditing({ isNew: true, entity: 'STUDENT' })}>
            <Icon icon={Plus} size={13} />
            حقل للطالب
          </button>
          <button type="button" className="btn ghost sm" onClick={() => setEditing({ isNew: true, entity: 'TEACHER' })}>
            <Icon icon={Plus} size={13} />
            حقل للمدرّس
          </button>
        </div>
      </div>

      {(['STUDENT', 'TEACHER'] as const).map((entity) => (
        <div key={entity} className="r349p-fe-group">
          <div className="r349p-fe-group-title">
            <Icon icon={entity === 'STUDENT' ? GraduationCap : User} size={13} aria-hidden />
            حقول {FIELD_ENTITY_LABELS[entity]}
            <span className="text-xxs text-subtle">({byEntity(entity).length})</span>
          </div>
          {byEntity(entity).length === 0 && (
            <p className="r349p-fe-empty text-xs text-subtle">
              لا حقول بعد — أضف أول حقل من الأزرار أعلاه.
            </p>
          )}
          {byEntity(entity).map((f) => (
            confirmDelete === f.id ? (
              <div key={f.id} className="r349p-fe-row r349p-fe-row--danger" role="alertdialog" aria-label="تأكيد حذف الحقل">
                <span className="text-xs">
                  حذف «{f.labelAr}» نهائيًا؟ القيم المخزّنة في ملفات الأعضاء تبقى بلا عنوان يعرضها.
                </span>
                <span className="r349p-fe-actions">
                  <button type="button" className="btn danger sm" disabled={del.isPending} onClick={() => doDelete(f.id)}>
                    {del.isPending ? '…' : 'حذف نهائي'}
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => setConfirmDelete(null)}>إلغاء</button>
                </span>
              </div>
            ) : editing && 'id' in editing && editing.id === f.id ? (
              <FieldForm key={f.id} initial={f} onDone={() => setEditing(null)} />
            ) : (
              <div key={f.id} className="r349p-fe-row">
                <div className="r349p-fe-id">
                  <span className="text-sm r349p-fe-label">{f.labelAr}</span>
                  <span className="r349p-fe-meta">
                    <bdi dir="ltr" className="font-mono">{f.key}</bdi>
                    <span>· {f.labelEn}</span>
                    <Badge>{FIELD_TYPE_LABELS[f.type]}</Badge>
                    {f.required && <span>· إلزامي</span>}
                    {f.searchable && <span>· قابل للبحث</span>}
                    <span>· ترتيب {f.sortOrder}</span>
                  </span>
                </div>
                <span className="r349p-fe-actions">
                  <button
                    type="button" className="btn ghost sm" aria-label={`تعديل الحقل ${f.labelAr}`}
                    onClick={() => { setEditing({ id: f.id }); setConfirmDelete(null); }}
                  >
                    <Icon icon={Pencil} size={12} />
                  </button>
                  <button
                    type="button" className="btn ghost sm" aria-label={`حذف الحقل ${f.labelAr}`}
                    onClick={() => setConfirmDelete(f.id)}
                  >
                    <Icon icon={Trash2} size={12} />
                  </button>
                </span>
              </div>
            )
          ))}
        </div>
      ))}

      {editing && 'isNew' in editing && (
        <FieldForm
          key={`new-${editing.entity}`}
          initial={{ entity: editing.entity } as Partial<FieldDefinition>}
          onDone={() => setEditing(null)}
        />
      )}

      {del.isError && (
        <p className="r349p-error" role="alert">تعذّر الحذف — أعد المحاولة</p>
      )}
    </section>
  );
}

/* ── the create/edit form (one shape, two seats) ─────────────────── */

interface FieldFormState {
  key: string;
  labelAr: string;
  labelEn: string;
  entity: FieldDefinition['entity'];
  type: FieldDefinition['type'];
  required: boolean;
  searchable: boolean;
  sortOrder: string;
  options: string;
}

function FieldForm({ initial, onDone }: { initial: Partial<FieldDefinition>; onDone: () => void }) {
  const isEdit = Boolean(initial.id);
  const create = useCreateFieldDefinition();
  const update = useUpdateFieldDefinition();
  const [form, setForm] = useState<FieldFormState>({
    key: initial.key ?? '',
    labelAr: initial.labelAr ?? '',
    labelEn: initial.labelEn ?? '',
    entity: initial.entity ?? 'STUDENT',
    type: initial.type ?? 'TEXT',
    required: initial.required ?? false,
    searchable: initial.searchable ?? false,
    sortOrder: String(initial.sortOrder ?? 0),
    options: (initial.options ?? []).join('\n'),
  });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof FieldFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k: 'required' | 'searchable') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.checked }));

  const needsOptions = form.type === 'SELECT' || form.type === 'MULTI_SELECT';
  const optionsList = form.options.split('\n').map((s) => s.trim()).filter(Boolean);

  const validate = (): string | null => {
    if (!form.labelAr.trim()) return 'التسمية العربية مطلوبة';
    if (!form.labelEn.trim()) return 'التسمية اللاتينية مطلوبة';
    if (!isEdit && !FIELD_KEY_RE.test(form.key.trim())) return 'المفتاح: حروف لاتينية صغيرة وأرقام وشرطات فقط';
    if (needsOptions) {
      if (optionsList.length === 0) return 'حقول الاختيار تحتاج خيارًا واحدًا على الأقل';
      if (new Set(optionsList).size !== optionsList.length) return 'الخيارات مكررة';
    }
    const order = Number(form.sortOrder);
    if (!Number.isInteger(order) || order < 0 || order > 999) return 'الترتيب: رقم صحيح 0–999';
    return null;
  };

  const save = () => {
    const v = validate();
    if (v) { setError(v); return; }
    setError(null);
    const payload = {
      labelAr: form.labelAr.trim(),
      labelEn: form.labelEn.trim(),
      entity: form.entity,
      type: form.type,
      required: form.required,
      searchable: form.searchable,
      sortOrder: Number(form.sortOrder),
      ...(needsOptions ? { options: optionsList } : { options: null }),
    };
    if (isEdit && initial.id) {
      update.mutate(
        { id: initial.id, ...payload },
        { onSuccess: onDone },
      );
    } else {
      create.mutate(
        { ...payload, key: form.key.trim() },
        { onSuccess: onDone },
      );
    }
  };

  const pending = create.isPending || update.isPending;
  const failure = (create.isError || update.isError)
    ? 'تعذّر الحفظ — تحقّق من المفتاح والترتيب (قد يكونا محجوزين لحقل آخر)'
    : error;

  return (
    <div className="r349p-fe-form" role="form" aria-label={isEdit ? `تعديل الحقل ${initial.labelAr ?? ''}` : 'حقل جديد'}>
      <div className="r349p-fe-form-head">
        <Icon icon={ListPlus} size={14} className="text-subtle" aria-hidden />
        <b className="text-sm">{isEdit ? `تعديل «${initial.labelAr}»` : 'حقل جديد'}</b>
        <button type="button" className="btn ghost sm" aria-label="إلغاء" onClick={onDone}>
          <Icon icon={X} size={12} />
        </button>
      </div>
      <div className="grid-2">
        <FormField label="التسمية بالعربية" value={form.labelAr} onChange={set('labelAr')} />
        <FormField label="التسمية باللاتينية" value={form.labelEn} onChange={set('labelEn')} dir="ltr" />
        {!isEdit && (
          <FormField label="المفتاح (لا يتغيّر لاحقًا)" value={form.key} onChange={set('key')} dir="ltr" mono />
        )}
        <SelectField label="الجهة" value={form.entity} onChange={set('entity')} options={[
          { value: 'STUDENT', label: 'حقول الطالب' },
          { value: 'TEACHER', label: 'حقول المدرّس' },
        ]} />
        <SelectField label="النوع" value={form.type} onChange={set('type')} options={[
          { value: 'TEXT', label: 'نص' },
          { value: 'NUMBER', label: 'رقم' },
          { value: 'DATE', label: 'تاريخ' },
          { value: 'BOOLEAN', label: 'نعم/لا' },
          { value: 'SELECT', label: 'اختيار' },
          { value: 'MULTI_SELECT', label: 'اختيار متعدد' },
        ]} />
        <FormField label="الترتيب (0–999)" value={form.sortOrder} onChange={set('sortOrder')} dir="ltr" mono />
        {needsOptions && (
          <label className="r349p-field r349p-field--wide">
            <span className="text-xxs text-subtle">الخيارات (واحد في كل سطر)</span>
            <textarea
              className="r349p-input r349p-fe-options" value={form.options}
              onChange={set('options')} rows={3} dir="rtl" aria-label="خيارات الحقل"
            />
          </label>
        )}
        <label className="r349p-fe-check">
          <input type="checkbox" checked={form.required} onChange={toggle('required')} />
          <span className="text-xs">إلزامي عند التسجيل</span>
        </label>
        <label className="r349p-fe-check">
          <input type="checkbox" checked={form.searchable} onChange={toggle('searchable')} />
          <span className="text-xs">قابل للبحث في الدليل</span>
        </label>
      </div>
      {failure && <p className="r349p-error" role="alert">{failure}</p>}
      <div className="r349p-savebar" role="toolbar" aria-label="حفظ الحقل">
        <button type="button" className="btn primary sm" onClick={save} disabled={pending}>
          {pending ? '…' : 'حفظ الحقل'}
        </button>
        <button type="button" className="btn ghost sm" onClick={onDone}>إلغاء</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   StudentFilePage — ملف الطالب (the registrar's five tabs)
   ════════════════════════════════════════════════════════════════ */

type FileTab = 'file' | 'courses' | 'grades' | 'attendance' | 'notes';

export function StudentFilePage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<FileTab>('file');
  const person = usePerson(id ?? null);

  if (person.isPending) {
    return (
      <PageFrame width="default">
        <PageHeader title="ملف الطالب" description="جارٍ التحميل…" />
        <Card><ListSkeleton rows={5} /></Card>
      </PageFrame>
    );
  }
  if (person.isError || !person.data) {
    return (
      <PageFrame width="default">
        <PageHeader title="ملف الطالب" description="الملف غير موجود أو خارج نطاق مؤسستك." />
        <Card>
          <ErrorState error={person.error ?? new Error('not found')} message="تعذّر فتح الملف" onRetry={() => person.refetch()} />
        </Card>
      </PageFrame>
    );
  }
  const p = person.data;
  if (!p || p.kind !== 'student') {
    return (
      <PageFrame width="default">
        <PageHeader title="الملف" description="هذا الملف لمدرّس — يُعرض من دليل المدرّسين." />
        <Card>
          {p ? <TeacherFileBody person={p} /> : <EmptyCell label="الملف غير موجود" note="خارج نطاق مؤسستك أو محذوف." />}
        </Card>
      </PageFrame>
    );
  }

  return (
    <PageFrame width="default">
      <PageHeader
        title={p.nameAr ?? `${p.user.firstName} ${p.user.lastName}`}
        description={`ملف الطالب · رقم القيد ${p.universityId}`}
      />
      <StatLine
        items={[
          { label: 'الحالة', value: ENROLLMENT_LABELS[p.academic.enrollmentStatus] ?? p.academic.enrollmentStatus },
          { label: 'وضع الدراسة', value: p.academic.studyType ? STUDY_TYPE_LABELS[p.academic.studyType] : '—' },
          { label: 'الكلية', value: p.faculty?.name ?? '—' },
          { label: 'الهاتف', value: p.phone.display ?? '—' },
        ]}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'file', label: 'الملف' },
          { value: 'courses', label: 'المقررات' },
          { value: 'grades', label: 'الدرجات' },
          { value: 'attendance', label: 'الحضور' },
          { value: 'notes', label: 'الملاحظات' },
        ]}
      />
      {tab === 'file' && <StudentFileTab p={p} />}
      {tab === 'courses' && <CoursesTab userId={p.user.id} />}
      {tab === 'grades' && <GradesTab p={p} />}
      {tab === 'attendance' && <AttendanceTab p={p} />}
      {tab === 'notes' && <NotesTab id={p.id} />}
    </PageFrame>
  );
}

/* ── الملف — the registrar edit form ─────────────────────────────── */

function StudentFileTab({ p }: { p: StudentPerson }) {
  const patch = usePatchPerson(p.id);
  // One literal feeds BOTH the initial state and the dirty comparison —
  // a single source (the pre-P5 twin literals drifted into a jscpd clone).
  const initial = {
    nameAr: p.nameAr ?? '',
    fatherName: p.fatherName ?? '',
    grandfatherName: p.grandfatherName ?? '',
    motherName: p.motherName ?? '',
    birthPlace: p.birthPlace ?? '',
    nationalId: p.nationalId.value ?? '',
    guardianName: p.guardian?.name ?? '',
    guardianRelationship: p.guardian?.relationship ?? '',
    guardianPhone: p.guardian?.phone.display ?? '',
    studyType: p.academic.studyType ?? '',
    enrollmentStatus: p.academic.enrollmentStatus ?? 'ACTIVE',
    secondarySchool: p.academic.secondarySchool ?? '',
    secondarySchoolBranch: p.academic.secondarySchoolBranch ?? '',
    secondarySchoolPercent: p.academic.secondarySchoolPercent?.toString() ?? '',
    admissionYear: p.academic.admissionYear?.toString() ?? '',
    city: p.city ?? '',
    address: p.address ?? '',
    stage: p.academic.stage ?? '',
    grade: p.academic.grade ?? '',
    section: p.academic.section ?? '',
  };
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = () => {
    const payload: PatchPersonInput = {
      nameAr: form.nameAr || null,
      fatherName: form.fatherName || null,
      grandfatherName: form.grandfatherName || null,
      motherName: form.motherName || null,
      birthPlace: form.birthPlace || null,
      ...(form.nationalId ? { nationalId: form.nationalId } : { nationalId: null }),
      guardianName: form.guardianName || null,
      guardianRelationship: form.guardianRelationship || null,
      guardianPhone: form.guardianPhone || null,
      studyType: (form.studyType || null) as PatchPersonInput['studyType'],
      enrollmentStatus: form.enrollmentStatus as PatchPersonInput['enrollmentStatus'],
      secondarySchool: form.secondarySchool || null,
      secondarySchoolBranch: form.secondarySchoolBranch || null,
      secondarySchoolPercent: form.secondarySchoolPercent ? Number(form.secondarySchoolPercent) : null,
      admissionYear: form.admissionYear ? Number(form.admissionYear) : null,
      city: form.city || null,
      address: form.address || null,
      stage: form.stage || null,
      grade: form.grade || null,
      section: form.section || null,
    };
    patch.mutate(
      payload,
      { onSuccess: () => { setSaved(true); window.setTimeout(() => setSaved(false), 2500); } },
    );
  };

  const nationalIdDirty = form.nationalId && form.nationalId.replace(/\D/g, '').length !== 12;

  return (
    <section aria-label="الملف" className="r349p-data">
      <SectionBar index="01" title="الملف — بيانات التوثيق" />
      <Card>
        <div className="grid-2">
          <FormField label="الاسم كما في الوثائق" value={form.nameAr} onChange={set('nameAr')} />
          <FormField label="اسم الأب" value={form.fatherName} onChange={set('fatherName')} />
          <FormField label="اسم الجد" value={form.grandfatherName} onChange={set('grandfatherName')} />
          <FormField label="اسم الأم" value={form.motherName} onChange={set('motherName')} />
          <FormField label="الرقم الوطني" value={form.nationalId} onChange={set('nationalId')} dir="ltr" mono error={nationalIdDirty ? '12 خانة رقمية' : undefined} />
          <FormField label="مكان الميلاد" value={form.birthPlace} onChange={set('birthPlace')} />
          <FormField label="المدينة" value={form.city} onChange={set('city')} />
          <FormField label="العنوان" value={form.address} onChange={set('address')} />
        </div>
      </Card>

      <SectionBar index="02" title="ولي الأمر" />
      <Card>
        <div className="grid-2">
          <FormField label="الاسم" value={form.guardianName} onChange={set('guardianName')} />
          <FormField label="صلة القرابة" value={form.guardianRelationship} onChange={set('guardianRelationship')} />
          <FormField label="الهاتف" value={form.guardianPhone} onChange={set('guardianPhone')} dir="ltr" mono />
        </div>
        {p.guardian?.phone.access === 'MASKED' && (
          <p className="r349p-note">هاتف ولي الأمر خاص — يظهر مقنّعًا حتى يغيّر الملف إعداده.</p>
        )}
      </Card>

      <SectionBar index="03" title="الأكاديمية" />
      <Card>
        <div className="grid-2">
          <SelectField label="وضع الدراسة" value={form.studyType} onChange={set('studyType')} options={[
            { value: '', label: '—' },
            { value: 'MORNING', label: 'صباحي' },
            { value: 'EVENING', label: 'مسائي' },
            { value: 'PARALLEL', label: 'موازي' },
          ]} />
          <SelectField label="الحالة الدراسية" value={form.enrollmentStatus} onChange={set('enrollmentStatus')} options={[
            { value: 'ACTIVE', label: 'مقيّد' },
            { value: 'SUSPENDED', label: 'موقوف' },
            { value: 'DEFERRED', label: 'مؤجّل' },
            { value: 'GRADUATED', label: 'متخرّج' },
            { value: 'WITHDRAWN', label: 'منسحب' },
          ]} />
          <FormField label="المرحلة (مدارس)" value={form.stage} onChange={set('stage')} />
          <FormField label="الصف (مدارس)" value={form.grade} onChange={set('grade')} />
          <FormField label="الفصل" value={form.section} onChange={set('section')} />
          <FormField label="الثانوية" value={form.secondarySchool} onChange={set('secondarySchool')} />
          <FormField label="شعبة الثانوية" value={form.secondarySchoolBranch} onChange={set('secondarySchoolBranch')} />
          <FormField label="نسبة الثانوية ٪" value={form.secondarySchoolPercent} onChange={set('secondarySchoolPercent')} dir="ltr" mono />
          <FormField label="سنة القبول" value={form.admissionYear} onChange={set('admissionYear')} dir="ltr" mono />
        </div>
      </Card>

      {p.customFields.length > 0 && (
        <>
          <SectionBar index="04" title="حقول المؤسسة" />
          <Card>
            <div className="grid-2">
              {p.customFields.map((f) => (
                <div key={f.key} className="fact-tile fact-tile--field">
                  <Icon icon={FileTextIcon} size={16} className="text-subtle" aria-hidden />
                  <div>
                    <div className="text-xxs text-subtle">{f.labelAr}</div>
                    <div className="text-sm" style={{ marginTop: 'var(--sp-0-5)' }}>
                      {f.value === null || f.value === undefined
                        ? '—'
                        : Array.isArray(f.value) ? f.value.join('، ')
                        : f.type === 'BOOLEAN' ? (f.value ? 'نعم' : 'لا')
                        : String(f.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      <div className="r349p-savebar" role="toolbar" aria-label="حفظ الملف">
        {patch.isError && <span className="r349p-error" role="alert">تعذّر الحفظ — أعد المحاولة</span>}
        {saved && <span className="r349p-saved"><Icon icon={Check} size={12} /> حُفظ</span>}
        <button type="button" className="btn primary sm" onClick={save} disabled={!dirty || patch.isPending || Boolean(nationalIdDirty)}>
          {patch.isPending ? '…' : 'حفظ التعديلات'}
        </button>
      </div>
    </section>
  );
}

const FileTextIcon = FileSpreadsheet;

/* ── المقررات — the student's enrollments (admin surface) ────────── */

interface AdminEnrollment {
  id: string;
  offering: { id: string; course: { name: string; code: string } } | null;
  status: string;
  progressPct: number;
}

function CoursesTab({ userId }: { userId: string }) {
  const inst = useInstitutionScope();
  const q = useQuery({
    queryKey: withInstitutionScope(['people', 'enrollments', userId], inst),
    queryFn: () => unwrap<{ data: AdminEnrollment[]; meta?: unknown }>(
      api.get('/enrollments', { params: { studentId: userId, limit: 100 } }),
    ),
  });
  if (q.isPending) return <Card><ListSkeleton rows={4} /></Card>;
  if (q.isError) return <Card><ErrorState error={q.error} message="تعذّر تحميل المقررات" onRetry={() => q.refetch()} /></Card>;
  const rows = q.data?.data ?? [];
  if (rows.length === 0) return <Card><EmptyCell label="لا مقررات" note="الطالب غير مسجّل في مقررات بعد." /></Card>;
  return (
    <Card>
      <div className="r349p-dir-list">
        {rows.map((e) => (
          <div key={e.id} className="r349p-dir-row">
            <Icon icon={GraduationCap} size={18} className="text-subtle" aria-hidden />
            <div className="r349p-dir-id">
              <span className="r349p-dir-name">{e.offering?.course.name ?? 'مقرر'}</span>
              <span className="r349p-dir-meta">
                <span className="font-mono" dir="ltr">{e.offering?.course.code}</span>
                <span>· تقدّم {e.progressPct}%</span>
              </span>
            </div>
            <Badge color={e.status === 'active' ? 'green' : undefined}>{e.status === 'active' ? 'نشط' : e.status}</Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── الدرجات / الحضور — per-offering reads (admin oversight) ─────── */

interface OfferingGrade {
  studentId: string;
  kind: string;
  score: number;
  maxScore: number;
}

function GradesTab({ p }: { p: StudentPerson }) {
  return <PerOfferingTab p={p} mode="grades" />;
}
function AttendanceTab({ p }: { p: StudentPerson }) {
  return <PerOfferingTab p={p} mode="attendance" />;
}

interface AttendanceSessionRow {
  records: Array<{ studentId: string; status: string }>;
}

function PerOfferingTab({ p, mode }: { p: StudentPerson; mode: 'grades' | 'attendance' }) {
  const inst = useInstitutionScope();
  const enrollments = useQuery({
    queryKey: withInstitutionScope(['people', 'enrollments', p.user.id], inst),
    queryFn: () => unwrap<{ data: AdminEnrollment[]; meta?: unknown }>(
      api.get('/enrollments', { params: { studentId: p.user.id, limit: 100 } }),
    ),
  });
  const offeringIds = enrollments.data?.data.map((e) => e.offering?.id).filter(Boolean) ?? [];

  // Sequential per-offering fetches (a term holds ~5-8 offerings).
  const [loaded, setLoaded] = useState<Array<{ id: string; name: string; grades?: OfferingGrade[]; sessions?: number; present?: number }>>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const out: typeof loaded = [];
      for (const e of enrollments.data?.data ?? []) {
        if (!e.offering) continue;
        try {
          if (mode === 'grades') {
            const grades = await unwrap<OfferingGrade[]>(
              api.get(`/offerings/${e.offering.id}/grades`),
            );
            out.push({ id: e.offering.id, name: e.offering.course.name, grades: grades.filter((g) => g.studentId === p.user.id) });
          } else {
            const sessions = await unwrap<AttendanceSessionRow[]>(
              api.get(`/offerings/${e.offering.id}/attendance`),
            );
            let present = 0;
            let total = 0;
            for (const s of sessions) {
              const rec = s.records.find((r) => r.studentId === p.user.id);
              if (rec) {
                total += 1;
                if (rec.status === 'PRESENT' || rec.status === 'LATE') present += 1;
              }
            }
            out.push({ id: e.offering.id, name: e.offering.course.name, sessions: total, present });
          }
        } catch { /* one offering failing must not kill the tab */ }
      }
      if (!cancelled) setLoaded(out);
    })();
    return () => { cancelled = true; };
  }, [enrollments.data, mode, p.user.id]);

  if (enrollments.isPending) return <Card><ListSkeleton rows={4} /></Card>;
  if (enrollments.isError) return <Card><ErrorState error={enrollments.error} message="تعذّر التحميل" onRetry={() => enrollments.refetch()} /></Card>;
  if (offeringIds.length === 0) return <Card><EmptyCell label="لا مقررات" note="لا درجات ولا حضور بلا مقررات." /></Card>;
  if (loaded.length === 0) return <Card><ListSkeleton rows={3} /></Card>;

  return (
    <Card>
      <div className="r349p-dir-list">
        {loaded.map((o) => (
          <div key={o.id} className="r349p-dir-row">
            <Icon icon={mode === 'grades' ? ShieldCheck : Clock} size={18} className="text-subtle" aria-hidden />
            <div className="r349p-dir-id">
              <span className="r349p-dir-name">{o.name}</span>
              {mode === 'grades' ? (
                <span className="r349p-dir-meta">
                  {(o.grades?.length ?? 0) === 0
                    ? 'لا درجات مسجّلة'
                    : o.grades!.map((g) => `${g.kind}: ${g.score}/${g.maxScore}`).join(' · ')}
                </span>
              ) : (
                <span className="r349p-dir-meta">
                  حضور {o.present} من {o.sessions}
                  {o.sessions ? ` · ${Math.round((o.present! / o.sessions) * 100)}%` : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ── الملاحظات — the file's own audit trail ─────────────────────── */

interface AuditRow {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: string;
  user: { firstName: string; lastName: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  'people.read': 'قراءة الملف',
  'people.update': 'تعديل الملف',
  'directory.export': 'تصدير دليل شمل الملف',
  'people.contact-request': 'طلب تواصل',
  'profile.self-update': 'تعديل صاحب الملف',
};

function NotesTab({ id }: { id: string }) {
  const inst = useInstitutionScope();
  const q = useQuery({
    queryKey: withInstitutionScope(['people', 'history', id], inst),
    queryFn: () => unwrap<AuditRow[]>(api.get(`/people/${id}/history`)),
  });
  if (q.isPending) return <Card><ListSkeleton rows={4} /></Card>;
  if (q.isError) return <Card><ErrorState error={q.error} message="تعذّر تحميل السجل" onRetry={() => q.refetch()} /></Card>;
  if (!q.data?.length) {
    return <Card><EmptyCell label="سجل فارغ" note="لم يُقرأ هذا الملف ولم يُعدّل بعد — كل لمسة ستُسجّل هنا." /></Card>;
  }
  return (
    <Card>
      <div className="r349p-dir-list">
        {q.data.map((r) => (
          <div key={r.id} className="r349p-dir-row">
            <Icon icon={Eye} size={16} className="text-subtle" aria-hidden />
            <div className="r349p-dir-id">
              <span className="r349p-dir-name">{ACTION_LABELS[r.action] ?? r.action}</span>
              <span className="r349p-dir-meta">
                {r.user ? `${r.user.firstName} ${r.user.lastName}` : 'النظام'}
                {' · '}
                {new Date(r.createdAt).toLocaleString('ar-LY')}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="r349p-note">
        هذا سجل اللمسات على الملف (قراءة/تعديل/تصدير) — لا يحمل أي قيم بيانات شخصية.
      </p>
    </Card>
  );
}

/* ── teacher file (from the directory's teacher rows) ────────────── */

function TeacherFileBody({ person }: { person: TeacherPerson }) {
  return (
    <div className="grid-2">
      <Fact icon={User} label="الاسم" value={person.nameAr ?? `${person.user.firstName} ${person.user.lastName}`} />
      <Fact icon={GraduationCap} label="التخصص" value={person.specialty} />
      <Fact icon={Phone} label="الهاتف" value={person.phone.display ?? '—'} mono />
      <Fact icon={ShieldCheck} label="الرتبة" value={person.rank} />
    </div>
  );
}

/* ── small form atoms ────────────────────────────────────────────── */

function FormField({
  label, value, onChange, dir, mono, error,
}: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dir?: 'rtl' | 'ltr'; mono?: boolean; error?: string;
}) {
  return (
    <label className="r349p-field">
      <span className="text-xxs text-subtle">{label}</span>
      <input
        className={`r349p-input ${mono ? 'font-mono' : ''}`}
        value={value}
        onChange={onChange}
        dir={dir}
        aria-label={label}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="r349p-error" role="alert">{error}</span>}
    </label>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="r349p-field">
      <span className="text-xxs text-subtle">{label}</span>
      <select className="r349p-input" value={value} onChange={onChange} aria-label={label}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Fact({ icon, label, value, mono }: { icon: LucideIcon; label: string; value: string; mono?: boolean }) {
  return (
    <div className="fact-tile fact-tile--field">
      <Icon icon={icon} size={16} className="text-subtle" aria-hidden />
      <div>
        <div className="text-xxs text-subtle">{label}</div>
        <div className="text-sm" style={{ marginTop: 'var(--sp-0-5)' }}>
          {mono ? <bdi dir="ltr" className="font-mono">{value}</bdi> : value}
        </div>
      </div>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex-col gap-2" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} width="100%" height={44} rounded="var(--r-md)" />
      ))}
    </div>
  );
}
