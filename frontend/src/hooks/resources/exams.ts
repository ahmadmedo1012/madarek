// exams.ts — r153c domain split of ../useResources.ts (exams domain: question bank · templates · moderation · attempts · grading · review.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';

// ── Exams ──────────────────────────────────────────────────────
export type QType = 'MCQ' | 'TRUE_FALSE' | 'SHORT' | 'ESSAY';
export type ExamKindFE = 'QUIZ' | 'MIDTERM' | 'FINAL' | 'PRACTICE';
export type ExamStatusFE = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'CLOSED';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionRow {
  id: string;
  type: QType;
  prompt: string;
  difficulty: Difficulty;
  points: number;
  category: { title: string; slug: string; iconEmoji: string | null };
  choices: string[] | null;
  author: string;
  tags: string[];
}
export function useQuestionBank(filter?: { categoryId?: string; difficulty?: Difficulty; type?: QType; q?: string }) {
  const qs = new URLSearchParams();
  if (filter?.categoryId) qs.set('categoryId', filter.categoryId);
  if (filter?.difficulty) qs.set('difficulty', filter.difficulty);
  if (filter?.type) qs.set('type', filter.type);
  if (filter?.q) qs.set('q', filter.q);
  const query = qs.toString() ? `?${qs}` : '';
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['question-bank', filter], inst),
    queryFn: () => unwrap<QuestionRow[]>(api.get('/question-bank' + query)),
  });
}

export interface QuestionCategoryRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  iconEmoji: string | null;
  isShared: boolean;
  faculty: { name: string } | null;
  department: { name: string } | null;
  _count: { questions: number };
}
export function useQuestionCategories() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['question-bank', 'categories'], inst),
    queryFn: () => unwrap<QuestionCategoryRow[]>(api.get('/question-bank/categories')),
  });
}

export interface ExamTemplateRow {
  id: string;
  title: string;
  kind: ExamKindFE;
  status: ExamStatusFE;
  durationMin: number;
  passingScore: number;
  openAt: string | null;
  closeAt: string | null;
  offering: { id: string; course: { name: string; code: string; iconEmoji: string | null } } | null;
  faculty: { name: string } | null;
  author: { firstName: string; lastName: string };
  _count: { questions: number; attempts: number };
}
export function useExamTemplates() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['exams', 'templates'], inst),
    queryFn: () => unwrap<ExamTemplateRow[]>(api.get('/exams/templates')),
  });
}

/** Full template payload of GET /exams/templates/:id. `correctAnswer` is
 *  nulled server-side for every viewer the answer key is not for (the
 *  author, ADMIN/OWNER oversight, QUALITY holding EXAMS_MODERATE —
 *  exams.routes.ts canSeeAnswers) — null here is a wire truth, not a
 *  missing field. Question-level `isApproved` / `moderationNote` are the
 *  moderation state of each bank question (the only read surface that
 *  exposes them — the bank listing filters to approved only). */
export interface ExamTemplateDetail {
  id: string;
  title: string;
  description: string | null;
  kind: ExamKindFE;
  status: ExamStatusFE;
  durationMin: number;
  passingScore: number;
  randomized: boolean;
  moderationNote: string | null;
  openAt: string | null;
  closeAt: string | null;
  offeringId: string | null;
  facultyId: string | null;
  authorId: string;
  createdAt: string;
  offering: { id: string; teacherId: string; course: { name: string; code: string } } | null;
  faculty: { name: string } | null;
  author: { firstName: string; lastName: string };
  moderatedBy: { firstName: string; lastName: string } | null;
  questions: Array<{
    id: string;
    order: number;
    pointsOverride: number | null;
    question: {
      id: string;
      type: QType;
      prompt: string;
      choices: string[] | null;
      correctAnswer: string | number | boolean | null;
      difficulty: Difficulty;
      points: number;
      isApproved: boolean;
      moderationNote: string | null;
      tags: string[];
      category: { title: string } | null;
    };
  }>;
  _count: { attempts: number };
}
export function useExamTemplate(id: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['exams', 'templates', id], inst),
    enabled: !!id,
    queryFn: () => unwrap<ExamTemplateDetail>(api.get(`/exams/templates/${id}`)),
  });
}

/** POST /question-bank body — mirrors the backend's createQuestionSchema
 *  (MCQ/TRUE_FALSE carry choices + an integer correctAnswer index,
 *  SHORT carries a model-answer string, ESSAY an optional rubric). */
