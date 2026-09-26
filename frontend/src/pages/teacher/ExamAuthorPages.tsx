/**
 * Unified exam authoring — 18-F1 (audits 15-d P1-4 / 15-a P1-8, D16-1)
 * + the manual-grading surface 18-F2 built on top of it.
 *
 * The backend exam-authoring surface (question bank, templates, publish
 * gate, moderation) shipped with zero interface; the read hooks existed
 * dead in useResources.ts. This page makes them live:
 *
 *   /teacher/exams              hub — my templates · question bank ·
 *                               (capability-gated) moderation queue
 *   /teacher/exams/:templateId  template detail — questions, answer key
 *                               (author/oversight only, per the backend's
 *                               canSeeAnswers gate), publish action,
 *                               moderation review for EXAMS_MODERATE,
 *                               «التصحيح» attempts section for the
 *                               offering teacher / template author —
 *                               the SUBMITTED→GRADED half of the exam
 *                               lifecycle (18-F1 hand-off #3)
 *
 * Capability honesty: authoring affordances render only for
 * EXAMS_AUTHOR holders, moderation only for EXAMS_MODERATE holders
 * (useMyPermissions) — a holder of neither sees the honest
 * PermissionDeniedState, and a pure moderator lands on the queue tab.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Archive, BadgeCheck, Ban, BookOpen, CheckCircle2,
  ChevronRight, ClipboardCheck, Clock, FileQuestion, FileText, Hourglass, Info,
  ListChecks, Plus, Search, Send, ShieldCheck, Target, Trash2, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, Card, Input, MetricCard, Tabs } from '../../components/primitives';
import type { ThemeColor } from '../../components/primitives';
import {
  DetailSkeleton, EmptyState, ErrorState, ListSkeleton, LoadingState,
  PermissionDeniedState,
} from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { Modal } from '../../components/overlays/Modal';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { ToggleSwitch } from '../../components/owner/ToggleSwitch';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { useAuthStore } from '../../stores/auth.store';
import type { AppRole } from '../../stores/auth.store';
import { toast } from '../../lib/toast';
import { countAr, formatDateTimeAr, formatRelativeArShort } from '../../lib/format';
import {
  useMyPermissions, useQuestionBank, useQuestionCategories, useExamTemplates,
  useExamTemplate, useExamModerationQueue, useModerateExam, useCreateQuestion,
  useCreateExamTemplate, usePublishExamTemplate, useModerateQuestion,
  useTeacherOfferings, useFaculties, useExamAttempts, useGradeExamAttempt,
  apiErrorMessage,
  type QType, type Difficulty, type ExamKindFE, type ExamStatusFE,
  type QuestionRow, type ExamTemplateRow, type ExamAttemptRow,
  type ExamAttemptStatusFE, type ExamTemplateDetail, type PendingExamAnswer,
  type CreateQuestionInput, type CreateExamTemplateInput,
} from '../../hooks/useResources';
import '../../styles/owner.css'; // ConfirmDialog + ToggleSwitch surfaces (D11 css split, 12-15)
import '../../styles/training.css'; // shared .back-link family (D11 css split, 12-15)

/* ═══════════════ Label maps (TS-pinned over the full enums — 15-a) ═══════════════ */

const QTYPE_LABEL: Record<QType, string> = {
  MCQ: 'اختيار من متعدد',
  TRUE_FALSE: 'صح أم خطأ',
  SHORT: 'إجابة قصيرة',
  ESSAY: 'سؤال مقالي',
};
/* Type chips stay neutral (the moderation rows' kind-badge grammar); the
 * semantic color budget belongs to difficulty + status, so adjacent chips
 * never blur. */

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  EASY: 'سهل',
  MEDIUM: 'متوسط',
  HARD: 'صعب',
};
const DIFFICULTY_COLOR: Record<Difficulty, ThemeColor> = {
  EASY: 'green',
  MEDIUM: 'amber',
  HARD: 'red',
};

/* Byte-identical to the taker's KIND_LABEL (OnlineExamsPages) — one name
 * per exam kind across author and taker surfaces (D17-1). */
const KIND_LABEL: Record<ExamKindFE, string> = {
  QUIZ: 'اختبار قصير',
  MIDTERM: 'نصفي',
  FINAL: 'نهائي',
  PRACTICE: 'تدريبي',
};

/* Every ExamStatus value is mapped — DRAFT and CLOSED are never written
 * today (15-a P2-1) but the Record stays exhaustive so a future writer
 * can never render a raw enum (P1-8's "no status display surface"). */
export const EXAM_STATUS_LABEL: Record<ExamStatusFE, string> = {
  DRAFT: 'مسودة',
  PENDING_REVIEW: 'بانتظار المراجعة',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض',
  PUBLISHED: 'منشور',
  CLOSED: 'مُغلق',
};
const EXAM_STATUS_COLOR: Record<ExamStatusFE, ThemeColor> = {
  DRAFT: 'purple',
  PENDING_REVIEW: 'amber',
  APPROVED: 'green',
  REJECTED: 'red',
  PUBLISHED: 'brand',
  CLOSED: 'purple',
};
const EXAM_STATUS_ICON: Record<ExamStatusFE, LucideIcon> = {
  DRAFT: FileText,
  PENDING_REVIEW: Hourglass,
  APPROVED: BadgeCheck,
  REJECTED: Ban,
  PUBLISHED: Send,
  CLOSED: Archive,
};

/* Every AttemptStatus of a grading-surface attempt row — exhaustive over
 * the wire enum (18-F2), so a raw status can never reach the DOM. */
const ATTEMPT_STATUS_LABEL: Record<ExamAttemptStatusFE, string> = {
  IN_PROGRESS: 'قيد الأداء',
  SUBMITTED: 'بانتظار التصحيح',
  GRADED: 'مُصحَّحة',
  EXPIRED: 'منتهية بانتهاء الوقت',
};
const ATTEMPT_STATUS_COLOR: Record<ExamAttemptStatusFE, ThemeColor> = {
  IN_PROGRESS: 'purple',
  // The actionable state — amber + the pending-answers count in the row
  // keep «بانتظار التصحيح» the loudest chip on the surface.
  SUBMITTED: 'amber',
  GRADED: 'green',
  EXPIRED: 'red',
};

/** Client mirror of the attempts endpoint's authorization (the backend
 *  decideAttemptsAccess + role door): render the grading section only
 *  where the gate can pass — QUALITY never passes the door (it moderates
 *  templates, never student answers), a keyless (faculty/general)
 *  template belongs to its author, and offering-scoped ones to the
 *  offering's teacher (ADMIN/OWNER oversight passes server-side through
 *  the caps check). Pure — pinned by the unit suite. */
export function canViewTemplateAttempts(
  template: Pick<ExamTemplateDetail, 'authorId' | 'offeringId' | 'offering'>,
  viewer: { id: string; role: AppRole } | null | undefined,
): boolean {
  if (!viewer) return false;
  if (viewer.role === 'STUDENT' || viewer.role === 'QUALITY') return false;
  if (template.offering) {
    return viewer.role === 'ADMIN' || viewer.role === 'OWNER' || template.offering.teacherId === viewer.id;
  }
  return viewer.role === 'OWNER' || template.authorId === viewer.id;
}

function TemplateStatusBadge({ status }: { status: ExamStatusFE }) {
  return (
    <Badge color={EXAM_STATUS_COLOR[status]} icon={EXAM_STATUS_ICON[status]}>
      {EXAM_STATUS_LABEL[status]}
    </Badge>
  );
}

/* ═══════════════ Pure helpers (exported for the unit suite) ═══════════════ */

/** Split a comma-separated tags input into the wire's string[] — trimmed,
 *  empties dropped, duplicates collapsed (each ≤ 40 chars is validated
 *  separately; the backend caps the array at 8). Both the Latin and the
 *  Arabic comma separate — an Arabic keyboard's default is ،. */
export function normalizeTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(/[,،]/)) {
    const t = part.trim();
    if (t !== '') seen.add(t);
  }
  return [...seen];
}

export interface QuestionDraftState {
  categoryId: string;
  type: QType;
  prompt: string;
  choices: string[];
  correctIndex: number | null;
  modelAnswer: string;
  rubric: string;
  points: string;
  difficulty: Difficulty;
  tagsRaw: string;
}

export type QuestionDraftErrors = Partial<
  Record<'categoryId' | 'prompt' | 'choices' | 'correct' | 'modelAnswer' | 'points' | 'tags', string>
>;

/** Client mirror of the backend's createQuestionSchema superRefine — the
 *  answer key's shape must match the question type (an MCQ keyed without
 *  an index silently graded every student wrong). */
export function validateQuestionDraft(d: QuestionDraftState): QuestionDraftErrors {
  const errors: QuestionDraftErrors = {};
  if (!d.categoryId) errors.categoryId = 'اختر تصنيف السؤال.';
  const prompt = d.prompt.trim();
  if (prompt.length < 5) errors.prompt = 'نص السؤال قصير جداً — 5 أحرف على الأقل.';
  else if (prompt.length > 2000) errors.prompt = 'نص السؤال طويل — الحد 2000 حرف.';
  if (d.type === 'MCQ' || d.type === 'TRUE_FALSE') {
    if (d.choices.some((c) => c.trim() === '')) errors.choices = 'أكمل نص كل الخيارات.';
    else if (d.choices.length < 2) errors.choices = 'خياران على الأقل.';
    else if (d.type === 'TRUE_FALSE' && d.choices.length !== 2) {
      errors.choices = 'سؤال صح أم خطأ له خياران بالضبط.';
    } else if (d.choices.length > 20) errors.choices = 'الحد 20 خياراً.';
    if (d.correctIndex === null || d.correctIndex < 0 || d.correctIndex >= d.choices.length) {
      errors.correct = 'حدِّد الإجابة الصحيحة قبل الحفظ.';
    }
  } else if (d.type === 'SHORT') {
    if (d.modelAnswer.trim() === '') {
      errors.modelAnswer = 'الإجابة القصيرة تحتاج إجابة نموذجية للتصحيح الآلي.';
    }
  }
  const pts = Number(d.points);
  if (d.points.trim() === '' || !Number.isInteger(pts) || pts < 1 || pts > 20) {
    errors.points = 'النقاط عدد صحيح بين 1 و 20.';
  }
  const tags = normalizeTags(d.tagsRaw);
  if (tags.length > 8) errors.tags = 'الحد 8 وسوم.';
  else if (tags.some((t) => t.length > 40)) errors.tags = 'كل وسم حتى 40 حرفاً.';
  return errors;
}

