/** Learning: enrollments, offerings, lectures, checkpoints, transcripts. */
import { get, post, patch, put, del } from "./client";
import type { EnrollmentRow, Lecture, LectureChapter, Material, Assignment, WatchEvent, CheckpointAnswerFeedback } from "./types";

export interface OfferingFull {
  id: string;
  term: string;
  room?: string | null;
  course: { id: string; code: string; name: string; nameEn?: string | null; description?: string | null; credits?: number | null; iconEmoji?: string | null; themeColor?: string | null; department?: { id: string; name: string } | null; faculty?: { id: string; name: string } | null; institution?: { id: string; name: string; slug: string } | null };
  teacher?: { id: string; firstName: string; lastName: string; avatarColor?: string | null; avatarInitials?: string | null } | null;
  schedule: { id: string; dayOfWeek: number; startTime: string; endTime: string; room?: string | null }[];
  materials: Material[];
  assignments: Assignment[];
  lectures: Lecture[];
}

export interface CourseCatalogRow {
  id: string;
  code: string;
  name: string;
  nameEn?: string | null;
  description?: string | null;
  credits?: number | null;
  iconEmoji?: string | null;
  themeColor?: string | null;
  department?: { id: string; name: string } | null;
  institution?: { id: string; name: string; nameEn?: string | null; slug: string } | null;
  [k: string]: unknown;
}

export const learningApi = {
  enrollments: () => get<EnrollmentRow[]>("/enrollments/me"),
  offerings: () => get<{ id: string; term: string; course: { id: string; name: string; code: string } }[]>("/offerings"),
  offering: (id: string) => get<OfferingFull>(`/offerings/${id}`),
  offeringFull: (id: string) => get<OfferingFull>(`/offerings/${id}/full`),
  courses: (q?: { page?: number; limit?: number; q?: string; institutionSlug?: string; departmentId?: string }) =>
    get<{ data: CourseCatalogRow[]; meta: { page: number; limit: number; total: number; totalPages: number } }>("/courses", q),
  lectures: (offeringId: string) => get<Lecture[]>(`/offerings/${offeringId}/lectures`),
  lecture: (id: string) => get<Lecture>(`/lectures/${id}`),
  watch: (id: string, payload: { watchedSec: number; totalSec: number; completed?: boolean }) =>
    post<WatchEvent>(`/lectures/${id}/watch`, payload),
  answerCheckpoint: (lectureId: string, checkpointId: string, answerIndex: number) =>
    post<CheckpointAnswerFeedback>(`/lectures/${lectureId}/checkpoints/${checkpointId}/answer`, { answerIndex }),
  // Teacher authoring
  createLecture: (offeringId: string, payload: { title: string; description?: string; ordinal?: number; durationSec?: number; videoUrl: string }) =>
    post<Lecture>(`/offerings/${offeringId}/lectures`, payload),
  updateLecture: (id: string, payload: Record<string, unknown>) => patch<Lecture>(`/lectures/${id}`, payload),
  deleteLecture: (id: string) => del<void>(`/lectures/${id}`),
  reorderLectures: (offeringId: string, orderedIds: string[]) => post<void>(`/offerings/${offeringId}/lectures/reorder`, { orderedIds }),
  addChapter: (lectureId: string, payload: { title: string; startSec: number; endSec: number; conceptId?: string }) =>
    post<LectureChapter>(`/lectures/${lectureId}/chapters`, payload),
  updateChapter: (lectureId: string, chapterId: string, payload: Record<string, unknown>) =>
    patch<LectureChapter>(`/chapters/${chapterId}`, payload),
  deleteChapter: (lectureId: string, chapterId: string) => del<void>(`/chapters/${chapterId}`),
  addCheckpoint: (lectureId: string, payload: { conceptId?: string | null; triggerSec: number; question: string; options: string[]; correctIndex: number; explanation?: string }) =>
    post<unknown>(`/lectures/${lectureId}/checkpoints`, payload),
  updateCheckpoint: (checkpointId: string, payload: Record<string, unknown>) =>
    patch<unknown>(`/checkpoints/${checkpointId}`, payload),
  deleteCheckpoint: (checkpointId: string) => del<void>(`/checkpoints/${checkpointId}`),
  transcriptStatus: (lectureId: string) => get<{ status: string; error?: string | null }>(`/lectures/${lectureId}/transcript/status`),
  generateTranscript: (lectureId: string) => post<unknown>(`/lectures/${lectureId}/transcript/generate`),
};