export interface CreateQuestionInput {
  categoryId: string;
  type: QType;
  prompt: string;
  choices?: string[];
  correctAnswer?: string | number;
  difficulty: Difficulty;
  points: number;
  tags: string[];
}
export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    // New questions land in moderation (isApproved: false) — they enter
    // the bank listing only after an EXAMS_MODERATE holder approves.
    mutationFn: (input: CreateQuestionInput) =>
      unwrap<{ id: string; isApproved: boolean }>(api.post('/question-bank', input)),
    onSuccess: () => {
      // Family-level: covers every filter view + the categories query
      // (['question-bank','categories']) whose _count.questions shifts.
      qc.invalidateQueries({ queryKey: ['question-bank'] });
    },
  });
}

/** POST /exams/templates body — questionIds are 1..60 approved bank
 *  questions; openAt/closeAt are ISO strings the backend coerces to Date. */
export interface CreateExamTemplateInput {
  offeringId?: string;
  facultyId?: string;
  title: string;
  kind: ExamKindFE;
  description?: string;
  durationMin: number;
  passingScore: number;
  randomized: boolean;
  questionIds: string[];
  openAt?: string;
  closeAt?: string;
}
export function useCreateExamTemplate() {
  const qc = useQueryClient();
  return useMutation({
    // Creation writes PENDING_REVIEW directly (the moderation gate).
    mutationFn: (input: CreateExamTemplateInput) =>
      unwrap<ExamTemplateRow>(api.post('/exams/templates', input)),
    onSuccess: () => {
      // ['exams'] covers the templates list + detail + the moderation
      // queue; the Intelligence offering cards carry _count.examTemplates.
      qc.invalidateQueries({ queryKey: ['exams'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
    },
  });
}

/** Author publish — the backend only flips APPROVED→PUBLISHED while the
 *  row is still APPROVED (a landing rejection 409s, never leapfrogs). */
export function usePublishExamTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      unwrap<ExamTemplateRow>(api.post(`/exams/templates/${templateId}/publish`, {})),
    onSuccess: () => {
      // PUBLISHED templates surface in the student exam list + every
      // author/moderation view — the ['exams'] family covers all of them.
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

/** Question-level moderation (POST /question-bank/:id/moderate) — the
 *  same approve/note body as the template moderate endpoint. Approval
 *  flips the question into every bank filter view; a rejection pulls it
 *  from the authoring pool (existing templates keep their rows). */
export function useModerateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      unwrap<{ id: string; isApproved: boolean }>(api.post(`/question-bank/${id}/moderate`, { approve, note })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['question-bank'] });
      // Template detail payloads embed the moderated question rows.
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export interface ModerationQueueItem {
  id: string;
  title: string;
  kind: ExamKindFE;
  durationMin: number;
  createdAt: string;
  offering: { course: { name: string } } | null;
  author: { firstName: string; lastName: string };
  _count: { questions: number };
}
export function useExamModerationQueue() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['exams', 'moderation-queue'], inst),
    queryFn: () => unwrap<ModerationQueueItem[]>(api.get('/exams/moderation-queue')),
  });
}

export function useModerateExam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve, note }: { id: string; approve: boolean; note?: string }) =>
      unwrap<{ id: string; status: ExamStatusFE }>(api.post(`/exams/templates/${id}/moderate`, { approve, note })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

/* ── Manual grading (18-F2 — the exam lifecycle's missing half) ── */

export type ExamAttemptStatusFE = 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED';

/** One parked answer of a SUBMITTED exam attempt — the grading modal's
 *  unit of work (essays and keyless shorts the auto-grader parked).
 *  `studentAnswer` is the chosen option's text for objective questions,
 *  the prose otherwise; null = the student wrote nothing. */
export interface PendingExamAnswer {
  answerId: string;
  questionId: string;
  prompt: string;
  type: QType;
  points: number;
  studentAnswer: string | null;
}

/** GET /exams/templates/:id/attempts row. `pendingReview` counts the
 *  answers awaiting a verdict; `pendingAnswers` embeds their grading
 *  detail ONLY on SUBMITTED rows — the one status the grade write
 *  accepts (IN_PROGRESS is mid-exam, EXPIRED is terminal; both ship an
 *  honest count with an empty array). */
export interface ExamAttemptRow {
  id: string;
  studentId: string;
  studentName: string;
  status: ExamAttemptStatusFE;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  maxScore: number;
  pendingReview: number;
  pendingAnswers: PendingExamAnswer[];
}

/** The attempts of one template for the grading surface — keyed under
 *  the template detail key, so both refresh together (the ['exams']
 *  family reaches them all). */
export function useExamAttempts(templateId: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['exams', 'templates', templateId, 'attempts'], inst),
    enabled: !!templateId,
    queryFn: () => unwrap<ExamAttemptRow[]>(api.get(`/exams/templates/${templateId}/attempts`)),
  });
}

