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
 * r170b closes the author dead-end r169-C1 flagged on this detail page
 * (a PENDING_REVIEW/REJECTED template was a read-only wall for its
 * author): the author can now EDIT the safe fields in place (PATCH
 * /exams/templates/:id — an edit after a moderation verdict honestly
 * resets the row to PENDING_REVIEW), CLONE the template (POST
 * /exams/templates/:id/clone — including PUBLISHED sources, the
 * iterate-on-a-live-exam path), and the publish button is VISIBLE with
 * a per-status reason for why it is gated instead of silently
 * vanishing. The two new mutations ride this module over the shared
 * `api` transport (the resources barrel is a frozen boundary this
 * round): same envelope, same ['exams'] invalidation family the
 * sibling hooks use.
 *
 * Capability honesty: authoring affordances render only for
 * EXAMS_AUTHOR holders, moderation only for EXAMS_MODERATE holders
 * (useMyPermissions) — a holder of neither sees the honest
 * PermissionDeniedState, and a pure moderator lands on the queue tab.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, Archive, BadgeCheck, Ban, BookOpen, CheckCircle2,
  ChevronDown, ChevronRight, ClipboardCheck, Copy, FileQuestion, FileText,
  Hourglass, Info, Lock, Pencil, Plus, Search, Send, Trash2, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, Button, FormField, Input, Tabs } from '../../components/primitives';
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
import { api, unwrap } from '../../lib/api';
import {
  useMyPermissions, useQuestionBank, useQuestionCategories, useExamTemplates,
  useExamTemplate, useExamModerationQueue, useModerateExam, useCreateQuestion,
  useCreateExamTemplate, usePublishExamTemplate, useModerateQuestion,
  useTeacherOfferings, useFaculties, useCurrentInstitutionSlug, useExamAttempts, useGradeExamAttempt,
  apiErrorMessage,
  type QType, type Difficulty, type ExamKindFE, type ExamStatusFE,
  type QuestionRow, type ExamTemplateRow, type ExamAttemptRow,
  type ExamAttemptStatusFE, type ExamTemplateDetail, type PendingExamAnswer,
  type CreateQuestionInput, type CreateExamTemplateInput,
} from '../../hooks/useResources';
import '../../styles/owner.css'; // ConfirmDialog + ToggleSwitch surfaces (D11 css split, 12-15)
import '../../styles/training.css'; // shared .back-link family (D11 css split, 12-15)
import '../../styles/teacher-quality.css'; // R304 — the family sheet (exa- section lives here)
import '../../styles/r305-teacher-quality.css'; // R305 — the Heron layer (exa2- section lives here)

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

/* ═══════════════ r170b — author edit/clone: client mirrors + mutations ═══════════════ */

/** PATCH /exams/templates/:id body — mirrors the backend's
 *  updateTemplateSchema. `null` clears the nullable fields
 *  (description / the open-close window); the kind, the scope and the
 *  question set are immutable on the wire (the route's comment owns
 *  the why). */
export interface UpdateExamTemplateInput {
  title?: string;
  description?: string | null;
  durationMin?: number;
  passingScore?: number;
  randomized?: boolean;
  openAt?: string | null;
  closeAt?: string | null;
}

/** Client mirror of the backend's edit gate (ownership +
 *  decideTemplateEdit): the author — or ADMIN/OWNER oversight — may
 *  edit unless the row is locked (PUBLISHED has attempts against it;
 *  CLOSED is terminal). Pinned by the unit suite alongside its
 *  backend twin. */
export function canEditTemplate(
  template: Pick<ExamTemplateDetail, 'authorId' | 'status'>,
  viewer: { id: string; role: AppRole } | null | undefined,
): boolean {
  if (!viewer) return false;
  const isAuthor = template.authorId === viewer.id;
  const isOversight = viewer.role === 'ADMIN' || viewer.role === 'OWNER';
  if (!isAuthor && !isOversight) return false;
  return template.status !== 'PUBLISHED' && template.status !== 'CLOSED';
}

/** Client mirror of decideTemplateCloneAccess — the clone reach equals
 *  the answer-key matrix (the copy hands its questions to the cloner
 *  as the new author, so a clone can never widen key visibility). */
export function canCloneTemplate(
  template: Pick<ExamTemplateDetail, 'authorId'>,
  viewer: { id: string; role: AppRole } | null | undefined,
  hasExamsModerate: boolean,
): boolean {
  if (!viewer) return false;
  if (viewer.role === 'ADMIN' || viewer.role === 'OWNER') return true;
  if (viewer.role === 'TEACHER') return template.authorId === viewer.id;
  if (viewer.role === 'QUALITY') return hasExamsModerate;
  return false;
}

/** Why is publish gated for this status? null = publish is available
 *  (APPROVED — the backend gate is the source of truth; the button
 *  still renders the error verbatim if a rejection lands mid-flight).
 *  The REJECTED branch points at the moderation note the detail header
 *  already renders instead of duplicating up to 500 chars into the
 *  actions row (the field is optional: list rows carry no note, and
 *  they never render the reason — explainGate is detail-only). */
export function publishGateReason(
  template: { status: ExamStatusFE; moderationNote?: string | null },
): string | null {
  switch (template.status) {
    case 'APPROVED':
      return null;
    case 'PENDING_REVIEW':
      return 'بانتظار مراجعة الجودة — يُفتح النشر بعد اعتمادها.';
    case 'REJECTED':
      return template.moderationNote
        ? 'رفضته الجودة — طالِع ملاحظتها أدناه، وعدّل القالب ليعود إلى المراجعة.'
        : 'رفضته الجودة — عدّل القالب ليعود إلى المراجعة.';
    case 'PUBLISHED':
      return 'هذا الاختبار منشور بالفعل.';
    case 'CLOSED':
      return 'هذا الاختبار مُغلق.';
    case 'DRAFT':
      return 'مسودة لم تُرسل إلى مراجعة الجودة بعد.';
  }
}

/** ISO wire value → the `datetime-local` input format (local time, no
 *  offset). The edit modal seeds its window fields from the stored row
 *  — the builder modal only ever builds fresh ones. '' for null. */
export function isoToLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface EditTemplateDraftState {
  title: string;
  description: string;
  durationMin: string;
  passingScore: string;
  randomized: boolean;
  openAt: string;
  closeAt: string;
}

export type EditTemplateDraftErrors = Partial<Record<'title' | 'durationMin' | 'passingScore' | 'window', string>>;

/** Client mirror of updateTemplateSchema's bounds — the same numbers
 *  (and the same Arabic copy) validateTemplateDraft pins for the
 *  builder, minus the fields an edit cannot touch. */
export function validateEditTemplateDraft(d: EditTemplateDraftState): EditTemplateDraftErrors {
  const errors: EditTemplateDraftErrors = {};
  const title = d.title.trim();
  if (title.length < 3) errors.title = 'العنوان قصير — 3 أحرف على الأقل.';
  else if (title.length > 200) errors.title = 'العنوان طويل — الحد 200 حرف.';
  const dur = Number(d.durationMin);
  if (d.durationMin.trim() === '' || !Number.isInteger(dur) || dur < 5 || dur > 480) {
    errors.durationMin = 'المدة عدد صحيح بين 5 و 480 دقيقة.';
  }
  const pass = Number(d.passingScore);
  if (d.passingScore.trim() === '' || !Number.isInteger(pass) || pass < 0 || pass > 100) {
    errors.passingScore = 'درجة النجاح نسبة صحيحة بين 0 و 100.';
  }
  if (d.openAt !== '' && d.closeAt !== '') {
    const open = new Date(d.openAt).getTime();
    const close = new Date(d.closeAt).getTime();
    if (!Number.isNaN(open) && !Number.isNaN(close) && close <= open) {
      errors.window = 'موعد الإغلاق يجب أن يكون بعد موعد الفتح.';
    }
  }
  return errors;
}