/** Build the POST /question-bank body from a validated draft — carries
 *  only the type-specific answer-key dimension. */
export function buildCreateQuestionInput(d: QuestionDraftState): CreateQuestionInput {
  const input: CreateQuestionInput = {
    categoryId: d.categoryId,
    type: d.type,
    prompt: d.prompt.trim(),
    difficulty: d.difficulty,
    points: Number(d.points),
    tags: normalizeTags(d.tagsRaw),
  };
  if (d.type === 'MCQ' || d.type === 'TRUE_FALSE') {
    input.choices = d.choices.map((c) => c.trim());
    input.correctAnswer = d.correctIndex ?? 0;
  } else if (d.type === 'SHORT') {
    input.correctAnswer = d.modelAnswer.trim();
  } else if (d.type === 'ESSAY' && d.rubric.trim() !== '') {
    input.correctAnswer = d.rubric.trim();
  }
  return input;
}

export interface TemplateDraftState {
  title: string;
  kind: ExamKindFE;
  description: string;
  durationMin: string;
  passingScore: string;
  randomized: boolean;
  scope: 'offering' | 'faculty' | 'general';
  offeringId: string;
  facultyId: string;
  openAt: string;
  closeAt: string;
  questionIds: ReadonlySet<string>;
}

export type TemplateDraftErrors = Partial<
  Record<'title' | 'scope' | 'durationMin' | 'passingScore' | 'questionIds' | 'window', string>
>;

/** Client mirror of createTemplateSchema — title 3..200, duration 5..480,
 *  passingScore 0..100, 1..60 distinct questions, closeAt strictly after
 *  openAt. */
export function validateTemplateDraft(d: TemplateDraftState): TemplateDraftErrors {
  const errors: TemplateDraftErrors = {};
  const title = d.title.trim();
  if (title.length < 3) errors.title = 'العنوان قصير — 3 أحرف على الأقل.';
  else if (title.length > 200) errors.title = 'العنوان طويل — الحد 200 حرف.';
  if (d.scope === 'offering' && !d.offeringId) errors.scope = 'اختر المقرّر الذي يُخصَّص له الاختبار.';
  if (d.scope === 'faculty' && !d.facultyId) errors.scope = 'اختر الكلّيّة التي يُخصَّص لها الاختبار.';
  const dur = Number(d.durationMin);
  if (d.durationMin.trim() === '' || !Number.isInteger(dur) || dur < 5 || dur > 480) {
    errors.durationMin = 'المدة عدد صحيح بين 5 و 480 دقيقة.';
  }
  const pass = Number(d.passingScore);
  if (d.passingScore.trim() === '' || !Number.isInteger(pass) || pass < 0 || pass > 100) {
    errors.passingScore = 'درجة النجاح نسبة صحيحة بين 0 و 100.';
  }
  if (d.questionIds.size < 1) errors.questionIds = 'اختر سؤالاً واحداً على الأقل من البنك.';
  else if (d.questionIds.size > 60) errors.questionIds = 'الحد 60 سؤالاً في القالب الواحد.';
  if (d.openAt !== '' && d.closeAt !== '') {
    const open = new Date(d.openAt).getTime();
    const close = new Date(d.closeAt).getTime();
    if (!Number.isNaN(open) && !Number.isNaN(close) && close <= open) {
      errors.window = 'موعد الإغلاق يجب أن يكون بعد موعد الفتح.';
    }
  }
  return errors;
}

/** Live sum of the picked questions' points — the builder's running
 *  total (pointsOverride only exists on saved template rows, never at
 *  build time). */
export function selectedPointsTotal(bank: readonly QuestionRow[], selected: ReadonlySet<string>): number {
  let sum = 0;
  for (const q of bank) {
    if (selected.has(q.id)) sum += q.points;
  }
  return sum;
}

/** Human sentence for a question's answer key, per type — or null when
 *  the viewer wasn't served the key (backend nulls it for non-authors)
 *  or the key's shape doesn't render. Legacy numeric-string MCQ keys are
 *  coerced exactly like the backend's grader (mcqKeyIndex). */
export function answerKeySummary(q: {
  type: QType;
  choices: string[] | null;
  correctAnswer: string | number | boolean | null;
}): string | null {
  if (q.correctAnswer === null || q.correctAnswer === undefined) return null;
  if (q.type === 'MCQ' || q.type === 'TRUE_FALSE') {
    if (typeof q.correctAnswer === 'boolean') return null;
    const idx = typeof q.correctAnswer === 'number' ? q.correctAnswer : Number(q.correctAnswer);
    if (!Number.isInteger(idx) || idx < 0) return null;
    const choice = q.choices?.[idx];
    return choice !== undefined ? `الإجابة الصحيحة: ${choice}` : null;
  }
  if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim() !== '') {
    return q.type === 'SHORT' ? `الإجابة النموذجية: ${q.correctAnswer}` : `معيار التصحيح: ${q.correctAnswer}`;
  }
  return null;
}

/* ═══════════════ Hub — /teacher/exams ═══════════════ */

type HubTab = 'templates' | 'bank' | 'moderation';

export default function ExamAuthoringPage() {
  const perms = useMyPermissions();
  const [tab, setTab] = useState<HubTab>('templates');
  const [building, setBuilding] = useState(false);

  const canAuthor = perms.data?.capabilities.includes('EXAMS_AUTHOR') ?? false;
  const canModerate = perms.data?.capabilities.includes('EXAMS_MODERATE') ?? false;

  const tabs = useMemo<Array<{ value: HubTab; label: string }>>(() => [
    ...(canAuthor
      ? [
          { value: 'templates' as const, label: 'قوالب اختباراتي' },
          { value: 'bank' as const, label: 'بنك الأسئلة' },
        ]
      : []),
    ...(canModerate ? [{ value: 'moderation' as const, label: 'مراجعة الجودة' }] : []),
  ], [canAuthor, canModerate]);
  // A pure moderator (no EXAMS_AUTHOR) never sees the authoring tabs —
  // their default lands on the queue instead of a permission wall. The
  // empty-tabs pass (permissions still loading) falls back to the default
  // tab; the render below never shows tabs before the capability resolve.
  const active: HubTab =
    tabs.length === 0
      ? 'templates'
      : tabs.some((t) => t.value === tab)
        ? tab
        : tabs[0]!.value;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">بنك الأسئلة والاختبارات</h1>
          <p className="page-subtitle">
            تأليف الأسئلة وبناء قوالب الاختبارات الموحَّدة، ومتابعة اعتمادها من الجودة حتى النشر.
          </p>
        </div>
        {canAuthor && (
          <Button variant="primary" onClick={() => setBuilding(true)}>
            <Icon icon={Plus} size={14} /> قالب اختبار جديد
          </Button>
        )}
      </header>

      {perms.isPending ? (
        <LoadingState label="جارٍ التحقق من صلاحياتك…" />
      ) : perms.isError ? (
        <ErrorState
          message="تعذَّر التحقق من صلاحياتك"
          error={perms.error}
          onRetry={() => perms.refetch()}
        />
      ) : !canAuthor && !canModerate ? (
        /* Honest wall — authoring and moderation are capability grants,
           not role defaults for every teacher. */
        <PermissionDeniedBlock />
      ) : (
        <>
          <Tabs<HubTab> value={active} onChange={setTab} items={tabs} />
          {active === 'templates' && <MyTemplatesSection onBuild={() => setBuilding(true)} />}
          {active === 'bank' && <QuestionBankSection />}
          {active === 'moderation' && <ModerationQueueSection />}
        </>
      )}

      {building && <TemplateBuilderModal onClose={() => setBuilding(false)} />}
    </div>
  );
}

function PermissionDeniedBlock() {
  const navigate = useNavigate();
  return (
    <PermissionDeniedState
      title="صلاحية التأليف غير مفعَّلة لحسابك"
      detail="إنشاء الأسئلة وقوالب الاختبارات يتطلب صلاحية «إنشاء اختبارات» — تواصل مع إدارة المنصة لمنحها."
      onBack={() => navigate('/teacher/dashboard')}
    />
  );
}

/* ═══════════════ My templates tab ═══════════════ */

function MyTemplatesSection({ onBuild }: { onBuild: () => void }) {
  const q = useExamTemplates();

  return (
    <Card
      title="قوالب اختباراتي"
      icon={FileText}
      subtitle={
        q.isPending
          ? 'جارٍ التحميل…'
          : q.data && q.data.length > 0
            ? countAr(q.data.length, ['قالب واحد', 'قالبان', 'قوالب', 'قالباً'])
            : undefined
      }
    >
      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState message="تعذَّر تحميل قوالبك" error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="لم تُنشئ قوالب اختبارات بعد"
          description="ابدأ ببناء قالب من أسئلة البنك المعتمدة، ثم أرسله لمراجعة الجودة ونشره لطلابك."
          action={
            <Button variant="primary" onClick={onBuild}>
              <Icon icon={Plus} size={14} /> قالب اختبار جديد
            </Button>
          }
        />
      ) : (
        <div className="flex-col gap-2">
          {q.data.map((t) => (
            <TemplateRow key={t.id} template={t} />
          ))}
        </div>
      )}
    </Card>
  );
}