/** POST /exams/attempts/:attemptId/grade body — mirrors the backend's
 *  manualGradeSchema: every pending answer exactly once (isCorrect +
 *  optional feedback ≤ 2000), finalize SUBMITTED → GRADED with the
 *  machine score + the teacher's verdicts. */
export interface ManualExamGradeInput {
  attemptId: string;
  answers: Array<{ answerId: string; isCorrect: boolean; feedback?: string }>;
}
export function useGradeExamAttempt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ManualExamGradeInput) =>
      unwrap<{ score: number; maxScore: number; status: string; passed: boolean }>(
        api.post(`/exams/attempts/${input.attemptId}/grade`, { answers: input.answers }),
      ),
    onSuccess: () => {
      // Finalizing SUBMITTED→GRADED shifts the attempts list, the
      // detail's _count.attempts and the author's template rows — the
      // ['exams'] family covers all of them.
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });
}

export interface MyExam {
  id: string;
  title: string;
  kind: ExamKindFE;
  durationMin: number;
  questionCount: number;
  passingScore: number;
  openAt: string | null;
  closeAt: string | null;
  courseName: string | null;
  courseIcon: string | null;
  facultyName: string | null;
  myAttempt: { id: string; status: string; score: number | null; maxScore: number; submittedAt: string | null } | null;
}
export function useMyExams() {
  const inst = useInstitutionScope();
  return useQuery({
    /* r180: GET /exams/me is institution-scoped server-side — the key
     * carries the scope segment (switch re-keys, no stale flash). */
    queryKey: withInstitutionScope(['exams', 'me'], inst),
    queryFn: () => unwrap<MyExam[]>(api.get('/exams/me')),
  });
}

export interface StartedAttempt {
  attemptId: string;
  expiresAt: string;
  durationMin: number;
  title: string;
  /** Present (as `true`) only on the TERMINAL start response. Declared
   *  as the literal `true` — not `boolean` — so the optional property
   *  doubles as a discriminant: `if (r.alreadyAttempted)` narrows the
   *  StartExamResponse union (the wire never sends `false`). */
  alreadyAttempted?: true;
  questions: Array<{ id: string; type: QType; prompt: string; choices: string[] | null; points: number }>;
}
/* D5 (WAVE-12-MAP, backend batch 12-1) — exam resume contract: when an
   IN_PROGRESS attempt exists, POST /exams/templates/:id/start returns the
   fresh-start shape PLUS `resumed: true` and the saved attempt; a GRADED /
   EXPIRED / SUBMITTED attempt answers with a TERMINAL `{ attemptId,
   status, alreadyAttempted: true }` that carries no questions, expiry or
   title. `value` is the raw saved input — the choice index for MCQ /
   TRUE_FALSE, the answer text otherwise (null when nothing was
   saved); the object form is accepted defensively. */
export interface SavedAnswerValue {
  choiceIndex?: number | null;
  answerText?: string | null;
}
export interface ResumedAttempt {
  id: string;
  status: string;
  expiresAt: string;
  answers: Array<{ questionId: string; value: SavedAnswerValue | number | string | null }>;
}
/* 15-c P1-3 — the backend ships three disjoint payloads with no tag of
   its own (exams.routes.ts start route: fresh 201 / resume 200 /
   terminal 200). The old flat type declared questions + expiresAt +
   durationMin + title on EVERY response, so the terminal shape was a
   type-level lie any future consumer could crash on. The union is
   discriminated by a `type` tag attached client-side (the backend is
   unchanged — see tagStartExamResponse), and the raw `alreadyAttempted`
   flag stays accessible so existing consumers' `if (r.alreadyAttempted)`
   early-return compiles and narrows unchanged. */
export type StartExamResponse =
  | (StartedAttempt & { type: 'fresh'; resumed?: undefined; attempt?: undefined })
  | (StartedAttempt & { type: 'resumed'; resumed: true; attempt: ResumedAttempt })
  | { type: 'alreadyAttempted'; attemptId: string; status: string; alreadyAttempted: true };

/** Untagged wire payload of POST /exams/templates/:id/start — exactly
 *  what the backend sends: a start-OK shape (fresh, or resume with the
 *  saved answers) or the terminal no-questions shape. No `type` field
 *  exists on the wire; the union is discriminated structurally. */
