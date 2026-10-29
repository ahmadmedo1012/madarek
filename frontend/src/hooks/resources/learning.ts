// learning.ts — r153c domain split of ../useResources.ts (learning domain: lectures + watch events · curriculum authoring · offering detail (full).)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';

// ── Lectures ───────────────────────────────────────────────────
export interface Lecture {
  id: string;
  offeringId: string;
  title: string;
  description?: string | null;
  ordinal: number;
  durationSec: number;
  videoUrl: string;
  posterUrl?: string | null;
  /** r323 B2.3 — the captions sidecar's serving path (set by the
   * teacher's SRT/VTT upload; the player's <track> + the knowledge
   * indexer read it). */
  transcriptUrl?: string | null;
  createdAt: string;
  _count?: { chapters: number; checkpoints: number };
  watchEvents?: Array<{ watchedSec: number; totalSec: number; completed: boolean }>;
  /** r164d (course flow): how many of this lecture's checkpoints the
   * STUDENT has answered — projected ONLY by GET /offerings/:id/full
   * (learning.routes.ts answeredCheckpointsByLecture) for STUDENT
   * tokens; the sibling list (useOfferingLectures) and every staff
   * read omit it. Absent ⇒ treat as "unknown", NOT 0 — see
   * pendingCheckpoints(). */
  answeredCheckpoints?: number;
}
export function useOfferingLectures(offeringId: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['offerings', offeringId, 'lectures'], inst),
    queryFn: () => unwrap<Lecture[]>(api.get(`/offerings/${offeringId}/lectures`)),
    enabled: Boolean(offeringId),
  });
}

export interface LectureChapter {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  ordinal: number;
  conceptId: string | null;
  concept: { id: string; name: string } | null;
}
export interface LectureCheckpoint {
  id: string;
  triggerSec: number;
  question: string;
  options: string[];
  conceptId: string | null;
  /** r157 (W2-F7 / 6A5): the student's own CheckpointAnswer rows,
   * projected by GET /lectures/:id as bare checkpointIds (one per
   * answered checkpoint). Optional — only STUDENTs get the field;
   * teacher/oversight reads carry no answers at all. Never contains
   * answerIndex/correct (privacy of attempts). */
  answers?: Array<{ checkpointId: string }>;
}
export interface LectureDetail extends Lecture {
  chapters: LectureChapter[];
  checkpoints: LectureCheckpoint[];
  offering: {
    id: string;
    course: { id: string; name: string; code: string; themeColor?: string | null };
    teacher: { id: string; firstName: string; lastName: string };
  };
}
export function useLecture(lectureId: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['lectures', lectureId], inst),
    queryFn: () => unwrap<LectureDetail>(api.get(`/lectures/${lectureId}`)),
    enabled: Boolean(lectureId),
  });
}
export function useReportWatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { lectureId: string; watchedSec: number; totalSec: number; completed?: boolean }) =>
      unwrap<WatchEventResult>(
        api.post(`/lectures/${input.lectureId}/watch`, {
          watchedSec: input.watchedSec,
          totalSec: input.totalSec,
          completed: input.completed,
        }),
      ),
    /* PP-X2 (audit P2-10): completing a lecture changes numbers that
     * live in THREE cached families — the dashboard KPIs + the resume
     * card (['me', …]), the course cards' progressPct + the course
     * detail's lecture list (['offerings', …]) — all behind staleTimes
     * up to 60s. Without this invalidation the moment of achievement
     * («مكتملة» + the new average) didn't show until a stale window
     * expired, which reads as the platform ignoring the work. Fires
     * only when the SAVED event is completed (the server merges
     * monotonic completion), so ordinary 10s progress ticks — which
     * never complete anything — stay invalidation-free. */
    onSuccess: (data) => {
      if (!data?.completed) return;
      qc.invalidateQueries({ queryKey: ['offerings'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      // The player page's own lecture key — so «مكتملة» + the 100%
      // watch bar land on the page the completion happened on, not on
      // the next visit (live-verified: the badge stayed stale without
      // it while the checkpoint loop kept the page mounted).
      qc.invalidateQueries({ queryKey: ['lectures'] });
    },
  });
}

/* The /lectures/:id/watch response body (learning.routes.ts returns the
 * upserted WatchEvent) — consumed by the invalidation gate above. */
