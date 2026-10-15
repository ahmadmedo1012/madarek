import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Users, BarChart3, ClipboardCheck, ClipboardList,
  AlertTriangle, Calendar, Upload, RefreshCw,
  TrendingUp, Send, FileText, X, CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { Card, MetricCard, Badge, ProgressBar, UserAvatar, SectionTitle, FormField, Pill } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton, ListSkeleton, TableSkeleton, KpiSkeleton, CardSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/overlays/Modal';
import {
  useTeacherOfferings,
  useTeacherStudents,
  useOfferingAnalytics,
  useRecordAttendance,
  useTeacherMaterials,
  useTeacherAssignments,
  usePendingSubmissions,
  useGradeSubmission,
  useCreateAssignment,
  useCreateMaterial,
  useUploadMaterialFile,
  apiErrorMessage,
  type PendingSubmissionRow,
  type TeacherStudentRow,
} from '../../hooks/useResources';
import { MessagesInbox } from '../../components/messages/MessagesInbox';
import { MessageComposeModal } from '../../components/messages/MessageComposeModal';
import { toast } from '../../lib/toast';
import {
  countAr,
  formatRelativeArShort,
  formatDateTimeAr,
  formatDateWithYearAr,
  WEEKDAY_NAMES_AR,
} from '../../lib/format';
import { ASSIGNMENT_KIND_LABEL, MATERIAL_TYPE_LABEL, gradeBand, GRADE_BANDS } from '../../lib/courseMeta';
import { validatePdfFile } from '../../lib/pdfUpload';
import ResearchReviewPage from './ResearchReviewPage';

/* The teacher dashboard now lives in TeacherDashboardPage.tsx
 * (social-media feed style). The previous KPI-grid version was
 * removed during the polish pass — it was unused and added 100 lines
 * of legacy code that didn't match the new visual language.
 */

/* ─── Generic placeholder structure ─── */
function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-title-block">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions}
    </header>
  );
}

/* countAr, formatRelativeArShort + WEEKDAY_NAMES_AR live in lib/format.ts
 * (waves 9-a / 13-15); ASSIGNMENT_KIND_LABEL + MATERIAL_TYPE_LABEL live
 * in lib/courseMeta.ts (waves 13-15 / 14-2) — the former page-local maps
 * here were byte-identical to the shared exports. GRADE_BANDS /
 * gradeBand (22-a, A6 P2) is the platform's ONE grade taxonomy,
 * consumed by the grades table, the students table and the performance
 * distribution — one student reads as one chip everywhere. */

/* ─── Shared course picker (A6 P3, 22-a) ─────────────────────
 * The grades/students/performance trio each carried a copy of the
 * "first offering by default" picker logic inside a full titled Card
 * that wasted the first fold. One hook + the header-actions mount
 * (the attendance save-button pattern) replaces all three. */
function useOfferingPicker() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const [offeringId, setOfferingId] = useState<string>('');
  const effectiveOfferingId = offeringId || offerings[0]?.id || '';
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;
  return { offsQ, offerings, effectiveOfferingId, setOfferingId, offering };
}

/** The picker control shared by the three analytical pages — a labeled
 * select sized for the header-actions slot (max-inline-size lives on
 * .course-select). */
