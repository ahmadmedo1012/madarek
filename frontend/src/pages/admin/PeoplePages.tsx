import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Phone, MessageCircle, Copy, Check, Download, FileSpreadsheet,
  Search, User, GraduationCap, ShieldCheck, Clock, Eye,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, UserAvatar, Tabs } from '../../components/primitives';
import { ErrorState, Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader, StatLine } from '../../components/patterns';
import { Icon } from '../../components/Icon';
import { EmptyCell, SectionBar } from '../../components/student';
import {
  useDirectory, usePerson, usePatchPerson, useContactRequest,
  downloadDirectoryExport,
  type StudentPerson, type TeacherPerson,
} from '../../hooks/resources/people';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
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

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const directory = useDirectory({
    kind,
    q: debouncedQ || undefined,
    studyType: (studyType || undefined) as 'MORNING' | 'EVENING' | 'PARALLEL' | undefined,
    enrollmentStatus: (enrollmentStatus || undefined) as StudentPerson['academic']['enrollmentStatus'] | undefined,
    page,
    limit: 25,
  });

  const rows = directory.data?.data ?? [];
  const meta = directory.data?.meta;

  const doExport = async (format: 'xlsx' | 'csv') => {
    setExporting(format);
    setExportError(false);
    try {
      await downloadDirectoryExport({
        kind,
        q: debouncedQ || undefined,
        studyType: (studyType || undefined) as 'MORNING' | 'EVENING' | 'PARALLEL' | undefined,
        enrollmentStatus: (enrollmentStatus || undefined) as StudentPerson['academic']['enrollmentStatus'] | undefined,
      }, format);
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
  const [form, setForm] = useState({
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
  });
  const [saved, setSaved] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const dirty = JSON.stringify(form) !== JSON.stringify({
    nameAr: p.nameAr ?? '', fatherName: p.fatherName ?? '',
    grandfatherName: p.grandfatherName ?? '', motherName: p.motherName ?? '',
    birthPlace: p.birthPlace ?? '', nationalId: p.nationalId.value ?? '',
    guardianName: p.guardian?.name ?? '', guardianRelationship: p.guardian?.relationship ?? '',
    guardianPhone: p.guardian?.phone.display ?? '',
    studyType: p.academic.studyType ?? '', enrollmentStatus: p.academic.enrollmentStatus ?? 'ACTIVE',
    secondarySchool: p.academic.secondarySchool ?? '',
    secondarySchoolBranch: p.academic.secondarySchoolBranch ?? '',
    secondarySchoolPercent: p.academic.secondarySchoolPercent?.toString() ?? '',
    admissionYear: p.academic.admissionYear?.toString() ?? '',
    city: p.city ?? '', address: p.address ?? '',
    stage: p.academic.stage ?? '', grade: p.academic.grade ?? '',
    section: p.academic.section ?? '',
  });

  const save = () => {
    patch.mutate(
      {
        nameAr: form.nameAr || null,
        fatherName: form.fatherName || null,
        grandfatherName: form.grandfatherName || null,
        motherName: form.motherName || null,
        birthPlace: form.birthPlace || null,
        ...(form.nationalId ? { nationalId: form.nationalId } : { nationalId: null }),
        guardianName: form.guardianName || null,
        guardianRelationship: form.guardianRelationship || null,
        guardianPhone: form.guardianPhone || null,
        studyType: (form.studyType || null) as 'MORNING' | 'EVENING' | 'PARALLEL' | null,
        enrollmentStatus: form.enrollmentStatus as StudentPerson['academic']['enrollmentStatus'],
        secondarySchool: form.secondarySchool || null,
        secondarySchoolBranch: form.secondarySchoolBranch || null,
        secondarySchoolPercent: form.secondarySchoolPercent ? Number(form.secondarySchoolPercent) : null,
        admissionYear: form.admissionYear ? Number(form.admissionYear) : null,
        city: form.city || null,
        address: form.address || null,
        stage: form.stage || null,
        grade: form.grade || null,
        section: form.section || null,
      },
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