interface WatchEventResult {
  completed: boolean;
  watchedSec: number;
  totalSec: number;
}
export function useAnswerCheckpoint() {
  return useMutation({
    mutationFn: (input: { lectureId: string; checkpointId: string; answerIndex: number }) =>
      unwrap<{ correct: boolean; correctIndex: number; explanation?: string }>(
        api.post(
          `/lectures/${input.lectureId}/checkpoints/${input.checkpointId}/answer`,
          { answerIndex: input.answerIndex },
        ),
      ),
  });
}

// ── Curriculum authoring (lectures · chapters · checkpoints) ──
// Mirrors backend/src/http/routes/curriculum.routes.ts (TEACHER/ADMIN/OWNER,
// zod strict). Reads stay on useOfferingLectures / useLecture above — these
// are the write paths. Every mutation invalidates the read keys so the
// "إدارة المنهج" panel refetches immediately.
//
// PATCH semantics: axios drops undefined keys from the JSON body, so the
// caller sends ONLY the changed fields — an omitted field keeps its DB
// value (the server schema is .partial()). There is no isPublished flag
// on the Lecture model, so partial field updates are the whole contract.

export interface LectureWriteInput {
  title: string;
  description?: string;
  videoUrl: string;
  durationSec?: number;
  ordinal?: number;
}
export interface LecturePatchInput {
  lectureId: string;
  title?: string;
  /** Empty string clears the description server-side; undefined = keep. */
  description?: string;
  videoUrl?: string;
  durationSec?: number;
  ordinal?: number;
}
export function useCreateLecture(offeringId: string) {
  const qc = useQueryClient();
  return useMutation({
    // 201 → { data: <lecture> }
    mutationFn: (input: LectureWriteInput) =>
      unwrap<Lecture>(api.post(`/offerings/${offeringId}/lectures`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offerings', offeringId] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
    },
  });
}
export function useUpdateLecture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lectureId, ...patch }: LecturePatchInput) =>
      unwrap<Lecture>(api.patch(`/lectures/${lectureId}`, patch)),
    onSuccess: (_data, vars) => {
      // The hook doesn't know the parent offering — prefix-invalidate both
      // the lecture detail key and every offering list/detail key.
      qc.invalidateQueries({ queryKey: ['lectures', vars.lectureId] });
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
    },
  });
}
/* r152b (A5 P2): atomic full-list reorder — replaces the FE's old
 * two-PATCH neighbor swap, whose partial failure left two lectures
 * sharing one ordinal (the list then shuffles non-deterministically).
 * The server rewrites every ordinal 0..n-1 in one transaction. */