function TemplateRow({ template }: { template: ExamTemplateRow }) {
  // A6 P3 (22-a): one label for the general scope everywhere — the row
  // used to say «عام» while the detail said «عام — كل الكلّيّات».
  const GENERAL_SCOPE = 'عام — كل الكلّيّات';
  const scope = template.offering
    ? `${template.offering.course.name} · ${template.offering.course.code}`
    : template.faculty
      ? `كلّيّة ${template.faculty.name}`
      : GENERAL_SCOPE;
  return (
    <div className="list-row">
      <div className="list-row-body">
        <div className="list-row-title" title={template.title}>{template.title}</div>
        <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge color="purple">{KIND_LABEL[template.kind]}</Badge>
          <TemplateStatusBadge status={template.status} />
          <span>{scope}</span>
          <span>
            {countAr(template._count.questions, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])} ·{' '}
            {countAr(template.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])}
          </span>
          {template._count.attempts > 0 && (
            <span>{countAr(template._count.attempts, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])}</span>
          )}
        </div>
        {template.status === 'REJECTED' && (
          <p className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
            رفضته الجودة — افتح القالب للاطلاع على الملاحظات، ثم أنشئ قالباً بديلاً يعالجها.
          </p>
        )}
      </div>
      <div className="flex gap-2" style={{ flexShrink: 0 }}>
        <Link className="btn ghost sm" to={`/teacher/exams/${template.id}`}>
          عرض
        </Link>
        <PublishButton template={template} />
      </div>
    </div>
  );
}

/* ═══════════════ Publish gate (APPROVED-only, irreversible) ═══════════════ */

function PublishButton({
  template,
  authorId,
}: {
  template: Pick<ExamTemplateRow, 'id' | 'status'>;
  /** Present on the detail surface — hides the button for a non-author
   *  viewing someone else's APPROVED template (the backend would 403). */
  authorId?: string;
}) {
  const publish = usePublishExamTemplate();
  const [confirming, setConfirming] = useState(false);
  const meId = useAuthStore((s) => s.user?.id);
  const perms = useMyPermissions();
  const canAuthor = perms.data?.capabilities.includes('EXAMS_AUTHOR') ?? false;

  // The backend gate: publish requires APPROVED + authorship. The button
  // renders only where the gate can pass — anywhere else it would be a
  // permanent dead control (a disabled button with no future).
  if (!canAuthor || template.status !== 'APPROVED') return null;
  if (authorId !== undefined && authorId !== meId) return null;

  const onPublish = async () => {
    try {
      await publish.mutateAsync(template.id);
      setConfirming(false);
      toast.success('أصبح الاختبار متاحاً للطلاب حسب نطاقه.', { title: 'تمّ نشر الاختبار' });
    } catch {
      setConfirming(false);
      // surfaced inline below — the backend's Arabic conflict message
      // (a rejection landing mid-flight) renders verbatim.
    }
  };

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => setConfirming(true)}
        /* A6 P3 (22-a): the tooltip names the consequence — the old
           «النشر متاح بعد اعتماد الجودة» was stale on an APPROVED
           row, where publishing is exactly what is available. */
        title="النشر يعرض الاختبار للطلاب حسب نطاقه ولا يمكن التراجع عنه"
      >
        <Icon icon={Send} size={12} /> نشر
      </Button>
      {publish.isError && (
        <span role="alert" className="text-xs" style={{ color: 'var(--danger-ink)', alignSelf: 'center' }}>
          {apiErrorMessage(publish.error, 'تعذَّر النشر — حاول مرة أخرى.')}
        </span>
      )}
      <ConfirmDialog
        open={confirming}
        title="نشر الاختبار"
        message="بعد النشر يظهر الاختبار للطلاب حسب نطاقه (المقرّر أو الكلّيّة) ولا يمكن سحبه من هذه الصفحة. هل تريد النشر الآن؟"
        confirmLabel="نشر نهائي"
        onConfirm={onPublish}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/* ═══════════════ Question bank tab ═══════════════ */

/* A6 P2 (22-a + 23-b): the bank filter row (hub) and the picker filter
 * row (builder modal) are sibling surfaces — they used to carry eight
 * drifting inline magic-number widths (280/200/160/140 vs
 * 220/150/130/120). Both rows now consume the shared `.filter-bar`
 * class whose scoped `--w-input-filter-*` tokens own the width budget
 * (components.css, 23-b): the hub renders the boxed toolbar, the
 * picker nests inside the already-boxed "أسئلة القالب" section so it
 * takes the chrome-less `.filter-bar.flush` variant. */

function QuestionBankSection() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'' | QType>('');
  const [difficulty, setDifficulty] = useState<'' | Difficulty>('');

  // Debounce the search input — wait 250ms of idle typing before firing
  // (the shared LibraryPage pattern).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const categories = useQuestionCategories();
  const bank = useQuestionBank({
    categoryId: categoryId || undefined,
    difficulty: difficulty || undefined,
    type: type || undefined,
    q: debouncedQ || undefined,
  });
  const [creating, setCreating] = useState(false);

  const filtered = categoryId !== '' || type !== '' || difficulty !== '' || debouncedQ !== '';

  return (
    <Card
      title="بنك الأسئلة المعتمدة"
      icon={FileQuestion}
      subtitle="الأسئلة التي اعتمدتها الجودة وتصلح لبناء القوالب — إنشاء سؤال جديد يمرّ على المراجعة أولاً."
      actions={
        <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
          <Icon icon={Plus} size={13} /> سؤال جديد
        </Button>
      }
    >
      <div
        className="filter-bar"
        role="group"
        aria-label="تصفية بنك الأسئلة"
        style={{ marginBlockEnd: 'var(--sp-4)' }}
      >
        <div className="topbar-search">
          <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
          <input
            type="text"
            placeholder="ابحث في نص الأسئلة…"
            aria-label="البحث في بنك الأسئلة"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input"
          aria-label="تصفية حسب التصنيف"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">كل التصنيفات</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label="تصفية حسب نوع السؤال"
          value={type}
          onChange={(e) => setType(e.target.value as '' | QType)}
        >
          <option value="">كل الأنواع</option>
          {(Object.keys(QTYPE_LABEL) as QType[]).map((t) => (
            <option key={t} value={t}>{QTYPE_LABEL[t]}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label="تصفية حسب مستوى الصعوبة"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as '' | Difficulty)}
        >
          <option value="">كل المستويات</option>
          {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
            <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
          ))}
        </select>
      </div>

      {bank.isPending ? (
        <ListSkeleton rows={5} />
      ) : bank.isError ? (
        <ErrorState message="تعذَّر تحميل بنك الأسئلة" error={bank.error} onRetry={() => bank.refetch()} />
      ) : !bank.data || bank.data.length === 0 ? (
        <EmptyState
          icon={filtered ? Search : FileQuestion}
          title={filtered ? 'لا توجد أسئلة تطابق التصفية' : 'البنك فارغ حتى الآن'}
          description={
            filtered
              ? 'جرّب كلمات بحث مختلفة أو أزل بعض عوامل التصفية.'
              : 'أنشئ أول سؤال — بعد اعتماده من الجودة سيظهر هنا ويصبح متاحاً للقوالب.'
          }
          action={
            !filtered ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                <Icon icon={Plus} size={14} /> سؤال جديد
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex-col gap-2">
          {bank.data.map((question) => (
            <QuestionBankRow key={question.id} question={question} />
          ))}
        </div>
      )}

      {creating && <CreateQuestionModal onClose={() => setCreating(false)} />}
    </Card>
  );
}

