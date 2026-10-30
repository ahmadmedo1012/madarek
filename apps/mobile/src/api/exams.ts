/** Exams: student attempts + teacher authoring + question bank + moderation. */
import { get, post, patch } from "./client";
import type { Paginated } from "./types";

export type ExamQuestionType = "MCQ" | "TRUE_FALSE" | "SHORT" | "ESSAY";
export type ExamKind = "QUIZ" | "MIDTERM" | "FINAL" | "PRACTICE";
export type ExamStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PUBLISHED" | "CLOSED";

export interface ExamQuestionRow {
  id: string;
  categoryId?: string | null;
  type: ExamQuestionType | string;
  prompt: string;
  choices?: string[] | null;
  correctAnswer?: unknown;
  difficulty: "EASY" | "MEDIUM" | "HARD" | string;
  points: number;
  tags?: string[];
  authorId?: string;
  isApproved?: boolean;
  moderationNote?: string | null;
  [k: string]: unknown;
}

export interface ExamTemplateRow {
  id: string;
  offeringId?: string | null;
  facultyId?: string | null;
  title: string;
  kind: ExamKind | string;
  description?: string | null;
  durationMin: number;
  passingScore?: number | null;
  randomized?: boolean;
  status: ExamStatus | string;
  openAt?: string | null;
  closeAt?: string | null;
  questionCount?: number;
  courseName?: string;
  courseIcon?: string | null;
  facultyName?: string;
  myAttempt?: { id: string; templateId: string; status: string; score?: number | null; maxScore?: number | null; submittedAt?: string | null } | null;
  [k: string]: unknown;
}

export interface StartExamPayload {
  attemptId: string;
  expiresAt: string;
  durationMin?: number;
  title?: string;
  questions: { id: string; type: ExamQuestionType | string; prompt: string; choices?: string[] | null; points: number }[];
  resumed?: boolean;
  attempt?: { id: string; status: string; expiresAt: string; answers: { questionId: string; value: number | string | null }[] };
  alreadyAttempted?: boolean;
  status?: string;
}

export interface SubmitExamResult {
  score: number;
  maxScore: number;
  status: string;
  needsManual: boolean;
  passed: boolean | null;
}

export interface ReviewPayload {
  attemptId: string;
  templateTitle?: string;
  score: number;
  maxScore: number;
  submittedAt?: string;
  questions: {
    questionId: string;
    type: string;
    prompt: string;
    choices?: string[] | null;
    points: number;
    myChoiceIndex?: number | null;
    myAnswerText?: string | null;
    isCorrect?: boolean | null;
    awardedPoints?: number | null;
    feedback?: string | null;
    correctAnswer?: unknown;
  }[];
}

export const examsApi = {
  myExams: () => get<ExamTemplateRow[]>("/exams/me"),
  start: (templateId: string) => post<StartExamPayload>(`/exams/templates/${templateId}/start`),
  answer: (attemptId: string, payload: { questionId: string; answerText?: string; choiceIndex?: number }) =>
    post<{ ok: boolean }>(`/exams/attempts/${attemptId}/answer`, payload),
  submit: (attemptId: string) => post<SubmitExamResult>(`/exams/attempts/${attemptId}/submit`),
  review: (attemptId: string) => get<ReviewPayload>(`/exams/attempts/${attemptId}/review`),
  // authoring
  templates: () => get<ExamTemplateRow[]>("/exams/templates"),
  template: (id: string) => get<ExamTemplateRow & { questions?: ExamQuestionRow[] }>(`/exams/templates/${id}`),
  createTemplate: (payload: { offeringId?: string; facultyId?: string; title: string; kind: string; description?: string; durationMin: number; passingScore?: number; randomized?: boolean; questionIds: string[]; openAt?: string; closeAt?: string }) =>
    post<ExamTemplateRow>("/exams/templates", payload),
  updateTemplate: (id: string, payload: Record<string, unknown>) => patch<ExamTemplateRow>(`/exams/templates/${id}`, payload),
  cloneTemplate: (id: string) => post<ExamTemplateRow>(`/exams/templates/${id}/clone`),
  publishTemplate: (id: string) => post<ExamTemplateRow>(`/exams/templates/${id}/publish`),
  moderateTemplate: (id: string, payload: { approve: boolean; note?: string }) => post<ExamTemplateRow>(`/exams/templates/${id}/moderate`, payload),
  attempts: (templateId: string) => get<unknown[]>(`/exams/templates/${templateId}/attempts`),
  gradeAttempt: (attemptId: string, answers: { answerId: string; isCorrect?: boolean; feedback?: string }[]) =>
    post<unknown>(`/exams/attempts/${attemptId}/grade`, { answers }),
  moderationQueue: () => get<ExamTemplateRow[]>("/exams/moderation-queue"),
  questionBank: (q?: { categoryId?: string; difficulty?: string; type?: string; q?: string }) =>
    get<{ data: ExamQuestionRow[]; meta: unknown }>("/question-bank", q),
  questionCategories: () => get<unknown[]>("/question-bank/categories"),
  createQuestion: (payload: { categoryId?: string; type: string; prompt: string; choices?: string[]; correctAnswer?: unknown; difficulty: string; points: number; tags?: string[] }) =>
    post<ExamQuestionRow>("/question-bank", payload),
  moderateQuestion: (id: string, payload: { approve: boolean; note?: string }) => post<unknown>(`/question-bank/${id}/moderate`, payload),
};