export function useReorderLectures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offeringId, ids }: { offeringId: string; ids: string[] }) =>
      unwrap<{ ok: true; count: number }>(
        api.post(`/offerings/${offeringId}/lectures/reorder`, { ids }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
    },
  });
}
export function useDeleteLecture() {
  const qc = useQueryClient();
  return useMutation({
    // 409 with an Arabic message when WatchEvents exist (student watch
    // history RESTRICTs the FK) — surfaced inline via apiErrorMessage.
    mutationFn: (lectureId: string) =>
      unwrap<{ ok: true }>(api.delete(`/lectures/${lectureId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'offerings'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
    },
  });
}

export interface ChapterWriteInput {
  title: string;
  startSec: number;
  endSec: number;
}
export interface ChapterPatchInput {
  chapterId: string;
  title?: string;
  startSec?: number;
  endSec?: number;
  /** 5-D3 (5-B6 hand-off #2): joined updateChapterBodySchema in wave
   *  26 — the FE chapter reorder swaps ordinals through PATCHes. */
  ordinal?: number;
}
export function useCreateChapter(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    // 201 → { data: <chapter> } (ordinal auto-assigned = max+1)
    mutationFn: (input: ChapterWriteInput) =>
      unwrap<LectureChapter>(api.post(`/lectures/${lectureId}/chapters`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures', lectureId] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useUpdateChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, ...patch }: ChapterPatchInput) =>
      unwrap<LectureChapter>(api.patch(`/chapters/${chapterId}`, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
/* r152b (A5 P2): atomic full-list chapter reorder — see useReorderLectures. */
export function useReorderChapters() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lectureId, ids }: { lectureId: string; ids: string[] }) =>
      unwrap<{ ok: true; count: number }>(
        api.post(`/lectures/${lectureId}/chapters/reorder`, { ids }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useDeleteChapter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) =>
      unwrap<{ ok: true }>(api.delete(`/chapters/${chapterId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}

export interface CheckpointWriteInput {
  /** NOTE: the API field is `question` (not `prompt`) — model invariant. */
  question: string;
  triggerSec: number;
  options: string[];
  correctIndex: number;
  conceptId?: string;
  explanation?: string;
}
export interface CheckpointPatchInput {
  checkpointId: string;
  question?: string;
  triggerSec?: number;
  options?: string[];
  /**
   * Send together with any options change — the server re-validates the
   * (options, correctIndex) pair and 400s when the index falls outside
   * the effective option list.
   */
  correctIndex?: number;
  conceptId?: string;
  explanation?: string;
}
export function useCreateCheckpoint(lectureId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckpointWriteInput) =>
      unwrap<LectureCheckpoint>(api.post(`/lectures/${lectureId}/checkpoints`, input)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures', lectureId] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useUpdateCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ checkpointId, ...patch }: CheckpointPatchInput) =>
      unwrap<LectureCheckpoint>(api.patch(`/checkpoints/${checkpointId}`, patch)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}
export function useDeleteCheckpoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkpointId: string) =>
      unwrap<{ ok: true }>(api.delete(`/checkpoints/${checkpointId}`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lectures'] });
      qc.invalidateQueries({ queryKey: ['offerings'] });
    },
  });
}

// ── Course offering detail (full) ──────────────────────────────
export interface OfferingFull {
  id: string;
  term: string;
  room?: string | null;
  course: {
    id: string;
    name: string;
    code: string;
    iconEmoji?: string | null;
    themeColor?: string | null;
    description?: string | null;
    credits: number;
    department: { id: string; name: string; faculty: { id: string; name: string } };
  };
  teacher: { id: string; firstName: string; lastName: string; avatarInitials?: string | null; avatarColor?: string | null };
  schedule: Array<{ id: string; dayOfWeek: number; startTime: string; endTime: string; room?: string | null }>;
  materials: Array<{ id: string; name: string; type: string; url: string; sizeBytes: string; createdAt: string }>;
  assignments: Array<{ id: string; title: string; type: string; dueAt: string; weight: number; maxScore: number }>;
  lectures: Array<Lecture & { _count: { chapters: number; checkpoints: number } }>;
  _count: { enrollments: number };
}
export function useOfferingFull(offeringId: string | undefined) {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['offerings', offeringId, 'full'], inst),
    queryFn: () => unwrap<OfferingFull>(api.get(`/offerings/${offeringId}/full`)),
    enabled: Boolean(offeringId),
  });
}

/* ── r164d (course flow): next-step selection (pure) ────────────────
 * The Coursera/edX "course home must point at one unmistakable next
 * action" rule. A lecture is FINISHED only when BOTH loops are closed:
 * the watch event is completed AND every checkpoint is answered —
 * r155a capped attempts per concept precisely because an unanswered
 * checkpoint is an open loop the student should be able to see and
 * close. Pure functions (no React) so tests pin the selection logic
 * directly; the pages feed them the server-ordered lecture list. */

/** Minimal lecture shape the selection needs — satisfied by both the
 * /full lecture rows and the useOfferingLectures rows. */
export interface NextLectureInput {
  id: string;
  title: string;
  watchEvents?: Array<{ watchedSec: number; totalSec: number; completed: boolean }>;
  _count?: { checkpoints: number };
  answeredCheckpoints?: number;
}

/** Checkpoints still open on a lecture. 0 when the answered count is
 * unknown (staff reads / older payloads) — the caller then degrades
 * honestly to watch-only completion instead of flagging every
 * checkpointed lecture as pending. */
export function pendingCheckpoints(l: NextLectureInput): number {
  const total = l._count?.checkpoints ?? 0;
  if (total === 0 || l.answeredCheckpoints === undefined) return 0;
  return Math.max(0, total - l.answeredCheckpoints);
}

/** Finished = watch completed AND no checkpoint left open. */
export function isLectureFinished(l: NextLectureInput): boolean {
  const completed = Array.isArray(l.watchEvents) && l.watchEvents.some((e) => e.completed);
  return completed && pendingCheckpoints(l) === 0;
}

/** The "التالي" target: the FIRST unfinished lecture in the given
 * (server-ordered) list — watch-OR-checkpoint open. null when the
 * whole curriculum is finished (the pages then render the honest
 * done state instead of a dead CTA). */
export function selectNextLecture<T extends NextLectureInput>(lectures: T[]): T | null {
  for (const l of lectures) {
    if (!isLectureFinished(l)) return l;
  }
  return null;
}