/** Build the PATCH body from a validated edit draft — the window fields
 *  always ship (a cleared input clears the stored value), so a saved
 *  edit is exactly what the modal shows. */
export function buildUpdateTemplateInput(d: EditTemplateDraftState): UpdateExamTemplateInput {
  return {
    title: d.title.trim(),
    description: d.description.trim() || null,
    durationMin: Number(d.durationMin),
    passingScore: Number(d.passingScore),
    randomized: d.randomized,
    openAt: d.openAt ? new Date(d.openAt).toISOString() : null,
    closeAt: d.closeAt ? new Date(d.closeAt).toISOString() : null,
  };
}

/** Author edit — PATCH /exams/templates/:id. Local to this module (the
 *  resources barrel is a frozen boundary this round): same { data }
 *  envelope via the shared api client, same ['exams'] invalidation
 *  family the sibling mutations use (list, detail, queue). */
function useUpdateExamTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExamTemplateInput }) =>
      unwrap<{ id: string; status: ExamStatusFE }>(api.patch(`/exams/templates/${id}`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

/** Author clone — POST /exams/templates/:id/clone. The new draft's id
 *  drives the navigation to the copy's detail page. */
function useCloneExamTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      unwrap<{ id: string; title: string; status: ExamStatusFE }>(api.post(`/exams/templates/${templateId}/clone`, {})),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

function TemplateStatusBadge({ status }: { status: ExamStatusFE }) {
  return (
    <Badge color={EXAM_STATUS_COLOR[status]} icon={EXAM_STATUS_ICON[status]}>
      {EXAM_STATUS_LABEL[status]}
    </Badge>
  );
}

/* R305 Heron — the row severity edge per template status: the same
 * truth the status chip tells, spoken as the inline-start 3px bar
 * (.hr-edge). Presentation only — the chip beside the title stays the
 * source of truth; DRAFT/CLOSED carry no edge (neutral states). */
const TEMPLATE_EDGE: Record<ExamStatusFE, 'info' | 'soon' | 'overdue' | 'ember' | undefined> = {
  DRAFT: undefined,
  PENDING_REVIEW: 'soon',
  APPROVED: 'info',
  REJECTED: 'overdue',
  PUBLISHED: 'ember',
  CLOSED: undefined,
};

/* R304 → R305 — the template lifecycle rail: authoring is a pipeline (draft →
 * quality review → approval → publish), so the detail page shows WHERE
 * the template stands on that rail, not just its current status word.
 * The stage labels are deliberately NOT the status vocabulary (the
 * status Badge beside the title stays the source of truth) — a rejected
 * review step wears the danger state, a closed template shows the whole
 * rail done. Presentation only. R305: the strip now speaks the shared
 * Heron .hr-rail grammar (done/current/rejected data-states); the ol's
 * aria-label and the current step's aria-current are the locator
 * contract and are preserved verbatim. */
const LIFECYCLE_STEPS = ['مسودة', 'مراجعة الجودة', 'الاعتماد', 'النشر للطلاب'] as const;

function TemplateLifecycle({ status }: { status: ExamStatusFE }) {
  const state = ({
    DRAFT: { done: 0, current: 0, rejected: false },
    PENDING_REVIEW: { done: 1, current: 1, rejected: false },
    APPROVED: { done: 2, current: 2, rejected: false },
    REJECTED: { done: 1, current: 1, rejected: true },
    PUBLISHED: { done: 3, current: 3, rejected: false },
    CLOSED: { done: 4, current: -1, rejected: false },
  } as const)[status];
  return (
    <ol className="hr-rail exa2-rail" aria-label="مسار القالب من الإنشاء إلى النشر">
      {LIFECYCLE_STEPS.map((label, i) => {
        const stepState = i < state.done
          ? ('done' as const)
          : i === state.current
            ? (state.rejected ? ('rejected' as const) : ('current' as const))
            : undefined;
        return (
          <li
            key={label}
            className="hr-rail-step"
            data-state={stepState}
            aria-current={i === state.current ? 'step' : undefined}
          >
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
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
    <div className="hr-scope">
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            {/* R305 Heron — the workflow brow: the exam lifecycle opens
                every authoring surface with its stage strip. */}
            <span className="hr-brow exa2-brow">مسار الاختبارات</span>
            <h1 className="page-title">بنك الأسئلة والاختبارات</h1>
            <p className="page-subtitle">
              تأليف الأسئلة وبناء قوالب الاختبارات الموحَّدة، ومتابعة اعتمادها من الجودة حتى النشر.
            </p>
          </div>
          {/* 4C-a: the build CTA moved down to its tab's section head —
              each tab owns its own action row (the page header stays a
              calm masthead; the old always-visible button followed the
              user onto tabs where it did nothing). */}
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

        {building && <TemplateBuilderModal onClose={() => setBuilding(false)} canModerate={canModerate} />}
      </div>
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

/** 4C-a — the tab opener (Superlist grammar → R305 Heron): a large-type
 *  section title, ONE honest Arabic line, and the tab's actions at the
 *  inline-end. R305: the head wears the shared .hr-section-head layer
 *  (hairline anchor + strong heading ink) and an optional .hr-section-count
 *  chip carries the surface's noun count. Replaces the generic Card chrome
 *  the tabs used to render inside; the row sheets below carry the content. */
function ExaSectionHead({
  title,
  desc,
  count,
  actions,
}: {
  title: string;
  desc?: string;
  count?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="exa-section-head hr-section-head">
      <div className="exa-section-heading">
        <h2 className="exa-section-title">{title}</h2>
        {desc && <p className="exa-section-desc">{desc}</p>}
      </div>
      {count != null && <span className="hr-section-count">{count}</span>}
      {actions && <div className="exa-section-actions">{actions}</div>}
    </div>
  );
}

function MyTemplatesSection({ onBuild }: { onBuild: () => void }) {
  const q = useExamTemplates();

  return (
    <>
      <ExaSectionHead
        title="قوالب اختباراتي"
        desc={
          q.isPending
            ? 'جارٍ التحميل…'
            : q.data && q.data.length > 0
              ? `${countAr(q.data.length, ['قالب واحد', 'قالبان', 'قوالب', 'قالباً'])} — يُفتح النشر بعد اعتماد الجودة.`
              : 'ستظهر قوالبك هنا — ابنِ قالباً من أسئلة البنك المعتمدة.'
        }
        actions={
          <Button variant="primary" className="hr-cta" onClick={onBuild}>
            <Icon icon={Plus} size={14} /> قالب اختبار جديد
          </Button>
        }
      />
      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState message="تعذَّر تحميل قوالبك" error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState illustration="empty-list"
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
        <>
          <div className="exa-rows">
            {q.data.map((t) => (
              <TemplateRow key={t.id} template={t} />
            ))}
          </div>
          {/* 3-d: the listing endpoint caps at take:100 with no total in
              the envelope — a full page honestly says the list may
              continue instead of implying it ends. */}
          {q.data.length >= 100 && (
            <p className="text-xs text-muted exa-cap-note" role="note">
              تُعرض أول 100 نتيجة — قد تكون هناك المزيد.
            </p>
          )}
        </>
      )}
    </>
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
  const detailHref = `/teacher/exams/${template.id}`;
  return (
    /* 4C-a: the row IS the detail link — title, chips and counts ride
       one full-width anchor; the trailing buttons stay real controls
       beside it (no nested interactive elements). R305: the severity
       edge speaks the status truth inline-start, ahead of the text. */
    <div className="exa-row exa-row-clickable hr-edge" data-severity={TEMPLATE_EDGE[template.status]}>
      <Link className="exa-row-main" to={detailHref}>
        <span className="exa-row-title" title={template.title}>{template.title}</span>
        <span className="exa-row-sub">
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
        </span>
        {template.status === 'REJECTED' && (
          <p className="exa-row-note">
            {/* r170b: the fix path is now the template's own تعديل (the
                edit resubmits it to the queue) — the old copy promised a
                replacement-template detour that no longer exists. */}
            رفضته الجودة — افتح القالب للاطلاع على الملاحظات وعدّله ليعود إلى المراجعة.
          </p>
        )}
      </Link>
      <div className="exa-row-actions">
        <Link className="btn ghost sm" to={detailHref}>
          عرض
        </Link>
        <PublishButton template={template} viewHref={detailHref} />
      </div>
    </div>
  );
}

/* ═══════════════ Publish gate (APPROVED-only, irreversible) ═══════════════ */

function PublishButton({
  template,
  authorId,
  viewHref,
  explainGate,
}: {
  template: Pick<ExamTemplateRow, 'id' | 'status'> & { moderationNote?: string | null };
  /** Present on the detail surface — hides the button for a non-author
   *  viewing someone else's APPROVED template (the backend would 403). */
  authorId?: string;
  /** 5-D3 (A10 P3-2): when the publish fires from the LIST row, the
   *  success toast offers the natural next step («عرض الاختبار») as an
   *  inline action. Absent on the detail surface — the button already
   *  sits on that page, the action would navigate nowhere. */
  viewHref?: string;
  /** r170b: on the DETAIL surface a gated publish renders as a DISABLED
   *  button + the per-status reason (publishGateReason) instead of
   *  vanishing — the author sees the honest path forward from every
   *  state. List rows keep the quiet null (a disabled control on every
   *  row is noise, and the row's status chip already says the state). */
  explainGate?: boolean;
}) {
  const publish = usePublishExamTemplate();
  const [confirming, setConfirming] = useState(false);
  const meId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const perms = useMyPermissions();
  const canAuthor = perms.data?.capabilities.includes('EXAMS_AUTHOR') ?? false;

  // The backend gate: publish requires APPROVED + authorship. The button
  // renders only where the gate can pass — anywhere else it would be a
  // permanent dead control (a disabled button with no future) — EXCEPT
  // on the explainGate surface, where a disabled control WITH its
  // reason is exactly the honesty the author needs (r170b).
  if (!canAuthor) return null;
  if (authorId !== undefined && authorId !== meId) return null;
  const reason = explainGate ? publishGateReason(template) : null;
  if (reason === null && template.status !== 'APPROVED') return null;

  const onPublish = async () => {
    try {
      await publish.mutateAsync(template.id);
      setConfirming(false);
      toast.success('أصبح الاختبار متاحاً للطلاب حسب نطاقه.', {
        title: 'تمّ نشر الاختبار',
        ...(viewHref ? {
          action: {
            label: 'عرض الاختبار',
            onClick: () => navigate(viewHref),
          },
        } : {}),
      });
    } catch {
      setConfirming(false);
      // surfaced inline below — the backend's Arabic conflict message
      // (a rejection landing mid-flight) renders verbatim.
    }
  };

  // r170b — the gated detail-surface control: disabled + the honest
  // per-status reason. aria-describedby ties the note to the control
  // so screen readers announce WHY it is off, not just that it is.
  if (reason !== null) {
    return (
      <span className="exa-gate">
        <Button
          variant="primary"
          size="sm"
          className="hr-cta"
          disabled
          aria-describedby="publish-gate-reason"
        >
          <Icon icon={Send} size={12} /> نشر
        </Button>
        <span
          id="publish-gate-reason"
          className="text-xs text-muted exa-gate-note"
          role="note"
        >
          {reason}
        </span>
      </span>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        className="hr-cta"
        onClick={() => setConfirming(true)}
        /* A6 P3 (22-a): the tooltip names the consequence — the old
           «النشر متاح بعد اعتماد الجودة» was stale on an APPROVED
           row, where publishing is exactly what is available. */
        title="النشر يعرض الاختبار للطلاب حسب نطاقه ولا يمكن التراجع عنه"
      >
        <Icon icon={Send} size={12} /> نشر
      </Button>
      {publish.isError && (
        <span role="alert" className="text-xs exa-error-line exa-error-center">
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
 * 220/150/130/120). The picker still consumes the shared `.filter-bar`
 * width budget (components.css, 23-b) with the chrome-less `.flush`
 * variant inside the boxed «أسئلة القالب» section; the hub's row was
 * re-composed in 4C-a as the calm `.exa-toolbar` (search flex-1 +
 * 44px selects) matching the Superlist row grammar. */

function QuestionBankSection() {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'' | QType>('');
  const [difficulty, setDifficulty] = useState<'' | Difficulty>('');
  // 4C-a — the accordion: one row expanded at a time keeps the list a
  // list. Pure client-side state over the already-fetched rows — the
  // bank listing's payload IS the expansion's data (no detail fetch,
  // no new endpoints).
  const [openId, setOpenId] = useState<string | null>(null);
  const toggleOpen = (id: string) => setOpenId((cur) => (cur === id ? null : id));

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
    <>
      <ExaSectionHead
        title="بنك الأسئلة المعتمدة"
        desc="الأسئلة التي اعتمدتها الجودة وتصلح لبناء القوالب — إنشاء سؤال جديد يمرّ على المراجعة أولاً."
        actions={
          <Button variant="primary" className="hr-cta" onClick={() => setCreating(true)}>
            <Icon icon={Plus} size={14} /> سؤال جديد
          </Button>
        }
      />

      {/* One calm toolbar — search flexes, the three selects wrap after
          it; the debounce + endpoint contract are unchanged. R305: the
          shared .hr-toolbar placement grammar joins the R304 widths. */}
      <div
        className="exa-toolbar hr-toolbar"
        role="group"
        aria-label="تصفية بنك الأسئلة"
      >
        <div className="exa-search">
          <span className="exa-search-icon"><Icon icon={Search} size={15} /></span>
          <input
            type="text"
            className="input exa-search-input"
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
            ) : (
              /* r148 (AUDIT-2 L7): الحالة الفارغة المُصفّاة كانت بلا مخرج —
                 الأسطح الشقيقة (admin/students، owner/users) توفر مسح
                 البحث والفلاتر. نفس النمط. */
              <Button variant="ghost" onClick={() => { setQ(''); setDebouncedQ(''); setCategoryId(''); setType(''); setDifficulty(''); }}>
                <Icon icon={X} size={13} /> مسح البحث والتصفية
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="exa-rows">
            {bank.data.map((question) => (
              <QuestionBankRow
                key={question.id}
                question={question}
                open={openId === question.id}
                onToggle={() => toggleOpen(question.id)}
              />
            ))}
          </div>
          {/* 3-d: same take:100 cap as the templates listing — the bank
              tab discloses it the same way when the page fills up. */}
          {bank.data.length >= 100 && (
            <p className="text-xs text-muted exa-cap-note" role="note">
              تُعرض أول 100 نتيجة — قد تكون هناك المزيد.
            </p>
          )}
        </>
      )}

      {creating && <CreateQuestionModal onClose={() => setCreating(false)} />}
    </>
  );
}

function QuestionBankRow({
  question,
  open,
  onToggle,
}: {
  question: QuestionRow;
  open: boolean;
  onToggle: () => void;
}) {
  // The panel id is aria-controls' only consumer — uniqueness comes
  // from the wire id, no useId ceremony needed for a per-row toggle.
  const panelId = `exa-q-${question.id}`;
  return (
    /* 4C-a — the centerpiece row: a real <button> toggles an in-place
       expansion (aria-expanded/aria-controls, chevron rotates). The
       expanded detail renders strictly from the fetched QuestionRow —
       and it says honestly what the bank listing does and doesn't
       carry: choices WITHOUT the key (the listing deliberately does
       not leak the answer) and no mutation affordance (questions are
       immutable once approved — create-new is the only edit path). */
    <div className={`exa-bank-row${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="exa-bank-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className="exa-chevron"><Icon icon={ChevronDown} size={16} /></span>
        <span className="exa-bank-head">
          <span className="exa-bank-prompt" title={question.prompt}>{question.prompt}</span>
          <span className="exa-bank-meta">
            <Badge>{QTYPE_LABEL[question.type]}</Badge>
            <Badge color={DIFFICULTY_COLOR[question.difficulty]}>{DIFFICULTY_LABEL[question.difficulty]}</Badge>
            {/* The listing only serves approved questions (isApproved
                filter in the route) — the chip states the pool's
                invariant, priming the "only approved questions enter
                templates" model. */}
            <Badge color="green" icon={BadgeCheck}>معتمد</Badge>
            <span className="exa-points">
              {countAr(question.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
            </span>
            <span className="flex gap-1 items-center">
              <EmojiIcon emoji={question.category.iconEmoji ?? '📚'} size={13} />
              {question.category.title}
            </span>
          </span>
        </span>
      </button>
      {open && (
        <div id={panelId} className="exa-bank-panel">
          <p className="exa-qtext">{question.prompt}</p>
          {question.choices && question.choices.length > 0 && (
            <ul className="exa-choices">
              {question.choices.map((choice, i) => (
                <li key={i} className="exa-choice">
                  <span className="exa-choice-index" aria-hidden>{i + 1}.</span>
                  <span>{choice}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="exa-byline">
            <span>التصنيف: {question.category.title}</span>
            <span>أضافها: {question.author}</span>
            {question.tags.length > 0 && <span>الوسوم: {question.tags.join('، ')}</span>}
          </div>
          <p className="exa-immutable" role="note">
            <Icon icon={Lock} size={13} />
            <span>
              الأسئلة المعتمدة ثابتة — لا تُعدَّل بعد الاعتماد. أنشئ سؤالاً جديداً لصياغة معدَّلة.
            </span>
          </p>
        </div>
      )}
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
            className="exa-form"
          >
            {/* 5-C4: the empty-categories notice rides the hint slot
                (single-child contract) — it stays announced via
                aria-describedby alongside any validation error. */}
            <Field
              label="تصنيف السؤال"
              htmlFor="newq-category"
              error={errors.categoryId}
              hint={categoriesEmpty ? 'تصنيفات الأسئلة تنشئها إدارة المنصة — تواصل معهم لإضافتها.' : undefined}
            >
              <select
                id="newq-category"
                className="input"
                value={draft.categoryId}
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
              <p role="alert" className="text-xs exa-error-line">
                {apiErrorMessage(create.error, 'تعذَّر حفظ السؤال — تحقّق من البيانات وحاول مرة أخرى.')}
              </p>
            )}

            <div className="exa-form-foot">
              <Button variant="ghost" onClick={requestClose} disabled={create.isPending}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" loading={create.isPending}>
                {/* 3-d: the pending label rides Button's visually-hidden
                    span while loading — SRs announce «جارٍ حفظ السؤال…»
                    like every submit in the family. */}
                {create.isPending ? 'جارٍ حفظ السؤال…' : 'حفظ السؤال'}
              </Button>
            </div>
          </form>
        )}
      </div>
      {guard}
    </Modal>
  );
}

/** Labelled field scaffold — 5-C4 (A10 P2-3): delegates to the
 *  platform FormField (primitives/Form.tsx), which completes the
 *  association contract the local copy was missing — aria-invalid +
 *  aria-describedby injected into the control (the errors re-announce
 *  on re-focus, not only as a one-shot role=alert) — while the row
 *  keeps its flex-1/min-width so the side-by-side pairs (points +
 *  difficulty, duration + pass mark, open + close) share the row and
 *  wrap at the same widths as before. */
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
  /** A single control element — the shared primitive injects the id +
   *  the aria wiring into it. */
  children: ReactElement;
}) {
  return (
    <FormField
      label={label}
      id={htmlFor}
      error={error}
      hint={hint}
      className="flex-1"
      style={{ minWidth: 140 }}
    >
      {children}
    </FormField>
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
    <div className="exa-choice-list">
      {/* r150c: canonical label grammar (was .form-label) — a group
          caption, not a field label, so no FormField wrapper. */}
      <span className="form-field-label">{optionsLabel}</span>
      <div role="group" aria-label={optionsLabel} className="exa-choice-rows">
        {draft.choices.map((choice, index) => (
          <div key={index} className="exa-choice-row">
            <label
              className="text-xs exa-choice-correct"
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
            <div className="exa-choice-field">
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
                className="btn ghost sm exa-choice-remove"
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
      {/* 3-d: both slots render, each in its own alert (the file's Field
          error convention) — the old `correctError ?? choicesError`
          swallowed the choices error whenever a correct-answer error
          also existed. */}
      {correctError && (
        <p role="alert" className="text-xs exa-error-line">
          {correctError}
        </p>
      )}
      {choicesError && (
        <p role="alert" className="text-xs exa-error-line">
          {choicesError}
        </p>
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

function TemplateBuilderModal({ onClose, canModerate }: { onClose: () => void; canModerate: boolean }) {
  const create = useCreateExamTemplate();
  const offerings = useTeacherOfferings();
  /* r180: scoped to the caller's institution (foreign faculty choices
   * always 403 at the backend). */
  const faculties = useFaculties(useCurrentInstitutionSlug());

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
            className="exa-form"
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
                  onChange={(e) => patch({ scope: e.target.value as TemplateDraftState['scope'] })}
                >
                  <option value="offering">مقرّر من مقرّراتي</option>
                  <option value="faculty">كلّيّة محدَّدة</option>
                  {/* r156: the backend (r155a) rejects an unscoped template
                      (no offering and no faculty) for authors without
                      EXAMS_MODERATE — a clean Arabic 400. Offering the
                      option to a non-moderator is a dead choice: hide it,
                      and the 400 stays as the honest backstop for
                      capability changes mid-draft. */}
                  {canModerate && <option value="general">عام (كل الكلّيّات)</option>}
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
              <p role="alert" className="text-xs exa-error-line">
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
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            <QuestionPicker draft={draft} patch={patch} error={errors.questionIds} />

            {create.isError && (
              <p role="alert" className="text-xs exa-error-line">
                {apiErrorMessage(create.error, 'تعذَّر إنشاء القالب — تحقّق من البيانات وحاول مرة أخرى.')}
              </p>
            )}

            <div className="exa-form-foot">
              <Button variant="ghost" onClick={requestClose} disabled={create.isPending}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" loading={create.isPending}>
                {create.isPending ? 'جارٍ إنشاء القالب…' : 'إنشاء القالب'}
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

  /* 3-d: the live pick-position per picked id — the payload's
   * questionIds array (the Set's insertion order) IS the wire order
   * (the backend assigns order: i+1 over it), so each picked row
   * shows its position in the sequence, renumbered as picks change. */
  const pickIndex = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const id of selected) m.set(id, (i += 1));
    return m;
  }, [selected]);

  return (
    <div className="exa-picker">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* r150c: canonical label grammar (was .form-label with a
            zeroed margin) — a toolbar heading, not a field label. */}
        <span className="form-field-label">أسئلة القالب</span>
        {/* Live selection state — count + running points total, the two
            numbers the author balances while building. */}
        <span className="text-xs text-muted" role="status">
          {countAr(selected.size, ['سؤال مختار واحد', 'سؤالان مختاران', 'أسئلة مختارة', 'سؤالاً مختاراً'])} من 60 ·{' '}
          {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
        </span>
      </div>

      {/* 3-d: the pick order IS the exam order — the backend assigns each
          template question its order from the pick sequence (order: i+1
          over questionIds), so the author sees the contract while picking.
          The randomized branch keeps it honest when the shuffle toggle is
          on (the pick order seeds the per-student shuffle). */}
      <p className="text-xs text-muted">
        {draft.randomized
          ? 'ترتيب اختيارك يحدّد ترتيب الأسئلة في الاختبار — ويُخلط عشوائياً لكل طالب عند بدئه.'
          : 'ترتيب اختيارك يحدّد ترتيب الأسئلة في الاختبار.'}
      </p>

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
        <p className="text-xs text-muted">
          لا توجد أسئلة معتمدة تطابق البحث — أسئلة جديدة تحتاج اعتماد الجودة أولاً قبل ظهورها هنا.
        </p>
      ) : (
        <div
          role="group"
          aria-label="اختيار أسئلة القالب"
          className="exa-picker-scroll"
        >
          {bank.data.map((question) => {
            const checked = selected.has(question.id);
            return (
              <label
                key={question.id}
                className="list-row exa-pick-row"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(question.id)}
                  aria-label={`اختيار السؤال: ${question.prompt.slice(0, 60)}`}
                  className="exa-pick-check"
                />
                {/* The row's live position in the pick sequence — the exam
                    order this question will carry (exa-pick-order,
                    exam-author.css); renumbered as picks change. */}
                {checked && (
                  <span className="exa-pick-order" title="ترتيب السؤال في الاختبار">
                    <span className="visually-hidden">ترتيبه في الاختبار: </span>
                    {pickIndex.get(question.id)}
                  </span>
                )}
                <div className="list-row-body">
                  <div className="list-row-title" title={question.prompt}>{question.prompt}</div>
                  <div className="list-row-sub exa-pick-sub">
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
        <p role="alert" className="text-xs exa-error-line">
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
    <>
      <ExaSectionHead
        title="قوالب بانتظار المراجعة"
        desc={
          q.isPending
            ? 'جارٍ التحميل…'
            : q.data && q.data.length > 0
              ? countAr(q.data.length, ['قالب واحد بانتظار قرارك', 'قالبان بانتظار قرارك', 'قوالب بانتظار قرارك', 'قالباً بانتظار قرارك'])
              : undefined
        }
      />
      {q.isPending ? (
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState message="تعذَّر تحميل قائمة المراجعة" error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState illustration="empty-list"
          icon={CheckCircle2}
          title="لا شيء بانتظار المراجعة"
          description="كل قوالب الاختبارات المرسلة اجتازت المراجعة — ستظهر القوالب الجديدة هنا فور إرسالها."
        />
      ) : (
        <div className="exa-rows">
          {q.data.map((item) => (
            <div key={item.id} className="exa-row exa-row-clickable hr-edge" data-severity="soon">
              <Link className="exa-row-main" to={`/teacher/exams/${item.id}`}>
                <span className="exa-row-title" title={item.title}>{item.title}</span>
                <span className="exa-row-sub">
                  <Badge color="purple">{KIND_LABEL[item.kind]}</Badge>
                  {item.offering && <Badge color="brand">{item.offering.course.name}</Badge>}
                  <span>
                    {countAr(item._count.questions, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])} ·{' '}
                    {countAr(item.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])}
                  </span>
                  <span>قدّمه: {item.author.firstName} {item.author.lastName}</span>
                </span>
              </Link>
              <div className="exa-row-actions">
                <Link className="btn primary sm" to={`/teacher/exams/${item.id}`}>
                  مراجعة
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* ═══════════════ Template detail — /teacher/exams/:templateId ═══════════════ */

export function ExamTemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const q = useExamTemplate(templateId);

  return (
    <div className="hr-scope">
      <div className="page">
        <Link to="/teacher/exams" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          العودة إلى بنك الأسئلة والاختبارات
        </Link>
        {q.isPending ? (
          <DetailSkeleton />
        ) : q.isError ? (
          <ErrorState message="تعذَّر تحميل القالب" error={q.error} onRetry={() => q.refetch()} />
        ) : q.data ? (
          <TemplateDetailBody template={q.data} />
        ) : null}
      </div>
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
      {/* 4C-a — the restructured detail header: back-link row (above),
          then the large-type title with its status/scope line and the
          actions strip on the inline-end. The publish control keeps
          PublishButton's gated-disabled + reason honesty. */}
      <header className="exa-detail-head">
        <div className="exa-detail-top">
          <div className="exa-detail-heading">
            {/* R305 Heron — the lifecycle brow above the authored title. */}
            <span className="hr-brow exa2-brow">دورة حياة القالب</span>
            {/* A6 P3 (22-a): 2-line clamp lives in the exa sheet —
                authored titles run long and pushed the whole page down;
                the full title stays in the title attr. */}
            <h1 className="exa-detail-title" title={template.title}>
              {template.title}
            </h1>
            <div className="exa-detail-sub">
              <Badge color="purple">{KIND_LABEL[template.kind]}</Badge>
              <TemplateStatusBadge status={template.status} />
              {template.offering ? (
                <span><Icon icon={BookOpen} size={12} /> {template.offering.course.name} · <bdi>{template.offering.course.code}</bdi></span>
              ) : template.faculty ? (
                <span>كلّيّة {template.faculty.name}</span>
              ) : (
                <span>عام — كل الكلّيّات</span>
              )}
            </div>
            {/* R304/R305: the workflow rail — where this template stands
                on draft → review → approval → publish (the Heron .hr-rail). */}
            <TemplateLifecycle status={template.status} />
          </div>
          <AuthorActions template={template} />
        </div>
      </header>

      {(template.status === 'REJECTED' || template.status === 'PENDING_REVIEW') && template.moderationNote && (
        <p className="exa-note" role="note">
          <Icon icon={Info} size={14} />
          <span>ملاحظة الجودة: {template.moderationNote}</span>
        </p>
      )}

      {/* 4C-a — the two-column split: the questions + grading list on
          the main side, the template's facts and the moderation decision
          attached as the aside (stacks below on narrow screens). The
          header numbers live where they answer questions: the count and
          the running points total ride the questions section head, the
          duration/pass mark/order ride the facts panel. */}
      <div className="exa-split">
        <div className="exa-main">
          <section aria-label="أسئلة القالب">
            <ExaSectionHead
              title="أسئلة القالب"
              count={countAr(template.questions.length, ['سؤال واحد', 'سؤالان', 'أسئلة', 'سؤالاً'])}
              desc={`مجموع النقاط ${countAr(totalPoints, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}`}
            />
            {template.questions.length === 0 ? (
              <EmptyState illustration="empty-list"
                icon={FileQuestion}
                title="لا أسئلة في هذا القالب"
                description="ربما أُوقفت أسئلته من البنك بعد بنائه."
              />
            ) : (
              <div className="exa-rows">
                {template.questions.map((eq) => (
                  <TemplateQuestionRow
                    key={eq.id}
                    /* 3-d: the wire's own order — the array position was
                        an index fiction that would drift the moment the
                        list is not densely numbered. */
                    order={eq.order}
                    row={eq}
                    canModerate={canModerate}
                  />
                ))}
              </div>
            )}
          </section>

          {canGradeHere && <AttemptsSection template={template} />}
        </div>

        <aside className="exa-aside" aria-label="تفاصيل القالب">
          <section className="exa-panel">
            <h2 className="exa-panel-title">تفاصيل القالب</h2>
            <div className="exa-facts">
              <DetailLine label="نطاق الاختبار">
                {template.offering ? (
                  <>{template.offering.course.name} (<bdi>{template.offering.course.code}</bdi>)</>
                ) : template.faculty ? (
                  <>كلّيّة {template.faculty.name}</>
                ) : (
                  'عام — كل الكلّيّات'
                )}
              </DetailLine>
              <DetailLine label="المدة">
                {countAr(template.durationMin, ['دقيقة واحدة', 'دقيقتان', 'دقائق', 'دقيقة'])}
              </DetailLine>
              <DetailLine label="درجة النجاح">
                <bdi>{template.passingScore}%</bdi>
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
          </section>

          {canModerate && <TemplateModerationPanel template={template} />}
        </aside>
      </div>
    </>
  );
}

/* ═══════════════ r170b — author actions (edit · clone · gated publish) ═══════════════ */

/** The detail header's author affordances: تعديل (the safe-fields
 *  modal, only where the backend's edit gate can pass), استنساخ (deep
 *  copy → navigate to the new draft), and the gated publish with its
 *  per-status reason. Non-authors see none of these — the backend 403s
 *  and a dead control is worse than no control (the PublishButton rule). */
function AuthorActions({ template }: { template: ExamTemplateDetail }) {
  const user = useAuthStore((s) => s.user);
  const perms = useMyPermissions();
  const navigate = useNavigate();
  const clone = useCloneExamTemplate();
  const [editing, setEditing] = useState(false);
  const [cloneFailed, setCloneFailed] = useState(false);

  const canAuthor = perms.data?.capabilities.includes('EXAMS_AUTHOR') ?? false;
  const canModerate = perms.data?.capabilities.includes('EXAMS_MODERATE') ?? false;
  // The capability AND the ownership/status gate must both hold — the
  // backend's PATCH door is requireCapability('EXAMS_AUTHOR') first,
  // then the author/oversight assert (canEditTemplate mirrors only the
  // second half).
  const editable = canAuthor && canEditTemplate(template, user);
  const cloneable = canAuthor && canCloneTemplate(template, user, canModerate);

  const onClone = async () => {
    setCloneFailed(false);
    try {
      const copy = await clone.mutateAsync(template.id);
      toast.success('أُنشئت نسخة كاملة بأسئلة القالب وأُرسلت إلى مراجعة الجودة.', {
        title: 'تمّ الاستنساخ',
      });
      // Straight to the new draft — its detail page is where the author
      // continues (edit the window, retitle, await moderation).
      navigate(`/teacher/exams/${copy.id}`);
    } catch {
      // surfaced inline below — the backend's Arabic message verbatim
      setCloneFailed(true);
    }
  };

  if (!editable && !cloneable) return null;

  return (
    <>
      <div className="exa-detail-actions">
        {editable && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Icon icon={Pencil} size={12} /> تعديل
          </Button>
        )}
        {cloneable && (
          <Button
            variant="ghost"
            size="sm"
            loading={clone.isPending}
            disabled={clone.isPending}
            onClick={() => void onClone()}
            title="نسخة كاملة من القالب بأسئلته — تُرسل إلى مراجعة الجودة"
          >
            <Icon icon={Copy} size={12} /> {clone.isPending ? 'جارٍ الاستنساخ…' : 'استنساخ'}
          </Button>
        )}
        <PublishButton template={template} authorId={template.authorId} explainGate />
        {cloneFailed && (
          <p role="alert" className="text-xs exa-error-line">
            {apiErrorMessage(clone.error, 'تعذَّر الاستنساخ — تحقّق من اتصالك وحاول مرة أخرى.')}
          </p>
        )}
      </div>
      {editing && <EditTemplateModal template={template} onClose={() => setEditing(false)} />}
    </>
  );
}

/** The edit modal — PATCH /exams/templates/:id over the safe fields.
 *  Field set = exactly what the wire accepts (kind, scope and the
 *  question set are immutable; the modal says so instead of offering
 *  dead controls). Saving an APPROVED/REJECTED template warns first:
 *  the edit honestly resets the moderation verdict. */
function EditTemplateModal({ template, onClose }: { template: ExamTemplateDetail; onClose: () => void }) {
  const update = useUpdateExamTemplate();

  const initial = useMemo<EditTemplateDraftState>(() => ({
    title: template.title,
    description: template.description ?? '',
    durationMin: String(template.durationMin),
    passingScore: String(template.passingScore),
    randomized: template.randomized,
    openAt: isoToLocalInputValue(template.openAt),
    closeAt: isoToLocalInputValue(template.closeAt),
  }), [template]);

  const [draft, setDraft] = useState<EditTemplateDraftState>(initial);
  const [errors, setErrors] = useState<EditTemplateDraftErrors>({});
  const [saved, setSaved] = useState(false);

  const patch = (p: Partial<EditTemplateDraftState>) => setDraft((d) => ({ ...d, ...p }));

  const dirty =
    draft.title !== initial.title ||
    draft.description !== initial.description ||
    draft.durationMin !== initial.durationMin ||
    draft.passingScore !== initial.passingScore ||
    draft.randomized !== initial.randomized ||
    draft.openAt !== initial.openAt ||
    draft.closeAt !== initial.closeAt;

  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !saved && dirty,
    pending: update.isPending,
    onClose,
  });

  const onSubmit = async () => {
    const found = validateEditTemplateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await update.mutateAsync({ id: template.id, input: buildUpdateTemplateInput(draft) });
      setSaved(true);
      // The verdict-reset states (APPROVED/REJECTED) say what saving did
      // to the lifecycle; every other state is a plain in-place edit.
      if (template.status === 'APPROVED' || template.status === 'REJECTED') {
        toast.success('حُفظ التعديل وعاد القالب إلى مراجعة الجودة بمحتواه المحدَّث.', {
          title: 'تمّ حفظ التعديل',
        });
      } else {
        toast.success('حُفظت تعديلات القالب.', { title: 'تمّ الحفظ' });
      }
    } catch {
      /* surfaced inline from update.isError */
    }
  };

  // What the save does to the moderation state — the honest pre-warning
  // (mirrors decideTemplateEdit, which the backend enforces anyway).
  const resetNotice =
    template.status === 'APPROVED'
      ? 'حفظ التعديل يُلغي الاعتماد الحالي ويعيد القالب إلى مراجعة الجودة قبل نشره.'
      : template.status === 'REJECTED'
        ? 'حفظ التعديل يعيد القالب إلى مراجعة الجودة بمحتواه المحدَّث.'
        : null;

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="تعديل القالب"
      closeOnOverlayClick={!update.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">تعديل القالب</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={update.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        {saved ? (
          <div className="form-feedback ok" role="status">
            <Icon icon={CheckCircle2} size={15} />
            <span className="flex-1">
              {resetNotice
                ? 'حُفظ التعديل — القالب الآن بانتظار مراجعة الجودة.'
                : 'حُفظت التعديلات على القالب.'}
            </span>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); void onSubmit(); }}
            noValidate
            className="exa-form"
          >
            <p className="text-sm text-muted">
              الأسئلة ونوع الاختبار ونطاقه ثابتة بعد الإنشاء — عدّل بيانات العرض والتوقيت هنا،
              أو استنسخ القالب لنسخة تُبنى عليها أسئلة مختلفة.
            </p>

            <Field label="عنوان القالب" htmlFor="edit-tpl-title" error={errors.title}>
              <Input
                id="edit-tpl-title"
                value={draft.title}
                error={!!errors.title}
                maxLength={200}
                onChange={(e) => patch({ title: e.target.value })}
              />
            </Field>

            <div className="flex gap-3 flex-wrap">
              <Field label="المدة (بالدقائق)" htmlFor="edit-tpl-duration" error={errors.durationMin} hint="بين 5 و 480 دقيقة">
                <Input
                  id="edit-tpl-duration"
                  type="number"
                  className="input-narrow"
                  min={5}
                  max={480}
                  step={1}
                  inputMode="numeric"
                  dir="ltr"
                  value={draft.durationMin}
                  error={!!errors.durationMin}
                  onChange={(e) => patch({ durationMin: e.target.value })}
                />
              </Field>
              <Field label="درجة النجاح (%)" htmlFor="edit-tpl-pass" error={errors.passingScore} hint="نسبة من مجموع النقاط">
                <Input
                  id="edit-tpl-pass"
                  type="number"
                  className="input-narrow"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="numeric"
                  dir="ltr"
                  value={draft.passingScore}
                  error={!!errors.passingScore}
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
              <Field
                label="يفتح في (اختياري)"
                htmlFor="edit-tpl-open"
                hint={draft.openAt
                  ? `المحدَّد: ${formatDateTimeAr(draft.openAt)}`
                  : 'غير محدَّد — يفتح فور النشر. مسح الحقل يزيل الموعد.'}
              >
                <input
                  id="edit-tpl-open"
                  type="datetime-local"
                  className="input"
                  dir="ltr"
                  value={draft.openAt}
                  onChange={(e) => patch({ openAt: e.target.value })}
                />
              </Field>
              <Field
                label="يغلق في (اختياري)"
                htmlFor="edit-tpl-close"
                hint={draft.closeAt
                  ? `المحدَّد: ${formatDateTimeAr(draft.closeAt)}`
                  : 'غير محدَّد — بلا إغلاق تلقائي. مسح الحقل يزيل الموعد.'}
              >
                <input
                  id="edit-tpl-close"
                  type="datetime-local"
                  className="input"
                  dir="ltr"
                  value={draft.closeAt}
                  onChange={(e) => patch({ closeAt: e.target.value })}
                />
              </Field>
            </div>
            {errors.window && (
              <p role="alert" className="text-xs exa-error-line">
                {errors.window}
              </p>
            )}

            <Field label="وصف (اختياري)" htmlFor="edit-tpl-desc" hint="يظهر للطالب قبل بدء الاختبار">
              <textarea
                id="edit-tpl-desc"
                className="input"
                rows={2}
                maxLength={2000}
                placeholder="تعليمات مختصرة لطلابك…"
                value={draft.description}
                onChange={(e) => patch({ description: e.target.value })}
              />
            </Field>

            {resetNotice && (
              <p className="text-sm text-muted exa-note-line" role="note">
                <Icon icon={Info} size={14} />
                <span>{resetNotice}</span>
              </p>
            )}

            {update.isError && (
              <p role="alert" className="text-xs exa-error-line">
                {apiErrorMessage(update.error, 'تعذَّر حفظ التعديل — تحقّق من البيانات وحاول مرة أخرى.')}
              </p>
            )}

            <div className="exa-form-foot">
              <Button variant="ghost" onClick={requestClose} disabled={update.isPending}>
                إلغاء
              </Button>
              <Button variant="primary" type="submit" loading={update.isPending}>
                {update.isPending ? 'جارٍ حفظ التعديل…' : 'حفظ التعديل'}
              </Button>
            </div>
          </form>
        )}
      </div>
      {guard}
    </Modal>
  );
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    /* A6 P3 (22-a): a dotted leader gives each label/value pair a scan
     * line — the old bare justify-between rows had no rhythm and VLM
     * read the card as noise. Baseline-aligned; long values wrap to
     * their own line (flex-wrap) with the leader shrinking to min.
     * R304: the leader/value anatomy lives in the family sheet
     * (.exa-fact-*); the row's utility composition stays (r167 pin). */
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="exa-fact-label">{label}</span>
      <span className="exa-fact-leader" aria-hidden />
      <span className="exa-fact-value">{children}</span>
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
    <section aria-label="التصحيح">
      <ExaSectionHead
        title="التصحيح"
        desc={
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
            <label className="exa-check">
              <input
                type="checkbox"
                checked={onlyPending}
                onChange={(e) => setOnlyPending(e.target.checked)}
              />
              بانتظار التصحيح فقط
            </label>
          ) : undefined
        }
      />
      {q.isPending ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState message="تعذَّر تحميل المحاولات" error={q.error} onRetry={() => q.refetch()} />
      ) : visible.length === 0 ? (
        <EmptyState illustration="empty-list"
          icon={onlyPending ? ClipboardCheck : FileQuestion}
          title={onlyPending ? 'لا محاولات بانتظار التصحيح' : 'لا محاولات بعد'}
          description={
            onlyPending
              ? 'كل المحاولات المسلَّمة مُصحَّحة — ستظهر المحاولات الجديدة هنا فور تسليمها.'
              : 'يبدأ الطلاب المحاولات من صفحة الاختبارات الخاصة بهم؛ تظهر محاولاتهم هنا لحظة بدئها.'
          }
        />
      ) : (
        <div className="exa-rows">
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
    </section>
  );
}

function AttemptRow({ attempt, onGrade }: { attempt: ExamAttemptRow; onGrade: () => void }) {
  const scoreTitle =
    attempt.score === null
      ? 'لم تُحسب الدرجة بعد'
      : `الدرجة الحالية: ${attempt.score} من ${attempt.maxScore}`;
  return (
    /* 4C-a: a static row for finished/in-flight attempts (no hover —
       nothing is clickable on them), the SUBMITTED one carrying the
       single تصحيح action. The machine score rides the actions edge in
       mono tabular figures. R305: the severity edge mirrors the
       attempt's state inline-start (SUBMITTED = awaiting action). */
    <div className="exa-row hr-edge" data-severity={
      attempt.status === 'SUBMITTED'
        ? 'soon'
        : attempt.status === 'GRADED'
          ? 'info'
          : attempt.status === 'EXPIRED'
            ? 'overdue'
            : undefined
    }>
      <div className="exa-row-main">
        <div className="exa-row-title" title={attempt.studentName}>{attempt.studentName}</div>
        <div className="exa-row-sub">
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
      <div className="exa-row-actions">
        {/* The machine score so far — the SUBMITTED row's partial truth
            (auto-graded points), never a fabricated verdict. */}
        <span className="exa-points" title={scoreTitle}>
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
 *  feedback note (≤ 2000, the backend's cap). `invalid` (3-d) flags the
 *  cards that still lack a verdict after a failed finalize — a data
 *  attribute the sheet turns into a soft danger edge, plus aria-invalid
 *  on the verdict group; it clears per-card the moment a verdict lands. */
function PendingAnswerCard({
  order,
  answer,
  verdict,
  feedback,
  invalid = false,
  onVerdict,
  onFeedback,
}: {
  order: number;
  answer: PendingExamAnswer;
  verdict: boolean | undefined;
  feedback: string;
  invalid?: boolean;
  onVerdict: (isCorrect: boolean) => void;
  onFeedback: (value: string) => void;
}) {
  return (
    <div
      className="exa-grade-card"
      data-invalid={invalid || undefined}
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="list-row-title exa-grade-prompt" title={answer.prompt}>
          <bdi className="font-mono">{order}</bdi> {answer.prompt}
        </div>
        <div className="flex gap-2 items-center exa-grade-side">
          <Badge>{QTYPE_LABEL[answer.type]}</Badge>
          <span className="text-xs text-muted">
            {countAr(answer.points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
          </span>
        </div>
      </div>

      <div className="text-sm exa-answer-surface">
        {answer.studentAnswer !== null ? (
          answer.studentAnswer
        ) : (
          <span className="text-xs exa-answer-missing">
            لم يكتب الطالب إجابة لهذا السؤال — حكمك يحدد درجته.
          </span>
        )}
      </div>

      <div
        className="flex gap-1 flex-wrap"
        role="group"
        aria-label={`حكم إجابة السؤال ${order}`}
        aria-invalid={invalid || undefined}
      >
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
            className="exa-form"
          >
            <p className="text-sm text-muted">
              {templateTitle} · الحالة: {ATTEMPT_STATUS_LABEL[attempt.status]}
              {attempt.score !== null && (
                <>
                  {' '}· الدرجة الآلية حتى الآن: <bdi className="font-mono">{attempt.score} / {attempt.maxScore}</bdi>
                </>
              )}
            </p>

            {pending.length === 0 ? (
              <p
                className="text-sm text-muted exa-note-line"
                role="note"
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
                  /* 3-d: derived from the existing validationError flag —
                     only the cards still missing a verdict light up, and
                     each clears the moment its verdict lands (the flag
                     itself is not part of the submit decision). */
                  invalid={validationError && verdicts[p.answerId] === undefined}
                  onVerdict={(isCorrect) => setVerdict(p.answerId, isCorrect)}
                  onFeedback={(value) => setFeedback((f) => ({ ...f, [p.answerId]: value }))}
                />
              ))
            )}

            {validationError && (
              <p role="alert" className="text-xs exa-error-line">
                حدِّد حكمك — صحيحة أم خاطئة — لكل إجابة معلّقة قبل الحفظ.
              </p>
            )}
            {grade.isError && (
              <p role="alert" className="text-xs exa-error-line">
                {apiErrorMessage(grade.error, 'تعذَّر حفظ التصحيح — تحقّق من اتصالك وحاول مرة أخرى.')}
              </p>
            )}

            <div className="exa-form-foot">
              <Button variant="ghost" onClick={requestClose} disabled={grade.isPending}>
                إلغاء
              </Button>
              {/* Double-submit guard: isPending locks the submit AND the
                  guarded close, so a verdict can never ride twice. */}
              <Button variant="primary" type="submit" loading={grade.isPending}>
                {grade.isPending
                  ? 'جارٍ اعتماد الدرجة…'
                  : pending.length === 0
                    ? 'اعتماد الدرجة النهائية'
                    : 'حفظ التصحيح واعتماد الدرجة'}
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
    <div className="exa-row exa-row-top">
      <bdi className="exa-order">{order}</bdi>
      <div className="exa-row-main">
        <div className="exa-row-title exa-row-title-wrap" title={q.prompt}>{q.prompt}</div>
        <div className="exa-row-sub">
          <Badge>{QTYPE_LABEL[q.type]}</Badge>
          <Badge color={DIFFICULTY_COLOR[q.difficulty]}>{DIFFICULTY_LABEL[q.difficulty]}</Badge>
          {q.category && <span>{q.category.title}</span>}
          <span className="exa-points">
            {countAr(points, ['نقطة واحدة', 'نقطتان', 'نقاط', 'نقطة'])}
            {row.pointsOverride !== null && ' (معدَّلة)'}
          </span>
          {!q.isApproved && <Badge color="red" icon={Ban}>موقوف</Badge>}
        </div>
        {/* Answer key — the backend nulls correctAnswer for every viewer
            it is not for; null renders nothing (never a fake key). */}
        {key && (
          <p className="exa-key">
            <Icon icon={CheckCircle2} size={11} /> {key}
          </p>
        )}
        {!q.isApproved && q.moderationNote && (
          <p className="exa-row-note">
            <Icon icon={Info} size={11} /> {q.moderationNote}
          </p>
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
    <div className="exa-mod-actions-col">
      {isApproved ? (
        <Button variant="ghost" size="sm" loading={moderateQ.isPending} onClick={() => void run(false)}>
          <Icon icon={Ban} size={12} /> {moderateQ.isPending ? 'جارٍ الإيقاف…' : 'إيقاف السؤال'}
        </Button>
      ) : (
        <Button variant="ghost" size="sm" loading={moderateQ.isPending} onClick={() => void run(true)}>
          <Icon icon={BadgeCheck} size={12} /> {moderateQ.isPending ? 'جارٍ الاعتماد…' : 'اعتماد السؤال'}
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
    <section className="exa-panel" aria-label="قرار المراجعة">
      <h2 className="exa-panel-title">قرار المراجعة</h2>
      <p className="exa-panel-sub">الحالة: {EXAM_STATUS_LABEL[template.status]}</p>
      {template.status === 'PENDING_REVIEW' ? (
        <>
          <FormField label="ملاحظة للمؤلف (اختياري)" id="mod-note" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            <textarea
              className="input"
              rows={2}
              maxLength={500}
              placeholder="تصل الملاحظة للمؤلف مع قرار الاعتماد أو الرفض…"
              aria-label="ملاحظة المراجعة للمؤلف"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </FormField>
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
        <p className="exa-panel-sub">
          يمكنك مراجعة أسئلته أدناه وإيقاف أيّ سؤال غير مناسب.
        </p>
      )}
      {failed && (
        <div className="form-error tq-feedback" role="alert">
          <Icon icon={AlertTriangle} size={14} />
          <span className="form-error-msg">{apiErrorMessage(failed.error, 'تعذَّر تنفيذ القرار — تحقّق من اتصالك وحاول مرة أخرى.')}</span>
          <button type="button" className="btn ghost sm" onClick={() => void run(failed.approve)}>
            إعادة المحاولة
          </button>
        </div>
      )}
    </section>
  );
}