function QuestionBankRow({ question }: { question: QuestionRow }) {
  return (
    <div className="list-row">
      <div className="list-row-body">
        <div className="list-row-title" title={question.prompt}>{question.prompt}</div>
        <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge>{QTYPE_LABEL[question.type]}</Badge>
          <Badge color={DIFFICULTY_COLOR[question.difficulty]}>{DIFFICULTY_LABEL[question.difficulty]}</Badge>
          <span className="flex gap-1 items-center">
            <EmojiIcon emoji={question.category.iconEmoji ?? '📚'} size={13} />
            {question.category.title}
          </span>
          <span>{countAr(question.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}</span>
          {question.tags.length > 0 && <span>· {question.tags.join('، ')}</span>}
        </div>
      </div>
      {/* The listing only serves approved questions (isApproved filter in
          the route) — the chip states the pool's invariant, priming the
          "only approved questions enter templates" model. */}
      <Badge color="green" icon={BadgeCheck}>معتمد</Badge>
    </div>
  );
}

/* ═══════════════ Create-question modal ═══════════════ */

const TF_CHOICES = ['صح', 'خطأ'];

function CreateQuestionModal({ onClose }: { onClose: () => void }) {
  const categories = useQuestionCategories();
  const create = useCreateQuestion();

  const [draft, setDraft] = useState<QuestionDraftState>({
    categoryId: '',
    type: 'MCQ',
    prompt: '',
    choices: ['', ''],
    correctIndex: null,
    modelAnswer: '',
    rubric: '',
    points: '1',
    difficulty: 'MEDIUM',
    tagsRaw: '',
  });
  const [errors, setErrors] = useState<QuestionDraftErrors>({});
  const [done, setDone] = useState(false);

  const patch = (p: Partial<QuestionDraftState>) => setDraft((d) => ({ ...d, ...p }));

  // TRUE_FALSE is exactly two choices — switching into it resets to the
  // canonical صح/خطأ pair; switching back to MCQ starts from two blank
  // slots (the صح/خطأ pair is not a meaningful MCQ starting point). In
  // both directions a correct-index that no longer points anywhere is
  // dropped rather than silently re-aimed.
  const onTypeChange = (type: QType) => {
    setDraft((d) => ({
      ...d,
      type,
      choices:
        type === 'TRUE_FALSE'
          ? [...TF_CHOICES]
          : d.type === 'TRUE_FALSE'
            ? ['', '']
            : d.choices.length >= 2
              ? d.choices
              : ['', ''],
      correctIndex: type === 'TRUE_FALSE' && d.correctIndex !== null && d.correctIndex < 2 ? d.correctIndex : null,
    }));
    setErrors({});
  };

  const removeChoice = (index: number) => {
    setDraft((d) => {
      const choices = d.choices.filter((_, i) => i !== index);
      // Keep the correct-answer mark honest when an earlier option
      // disappears (the CheckpointBuilder rule): shift, or reset it.
      let correctIndex = d.correctIndex;
      if (correctIndex !== null) {
        if (index < correctIndex) correctIndex -= 1;
        else if (index === correctIndex) correctIndex = null;
      }
      return { ...d, choices, correctIndex };
    });
  };

  // Longest unsaved prose of the flow — Esc / X / cancel / overlay-click
  // all route through the shared discard guard while dirty.
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !done && (draft.prompt !== '' || draft.correctIndex !== null || draft.modelAnswer !== '' || draft.rubric !== '' || draft.tagsRaw !== '' || draft.categoryId !== ''),
    pending: create.isPending,
    onClose,
  });

  const onSubmit = async () => {
    const found = validateQuestionDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await create.mutateAsync(buildCreateQuestionInput(draft));
      setDone(true);
    } catch {
      /* surfaced inline from create.isError */
    }
  };

  const categoriesEmpty = !categories.isPending && (categories.data?.length ?? 0) === 0;

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="سؤال جديد"
      closeOnOverlayClick={!create.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">سؤال جديد</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={create.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        {done ? (
          <div className="form-feedback ok" role="status">
            <Icon icon={CheckCircle2} size={15} />
            <span className="flex-1">
              أُرسل السؤال إلى مراجعة الجودة — سيظهر في البنك ويصبح متاحاً للقوالب بعد الاعتماد.
            </span>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}
          >
            <Field label="تصنيف السؤال" htmlFor="newq-category" error={errors.categoryId}>
              <select
                id="newq-category"
                className="input"
                value={draft.categoryId}
                aria-invalid={!!errors.categoryId}
                onChange={(e) => patch({ categoryId: e.target.value })}
                disabled={categories.isPending || categoriesEmpty}
              >
                {categories.isPending ? (
                  <option value="">جارٍ التحميل…</option>
                ) : categoriesEmpty ? (
                  <option value="">لا توجد تصنيفات بعد</option>
                ) : (
                  <>
                    <option value="">اختر تصنيفاً…</option>
                    {categories.data?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}{c.department ? ` — ${c.department.name}` : ''}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {categoriesEmpty && (
                <span className="text-xs text-muted">تصنيفات الأسئلة تنشئها إدارة المنصة — تواصل معهم لإضافتها.</span>
              )}
            </Field>

            <Field label="نوع السؤال" htmlFor="newq-type" hint="النوع يحدد شكل الإجابة وطريقة التصحيح">
              <select
                id="newq-type"
                className="input"
                value={draft.type}
                onChange={(e) => onTypeChange(e.target.value as QType)}
              >
                {(Object.keys(QTYPE_LABEL) as QType[]).map((t) => (
                  <option key={t} value={t}>{QTYPE_LABEL[t]}</option>
                ))}
              </select>
            </Field>

            <Field label="نص السؤال" htmlFor="newq-prompt" error={errors.prompt}>
              <textarea
                id="newq-prompt"
                className="input"
                rows={3}
                maxLength={2000}
                placeholder="اكتب نص السؤال كما سيظهر للطالب…"
                aria-invalid={!!errors.prompt}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.prompt}
                onChange={(e) => patch({ prompt: e.target.value })}
              />
            </Field>

            {(draft.type === 'MCQ' || draft.type === 'TRUE_FALSE') && (
              <ChoicesEditor
                draft={draft}
                patch={patch}
                removeChoice={removeChoice}
                choicesError={errors.choices}
                correctError={errors.correct}
              />
            )}

            {draft.type === 'SHORT' && (
              <Field
                label="الإجابة النموذجية"
                htmlFor="newq-model"
                error={errors.modelAnswer}
                hint="تُصحَّح إجابة الطالب آلياً بمطابقتها مع هذا النص"
              >
                <Input
                  id="newq-model"
                  value={draft.modelAnswer}
                  error={!!errors.modelAnswer}
                  placeholder="مثال: بروتوكول التحكم بالنقل"
                  onChange={(e) => patch({ modelAnswer: e.target.value })}
                />
              </Field>
            )}

            {draft.type === 'ESSAY' && (
              <Field
                label="معيار التصحيح (اختياري)"
                htmlFor="newq-rubric"
                hint="الأسئلة المقالية تُصحَّح يدوياً — يظهر المعيار للمصحح"
              >
                <textarea
                  id="newq-rubric"
                  className="input"
                  rows={3}
                  maxLength={2000}
                  placeholder="مثال: يذكر الطالب ثلاث خصائص مع شرح موجز لكل منها…"
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                  value={draft.rubric}
                  onChange={(e) => patch({ rubric: e.target.value })}
                />
              </Field>
            )}

            <div className="flex gap-3 flex-wrap">
              <Field label="النقاط" htmlFor="newq-points" error={errors.points}>
                <Input
                  id="newq-points"
                  type="number"
                  className="input-narrow"
                  min={1}
                  max={20}
                  step={1}
                  inputMode="numeric"
                  dir="ltr"
                  value={draft.points}
                  error={!!errors.points}
                  aria-invalid={!!errors.points}
                  onChange={(e) => patch({ points: e.target.value })}
                />
              </Field>
              <Field label="الصعوبة" htmlFor="newq-difficulty">
                <select
                  id="newq-difficulty"
                  className="input"
                  value={draft.difficulty}
                  onChange={(e) => patch({ difficulty: e.target.value as Difficulty })}
                >
                  {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
                    <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="وسوم (اختياري)" htmlFor="newq-tags" error={errors.tags} hint="افصل بين الوسوم بفاصلة">
              <Input
                id="newq-tags"
                value={draft.tagsRaw}
                error={!!errors.tags}
                placeholder="شبكات، أساسيات"
                onChange={(e) => patch({ tagsRaw: e.target.value })}
              />
            </Field>

            {create.isError && (
              <p role="alert" className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
                {apiErrorMessage(create.error, 'تعذَّر حفظ السؤال — تحقّق من البيانات وحاول مرة أخرى.')}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--rule)' }}>
              <Button variant="ghost" onClick={requestClose} disabled={create.isPending}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" loading={create.isPending}>
                حفظ السؤال
              </Button>
            </div>
          </form>
        )}
      </div>
      {guard}
    </Modal>
  );
}

/** Labelled field scaffold — the modal-body rhythm the curriculum
 *  builders use (FormField), reading the platform's form-label class. */