export type StartExamWire =
  | (StartedAttempt & { resumed?: boolean; attempt?: ResumedAttempt })
  | { attemptId: string; status: string; alreadyAttempted: true };

/** Attach the `type` discriminant to a raw start response (15-c P1-3):
 *  the terminal payload carries `alreadyAttempted: true` and no
 *  questions; a resume carries `resumed: true` + the saved attempt;
 *  everything else is a fresh start. Pure and exported so the union
 *  contract is unit-pinned without a server. */
export function tagStartExamResponse(wire: StartExamWire): StartExamResponse {
  if ('questions' in wire) {
    // Start-OK payload — rebuild the normalized base so the tagged
    // result carries exactly the declared fields (wire-only extras
    // like a stray `resumed: false` never leak through).
    const base: StartedAttempt = {
      attemptId: wire.attemptId,
      expiresAt: wire.expiresAt,
      durationMin: wire.durationMin,
      title: wire.title,
      questions: wire.questions,
    };
    if (wire.resumed === true && wire.attempt) {
      return { ...base, type: 'resumed', resumed: true, attempt: wire.attempt };
    }
    return { ...base, type: 'fresh' };
  }
  // Terminal payload — the attempt is closed for this student
  // (GRADED / EXPIRED / SUBMITTED awaiting grading).
  return {
    type: 'alreadyAttempted',
    attemptId: wire.attemptId,
    status: wire.status,
    alreadyAttempted: true,
  };
}

export function useStartExam() {
  return useMutation({
    // The backend sends one of three disjoint payloads with no tag of
    // its own — tagStartExamResponse attaches the `type` discriminant
    // so consumers branch on a truthful union (15-c P1-3).
    mutationFn: async (templateId: string) =>
      tagStartExamResponse(
        await unwrap<StartExamWire>(api.post(`/exams/templates/${templateId}/start`, {})),
      ),
  });
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: ({ attemptId, questionId, answerText, choiceIndex }: { attemptId: string; questionId: string; answerText?: string; choiceIndex?: number }) =>
      unwrap<{ ok: boolean }>(api.post(`/exams/attempts/${attemptId}/answer`, { questionId, answerText, choiceIndex })),
  });
}

export function useFinishExam() {
  const qc = useQueryClient();
  return useMutation({
    // `passed` is null while manual grading pends (needsManual > 0) —
    // the backend deliberately withholds the verdict (15-c P1-1);
    // consumers must render a neutral state, never a failed one.
    mutationFn: (attemptId: string) =>
      unwrap<{ score: number; maxScore: number; status: string; needsManual: number; passed: boolean | null }>(
        api.post(`/exams/attempts/${attemptId}/submit`, {}),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams', 'me'] });
      /* r165a: a finished attempt also leaves the dashboard agenda —
       * the server's ['me','dashboard'] agenda excludes finished exam
       * attempts, but that query caches for 60s, so a just-finished
       * exam kept advertising itself on the student's home. Same
       * one-line pattern useSubmitAssignment ships. */
      qc.invalidateQueries({ queryKey: ['me', 'dashboard'] });
    },
  });
}

/* 5-D3 (5-B3 hand-off #1 / A6 P2-4): the student's own post-grading
 * review — GET /exams/attempts/:id/review (STUDENT, own attempt,
 * GRADED-only server-side). `correctAnswer` is the released key:
 * MCQ/TRUE_FALSE choice index, SHORT model answer, null for ESSAY
 * (the rubric stays teacher-side) and keyless shorts. */
export interface AttemptReviewQuestion {
  questionId: string;
  type: QType;
  prompt: string;
  choices: string[] | null;
  points: number;
  myChoiceIndex: number | null;
  myAnswerText: string | null;
  isCorrect: boolean | null;
  awardedPoints: number | null;
  feedback: string | null;
  correctAnswer: string | number | null;
}
export interface AttemptReview {
  attemptId: string;
  templateTitle: string;
  score: number | null;
  maxScore: number;
  submittedAt: string | null;
  questions: AttemptReviewQuestion[];
}
export function useExamReview(attemptId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['exams', 'review', attemptId],
    enabled,
    // A graded attempt's answers are immutable — refetching on every
    // mount buys nothing.
    staleTime: 5 * 60_000,
    queryFn: () => unwrap<AttemptReview>(api.get(`/exams/attempts/${attemptId}/review`)),
  });
}