function OfferingPickerSelect({
  offerings,
  effectiveOfferingId,
  onChange,
  label,
}: {
  offerings: NonNullable<ReturnType<typeof useTeacherOfferings>['data']>;
  effectiveOfferingId: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <FormField label={label}>
      <select
        className="input course-select"
        value={effectiveOfferingId}
        onChange={(e) => onChange(e.target.value)}
      >
        {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
        {offerings.map((o) => (
          <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
        ))}
      </select>
    </FormField>
  );
}

export function TeacherSchedulePage() {
  const offsQ = useTeacherOfferings();
  /* r148 (AUDIT-2 L8): سبينر صفحي مكان هيكل مطابق الشكل — القائمة
     النهائية جدول حصص أسبوعي؛ TableSkeleton يحافظ على الإيقاع. */
  if (offsQ.isPending) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." /><Card><TableSkeleton rows={5} cols={4} /></Card></div>;
  if (offsQ.isError) return <div className="page"><PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." /><ErrorState error={offsQ.error} onRetry={() => offsQ.refetch()} /></div>;

  // Group all schedule slots by dayOfWeek across the teacher's offerings.
  const offerings = offsQ.data ?? [];
  type Slot = { startTime: string; endTime: string; courseName: string; courseCode: string; room: string | null; enrolled: number };
  const byDay: Record<number, Slot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const o of offerings) {
    for (const slot of o.schedule) {
      byDay[slot.dayOfWeek]?.push({
        startTime: slot.startTime,
        endTime: slot.endTime,
        courseName: o.course.name,
        courseCode: o.course.code,
        room: slot.room ?? o.room ?? null,
        enrolled: o._count.enrollments,
      });
    }
  }
  for (const list of Object.values(byDay)) list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  const days = Object.entries(byDay).map(([dow, items]) => ({ dow: Number(dow), items })).filter((d) => d.items.length > 0);
  // A6 P3 (22-a): a "اليوم" anchor — the same dayOfWeek convention as
  // Date#getDay() (0=Sunday), so a teacher scanning for today's
  // lectures stops at the marked header instead of reading them all.
  const todayDow = new Date().getDay();

  return (
    <div className="page">
      <PageHeader title="جدول المحاضرات" subtitle="جدولك الأسبوعيّ مع القاعات والأوقات." />
      {days.length === 0 ? (
        <EmptyState
          title="لا يوجد جدول مسجَّل"
          illustration="empty-search"
          description="ستظهر محاضراتك هنا فور تسجيل الجداول لمقرّراتك من قِبَل الإدارة."
        />
      ) : (
        <Card title="الأسبوع" icon={Calendar}>
          <div className="flex-col gap-3">
            {days.map((d) => (
              <div key={d.dow}>
                <div className="flex items-center gap-2">
                  <SectionTitle>{WEEKDAY_NAMES_AR[d.dow]}</SectionTitle>
                  {d.dow === todayDow && <Badge color="brand">اليوم</Badge>}
                </div>
                <div className="flex-col">
                  {d.items.map((it, i) => (
                    <div key={i} className="list-row">
                      {/* Latin time range inside an RTL line — bdi keeps
                          the dash order stable (audit 0-e P2-47) */}
                      <bdi className="list-row-meta">{it.startTime} — {it.endTime}</bdi>
                      <div className="list-row-body">
                        <div className="list-row-title">{it.courseName}</div>
                        <div className="list-row-sub">
                          {it.room ? `${it.room} · ` : ''}
                          {/* P2-1 (5-A7): a scheduled slot with no enrollments
                              names the reality — countAr(0) renders the
                              broken «0 طالباً». */}
                          {it.enrolled === 0 ? 'لا طلاب مسجَّلين' : countAr(it.enrolled, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}
                        </div>
                      </div>
                      <Badge><bdi>{it.courseCode}</bdi></Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

type AttStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
/* Selected state rides on [data-tone] + .on (CSS owns the colors) — the
 * old inline style block had no aria-pressed and no class-based state
 * (audit 0-e P1-32). EXCUSED (15-a P1-7) is the 4th AttendanceStatus:
 * the backend accepts it and the risk/analytics stack excludes it from
 * denominators — it was unreachable from this, its only write surface.
 * The brand selected wash lives in components.css since 17-a2 (E6
 * hand-off) — all four tones are class-based now. */
const ATT_OPTIONS: Array<{ v: AttStatus; label: string; tone: 'success' | 'warning' | 'danger' | 'brand' }> = [
  { v: 'PRESENT', label: 'حاضر',   tone: 'success' },
  { v: 'LATE',    label: 'متأخّر', tone: 'warning' },
  { v: 'ABSENT',  label: 'غائب',   tone: 'danger' },
  { v: 'EXCUSED', label: 'بعذر',   tone: 'brand' },
];

/** 'YYYY-MM-DD' of the client-local calendar day — the roll-call default
 *  (15-h P1-6): slicing `toISOString()` yields the UTC day, which reads
 *  as yesterday's date during the first ~2h of a Libyan night. */
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AttendancePage() {
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const [offeringId, setOfferingId] = useState<string>('');
  const effectiveOfferingId = offeringId || offerings[0]?.id || '';
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const record = useRecordAttendance();

  // 15-h P1-6: default = the client-local day (never the UTC slice —
  // between 00:00 and ~02:00 Libya time that is yesterday's date).
  const [date, setDate] = useState<string>(() => localDayKey(new Date()));
  const [dateError, setDateError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttStatus>>({});

  const students = stuQ.data ?? [];
  const offering = offerings.find((o) => o.id === effectiveOfferingId) ?? null;

  const counts = useMemo(() => {
    let p = 0, l = 0, a = 0, e = 0;
    for (const s of students) {
      const st = statusByStudent[s.studentId] ?? 'PRESENT';
      if (st === 'PRESENT') p++;
      else if (st === 'LATE') l++;
      else if (st === 'ABSENT') a++;
      else if (st === 'EXCUSED') e++;
    }
    return { p, l, a, e, total: students.length };
  }, [students, statusByStudent]);

  /* 5-C3 (A9 P1-3): the offerings query was never gated — while it
     loaded (and when it failed) the select said «— لا توجد مقرّرات —»
     and the roster card a false «لا توجد مقرّرات»: a teacher with a
     dead request was told they have no courses, with no retry. Same
     two-branch gate as TeacherSchedulePage (:106-107), shape-matched
     to this page (session form card + roster list). */
  if (offsQ.isPending) {
    return (
      <div className="page">
        <PageHeader
          title="الحضور والغياب"
          subtitle="سجّل الحضور لكلّ محاضرة. يحفظ سجلّاً واحداً لكلّ تاريخ في قاعدة البيانات."
        />
        <CardSkeleton lines={3} />
        <ListSkeleton rows={5} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader
          title="الحضور والغياب"
          subtitle="سجّل الحضور لكلّ محاضرة. يحفظ سجلّاً واحداً لكلّ تاريخ في قاعدة البيانات."
        />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  const onSave = () => {
    if (!effectiveOfferingId || students.length === 0) return;
    // 15-h P1-6: a cleared <input type="date"> yields '' — new Date('')
    // is an Invalid Date whose toISOString() would throw inside this
    // handler (the save silently did nothing). Block with an inline
    // Arabic message instead; the wire value stays a UTC-midnight ISO.
    if (!date) {
      setDateError('حدّد تاريخ الجلسة قبل الحفظ.');
      return;
    }
    setDateError(null);
    record.mutate({
      offeringId: effectiveOfferingId,
      date: new Date(date).toISOString(),
      topic: topic || undefined,
      records: students.map((s) => ({
        studentId: s.studentId,
        status: statusByStudent[s.studentId] ?? 'PRESENT',
      })),
    });
  };

  return (
    <div className="page">
      <PageHeader
        title="الحضور والغياب"
        subtitle="سجِّل الحضور لكلّ محاضرة. يحفظ سجلّاً واحداً لكلّ تاريخ في قاعدة البيانات."
        actions={
          <button
            type="button"
            className="btn primary"
            onClick={onSave}
            disabled={!effectiveOfferingId || students.length === 0 || record.isPending}
          >
            {record.isPending ? 'جارٍ الحفظ…' : 'حفظ السجلّ'}
          </button>
        }
      />

      <Card title="الجلسة" icon={Calendar}>
        <div className="form-row-3">
          <FormField label="المقرّر">
            <select className="input" value={effectiveOfferingId} onChange={(e) => setOfferingId(e.target.value)}>
              {offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}
              {offerings.map((o) => (
                <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
              ))}
            </select>
          </FormField>
          {/* The hint sits OUTSIDE the label — a wrapping label would
              fold the hint into the input's accessible name (the
              15-h test suite pins the name to «تاريخ الجلسة»). */}
          <FormField
            label="تاريخ الجلسة"
            id="att-date"
            hint={date
              /* Local-noon anchor: a bare YYYY-MM-DD parses as UTC
               * midnight and would echo the previous day west of
               * Greenwich; the teacher picked a calendar DAY. */
              ? <>المحدَّد: {formatDateWithYearAr(`${date}T12:00:00`)}</>
              : 'اختر التاريخ من تقويم الحقل — ترتيب الصيغة داخل الحقل يتبع إعدادات المتصفح.'}
          >
            <input
              type="date"
              className="input"
              dir="ltr"
              value={date}
              aria-invalid={dateError ? true : undefined}
              aria-describedby={dateError ? 'att-date-error' : undefined}
              onChange={(e) => {
                setDate(e.target.value);
                setDateError(null);
              }}
            />
          </FormField>
          <FormField label="الموضوع (اختياريّ)">
            <input type="text" className="input" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="مثال: مقدّمة في UML" />
          </FormField>
        </div>
        {dateError && (
          <div id="att-date-error" className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-3)' }}>
            <Icon icon={AlertTriangle} size={14} />
            <span className="flex-1">{dateError}</span>
          </div>
        )}
      </Card>

      <div className="grid-2-1">
        <Card title={offering ? `طلاب ${offering.course.name}` : 'الطلاب'} icon={ClipboardCheck}>
          {!effectiveOfferingId ? (
            <EmptyState title="لا توجد مقرّرات" description="ستظهر المقرّرات هنا حين تُسنَد إليك." illustration="empty-search" />
          ) : stuQ.isPending ? (
            <ListSkeleton rows={5} />
          ) : stuQ.isError ? (
            <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
          ) : students.length === 0 ? (
            <EmptyState title="لا يوجد طلاب" description="لا توجد تسجيلات نشطة في هذا المقرّر بعد." illustration="empty-search" />
          ) : (
            <div className="flex-col gap-2">
              {students.map((s) => {
                const status = statusByStudent[s.studentId] ?? 'PRESENT';
                return (
                  <div key={s.studentId} className="list-row">
                    <UserAvatar
                      initials={s.avatarInitials ?? s.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                      color={s.avatarColor ?? undefined}
                      size={32}
                    />
                    <div className="list-row-body">
                      <div className="list-row-title">{s.name}</div>
                      <div className="list-row-sub font-mono"><bdi>{s.universityId}</bdi></div>
                    </div>
                    <div className="flex gap-1" role="group" aria-label={`حضور ${s.name}`}>
                      {ATT_OPTIONS.map((opt) => {
                        const on = status === opt.v;
                        return (
                          <button
                            key={opt.v}
                            type="button"
                            className={`att-toggle${on ? ' on' : ''}`}
                            data-tone={opt.tone}
                            aria-pressed={on}
                            onClick={() => setStatusByStudent({ ...statusByStudent, [s.studentId]: opt.v })}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card title="إحصائيّات الجلسة">
          {/* A6 P2 (22-a): the stats card mirrors the roster's state —
              never four fake 0% bars while nothing is loaded. Empty
              buckets dim instead of painting full-weight zero tracks
              (the old "barely visible grey … looks like a rendering
              bug" VLM verdict). */}
          {!effectiveOfferingId ? (
            <p className="text-xs text-muted" style={{ margin: 0 }}>
              اختر مقرّراً لعرض إحصائيّات جلساته.
            </p>
          ) : stuQ.isPending ? (
            <div className="flex-col gap-4" aria-busy="true" aria-live="polite">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} aria-hidden>
                  <div className="flex items-center justify-between" style={{ marginBlockEnd: 'var(--sp-2)' }}>
                    <Skeleton width={90} height={11} />
                    <Skeleton width={34} height={11} />
                  </div>
                  <Skeleton width="100%" height={6} rounded="var(--r-full)" />
                </div>
              ))}
            </div>
          ) : students.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="لا طلاب في هذا المقرّر بعد" description="لا إحصائيّات لعرضها — سجّل طالبًا أول لعرض حضوره وتأخّره." illustration="empty-search" />
          ) : (
            <div className="flex-col gap-4">
              <div style={{ opacity: counts.p === 0 ? 0.55 : 1, transition: 'opacity var(--t-fast) var(--ease)' }}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.p / counts.total) * 100) : 0} label={`الحضور (${counts.p})`} color="var(--success)" />
              </div>
              <div style={{ opacity: counts.l === 0 ? 0.55 : 1, transition: 'opacity var(--t-fast) var(--ease)' }}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.l / counts.total) * 100) : 0} label={`التأخّر (${counts.l})`} color="var(--warning)" />
              </div>
              <div style={{ opacity: counts.a === 0 ? 0.55 : 1, transition: 'opacity var(--t-fast) var(--ease)' }}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.a / counts.total) * 100) : 0} label={`الغياب (${counts.a})`} color="var(--danger)" />
              </div>
              {/* بعذر counts out of the session total (same denominator as
                  the other bars) — the analytics KPI keeps its own
                  EXCUSED-excluded math server-side. */}
              <div style={{ opacity: counts.e === 0 ? 0.55 : 1, transition: 'opacity var(--t-fast) var(--ease)' }}>
                <ProgressBar value={counts.total > 0 ? Math.round((counts.e / counts.total) * 100) : 0} label={`بعذر (${counts.e})`} color="var(--accent)" />
              </div>
            </div>
          )}
          {record.isError && (
            <div className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-3)' }}>
              <Icon icon={AlertTriangle} size={14} />
              <span className="flex-1">
                {apiErrorMessage(record.error, 'تعذَّر حفظ سجلّ الحضور.')} أعد المحاولة بالضغط على «حفظ السجلّ».
              </span>
            </div>
          )}
          {record.isSuccess && (
            <div className="form-feedback ok" role="status" style={{ marginBlockStart: 'var(--sp-3)' }}>
              <Icon icon={CheckCircle2} size={14} />
              <span>تمّ حفظ سجلّ الحضور لهذا التاريخ.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function GradesPage() {
  const { offsQ, offerings, effectiveOfferingId, setOfferingId, offering } = useOfferingPicker();
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);

  /* 5-C3 (A9 P1-3): gate the offerings query — during load AND on
     error this page rendered the false «اختر مقرّراً» empty plus a
     select claiming «— لا توجد مقرّرات —». Skeleton shaped like the
     table that lands; retry on failure. */
  if (offsQ.isPending) {
    return (
      <div className="page">
        <PageHeader title="درجات الطلاب" subtitle="نظرة على متوسّط درجات طلاب المقرّر الحاليّ." />
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader title="درجات الطلاب" subtitle="نظرة على متوسّط درجات طلاب المقرّر الحاليّ." />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="درجات الطلاب"
        subtitle="نظرة على متوسّط درجات طلاب المقرّر الحاليّ."
        actions={
          <OfferingPickerSelect
            offerings={offerings}
            effectiveOfferingId={effectiveOfferingId}
            onChange={setOfferingId}
            label="المقرّر"
          />
        }
      />

      <Card
        title={offering ? `${offering.course.name} · ${offering.course.code}` : 'الدرجات'}
        icon={ClipboardList}
      >
        {!effectiveOfferingId ? (
          <EmptyState title="اختر مقرّراً" description="حدّد أحد مقرّراتك من أعلى الصفحة لعرض درجات طلابه." illustration="empty-search" />
        ) : stuQ.isPending ? (
          <TableSkeleton rows={5} cols={5} />
        ) : stuQ.isError ? (
          <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
        ) : (stuQ.data ?? []).length === 0 ? (
          <EmptyState title="لا يوجد طلاب" description="لا توجد تسجيلات في هذا المقرّر بعد." illustration="empty-search" />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">الطالب</th>
                  <th scope="col">الرقم الجامعيّ</th>
                  <th scope="col">متوسّط الدرجات</th>
                  <th scope="col">الحضور</th>
                  <th scope="col">التقدير</th>
                </tr>
              </thead>
              <tbody>
                {(stuQ.data ?? []).map((s) => {
                  /* One taxonomy everywhere (A6 P2, 22-a): the same
                   * gradeBand chip this student wears on /students and
                   * the same bucket they count into on /performance. */
                  const band = gradeBand(s.avgGrade);
                  return (
                    <tr key={s.studentId}>
                      <td className="tbl-strong" data-label="الطالب">{s.name}</td>
                      <td data-label="الرقم الجامعيّ"><bdi className="font-mono text-xs">{s.universityId}</bdi></td>
                      <td className="tbl-num" data-label="متوسّط الدرجات"><bdi>{s.avgGrade}%</bdi></td>
                      <td className="tbl-num" data-label="الحضور">{s.attendancePct}%</td>
                      <td data-label="التقدير"><Badge color={band.color}>{band.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm text-muted notice-paragraph">
          إدخال الدرجات الفصليّة (الاختبار 1، الاختبار 2، المشروع، النهائيّ) قيد التطوير.
          حالياً تُعرض الدرجات المرصودة من واجبات المقرّر.{' '}
          <Link to="/teacher/intelligence" className="text-link">شاهد الذكاء الأكاديميّ</Link>
          {' '}للحصول على تحليل أعمق.
        </p>
      </Card>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/* ─── r144: add-material-by-URL — the backend's POST /offerings/:id/
 * materials contract (by-link, no multipart — AGENTS §5.6). Replaces
 * the old «قيد التطوير» dead-end card with the actual channel.
 * P3 adds the FILE mode: POST /offerings/:id/materials/file uploads a
 * real PDF (raw body, name/description/type on the query string) — now
 * the default channel; the by-link form below stays verbatim for every
 * non-PDF type. */
function MaterialFormModal({ onClose }: { onClose: () => void }) {
  const offerings = useTeacherOfferings();
  const create = useCreateMaterial();
  /* P3: the direct-PDF channel (file mode). */
  const uploadMaterial = useUploadMaterialFile();

  /* P3: two honest channels, one modal — «ملف PDF» (direct upload)
   * | «رابط خارجي» (the r144 by-link form). The Pill pair carries
   * aria-pressed (the house two-way switch idiom); switching clears the
   * other mode's stale inline validation. */
  const [mode, setMode] = useState<'file' | 'link'>('file');
  const [offeringId, setOfferingId] = useState('');
  const [name, setName] = useState('');
  /* True while the name field holds the auto-fill derived from the
   * picked file's name — replacing the file refreshes the derived name,
   * but a manual edit always wins (nameAuto flips off on first edit). */
  const [nameAuto, setNameAuto] = useState(false);
  const [type, setType] = useState<'PDF' | 'PPT' | 'VIDEO' | 'DOC' | 'ZIP' | 'IMAGE' | 'OTHER'>('PDF');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  /* r164-h: determinate upload progress (0–100) — fed by the mutation's
   * onUploadProgress (axios), reset on every submit attempt. */
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pending = mode === 'file' ? uploadMaterial.isPending : create.isPending;
  const dirty = mode === 'file'
    ? name.trim() !== '' || description.trim() !== '' || file !== null
    : name.trim() !== '' || url.trim() !== '' || description.trim() !== '';
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty,
    pending,
    onClose,
  });

  const list = offerings.data ?? [];
  const effectiveOfferingId = offeringId || list[0]?.id || '';

  const pickFile = (f: File | null) => {
    setFile(f);
    if (f && (name.trim() === '' || nameAuto)) {
      setName(f.name.replace(/\.pdf$/i, ''));
      setNameAuto(true);
    }
    /* r164-h: the pick guard — reject a wrong file the MOMENT it is
     * picked, not at submit: the same validatePdfFile mirror of the
     * server caps, with immediate inline feedback; a valid pick (or a
     * removal) clears a stale file error. */
    setValidationError(f ? validatePdfFile(f) : null);
  };
  /* Clearing the value lets the SAME file be re-picked afterwards — a
   * file input only fires change when its value actually differs. */
  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onSubmit = async () => {
    if (mode === 'file') {
      /* P3: honest client-side caps (PDF only, 20MB) BEFORE any request
       * leaves the browser — the mirror of the server's guards. Early
       * returns (not one chained ternary) so the picked file narrows to
       * File for the mutation payload below. */
      if (!effectiveOfferingId) { setValidationError('اختر المقرّر أولاً.'); return; }
      if (name.trim().length < 1) { setValidationError('اسم الملف مطلوب.'); return; }
      if (!file) { setValidationError('اختر ملف PDF للرفع.'); return; }
      const fileErr = validatePdfFile(file);
      if (fileErr) { setValidationError(fileErr); return; }
      setValidationError(null);
      setProgress(0);
      try {
        await uploadMaterial.mutateAsync({
          offeringId: effectiveOfferingId,
          name: name.trim(),
          description: description.trim() || undefined,
          file,
          /* r164-h: the byte-accurate bar — axios reports loaded/total,
           * the hook rounds to 0–100. */
          onUploadProgress: setProgress,
        });
        toast.success('أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.', { title: 'تمّت الإضافة' });
        onClose();
      } catch {
        // surfaced inline from uploadMaterial.isError below
      }
      return;
    }
    const err =
      !effectiveOfferingId ? 'اختر المقرّر أولاً.' :
      name.trim().length < 1 ? 'اسم الملف مطلوب.' :
      !/^https:\/\//.test(url.trim()) ? 'الرابط يجب أن يبدأ بـ https://' :
      null;
    setValidationError(err);
    if (err) return;
    try {
      await create.mutateAsync({
        offeringId: effectiveOfferingId,
        name: name.trim(),
        type,
        url: url.trim(),
        description: description.trim() || undefined,
      });
      toast.success('أُضيف الملف إلى المقرّر وسيظهر لطلابه فوراً.', { title: 'تمّت الإضافة' });
      onClose();
    } catch {
      // surfaced inline from create.isError below
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="إضافة مادة تعليمية"
      closeOnOverlayClick={!pending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">إضافة مادة</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={pending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} noValidate>
        <div className="modal-body">
          <div className="flex items-center gap-2" role="group" aria-label="طريقة إضافة المادة">
            <Pill
              on={mode === 'file'}
              icon={FileText}
              onClick={() => { setMode('file'); setValidationError(null); }}
            >
              ملف PDF
            </Pill>
            <Pill
              on={mode === 'link'}
              icon={ExternalLink}
              onClick={() => { setMode('link'); setValidationError(null); }}
            >
              رابط خارجي
            </Pill>
          </div>

          <FormField label="المقرّر" error={list.length === 0 ? 'لا توجد مقرّرات مرتبطة بحسابك — تواصل مع الإدارة.' : undefined}>
            <select
              className="input"
              value={effectiveOfferingId}
              onChange={(e) => setOfferingId(e.target.value)}
              disabled={pending || list.length === 0}
            >
              {list.map((o) => (
                <option key={o.id} value={o.id}>
                  {/* r168c: <bdi> is invalid inside <option> (text-only
                      content — React validateDOMNesting warned live during
                      the assignment flow). Plain text; option rendering
                      ignores bidi isolation anyway. */}
                  {o.course.name} · {o.course.code}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="اسم المادة" error={validationError && name.trim().length < 1 ? validationError : undefined}>
            <input
              className="input"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameAuto(false); }}
              placeholder='مثال: محاضرة الأسبوع الثالث — الشرائح'
              maxLength={200}
              disabled={pending}
            />
          </FormField>

          {mode === 'file' ? (
            <>
              <FormField
                label="ملف PDF"
                hint="ملفات PDF فقط، بحد أقصى 20 ميغابايت."
                error={validationError && name.trim().length >= 1 && effectiveOfferingId ? validationError : undefined}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="input upload-file-input"
                  accept="application/pdf,.pdf"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                  disabled={pending}
                />
              </FormField>
              {file && (
                <div className="upload-file-field">
                  <Icon icon={FileText} size={14} className="text-muted" />
                  <span className="upload-file-name" title={file.name}><bdi>{file.name}</bdi></span>
                  <button
                    type="button"
                    className="btn ghost sm upload-file-remove"
                    onClick={removeFile}
                    disabled={pending}
                  >
                    <Icon icon={X} size={14} />
                    إزالة الملف
                  </button>
                </div>
              )}
              {/* r164-h: the determinate upload bar — real bytes (axios
                  onUploadProgress → 0–100), live-announced so screen
                  readers hear the upload is moving. */}
              {mode === 'file' && uploadMaterial.isPending && (
                <div aria-live="polite">
                  <ProgressBar
                    value={progress}
                    showValue={false}
                    label={`جارٍ رفع الملف… ${progress}%`}
                    color="var(--accent)"
                  />
                </div>
              )}
              {/* Locked type — the upload route is PDF-only, so the type
                  select collapses to an honest static chip (no fake
                  choice of types this channel cannot take). */}
              <div className="form-field">
                <div className="form-field-label">النوع</div>
                <Pill icon={FileText}>PDF</Pill>
              </div>
            </>
          ) : (
            <>
              <FormField label="النوع">
                <select
                  className="input"
                  value={type}
                  onChange={(e) => setType(e.target.value as typeof type)}
                  disabled={pending}
                >
                  <option value="PDF">PDF</option>
                  <option value="PPT">PPT</option>
                  <option value="VIDEO">فيديو</option>
                  <option value="DOC">DOC</option>
                  <option value="ZIP">ZIP</option>
                  <option value="IMAGE">صورة</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </FormField>

              <FormField
                label="الرابط (https)"
                hint='رابط مباشر للملف على خدمة خارجية، أو مسار ملف ورقة من المنصة.'
                error={validationError && !/^https:\/\//.test(url.trim()) ? validationError : undefined}
              >
                <input
                  className="input" dir="ltr" style={{ textAlign: 'start' }}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  maxLength={500}
                  disabled={pending}
                  spellCheck={false}
                />
              </FormField>
            </>
          )}

          <FormField label="الوصف (اختياري)">
            <textarea
              className="input" rows={3} maxLength={2000}
              placeholder='وصف مختصر يساعد الطالب على معرفة محتوى المادة…'
              value={description} onChange={(e) => setDescription(e.target.value)}
              disabled={pending} style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          {(mode === 'file' ? uploadMaterial.isError : create.isError) && (
            /* r164-h: the failure retry — the draft (file + name +
               description) stays in the modal, so «إعادة المحاولة»
               re-runs the SAME submit path instead of forcing the
               teacher to re-pick everything. */
            <div className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-2)' }}>
              <Icon icon={X} size={14} />
              <span className="flex-1">
                {apiErrorMessage(mode === 'file' ? uploadMaterial.error : create.error, 'تعذّرت إضافة المادة — حاول مرة أخرى.')}
              </span>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => void onSubmit()}
                disabled={pending}
              >
                <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
              </button>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={pending}>
            إلغاء
          </button>
          <button type="submit" className="btn primary" disabled={pending}>
            {mode === 'file'
              ? (uploadMaterial.isPending ? 'جارٍ رفع الملف…' : 'إضافة المادة')
              : (create.isPending ? 'جارٍ الإضافة…' : 'إضافة المادة')}
          </button>
        </div>
      </form>
      {guard}
    </Modal>
  );
}

export function MaterialsPage() {
  const q = useTeacherMaterials();
  const [adding, setAdding] = useState(false);

  return (
    <div className="page">
      <PageHeader
        title="الملفات التعليمية"
        subtitle="ملفّاتك المرفوعة على مقرّراتك — مع عدد المشاهدات والتحميلات الفعليّ."
        actions={(
          /* r144 (T1-h F2): the channel the old dead-end card pointed
           * at without providing. By-link creation (no multipart). */
          <button type="button" className="btn primary" onClick={() => setAdding(true)}>
            <Icon icon={Upload} size={15} /> إضافة مادة
          </button>
        )}
      />

      {/* P3: the channel copy is honest now — direct PDF upload is
          live (the modal's default mode); by-link stays for other types. */}
      <Card title="إضافة مادة" icon={Upload}>
        <div className="flex items-center gap-3">
          <Icon icon={Upload} size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div className="text-xs text-muted">
            <strong>ارفع ملف PDF مباشرة من جهازك، أو أضف رابطاً خارجياً لأي نوع آخر.</strong>{' '}
            الملفات المرفوعة تُخزّن على المنصة ويفتحها طلاب المقرّر من العارض الداخلي مباشرة، ومع الروابط يبقى مجال الفيديو والعروض وغيرها.
          </div>
        </div>
      </Card>

      <Card title="ملفاتك" icon={FileText}>
        {q.isPending ? (
          <TableSkeleton rows={4} cols={7} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState title="لم ترفع ملفات بعد" description="أضف أول مادة بزر «إضافة مادة» بالأعلى — سيظهر لطلاب المقرّر فوراً." illustration="empty-search" />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">الملفّ</th>
                  <th scope="col">المقرّر</th>
                  <th scope="col">النوع</th>
                  <th scope="col">الحجم</th>
                  <th scope="col">المشاهدات</th>
                  <th scope="col">التحميلات</th>
                  <th scope="col">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((m) => (
                  <tr key={m.id}>
                    <td className="tbl-strong" data-label="الملفّ">
                      <a href={m.url} target="_blank" rel="noreferrer" className="text-link">
                        {m.name}
                      </a>
                    </td>
                    <td data-label="المقرّر">{m.course.name}</td>
                    <td data-label="النوع"><Badge>{MATERIAL_TYPE_LABEL[m.type] ?? <bdi>{m.type}</bdi>}</Badge></td>
                    <td className="tbl-num" data-label="الحجم">{m.sizeBytes > 0 ? <bdi>{formatSize(m.sizeBytes)}</bdi> : '—'}</td>
                    <td className="tbl-num" data-label="المشاهدات">{m.views.toLocaleString('ar-LY')}</td>
                    <td className="tbl-num" data-label="التحميلات">{m.downloads.toLocaleString('ar-LY')}</td>
                    <td className="text-subtle" data-label="التاريخ" title={formatDateTimeAr(m.createdAt)}>{formatRelativeArShort(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding && <MaterialFormModal onClose={() => setAdding(false)} />}
    </div>
  );
}

export function ResearchPage() {
  return <ResearchReviewPage />;
}

/* ─── r164-h: the risk vocabulary shared by the students table's
 * «المخاطرة» column — the same labels TeacherIntelligencePage's risk
 * rows wear (kept local to this bundle; the intelligence page keeps
 * its own edge/ink maps local too). */
const STUDENT_RISK_LABEL: Record<TeacherStudentRow['riskLevel'], string> = {
  OK: 'مستقر',
  WATCH: 'تحت المراقبة',
  AT_RISK: 'في خطر',
  CRITICAL: 'حرج',
};
const STUDENT_RISK_TONE: Record<TeacherStudentRow['riskLevel'], 'green' | 'gold' | 'amber' | 'red'> = {
  OK: 'green',
  WATCH: 'gold',
  AT_RISK: 'amber',
  CRITICAL: 'red',
};

export function StudentsListPage() {
  const { offsQ, offerings, effectiveOfferingId, setOfferingId, offering } = useOfferingPicker();
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const students = stuQ.data ?? [];

  /* 5-C3 (A9 P1-3): same offerings gate as GradesPage — the false
     «اختر مقرّراً» empty fired during load and on error here too. */
  if (offsQ.isPending) {
    return (
      <div className="page">
        <PageHeader title="قائمة الطلاب" subtitle="جميع الطلاب المسجّلين في مقرّراتك." />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader title="قائمة الطلاب" subtitle="جميع الطلاب المسجّلين في مقرّراتك." />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title="قائمة الطلاب"
        subtitle="جميع الطلاب المسجَّلين في مقرّراتك."
        actions={
          <OfferingPickerSelect
            offerings={offerings}
            effectiveOfferingId={effectiveOfferingId}
            onChange={setOfferingId}
            label="المقرّر"
          />
        }
      />

      <Card
        title={
          offering
            ? `${offering.course.name} · ${offering.course.code} · ${
              /* P2-1: «0 طالباً» is broken Arabic — the zero case names
               * the reality (the empty-state below carries the guidance). */
              students.length === 0
                ? 'لا طلاب مسجَّلين'
                : countAr(students.length, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])
            }`
            : 'الطلاب'
        }
        icon={Users}
      >
        {!effectiveOfferingId ? (
          <EmptyState title="اختر مقرّراً" description="حدّد أحد مقرّراتك من أعلى الصفحة لعرض قائمة طلابه." illustration="empty-search" />
        ) : stuQ.isPending ? (
          <TableSkeleton rows={5} cols={6} />
        ) : stuQ.isError ? (
          <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
        ) : students.length === 0 ? (
          <EmptyState title="لا يوجد طلاب مسجَّلون" description="لا توجد تسجيلات نشطة في هذا المقرّر بعد." illustration="empty-search" />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">الاسم</th>
                  <th scope="col">الرقم الجامعيّ</th>
                  <th scope="col">الحضور</th>
                  <th scope="col">المتوسّط</th>
                  {/* A6 P2 (22-a): «التقدير» — the same column name and
                      the same gradeBand chip as the grades table; the
                      old «الحالة» column carried a private vocabulary
                      (متفوّق/متوسّط) that disagreed with its sisters. */}
                  <th scope="col">التقدير</th>
                  {/* r164-h: «المخاطرة» — the same risk vocabulary the
                      intelligence page's risk rows wear, so the row's
                      link (below) has visible context to act on. */}
                  <th scope="col">المخاطرة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const band = gradeBand(s.avgGrade);
                  return (
                    <tr key={s.studentId}>
                      {/* r164-h: the name is the row's door — ONE tap to
                          the offering's intelligence deep dive (the risk
                          context the chip beside it names). */}
                      <td className="tbl-strong" data-label="الاسم">
                        <Link
                          to={`/teacher/intelligence/${effectiveOfferingId}`}
                          className="text-link"
                          title="سياق المخاطرة والأداء في الذكاء الأكاديميّ"
                        >
                          {s.name}
                        </Link>
                      </td>
                      <td data-label="الرقم الجامعيّ"><bdi className="font-mono text-xs">{s.universityId}</bdi></td>
                      <td className="tbl-num" data-label="الحضور">{s.attendancePct}%</td>
                      <td className="tbl-num" data-label="المتوسّط"><bdi>{s.avgGrade}%</bdi></td>
                      <td data-label="التقدير"><Badge color={band.color}>{band.label}</Badge></td>
                      <td data-label="المخاطرة">
                        <Badge color={STUDENT_RISK_TONE[s.riskLevel]}>{STUDENT_RISK_LABEL[s.riskLevel]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function PerformancePage() {
  const { offsQ, offerings, effectiveOfferingId, setOfferingId, offering } = useOfferingPicker();
  const stuQ = useTeacherStudents(effectiveOfferingId || undefined);
  const analytics = useOfferingAnalytics(effectiveOfferingId || undefined);
  const students = stuQ.data ?? [];

  // Derive the grade distribution from the SAME gradeBand the grades
  // and students tables render (A6 P2, 22-a) — a student at 62 counts
  // into «جيّد» here and wears a «جيّد» chip everywhere; the old
  // private buckets (85+/75-84/60-74/<60) disagreed with both tables.
  const distribution = useMemo(() => {
    const total = students.length;
    const counts = new Map(GRADE_BANDS.map((b) => [b.key, 0]));
    if (total > 0) {
      for (const s of students) {
        const band = gradeBand(s.avgGrade);
        counts.set(band.key, (counts.get(band.key) ?? 0) + 1);
      }
    }
    return GRADE_BANDS.map((band) => {
      const count = counts.get(band.key) ?? 0;
      return { band, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    });
  }, [students]);

  /* 5-C3 (A9 P1-3): offerings gate, performance edition — the page
     used to render its «اختر مقرّراً» empty while the picker data was
     still in flight (or dead). Skeleton mirrors what lands: the KPI
     row + the distribution card. */
  if (offsQ.isPending) {
    return (
      <div className="page">
        <PageHeader title="الأداء والتحليل" subtitle="رؤى على أداء فصلك — مُستخرجة من بيانات الحضور والدرجات الفعليّة." />
        <KpiSkeleton />
        <CardSkeleton lines={5} />
      </div>
    );
  }
  if (offsQ.isError) {
    return (
      <div className="page">
        <PageHeader title="الأداء والتحليل" subtitle="رؤى على أداء فصلك — مُستخرجة من بيانات الحضور والدرجات الفعليّة." />
        <ErrorState error={offsQ.error} onRetry={() => void offsQ.refetch()} />
      </div>
    );
  }

  const passing = students.filter((s) => s.avgGrade >= 50).length;
  const passRate = students.length > 0 ? Math.round((passing / students.length) * 100) : 0;
  const top = students.filter((s) => gradeBand(s.avgGrade).key === 'EXCELLENT').length;
  const atRisk = students.filter((s) => s.riskLevel === 'AT_RISK' || s.riskLevel === 'CRITICAL').length;

  return (
    <div className="page">
      <PageHeader
        title="الأداء والتحليل"
        subtitle="رؤى على أداء فصلك — مُستخرجة من بيانات الحضور والدرجات الفعليّة."
        actions={
          <OfferingPickerSelect
            offerings={offerings}
            effectiveOfferingId={effectiveOfferingId}
            onChange={setOfferingId}
            label="المقرّر"
          />
        }
      />

      {!effectiveOfferingId ? (
        <EmptyState title="اختر مقرّراً" description="حدّد أحد مقرّراتك من أعلى الصفحة لعرض تحليل أداء فصلك." illustration="empty-search" />
      ) : stuQ.isPending || analytics.isPending ? (
        /* 5-C3 (A9 P2-2): bare spinner → the shapes that land — the
           3-KPI row + the distribution card — so the data-land swap
           doesn't move the page (A9 V1 measured the spinner→content
           jump on this family). */
        <>
          <KpiSkeleton />
          <CardSkeleton lines={5} />
        </>
      ) : stuQ.isError ? (
        <ErrorState error={stuQ.error} onRetry={() => stuQ.refetch()} />
      ) : analytics.isError ? (
        <ErrorState message="تعذَّر تحميل مؤشّرات المقرّر" error={analytics.error} onRetry={() => analytics.refetch()} />
      ) : (
        <>
          <div className="grid-3">
            <MetricCard
              icon={TrendingUp}
              label="معدّل النجاح"
              value={students.length > 0 ? `${passRate}%` : '—'}
              change={students.length > 0 ? `${passing} من ${students.length}` : 'لا توجد بيانات'}
              color={passRate >= 70 ? 'green' : passRate >= 50 ? 'amber' : 'red'}
            />
            <MetricCard
              icon={Users}
              label="طلاب متفوّقون"
              value={top.toString()}
              change={students.length > 0 ? `من ${students.length}` : '—'}
              color="brand"
            />
            <MetricCard
              icon={AlertTriangle}
              label="بحاجة دعم"
              value={atRisk.toString()}
              change={atRisk > 0 ? 'مراقبة مستمرّة' : 'لا تنبيهات'}
              color={atRisk === 0 ? 'green' : 'amber'}
            />
          </div>

          <Card
            title={offering ? `توزيع الدرجات — ${offering.course.name}` : 'توزيع الدرجات'}
            icon={BarChart3}
          >
            {students.length === 0 ? (
              <EmptyState
                title="لا توجد بيانات توزيع بعد"
                illustration="empty-search"
                description="سيظهر توزيع الدرجات هنا فور تسجيل طلاب في المقرّر."
              />
            ) : (
              /* A6 P2 (22-a): empty buckets dim instead of painting
                 full-weight 0% tracks — the honest zero, not the
                 "rendering bug" wall. */
              <div className="flex-col gap-3">
                {distribution.map(({ band, pct }) => (
                  <div key={band.key} style={{ opacity: pct === 0 ? 0.55 : 1, transition: 'opacity var(--t-fast) var(--ease)' }}>
                    <ProgressBar
                      value={pct}
                      /* A7 P2-6: the label already carries the pct — the
                        bar's own value readout rendered it twice
                        («0%0%» live in DOM). */
                      showValue={false}
                      /* ReactNode label → the accessible name needs the
                         explicit ariaLabel (ProgressBar's string-label
                         fallback can't fire for markup). */
                      ariaLabel={`حصة تقدير ${band.label} (${band.range}): ${pct}%`}
                      label={<>{band.label} (<bdi>{band.range}</bdi>) · <bdi>{pct}%</bdi></>}
                      color={band.barColor}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/* Relative due-date copy — module scope so the queue groups and the
 * assignments list share ONE wording (5-B6). */
function formatDue(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return `انتهى ${countAr(-days, ['منذ يوم', 'منذ يومين', 'منذ أيام', 'منذ يوماً'])}`;
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days < 7) return `بعد ${countAr(days, ['يوم', 'يومين', 'أيام', 'يوماً'])}`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

/* ─── r144: the teaching loop's authoring half ─────────────────────
 * A modal on the backend's existing POST /offerings/:id/assignments
 * contract (title / description / type / dueAt / weight / maxScore).
 * Mirrors GradeSubmissionModal's structure: real <form>, FormField
 * wiring, discard guard, inline errors, toast on success. */
function AssignmentFormModal({ onClose }: { onClose: () => void }) {
  const offerings = useTeacherOfferings();
  const create = useCreateAssignment();

  const [offeringId, setOfferingId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'HOMEWORK' | 'QUIZ' | 'PROJECT' | 'EXAM'>('HOMEWORK');
  const [dueAt, setDueAt] = useState('');
  const [weight, setWeight] = useState('10');
  const [maxScore, setMaxScore] = useState('100');
  const [validationError, setValidationError] = useState<string | null>(null);

  const dirty = title.trim() !== '' || description.trim() !== '' || dueAt !== ''
    || weight !== '10' || maxScore !== '100';
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty,
    pending: create.isPending,
    onClose,
  });

  const list = offerings.data ?? [];
  const effectiveOfferingId = offeringId || list[0]?.id || '';

  const onSubmit = async () => {
    const err =
      !effectiveOfferingId ? 'اختر المقرّر أولاً.' :
      title.trim().length < 2 ? 'العنوان حرفان على الأقل.' :
      !dueAt ? 'حدّد الموعد النهائي للتسليم.' :
      Number.isNaN(Date.parse(dueAt)) ? 'قيمة الموعد النهائي غير صالحة.' :
      Number(weight) < 0 || Number(weight) > 100 ? 'الوزن بين 0 و100.' :
      Number(maxScore) <= 0 ? 'الدرجة العظمى أكبر من صفر.' :
      null;
    setValidationError(err);
    if (err) return;
    try {
      await create.mutateAsync({
        offeringId: effectiveOfferingId,
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        dueAt: new Date(dueAt).toISOString(),
        weight: Number(weight),
        maxScore: Number(maxScore),
      });
      toast.success('أُنشئ الواجب وسيظهر لطلاب المقرّر فوراً.', { title: 'تمّ الإنشاء' });
      onClose();
    } catch {
      // surfaced inline from create.isError below
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="إنشاء واجب جديد"
      closeOnOverlayClick={!create.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">واجب جديد</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={create.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} noValidate>
        <div className="modal-body">
          <FormField label="المقرّر" error={list.length === 0 ? 'لا توجد مقرّرات مرتبطة بحسابك — تواصل مع الإدارة.' : undefined}>
            <select
              className="input"
              value={effectiveOfferingId}
              onChange={(e) => setOfferingId(e.target.value)}
              disabled={create.isPending || list.length === 0}
            >
              {list.map((o) => (
                <option key={o.id} value={o.id}>
                  {/* r168c: <bdi> is invalid inside <option> (text-only
                      content — React validateDOMNesting warned live during
                      the assignment flow). Plain text; option rendering
                      ignores bidi isolation anyway. */}
                  {o.course.name} · {o.course.code}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="العنوان" error={validationError && title.trim().length < 2 ? validationError : undefined}>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: واجب الأسبوع الأول — مقدمة في الموضوع"
              maxLength={200}
              disabled={create.isPending}
            />
          </FormField>

          <FormField label="النوع">
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              disabled={create.isPending}
            >
              <option value="HOMEWORK">واجب</option>
              <option value="QUIZ">اختبار قصير</option>
              <option value="PROJECT">مشروع</option>
              <option value="EXAM">اختبار</option>
            </select>
          </FormField>

          <FormField label="الموعد النهائي للتسليم" error={validationError && !dueAt ? validationError : undefined}>
            <input
              type="datetime-local"
              className="input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={create.isPending}
            />
          </FormField>

          <div className="flex gap-3" style={{ gap: 'var(--sp-3)' }}>
            <FormField label="الوزن (% من الدرجات)">
              <input
                type="number" className="input input-narrow" min={0} max={100} step={1}
                value={weight} onChange={(e) => setWeight(e.target.value)} disabled={create.isPending}
              />
            </FormField>
            <FormField label="الدرجة العظمى">
              <input
                type="number" className="input input-narrow" min={1} step={1}
                value={maxScore} onChange={(e) => setMaxScore(e.target.value)} disabled={create.isPending}
              />
            </FormField>
          </div>

          <FormField label="الوصف (اختياري)">
            <textarea
              className="input" rows={3} maxLength={4000}
              placeholder="تعليمات التسليم، المراجع، معايير التقييم…"
              value={description} onChange={(e) => setDescription(e.target.value)}
              disabled={create.isPending} style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          {create.isError && (
            <p role="alert" className="text-xs text-red" style={{ marginBlockStart: 'var(--sp-2)' }}>
              {apiErrorMessage(create.error, 'تعذّر إنشاء الواجب — حاول مرة أخرى.')}
            </p>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={create.isPending}>
            إلغاء
          </button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            {create.isPending ? 'جارٍ الإنشاء…' : 'إنشاء الواجب'}
          </button>
        </div>
      </form>
      {guard}
    </Modal>
  );
}

export function AssignmentsPage() {
  const q = useTeacherAssignments();
  /* r157 / 6A8: the queue rides its OWN endpoint — the dashboard feed
   * only ever previewed 6 rows, so the 7th+ pending submission was
   * invisible on the very page built to grade it. The new hook walks
   * the full shared set (SUBMITTED + LATE, oldest-first, take 100). */
  const pendingQ = usePendingSubmissions();

  const [gradeTarget, setGradeTarget] = useState<GradeTarget | null>(null);
  const [creating, setCreating] = useState(false);

  /* The queue group header carries the assignment's due date (VLM
   * residue, re-measured valid): urgency context per group, from the
   * same assignment rows the fallback ceiling lookup uses. */
  const dueFor = useCallback((title: string, courseCode?: string) => {
    const match = (q.data ?? []).find(
      (a) => a.title === title && (!courseCode || a.course.code === courseCode),
    );
    return match?.dueAt;
  }, [q.data]);

  const pending = useMemo(
    () => queueToPending(pendingQ.data ?? []),
    [pendingQ.data],
  );

  /* The next row after the one on screen — computed from the same
   * pending list, skipping the submission being graded. After a save
   * the queue refetch (the modal's post-save invalidation drops the
   * graded row, so this stays honest even mid-refetch. */
  const nextTarget = gradeTarget
    ? pending.find((p) => p.submissionId !== gradeTarget.submissionId) ?? null
    : null;

  return (
    <div className="page">
      <PageHeader
        title="الواجبات والاختبارات"
        subtitle="كلّ الواجبات الموزَّعة على مقرّراتك، والتسليمات بانتظار تقييمك."
        actions={(
          /* r144 (T1-h F1): the teaching loop's missing authoring half —
           * the copy used to promise «ستظهر هنا فور إنشاء أيّ واجب» with
           * no creation affordance anywhere in the product. */
          <button type="button" className="btn primary" onClick={() => setCreating(true)}>
            <Icon icon={ClipboardList} size={15} /> واجب جديد
          </button>
        )}
      />

      <NeedsReviewCard
        pending={pending}
        isPending={pendingQ.isPending}
        isError={pendingQ.isError}
        error={pendingQ.error}
        onRetry={() => pendingQ.refetch()}
        dueFor={dueFor}
        onGrade={(target) => setGradeTarget(target)}
      />

      <Card title="جميع الواجبات" icon={ClipboardList}>
        {q.isPending ? (
          <ListSkeleton rows={5} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState title="لا توجد واجبات بعد" description="أنشئ أول واجب بزر «واجب جديد» بالأعلى — سيظهر لطلاب المقرّر فوراً." illustration="empty-search" />
        ) : (
          <div className="flex-col gap-2">
            {q.data.map((a) => {
              const ratio = a.enrolled > 0 ? a.submissions / a.enrolled : 0;
              const tone: 'green' | 'amber' | 'red' = ratio > 0.5 ? 'green' : ratio > 0.25 ? 'amber' : 'red';
              /* 5-B6 (A7 «assignments 7.5 → 9»): the due chip carries its
               * own tone so a teacher scanning the list reads urgency
               * without parsing relative dates — overdue red, ≤3 days
               * amber, beyond green. The full date rides the title
               * attribute (P3-2 parity with the exam attempts). */
              const days = Math.round((new Date(a.dueAt).getTime() - Date.now()) / 86400000);
              const dueTone: 'green' | 'amber' | 'red' = days < 0 ? 'red' : days <= 3 ? 'amber' : 'green';
              return (
                <div key={a.id} className="list-row">
                  <div className="list-row-body">
                    <div className="list-row-title">
                      {ASSIGNMENT_KIND_LABEL[a.type] ?? <bdi>{a.type}</bdi>}: {a.title}
                    </div>
                    <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>{a.course.name} · <bdi>{a.course.code}</bdi></span>
                      {/* Grading context travels with the row — the same
                          ceiling the modal enforces, visible up front. */}
                      <span>الدرجة من <bdi className="font-mono">{a.maxScore}</bdi></span>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center" style={{ flexShrink: 0 }}>
                    {/* The due chip carries its own tone (A7 «assignments
                        7.5 → 9»): overdue red, ≤3 days amber, beyond
                        green — urgency readable without parsing relative
                        dates. The full date rides the title (P3-2). */}
                    <span title={formatDateTimeAr(a.dueAt)}>
                      <Badge color={dueTone}>{formatDue(a.dueAt)}</Badge>
                    </span>
                    {/* LTR fraction order stays stable inside the RTL line;
                        the counted noun follows the numerator (1/few/many).
                        P2-1 (5-A7): the zero case names the reality —
                        countAr(0) renders the broken «0 تسليماً». */}
                    <span className="text-xs font-mono text-muted" title="التسليمات مقابل المسجّلين">
                      <bdi>{a.submissions} / {a.enrolled}</bdi>{' '}
                      {a.submissions === 0 ? 'لا تسليمات بعد' : countAr(a.submissions, ['تسليم', 'تسليمان', 'تسليمات', 'تسليماً'])}
                    </span>
                    <Badge color={tone}>{Math.round(ratio * 100)}%</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {gradeTarget && (
        /* Keyed by submission: «تقييم التالي» swaps the target and the
         * fresh draft + done state remount with it — a graded-then-next
         * flow never inherits the previous row's score box. */
        <GradeSubmissionModal
          key={gradeTarget.submissionId}
          target={gradeTarget}
          nextTarget={nextTarget}
          onClose={() => setGradeTarget(null)}
          onNext={() => nextTarget && setGradeTarget(nextTarget)}
        />
      )}

      {creating && <AssignmentFormModal onClose={() => setCreating(false)} />}
    </div>
  );
}

interface GradeTarget {
  submissionId: string;
  studentName: string;
  assignmentTitle: string;
  courseCode?: string;
  maxScore?: number;
  submittedAt: string;
  /** LATE submissions (the queue row's status) — drives the «متأخر» chip
   *  on the row. Never folded into assignmentTitle: groupPending keys
   *  by title. */
  late: boolean;
  /** 5-B6 (audit 5-A7 P1-2): the student's answer, carried by the
   *  queue row (the backend projects textAnswer + fileUrl). */
  textAnswer?: string | null;
  fileUrl?: string | null;
}

/** r157 / 6A8 — the pending-queue row → GradeTarget mapping. The
 * dedicated queue endpoint ships the assignment's title/maxScore (and
 * course code) as real fields, so the old feed-path hacks — the
 * "s-" prefix strip and the «سلّم / سلّم/ت» title strip the maxScore
 * lookup needed — are gone: the queue row IS the target. Exported for
 * the unit suite. */
export function queueToPending(rows: PendingSubmissionRow[]): GradeTarget[] {
  return rows.map((r) => ({
    submissionId: r.id,
    studentName: `${r.student.firstName} ${r.student.lastName}`,
    assignmentTitle: r.assignment.title,
    courseCode: r.assignment.offering.course.code,
    maxScore: r.assignment.maxScore,
    submittedAt: r.submittedAt,
    late: r.status === 'LATE',
    textAnswer: r.textAnswer,
    fileUrl: r.fileUrl,
  }));
}

/* ─── Pending submissions awaiting grading ───────────────── */

/** One assignment's pending rows — the queue groups by assignment so 30
 *  pending submissions read as a handful of groups (A7 plan item 4),
 *  each carrying its own grading ceiling + due date. */
interface QueueGroup {
  key: string;
  assignmentTitle: string;
  courseCode?: string;
  maxScore?: number;
  /** The assignment's dueAt (ISO) — the group header renders the
   * relative due copy (VLM residue 5-B6). */
  dueAt?: string;
  rows: GradeTarget[];
}

function groupPending(pending: GradeTarget[], dueFor: (title: string, courseCode?: string) => string | undefined): QueueGroup[] {
  const groups: QueueGroup[] = [];
  for (const p of pending) {
    const key = `${p.assignmentTitle}·${p.courseCode ?? ''}`;
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.rows.push(p);
      existing.maxScore = existing.maxScore ?? p.maxScore;
    } else {
      groups.push({
        key,
        assignmentTitle: p.assignmentTitle,
        courseCode: p.courseCode,
        maxScore: p.maxScore,
        dueAt: dueFor(p.assignmentTitle, p.courseCode),
        rows: [p],
      });
    }
  }
  return groups;
}

function NeedsReviewCard({
  pending,
  isPending,
  isError,
  error,
  onRetry,
  dueFor,
  onGrade,
}: {
  pending: GradeTarget[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  dueFor: (title: string, courseCode?: string) => string | undefined;
  onGrade: (target: GradeTarget) => void;
}) {
  const groups = useMemo(() => groupPending(pending, dueFor), [pending, dueFor]);

  return (
    <Card
      title="تسليمات بانتظار التقييم"
      icon={ClipboardCheck}
      /* P2-1: countAr(0) renders the broken «0 تسليماً…» — the zero case
       * gets its own honest copy (the dashboard-badge pattern). */
      subtitle={
        pending.length === 0
          ? 'لا تسليمات بانتظار درجتك'
          : countAr(pending.length, ['تسليم واحد بانتظار درجتك', 'تسليمان بانتظار درجتك', 'تسليمات بانتظار درجتك', 'تسليماً بانتظار درجتك'])
      }
    >
      {isPending ? (
        <ListSkeleton rows={3} />
      ) : isError ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : pending.length === 0 ? (
        <EmptyState
          title="لا توجد تسليمات بانتظار التقييم"
          illustration="empty-search"
          description="ستظهر هنا تسليمات طلابك فور وصولها."
        />
      ) : (
        <div className="flex-col gap-3">
          {groups.map((g) => (
            <div key={g.key} className="queue-group">
              <div className="queue-group-head">
                <div className="queue-group-main">
                  <div className="queue-group-title">{g.assignmentTitle}</div>
                  {(g.courseCode || g.dueAt) && (
                    <div className="queue-group-sub">
                      {g.courseCode && <bdi>{g.courseCode}</bdi>}
                      {g.dueAt && (
                        <>
                          {g.courseCode ? ' · ' : ''}
                          <span title={formatDateTimeAr(g.dueAt)}>يستحقّ {formatDue(g.dueAt)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                {g.maxScore !== undefined && (
                  <Badge>الدرجة من <bdi className="font-mono">{g.maxScore}</bdi></Badge>
                )}
                <Badge color="amber">
                  {countAr(g.rows.length, ['تسليم واحد', 'تسليمان', 'تسليمات', 'تسليماً'])}
                </Badge>
              </div>
              <div className="flex-col gap-2">
                {g.rows.map((p) => (
                  <div key={p.submissionId} className="list-row">
                    <UserAvatar
                      initials={p.studentName.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('')}
                      size={32}
                    />
                    <div className="list-row-body">
                      <div className="list-row-title" style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>{p.studentName}</span>
                        {/* 18-G's late flag — a small warning chip beside the
                            name, never a suffix inside the assignment title
                            (maxScore matches the stripped title). */}
                        {p.late && <Badge color="amber">متأخر</Badge>}
                      </div>
                      <div className="list-row-sub" title={formatDateTimeAr(p.submittedAt)}>
                        وصل {formatRelativeArShort(p.submittedAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => onGrade(p)}
                    >
                      <Icon icon={Send} size={12} /> تقييم
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ─── Teacher grading modal (grade + feedback) ──────────── */

/** The student's file, linked the way the research flow links papers:
 *  platform-served files open the in-app /document/ viewer (annotations
 *  included); external https URLs open in a new tab. */
function SubmissionFileLink({ fileUrl, assignmentTitle }: { fileUrl: string; assignmentTitle: string }) {
  if (fileUrl.startsWith('/api/v1/files/papers/')) {
    return (
      <Link
        to={`/document/${encodeURIComponent(fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(assignmentTitle)}&back=${encodeURIComponent('/teacher/assignments')}`}
        className="btn outline sm"
      >
        <Icon icon={FileText} size={13} />
        فتح الملف في العارض
      </Link>
    );
  }
  return (
    <a href={fileUrl} target="_blank" rel="noreferrer" className="btn outline sm">
      <Icon icon={ExternalLink} size={13} />
      فتح الملف الخارجي
    </a>
  );
}

function GradeSubmissionModal({
  target,
  nextTarget,
  onClose,
  onNext,
}: {
  target: GradeTarget;
  /** The next pending submission after this one — powers «تقييم التالي»
   *  (A7 P2-2): 30 submissions ≈ 30 saves, not 30 × save+close+hunt. */
  nextTarget: GradeTarget | null;
  onClose: () => void;
  onNext: () => void;
}) {
  const grade = useGradeSubmission(target.submissionId);
  const qc = useQueryClient();
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  /* «تقييم التالي» grabs focus when the done state renders — after a
   * save the teacher's Enter key walks straight into the next
   * submission (the whole queue is gradeable without the mouse).
   * Imperative (not the autofocus attribute) so jsdom and every
   * browser behave the same. */
  const nextBtnRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (done) nextBtnRef.current?.focus();
  }, [done]);

  // 15-e P1-6: the score + up-to-2000-char feedback is the teacher's
  // longest unsaved prose — Esc / close X / cancel / overlay-click now
  // route through the shared discard guard (the same one the curriculum
  // builders use) instead of silently dropping the draft. Once the save
  // lands the draft is no longer unsaved — closing is free.
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !done && (score !== '' || feedback !== ''),
    pending: grade.isPending,
    onClose,
  });

  const onSubmit = async () => {
    const value = Number(score);
    if (score.trim() === '' || Number.isNaN(value)) {
      setValidationError('أدخل درجة صحيحة.');
      return;
    }
    if (value < 0) {
      setValidationError('لا يمكن أن تكون الدرجة سالبة.');
      return;
    }
    if (target.maxScore !== undefined && value > target.maxScore) {
      setValidationError(`الدرجة يجب ألّا تتجاوز ${target.maxScore}.`);
      return;
    }
    setValidationError(null);
    try {
      await grade.mutateAsync({
        grade: value,
        feedback: feedback.trim() || undefined,
      });
      // r157 / 6A8: useGradeSubmission refreshes the dashboards — but the
      // QUEUE this page now renders is its own query key. Drop the graded
      // row from ['teacher','me','pending-submissions'] so «تقييم التالي»
      // and the NeedsReviewCard counts stay honest immediately.
      void qc.invalidateQueries({ queryKey: ['teacher', 'me', 'pending-submissions'] });
      setDone(true);
      toast.success('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.', { title: 'تمّ التقييم' });
    } catch {
      // surfaced inline from grade.isError below
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel={`تقييم تسليم ${target.assignmentTitle}`}
      closeOnOverlayClick={!grade.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">تقييم التسليم</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={grade.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      {/* A7 P2-2: a real <form> — Enter in the score field submits the
          grade (the GradeAttemptModal contract; this was the only
          grading/authoring modal without one). */}
      <form
        onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
        noValidate
      >
        <div className="modal-body">
          <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{target.assignmentTitle}</div>
          <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-4)' }} title={formatDateTimeAr(target.submittedAt)}>
            {target.studentName}
            {target.courseCode ? <> · <bdi>{target.courseCode}</bdi></> : null} · وصل {formatRelativeArShort(target.submittedAt)}
          </div>

          {/* A7 P1-2 — the answer the teacher is grading. Carried by the
              queue row (see GradeTarget); a submission always has at
              least one of textAnswer/fileUrl server-side, so an absent
              pair means a legacy payload, not an empty answer. */}
          {(target.textAnswer != null && target.textAnswer !== '') || target.fileUrl != null ? (
            <div className="grade-answer">
              <div className="grade-answer-head">
                <Icon icon={FileText} size={13} />
                <span>إجابة الطالب</span>
              </div>
              {target.textAnswer != null && target.textAnswer !== '' && (
                <p className="grade-answer-text">{target.textAnswer}</p>
              )}
              {target.fileUrl != null && (
                <SubmissionFileLink fileUrl={target.fileUrl} assignmentTitle={target.assignmentTitle} />
              )}
            </div>
          ) : null}

          {done ? (
            <div className="form-feedback ok" role="status">
              <Icon icon={CheckCircle2} size={15} />
              <span className="flex-1">تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.</span>
            </div>
          ) : (
            <>
              {/* 23-b (21-b hand-off, A9 P2-4): the two grade-modal fields
                  ride the shared FormField primitive — the label is
                  htmlFor-wired and the validation error now injects
                  aria-invalid + aria-describedby into the control itself
                  (announced on re-focus, not only via the role=alert),
                  instead of the hand-rolled label + loose alert <p>. */}
              <FormField
                label={`الدرجة${target.maxScore !== undefined ? ` (من 0 إلى ${target.maxScore})` : ''}`}
                error={validationError}
              >
                <input
                  type="number"
                  className="input input-narrow"
                  placeholder={target.maxScore !== undefined ? `0 – ${target.maxScore}` : '0'}
                  min={0}
                  max={target.maxScore}
                  step="any"
                  inputMode="decimal"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  disabled={grade.isPending}
                />
              </FormField>

              <FormField label="ملاحظات للطالب (اختياري)">
                <textarea
                  className="input"
                  rows={4}
                  placeholder="اكتب ملاحظاتك على الإجابة…"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={grade.isPending}
                  maxLength={2000}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </FormField>

              {grade.isError && (
                <p role="alert" className="text-xs text-red" style={{ marginBlockStart: 'var(--sp-2)' }}>
                  {apiErrorMessage(grade.error, 'تعذَّر حفظ الدرجة — حاول مرة أخرى.')}
                </p>
              )}
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={grade.isPending}>
            {done ? 'إغلاق' : 'إلغاء'}
          </button>
          {done ? (
            nextTarget && (
              <button type="button" className="btn primary" onClick={onNext} ref={nextBtnRef}>
                <Icon icon={Send} size={13} /> تقييم التالي
              </button>
            )
          ) : (
            <button
              type="submit"
              className="btn primary"
              disabled={grade.isPending}
            >
              {grade.isPending ? 'جارٍ الحفظ…' : 'حفظ الدرجة'}
            </button>
          )}
        </div>
      </form>
      {guard}
    </Modal>
  );
}


/* ── Messages (r170a inbox) — r171a shared extraction ──────────
 *
 * The inbox (rows, unread sweep, pagination) and the compose/reply
 * lifecycle (validation, send, toast, error mapping) moved verbatim to
 * the role-agnostic components/messages/ pair so the STUDENT side
 * could ship the same full loop — students previously received DMs
 * with no inbox at all (notification link:null). This file keeps every
 * exported name the route table and the unit suites use: MessagesPage
 * (a thin wrapper now) + the pure helpers re-exported below. The
 * teacher-specific half — the offering selector and its roster
 * optgroup — rides renderCompose/extraFields into the shared modal. */

/* Re-exports keep every existing import site (the route table's lazy
 * wrapper, the unit suites) working unchanged. */
export {
  isUnreadIncoming,
  MESSAGE_MAX_CHARS,
  validateMessageDraft,
  sendErrorMessage,
  collectCorrespondents,
} from '../../components/messages/MessagesInbox';

/** The teacher compose shell: the offering selector + its roster
 * optgroup (the only real student pool a teacher can call — see the
 * RECIPIENT SCOPE note in MessagesInbox). The offering selector feeds
 * the student optgroup only; it starts empty so useTeacherStudents
 * stays disabled (enabled: !!offeringId) until the teacher actually
 * picks a course — no roster fetch on a plain reply. */
function TeacherMessageCompose({
  preset,
  correspondents,
  onClose,
}: {
  preset: { id: string; name: string } | null;
  correspondents: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [offeringId, setOfferingId] = useState('');
  const offsQ = useTeacherOfferings();
  const offerings = offsQ.data ?? [];
  const rosterQ = useTeacherStudents(offeringId || undefined);
  const roster = rosterQ.data ?? [];
  const offeringLabel = offerings.find((o) => o.id === offeringId)?.course.name;

  /* The roster's loading/error states ride the recipient select as
   * disabled options — exactly the r170a modal's rows. */
  const statusOptions = [
    ...(rosterQ.isPending ? ['جارٍ تحميل طلاب المقرّر…'] : []),
    ...(rosterQ.isError ? ['تعذَّر تحميل طلاب المقرّر'] : []),
  ];

  return (
    <MessageComposeModal
      presetRecipient={preset}
      correspondents={correspondents}
      recipientGroups={roster.length > 0 ? [{
        label: offeringLabel ? `طلاب ${offeringLabel}` : 'طلاب المقرّر',
        options: roster.map((s) => ({ id: s.studentId, name: s.name, detail: s.universityId })),
      }] : undefined}
      statusOptions={statusOptions}
      noRecipientsHint="لا يوجد مستلمون متاحون بعد — اختر مقرّراً لطلابه، أو انتظر رسالة واردة تردّ عليها."
      extraDirty={preset ? false : offeringId !== ''}
      extraFields={offerings.length > 0 && !preset ? ({ sendPending }) => (
        <FormField
          label="المقرّر (لاختيار أحد طلابك)"
          hint="اختر مقرّراً لدرج أسماء طلابه ضمن قائمة المستلمين — أو راسِل من سبق أن راسلك."
        >
          <select
            className="input"
            value={offeringId}
            onChange={(e) => setOfferingId(e.target.value)}
            disabled={sendPending}
          >
            <option value="">— بدون مقرّر —</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
            ))}
          </select>
        </FormField>
      ) : undefined}
      onClose={onClose}
    />
  );
}

export function MessagesPage() {
  return (
    <MessagesInbox
      title="صندوق الرسائل"
      subtitle="كل رسالة وصلتك أو أرسلتها عبر المنصّة — أنشئ رسالة جديدة أو ردّ على الواردة منها، والمستلمون المتاحون هم طلاب مقرّراتك ومن راسلتك سابقاً."
      renderCompose={(args) => <TeacherMessageCompose {...args} />}
    />
  );
}