function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 140 }}>
      <label className="form-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <span className="text-xs text-muted" style={{ margin: 0 }}>{hint}</span>}
      {error && (
        <span role="alert" className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

/** MCQ / TRUE_FALSE choices editor — a radio per option marks the
 *  correct answer (the CheckpointBuilder grammar, adapted to the
 *  question-bank wire: correctAnswer is an index into choices). */
function ChoicesEditor({
  draft,
  patch,
  removeChoice,
  choicesError,
  correctError,
}: {
  draft: QuestionDraftState;
  patch: (p: Partial<QuestionDraftState>) => void;
  removeChoice: (index: number) => void;
  choicesError?: string;
  correctError?: string;
}) {
  const isTF = draft.type === 'TRUE_FALSE';
  const optionsLabel = `${isTF ? 'الخياران' : `الخيارات (${draft.choices.length}/20)`}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="form-label">{optionsLabel}</span>
      <div role="group" aria-label={optionsLabel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {draft.choices.map((choice, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
            <label
              className="text-xs"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <input
                type="radio"
                name="newq-correct"
                checked={draft.correctIndex === index}
                onChange={() => patch({ correctIndex: index })}
                aria-label={`تعيين الخيار ${index + 1} إجابةً صحيحة`}
              />
              صحيحة
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Input
                type="text"
                aria-label={`نص الخيار ${index + 1}`}
                placeholder={`الخيار ${index + 1}`}
                value={choice}
                onChange={(e) => {
                  const choices = draft.choices.map((c, i) => (i === index ? e.target.value : c));
                  patch({ choices });
                }}
              />
            </div>
            {!isTF && (
              <button
                type="button"
                className="btn ghost sm"
                style={{ marginTop: 8, color: 'var(--danger)' }}
                disabled={draft.choices.length <= 2}
                onClick={() => removeChoice(index)}
                aria-label={`إزالة الخيار ${index + 1}`}
                title={draft.choices.length <= 2 ? 'خياران على الأقل' : undefined}
              >
                <Icon icon={Trash2} size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
      {(choicesError || correctError) && (
        <span role="alert" className="text-xs" style={{ color: 'var(--danger-ink)' }}>
          {correctError ?? choicesError}
        </span>
      )}
      {!isTF && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            disabled={draft.choices.length >= 20}
            onClick={() => patch({ choices: [...draft.choices, ''] })}
          >
            <Icon icon={Plus} size={12} /> إضافة خيار
          </Button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════ Template builder modal ═══════════════ */

function TemplateBuilderModal({ onClose }: { onClose: () => void }) {
  const create = useCreateExamTemplate();
  const offerings = useTeacherOfferings();
  const faculties = useFaculties();

  const [draft, setDraft] = useState<TemplateDraftState>({
    title: '',
    kind: 'QUIZ',
    description: '',
    durationMin: '45',
    passingScore: '50',
    randomized: true,
    scope: 'offering',
    offeringId: '',
    facultyId: '',
    openAt: '',
    closeAt: '',
    questionIds: new Set<string>(),
  });
  const [errors, setErrors] = useState<TemplateDraftErrors>({});
  const [done, setDone] = useState(false);

  const patch = (p: Partial<TemplateDraftState>) => setDraft((d) => ({ ...d, ...p }));

  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !done && (draft.title !== '' || draft.description !== '' || draft.questionIds.size > 0),
    pending: create.isPending,
    onClose,
  });

  const onSubmit = async () => {
    const found = validateTemplateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const input: CreateExamTemplateInput = {
      title: draft.title.trim(),
      kind: draft.kind,
      description: draft.description.trim() || undefined,
      durationMin: Number(draft.durationMin),
      passingScore: Number(draft.passingScore),
      randomized: draft.randomized,
      questionIds: [...draft.questionIds],
      ...(draft.scope === 'offering' && draft.offeringId ? { offeringId: draft.offeringId } : {}),
      ...(draft.scope === 'faculty' && draft.facultyId ? { facultyId: draft.facultyId } : {}),
      ...(draft.openAt ? { openAt: new Date(draft.openAt).toISOString() } : {}),
      ...(draft.closeAt ? { closeAt: new Date(draft.closeAt).toISOString() } : {}),
    };
    try {
      await create.mutateAsync(input);
      setDone(true);
    } catch {
      /* surfaced inline from create.isError */
    }
  };

  const offeringsEmpty = !offerings.isPending && (offerings.data?.length ?? 0) === 0;

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="قالب اختبار جديد"
      closeOnOverlayClick={!create.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">قالب اختبار جديد</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={create.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        {done ? (
          <div className="form-feedback ok" role="status">
            <Icon icon={CheckCircle2} size={15} />
            <span className="flex-1">
              أُرسل القالب إلى مراجعة الجودة — بعد الاعتماد يصبح زر النشر متاحاً في قوالبك.
            </span>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}
          >
            <Field label="عنوان القالب" htmlFor="tpl-title" error={errors.title}>
              <Input
                id="tpl-title"
                value={draft.title}
                error={!!errors.title}
                maxLength={200}
                placeholder="مثال: اختبار نصفي — الشبكات"
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>

            <div className="flex gap-3 flex-wrap">
              <Field label="نوع الاختبار" htmlFor="tpl-kind">
                <select
                  id="tpl-kind"
                  className="input"
                  value={draft.kind}
                  onChange={(e) => patch({ kind: e.target.value as ExamKindFE })}
                >
                  {(Object.keys(KIND_LABEL) as ExamKindFE[]).map((k) => (
                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                  ))}
                </select>
              </Field>
              <Field label="النطاق" htmlFor="tpl-scope" error={errors.scope}>
                <select
                  id="tpl-scope"
                  className="input"
                  value={draft.scope}
                  aria-invalid={!!errors.scope}
                  onChange={(e) => patch({ scope: e.target.value as TemplateDraftState['scope'] })}
                >
                  <option value="offering">مقرّر من مقرّراتي</option>
                  <option value="faculty">كلّيّة محدَّدة</option>
                  <option value="general">عام (كل الكلّيّات)</option>
                </select>
              </Field>
            </div>

            {draft.scope === 'offering' && (
              <Field
                label="المقرّر"
                htmlFor="tpl-offering"
                error={errors.scope}
                hint={offeringsEmpty ? 'لا مقرّرات مسندة إليك هذا الفصل — اختر نطاقاً آخر.' : undefined}
              >
                <select
                  id="tpl-offering"
                  className="input"
                  value={draft.offeringId}
                  disabled={offerings.isPending || offeringsEmpty}
                  onChange={(e) => patch({ offeringId: e.target.value })}
                >
                  {offerings.isPending ? (
                    <option value="">جارٍ التحميل…</option>
                  ) : offeringsEmpty ? (
                    <option value="">لا مقرّرات بعد</option>
                  ) : (
                    <>
                      <option value="">اختر المقرّر…</option>
                      {offerings.data?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {`${o.course.name} — ${o.course.code} · ${o.term}`}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </Field>
            )}

            {draft.scope === 'faculty' && (
              <Field label="الكلّيّة" htmlFor="tpl-faculty" error={errors.scope}>
                <select
                  id="tpl-faculty"
                  className="input"
                  value={draft.facultyId}
                  disabled={faculties.isPending}
                  onChange={(e) => patch({ facultyId: e.target.value })}
                >
                  {faculties.isPending ? (
                    <option value="">جارٍ التحميل…</option>
                  ) : (
                    <>
                      <option value="">اختر الكلّيّة…</option>
                      {faculties.data?.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </>
                  )}
                </select>
              </Field>
            )}

            <div className="flex gap-3 flex-wrap">
              <Field label="المدة (بالدقائق)" htmlFor="tpl-duration" error={errors.durationMin} hint="بين 5 و 480 دقيقة">
                <Input
                  id="tpl-duration"
                  type="number"
                  className="input-narrow"
                  min={5}
                  max={480}
                  step={1}
                  inputMode="numeric"
                  dir="ltr"
                  value={draft.durationMin}
                  error={!!errors.durationMin}
                  aria-invalid={!!errors.durationMin}
                  onChange={(e) => patch({ durationMin: e.target.value })}
                />
              </Field>
              <Field label="درجة النجاح (%)" htmlFor="tpl-pass" error={errors.passingScore} hint="نسبة من مجموع النقاط">
                <Input
                  id="tpl-pass"
                  type="number"
                  className="input-narrow"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  dir="ltr"
                  value={draft.passingScore}
                  error={!!errors.passingScore}
                  aria-invalid={!!errors.passingScore}
                  onChange={(e) => patch({ passingScore: e.target.value })}
                />
              </Field>
            </div>

            <ToggleSwitch
              label="ترتيب عشوائي للأسئلة"
              description="يُخلط ترتيب الأسئلة لكل طالب عند بدء الاختبار"
              checked={draft.randomized}
              onChange={(randomized) => patch({ randomized })}
            />

            <div className="flex gap-3 flex-wrap">
              {/* A6 P2 (22-a): the datetime-local field renders in the
                  browser's locale (en-US → mm/dd/yyyy) inside this Arabic
                  modal. The hint names the native calendar as the safe
                  path; once a value is picked it becomes an Arabic echo
                  the author can verify against (datetime-local values
                  carry no offset — the echo is the same local time). */}
              <Field
                label="يفتح في (اختياري)"
                htmlFor="tpl-open"
                hint={draft.openAt
                  ? `المحدَّد: ${formatDateTimeAr(draft.openAt)}`
                  : 'اختر من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'}
              >
                <input
                  id="tpl-open"
                  type="datetime-local"
                  className="input"
                  dir="ltr"
                  value={draft.openAt}
                  onChange={(e) => patch({ openAt: e.target.value })}
                />
              </Field>
              <Field
                label="يغلق في (اختياري)"
                htmlFor="tpl-close"
                hint={draft.closeAt
                  ? `المحدَّد: ${formatDateTimeAr(draft.closeAt)}`
                  : 'اختر من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'}
              >
                <input
                  id="tpl-close"
                  type="datetime-local"
                  className="input"
                  dir="ltr"
                  value={draft.closeAt}
                  onChange={(e) => patch({ closeAt: e.target.value })}
                />
              </Field>
            </div>
            {errors.window && (
              <p role="alert" className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
                {errors.window}
              </p>
            )}

            <Field label="وصف (اختياري)" htmlFor="tpl-desc" hint="يظهر للطالب قبل بدء الاختبار">
              <textarea
                id="tpl-desc"
                className="input"
                rows={2}
                maxLength={2000}
                placeholder="تعليمات مختصرة لطلابك…"
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            <QuestionPicker draft={draft} patch={patch} error={errors.questionIds} />

            {create.isError && (
              <p role="alert" className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
                {apiErrorMessage(create.error, 'تعذَّر إنشاء القالب — تحقّق من البيانات وحاول مرة أخرى.')}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--rule)' }}>
              <Button variant="ghost" onClick={requestClose} disabled={create.isPending}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" loading={create.isPending}>
                إنشاء القالب
              </Button>
            </div>
          </form>
        )}
      </div>
      {guard}
    </Modal>
  );
}

/* ═══════════════ Question picker (multi-select + live sum) ═══════════════ */

function QuestionPicker({
  draft,
  patch,
  error,
}: {
  draft: TemplateDraftState;
  patch: (p: Partial<TemplateDraftState>) => void;
  error?: string;
}) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [type, setType] = useState<'' | QType>('');
  const [difficulty, setDifficulty] = useState<'' | Difficulty>('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const categories = useQuestionCategories();
  const [categoryId, setCategoryId] = useState('');
  const bank = useQuestionBank({
    categoryId: categoryId || undefined,
    difficulty: difficulty || undefined,
    type: type || undefined,
    q: debouncedQ || undefined,
  });

  const selected = draft.questionIds;
  const points = useMemo(
    () => selectedPointsTotal(bank.data ?? [], selected),
    [bank.data, selected],
  );
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 60) next.add(id);
    patch({ questionIds: next });
  };

  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--sp-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-3)',
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="form-label" style={{ margin: 0 }}>أسئلة القالب</span>
        {/* Live selection state — count + running points total, the two
            numbers the author balances while building. */}
        <span className="text-xs text-muted" role="status">
          {countAr(selected.size, ['سؤال مختار واحد', 'سؤالان مختاران', 'أسئلة مختارة', 'سؤالاً مختاراً'])} من 60 ·{' '}
          {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
        </span>
      </div>

      <div
        className="filter-bar flush"
        role="group"
        aria-label="تصفية أسئلة البنك"
      >
        {/* Same shared `.filter-bar` width budget as the hub's bank
            filter row (the A6 P2 unification) — the flush variant drops
            the toolbar chrome because the picker already lives inside
            the boxed «أسئلة القالب» section. */}
        <div className="topbar-search">
          <span className="topbar-search-icon"><Icon icon={Search} size={13} /></span>
          <input
            type="text"
            placeholder="ابحث…"
            aria-label="البحث في أسئلة البنك"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="input"
          aria-label="تصفية أسئلة البنك حسب التصنيف"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">كل التصنيفات</option>
          {categories.data?.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label="تصفية أسئلة البنك حسب النوع"
          value={type}
          onChange={(e) => setType(e.target.value as '' | QType)}
        >
          <option value="">كل الأنواع</option>
          {(Object.keys(QTYPE_LABEL) as QType[]).map((t) => (
            <option key={t} value={t}>{QTYPE_LABEL[t]}</option>
          ))}
        </select>
        <select
          className="input"
          aria-label="تصفية أسئلة البنك حسب الصعوبة"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as '' | Difficulty)}
        >
          <option value="">كل المستويات</option>
          {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
            <option key={d} value={d}>{DIFFICULTY_LABEL[d]}</option>
          ))}
        </select>
      </div>

      {bank.isPending ? (
        <ListSkeleton rows={3} />
      ) : bank.isError ? (
        <div className="inline-retry" role="alert">
          <span className="text-sm text-muted">تعذَّر تحميل أسئلة البنك.</span>
          <Button variant="ghost" size="sm" onClick={() => bank.refetch()}>
            <Icon icon={AlertTriangle} size={12} /> إعادة المحاولة
          </Button>
        </div>
      ) : !bank.data || bank.data.length === 0 ? (
        <p className="text-xs text-muted" style={{ margin: 0 }}>
          لا توجد أسئلة معتمدة تطابق البحث — أسئلة جديدة تحتاج اعتماد الجودة أولاً قبل ظهورها هنا.
        </p>
      ) : (
        <div
          role="group"
          aria-label="اختيار أسئلة القالب"
          style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}
        >
          {bank.data.map((question) => {
            const checked = selected.has(question.id);
            return (
              <label
                key={question.id}
                className="list-row"
                style={{ cursor: 'pointer', alignItems: 'flex-start', margin: 0 }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(question.id)}
                  aria-label={`اختيار السؤال: ${question.prompt.slice(0, 60)}`}
                  style={{ marginTop: 4, flexShrink: 0 }}
                />
                <div className="list-row-body">
                  <div className="list-row-title" title={question.prompt}>{question.prompt}</div>
                  <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge>{QTYPE_LABEL[question.type]}</Badge>
                    <Badge color={DIFFICULTY_COLOR[question.difficulty]}>{DIFFICULTY_LABEL[question.difficulty]}</Badge>
                    <span>{question.category.title}</span>
                    <span>{countAr(question.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}</span>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}
      {error && (
        <p role="alert" className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ═══════════════ Moderation queue tab (EXAMS_MODERATE) ═══════════════ */

function ModerationQueueSection() {
  const q = useExamModerationQueue();

  return (
    <Card
      title="قوالب بانتظار المراجعة"
      icon={ShieldCheck}
      subtitle={
        q.isPending
          ? 'جارٍ التحميل…'
          : q.data && q.data.length > 0
            ? countAr(q.data.length, ['قالب واحد بانتظار قرارك', 'قالبان بانتظار قرارك', 'قوالب بانتظار قرارك', 'قالباً بانتظار قرارك'])
            : undefined
      }
    >
      {q.isPending ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState message="تعذَّر تحميل قائمة المراجعة" error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="لا شيء بانتظار المراجعة"
          description="كل قوالب الاختبارات المرسلة اجتازت المراجعة — ستظهر القوالب الجديدة هنا فور إرسالها."
        />
      ) : (
        <div className="flex-col gap-2">
          {q.data.map((item) => (
            <div key={item.id} className="list-row">
              <div className="list-row-body">
                <div className="list-row-title" title={item.title}>{item.title}</div>
                <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Badge color="purple">{KIND_LABEL[item.kind]}</Badge>
                  {item.offering && <Badge color="brand">{item.offering.course.name}</Badge>}
                  <span>
                    {countAr(item._count.questions, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])} ·{' '}
                    {countAr(item.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])}
                  </span>
                  <span>قدّمه: {item.author.firstName} {item.author.lastName}</span>
                </div>
              </div>
              <Link className="btn primary sm" to={`/teacher/exams/${item.id}`}>
                مراجعة
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════ Template detail — /teacher/exams/:templateId ═══════════════ */

export function ExamTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const q = useExamTemplate(templateId);

  return (
    <div className="page">
      <Link to="/teacher/exams" className="back-link">
        <Icon icon={ChevronRight} size={14} />
        بنك الأسئلة والاختبارات
      </Link>
      {q.isPending ? (
        <DetailSkeleton />
      ) : q.isError ? (
        <ErrorState message="تعذَّر تحميل القالب" error={q.error} onRetry={() => q.refetch()} />
      ) : q.data ? (
        <TemplateDetailBody template={q.data} />
      ) : null}
    </div>
  );
}

function TemplateDetailBody({ template }: { template: ExamTemplateDetail }) {
  const perms = useMyPermissions();
  const canModerate = perms.data?.capabilities.includes('EXAMS_MODERATE') ?? false;
  const user = useAuthStore((s) => s.user);
  // The grading section renders only where the attempts endpoint's gate
  // can pass for THIS viewer (the PublishButton rule: never a surface
  // that would permanently error).
  const canGradeHere = canViewTemplateAttempts(template, user);
  const totalPoints = template.questions.reduce(
    (sum, eq) => sum + (eq.pointsOverride ?? eq.question.points),
    0,
  );

  return (
    <>
      <header className="page-header">
        <div className="page-title-block">
          {/* A6 P3 (22-a): 2-line clamp — authored titles run long and
              pushed the whole page down; the full title stays in the
              title attr (and the clamp keeps the first two lines
              readable, not a truncation). */}
          <h1
            className="page-title"
            title={template.title}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            } as React.CSSProperties}
          >
            {template.title}
          </h1>
          <p className="page-subtitle" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge color="purple">{KIND_LABEL[template.kind]}</Badge>
            <TemplateStatusBadge status={template.status} />
            {template.offering ? (
              <span><Icon icon={BookOpen} size={12} /> {template.offering.course.name} · <bdi>{template.offering.course.code}</bdi></span>
            ) : template.faculty ? (
              <span>كلّيّة {template.faculty.name}</span>
            ) : (
              <span>عام — كل الكلّيّات</span>
            )}
          </p>
        </div>
        <PublishButton template={template} authorId={template.authorId} />
      </header>

      {(template.status === 'REJECTED' || template.status === 'PENDING_REVIEW') && template.moderationNote && (
        <p className="text-sm" style={{ margin: 0, color: 'var(--danger-ink)' }} role="note">
          <Icon icon={Info} size={13} /> ملاحظة الجودة: {template.moderationNote}
        </p>
      )}

      <div className="grid-4">
        <MetricCard
          icon={ListChecks}
          label="الأسئلة"
          value={template.questions.length.toString()}
          color="brand"
        />
        <MetricCard
          icon={Clock}
          label="المدة"
          value={countAr(template.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])}
          color="purple"
        />
        <MetricCard
          icon={Target}
          label="مجموع النقاط"
          value={countAr(totalPoints, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
          color="amber"
        />
        <MetricCard
          icon={BadgeCheck}
          label="درجة النجاح"
          value={<bdi>{template.passingScore}%</bdi>}
          color="green"
        />
      </div>

      <Card title="تفاصيل القالب" icon={FileText} compact>
        <div className="flex-col gap-2">
          <DetailLine label="نطاق الاختبار">
            {template.offering ? (
              <>{template.offering.course.name} (<bdi>{template.offering.course.code}</bdi>)</>
            ) : template.faculty ? (
              <>كلّيّة {template.faculty.name}</>
            ) : (
              'عام — كل الكلّيّات'
            )}
          </DetailLine>
          <DetailLine label="ترتيب الأسئلة">
            {template.randomized ? 'عشوائي لكل طالب' : 'ثابت بترتيب الإنشاء'}
          </DetailLine>
          {template.openAt && (
            <DetailLine label="يفتح في">{formatDateTimeAr(template.openAt)}</DetailLine>
          )}
          {template.closeAt && (
            <DetailLine label="يغلق في">{formatDateTimeAr(template.closeAt)}</DetailLine>
          )}
          <DetailLine label="المؤلف">
            {template.author.firstName} {template.author.lastName}
          </DetailLine>
          {template.moderatedBy && (
            <DetailLine label="مراجع الجودة">
              {template.moderatedBy.firstName} {template.moderatedBy.lastName}
            </DetailLine>
          )}
          <DetailLine label="محاولات الطلاب">
            {/* P2-1 (5-A7): countAr(0) renders the broken «0 محاولة» —
                the zero case names the reality. */}
            {template._count.attempts === 0
              ? 'لا محاولات بعد'
              : countAr(template._count.attempts, ['محاولة واحدة', 'محاولتان', 'محاولات', 'محاولة'])}
          </DetailLine>
          {template.description && <DetailLine label="الوصف">{template.description}</DetailLine>}
        </div>
      </Card>

      {canGradeHere && <AttemptsSection template={template} />}

      {canModerate && <TemplateModerationPanel template={template} />}

      <Card
        title="أسئلة القالب"
        icon={ListChecks}
        subtitle={countAr(template.questions.length, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])}
      >
        {template.questions.length === 0 ? (
          <EmptyState
            icon={FileQuestion}
            title="لا أسئلة في هذا القالب"
            description="ربما أُوقفت أسئلته من البنك بعد بنائه."
          />
        ) : (
          <div className="flex-col gap-2">
            {template.questions.map((eq, i) => (
              <TemplateQuestionRow
                key={eq.id}
                order={i + 1}
                row={eq}
                canModerate={canModerate}
              />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    /* A6 P3 (22-a): a dotted leader gives each label/value pair a scan
     * line — the old bare justify-between rows had no rhythm and VLM
     * read the card as noise. Baseline-aligned; long values wrap to
     * their own line (flex-wrap) with the leader shrinking to min. */
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-xs text-muted" style={{ flexShrink: 0 }}>{label}</span>
      <span
        aria-hidden
        style={{
          flex: '1 1 2rem',
          minInlineSize: '1rem',
          borderBottom: '1px dotted var(--border-strong)',
          transform: 'translateY(-0.2em)',
        }}
      />
      <span className="text-sm" style={{ textAlign: 'end' }}>{children}</span>
    </div>
  );
}

/* ═══════════════ Manual grading — «التصحيح» (18-F2) ═══════════════ */

function AttemptsSection({ template }: { template: ExamTemplateDetail }) {
  const q = useExamAttempts(template.id);
  const [onlyPending, setOnlyPending] = useState(false);
  const [grading, setGrading] = useState<ExamAttemptRow | null>(null);

  const attempts = q.data ?? [];
  const awaiting = attempts.filter((a) => a.status === 'SUBMITTED').length;
  const visible = onlyPending ? attempts.filter((a) => a.status === 'SUBMITTED') : attempts;

  return (
    <Card
      title="التصحيح"
      icon={ClipboardCheck}
      subtitle={
        q.isPending
          ? 'جارٍ التحميل…'
          : attempts.length > 0
            ? /* P2-1 (5-A7): awaiting can be 0 while attempts exist —
               * countAr(0) renders the broken «0 محاولة…». */
              (awaiting === 0
                ? 'لا محاولات بانتظار تصحيحك'
                : countAr(awaiting, ['محاولة واحدة بانتظار تصحيحك', 'محاولتان بانتظار تصحيحك', 'محاولات بانتظار تصحيحك', 'محاولة بانتظار تصحيحك']))
            : undefined
      }
      actions={
        attempts.length > 0 ? (
          <label className="flex gap-2 items-center text-xs" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={onlyPending}
              onChange={(e) => setOnlyPending(e.target.checked)}
            />
            بانتظار التصحيح فقط
          </label>
        ) : undefined
      }
    >
      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState message="تعذَّر تحميل المحاولات" error={q.error} onRetry={() => q.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={onlyPending ? ClipboardCheck : FileQuestion}
          title={onlyPending ? 'لا محاولات بانتظار التصحيح' : 'لا محاولات بعد'}
          description={
            onlyPending
              ? 'كل المحاولات المسلَّمة مُصحَّحة — ستظهر المحاولات الجديدة هنا فور تسليمها.'
              : 'يبدأ الطلاب المحاولات من صفحة الاختبارات الخاصة بهم؛ تظهر محاولاتهم هنا لحظة بدئها.'
          }
        />
      ) : (
        <div className="flex-col gap-2">
          {visible.map((a) => (
            <AttemptRow key={a.id} attempt={a} onGrade={() => setGrading(a)} />
          ))}
        </div>
      )}

      {grading && (
        <GradeAttemptModal
          attempt={grading}
          templateTitle={template.title}
          onClose={() => setGrading(null)}
        />
      )}
    </Card>
  );
}

function AttemptRow({ attempt, onGrade }: { attempt: ExamAttemptRow; onGrade: () => void }) {
  const scoreTitle =
    attempt.score === null
      ? 'لم تُحسب الدرجة بعد'
      : `الدرجة الحالية: ${attempt.score} من ${attempt.maxScore}`;
  return (
    <div className="list-row">
      <div className="list-row-body">
        <div className="list-row-title" title={attempt.studentName}>{attempt.studentName}</div>
        <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge color={ATTEMPT_STATUS_COLOR[attempt.status]}>{ATTEMPT_STATUS_LABEL[attempt.status]}</Badge>
          {attempt.submittedAt ? (
            <span title={formatDateTimeAr(attempt.submittedAt)}>
              سلِّمت {formatRelativeArShort(attempt.submittedAt)}
            </span>
          ) : (
            <span title={formatDateTimeAr(attempt.startedAt)}>
              بدأت {formatRelativeArShort(attempt.startedAt)}
            </span>
          )}
          {attempt.status === 'SUBMITTED' && attempt.pendingReview > 0 && (
            <span>
              {countAr(attempt.pendingReview, ['إجابة واحدة بانتظار تقييمك', 'إجابتان بانتظار تقييمك', 'إجابات بانتظار تقييمك', 'إجابة بانتظار تقييمك'])}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 items-center" style={{ flexShrink: 0 }}>
        {/* The machine score so far — the SUBMITTED row's partial truth
            (auto-graded points), never a fabricated verdict. */}
        <span className="text-xs font-mono text-muted" title={scoreTitle}>
          {attempt.score === null ? '—' : <bdi>{attempt.score} / {attempt.maxScore}</bdi>}
        </span>
        {attempt.status === 'SUBMITTED' && (
          <Button variant="primary" size="sm" onClick={onGrade}>
            <Icon icon={ClipboardCheck} size={12} /> تصحيح
          </Button>
        )}
      </div>
    </div>
  );
}

/** One parked answer: prompt, the student's answer, a correct/incorrect
 *  verdict pair (the roll-call att-toggle grammar — pressed states,
 *  focus rings and 44px touch targets come with it) and an optional
 *  feedback note (≤ 2000, the backend's cap). */
function PendingAnswerCard({
  order,
  answer,
  verdict,
  feedback,
  onVerdict,
  onFeedback,
}: {
  order: number;
  answer: PendingExamAnswer;
  verdict: boolean | undefined;
  feedback: string;
  onVerdict: (isCorrect: boolean) => void;
  onFeedback: (value: string) => void;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 'var(--r-md)',
        padding: 'var(--sp-3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-2)',
      }}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="list-row-title" title={answer.prompt} style={{ flex: 1, minWidth: 200 }}>
          <bdi className="font-mono">{order}</bdi> {answer.prompt}
        </div>
        <div className="flex gap-2 items-center" style={{ flexShrink: 0 }}>
          <Badge>{QTYPE_LABEL[answer.type]}</Badge>
          <span className="text-xs text-muted">
            {countAr(answer.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
          </span>
        </div>
      </div>

      <div className="text-sm" style={{
        margin: 0,
        padding: 'var(--sp-2)',
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-sm)',
        whiteSpace: 'pre-wrap',
      }}>
        {answer.studentAnswer !== null ? (
          answer.studentAnswer
        ) : (
          <span className="text-xs" style={{ color: 'var(--warning-ink)' }}>
            لم يكتب الطالب إجابة لهذا السؤال — حكمك يحدد درجته.
          </span>
        )}
      </div>

      <div className="flex gap-1 flex-wrap" role="group" aria-label={`حكم إجابة السؤال ${order}`}>
        <button
          type="button"
          className={`att-toggle${verdict === true ? ' on' : ''}`}
          data-tone="success"
          aria-pressed={verdict === true}
          onClick={() => onVerdict(true)}
        >
          صحيحة
        </button>
        <button
          type="button"
          className={`att-toggle${verdict === false ? ' on' : ''}`}
          data-tone="danger"
          aria-pressed={verdict === false}
          onClick={() => onVerdict(false)}
        >
          خاطئة
        </button>
      </div>

      <textarea
        className="input"
        rows={2}
        maxLength={2000}
        placeholder="ملاحظة للطالب (اختيارية)…"
        aria-label={`ملاحظة على إجابة السؤال ${order}`}
        style={{ resize: 'vertical', fontFamily: 'inherit' }}
        value={feedback}
        onChange={(e) => onFeedback(e.target.value)}
      />
    </div>
  );
}

/** The grading modal: verdict + feedback per parked answer, then the
 *  finalize POST (SUBMITTED → GRADED). Mirrors the backend's
 *  reconcileManualGrades client-side — the submit is blocked until
 *  EVERY parked answer has a verdict. */
function GradeAttemptModal({
  attempt,
  templateTitle,
  onClose,
}: {
  attempt: ExamAttemptRow;
  templateTitle: string;
  onClose: () => void;
}) {
  const grade = useGradeExamAttempt();
  // answerId → verdict (true = correct, false = wrong; undefined = undecided).
  const [verdicts, setVerdicts] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState(false);
  const [done, setDone] = useState<{ score: number; maxScore: number } | null>(null);

  const pending = attempt.pendingAnswers;
  const missing = pending.filter((p) => verdicts[p.answerId] === undefined);
  const dirty =
    Object.keys(verdicts).length > 0 ||
    Object.values(feedback).some((f) => f.trim() !== '');

  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !done && dirty,
    pending: grade.isPending,
    onClose,
  });

  const setVerdict = (answerId: string, isCorrect: boolean) => {
    setVerdicts((v) => ({ ...v, [answerId]: isCorrect }));
    setValidationError(false);
  };

  const onSubmit = async () => {
    // Client mirror of the backend's reconciliation: every pending
    // answer exactly once — an undecided verdict is blocked here, not
    // bounced by a 400.
    if (missing.length > 0) {
      setValidationError(true);
      return;
    }
    setValidationError(false);
    try {
      const result = await grade.mutateAsync({
        attemptId: attempt.id,
        answers: pending.map((p) => {
          const note = (feedback[p.answerId] ?? '').trim();
          return {
            answerId: p.answerId,
            isCorrect: verdicts[p.answerId] === true,
            ...(note !== '' ? { feedback: note } : {}),
          };
        }),
      });
      setDone({ score: result.score, maxScore: result.maxScore });
      toast.success('اعتُمدت الدرجة النهائية للمحاولة.', { title: 'تمّ التصحيح' });
    } catch {
      /* surfaced inline from grade.isError */
    }
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel={`تصحيح محاولة — ${attempt.studentName}`}
      closeOnOverlayClick={!grade.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">تصحيح محاولة — {attempt.studentName}</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={grade.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        {done ? (
          <div className="form-feedback ok" role="status">
            <Icon icon={CheckCircle2} size={15} />
            <span className="flex-1">
              اعتُمدت الدرجة النهائية: <bdi className="font-mono">{done.score} / {done.maxScore}</bdi> — سترى
              المحاولة في القائمة بحالة «{ATTEMPT_STATUS_LABEL.GRADED}».
            </span>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
            noValidate
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}
          >
            <p className="text-sm text-muted" style={{ margin: 0 }}>
              {templateTitle} · الحالة: {ATTEMPT_STATUS_LABEL[attempt.status]}
              {attempt.score !== null && (
                <>
                  {' '}· الدرجة الآلية حتى الآن: <bdi className="font-mono">{attempt.score} / {attempt.maxScore}</bdi>
                </>
              )}
            </p>

            {pending.length === 0 ? (
              <p
                className="text-sm text-muted"
                role="note"
                style={{ margin: 0, display: 'flex', gap: 6, alignItems: 'flex-start' }}
              >
                <Icon icon={Info} size={14} />
                <span>
                  لا إجابات معلّقة في هذه المحاولة (أسئلتها المقالية تركت بلا إجابة) — حفظ التصحيح يعتدّ بالدرجة
                  الآلية كما هي ويُنهي المحاولة.
                </span>
              </p>
            ) : (
              pending.map((p, i) => (
                <PendingAnswerCard
                  key={p.answerId}
                  order={i + 1}
                  answer={p}
                  verdict={verdicts[p.answerId]}
                  feedback={feedback[p.answerId] ?? ''}
                  onVerdict={(isCorrect) => setVerdict(p.answerId, isCorrect)}
                  onFeedback={(value) => setFeedback((f) => ({ ...f, [p.answerId]: value }))}
                />
              ))
            )}

            {validationError && (
              <p role="alert" className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
                حدِّد حكمك — صحيحة أم خاطئة — لكل إجابة معلّقة قبل الحفظ.
              </p>
            )}
            {grade.isError && (
              <p role="alert" className="text-xs" style={{ margin: 0, color: 'var(--danger-ink)' }}>
                {apiErrorMessage(grade.error, 'تعذَّر حفظ التصحيح — تحقّق من اتصالك وحاول مرة أخرى.')}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-2)', paddingTop: 'var(--sp-2)', borderTop: '1px solid var(--rule)' }}>
              <Button variant="ghost" onClick={requestClose} disabled={grade.isPending}>
                إلغاء
              </Button>
              {/* Double-submit guard: isPending locks the submit AND the
                  guarded close, so a verdict can never ride twice. */}
              <Button variant="primary" type="submit" loading={grade.isPending}>
                {pending.length === 0 ? 'اعتماد الدرجة النهائية' : 'حفظ التصحيح واعتماد الدرجة'}
              </Button>
            </div>
          </form>
        )}
      </div>
      {guard}
    </Modal>
  );
}

function TemplateQuestionRow({
  order,
  row,
  canModerate,
}: {
  order: number;
  row: ExamTemplateDetail['questions'][number];
  canModerate: boolean;
}) {
  const q = row.question;
  const points = row.pointsOverride ?? q.points;
  const key = answerKeySummary(q);

  return (
    <div className="list-row" style={{ alignItems: 'flex-start' }}>
      <bdi className="list-row-meta font-mono">{order}</bdi>
      <div className="list-row-body">
        <div className="list-row-title" title={q.prompt}>{q.prompt}</div>
        <div className="list-row-sub" style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge>{QTYPE_LABEL[q.type]}</Badge>
          <Badge color={DIFFICULTY_COLOR[q.difficulty]}>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
          {q.category && <span>{q.category.title}</span>}
          <span>
            {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
            {row.pointsOverride !== null && ' (معدَّلة)'}
          </span>
          {!q.isApproved && <Badge color="red" icon={Ban}>موقوف</Badge>}
        </div>
        {/* Answer key — the backend nulls correctAnswer for every viewer
            it is not for; null renders nothing (never a fake key). */}
        {key && (
          <div className="text-xs" style={{ color: 'var(--success-ink)', marginBlockStart: 2 }}>
            <Icon icon={CheckCircle2} size={11} /> {key}
          </div>
        )}
        {!q.isApproved && q.moderationNote && (
          <div className="text-xs" style={{ color: 'var(--danger-ink)', marginBlockStart: 2 }}>
            <Icon icon={Info} size={11} /> {q.moderationNote}
          </div>
        )}
      </div>
      {canModerate && <QuestionModerationActions questionId={q.id} isApproved={q.isApproved} />}
    </div>
  );
}

/* ═══════════════ Moderation actions (EXAMS_MODERATE) ═══════════════ */

/** Per-question approve/suspend — the question-level moderate endpoint.
 *  Both directions are reversible (moderate again), so no confirm gate;
 *  the note rides only on template-level decisions where the author has
 *  a surface to read it. */
function QuestionModerationActions({ questionId, isApproved }: { questionId: string; isApproved: boolean }) {
  const moderateQ = useModerateQuestion();
  const [failed, setFailed] = useState<{ approve: boolean; error: unknown } | null>(null);

  const run = async (approve: boolean) => {
    setFailed(null);
    try {
      await moderateQ.mutateAsync({ id: questionId, approve });
    } catch (e) {
      setFailed({ approve, error: e });
    }
  };

  return (
    <div className="flex-col gap-1" style={{ flexShrink: 0, alignItems: 'stretch' }}>
      {isApproved ? (
        <Button variant="ghost" size="sm" loading={moderateQ.isPending} onClick={() => void run(false)}>
          <Icon icon={Ban} size={12} /> إيقاف السؤال
        </Button>
      ) : (
        <Button variant="ghost" size="sm" loading={moderateQ.isPending} onClick={() => void run(true)}>
          <Icon icon={BadgeCheck} size={12} /> اعتماد السؤال
        </Button>
      )}
      {failed && (
        <div className="form-error" role="alert">
          <Icon icon={AlertTriangle} size={14} />
          <span className="form-error-msg">{apiErrorMessage(failed.error, 'تعذَّر تنفيذ القرار — حاول مرة أخرى.')}</span>
          <button type="button" className="btn ghost sm" onClick={() => void run(failed.approve)}>
            إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  );
}

/** Template-level decision — approve/reject with an optional note the
 *  author reads on this page (the REJECTED-note surface 15-a P1-8
 *  flagged as invisible). */
function TemplateModerationPanel({ template }: { template: ExamTemplateDetail }) {
  const moderate = useModerateExam();
  const [note, setNote] = useState('');
  // Which decision is in flight / failed — drives button labels + retry.
  const [acting, setActing] = useState<boolean | null>(null);
  const [failed, setFailed] = useState<{ approve: boolean; error: unknown } | null>(null);

  const run = async (approve: boolean) => {
    setFailed(null);
    setActing(approve);
    try {
      await moderate.mutateAsync({ id: template.id, approve, note: note.trim() || undefined });
      setNote('');
    } catch (e) {
      setFailed({ approve, error: e });
    } finally {
      setActing(null);
    }
  };

  return (
    <Card title="قرار المراجعة" icon={ShieldCheck} subtitle={EXAM_STATUS_LABEL[template.status]}>
      {template.status === 'PENDING_REVIEW' ? (
        <>
          <label className="form-label" htmlFor="mod-note">ملاحظة للمؤلف (اختياري)</label>
          <textarea
            id="mod-note"
            className="input"
            rows={2}
            maxLength={500}
            placeholder="تصل الملاحظة للمؤلف مع قرار الاعتماد أو الرفض…"
            aria-label="ملاحظة المراجعة للمؤلف"
            style={{ resize: 'vertical', fontFamily: 'inherit', marginBlockEnd: 'var(--sp-3)' }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              loading={acting === true}
              disabled={acting !== null}
              onClick={() => void run(true)}
            >
              <Icon icon={CheckCircle2} size={13} /> {acting === true ? 'جارٍ الاعتماد…' : 'اعتماد القالب'}
            </Button>
            <Button
              variant="danger"
              loading={acting === false}
              disabled={acting !== null}
              onClick={() => void run(false)}
            >
              <Icon icon={AlertTriangle} size={13} /> {acting === false ? 'جارٍ الرفض…' : 'رفض القالب'}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          حالة القالب: {EXAM_STATUS_LABEL[template.status]} — يمكنك مراجعة أسئلته أدناه وإيقاف أيّ سؤال غير مناسب.
        </p>
      )}
      {failed && (
        <div className="form-error" role="alert" style={{ marginBlockStart: 'var(--sp-3)' }}>
          <Icon icon={AlertTriangle} size={14} />
          <span className="form-error-msg">{apiErrorMessage(failed.error, 'تعذَّر تنفيذ القرار — تحقّق من اتصالك وحاول مرة أخرى.')}</span>
          <button type="button" className="btn ghost sm" onClick={() => void run(failed.approve)}>
            إعادة المحاولة
          </button>
        </div>
      )}
    </Card>
  );
}
