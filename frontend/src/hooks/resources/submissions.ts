// submissions.ts — r153c domain split of ../useResources.ts (assignment submissions domain (validate/submit/grade).)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';

// ── Assignment submissions (student submit + teacher grade) ────
export type SubmissionStatusFE = 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED' | 'DRAFT';

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  textAnswer?: string | null;
  fileUrl?: string | null;
  status: SubmissionStatusFE;
  grade?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
}

/* r164-e (assessment loop) — the timeline's label contract. Every
 * student-facing surface that renders a submission status speaks the
 * SAME chip (short label + tone + what-happens-next hint), so the loop
 * reads identically on the results page, the agenda and any future
 * surface. Pure + exported for unit pinning. RETURNED has no writer in
 * the live state machine (enum value only) but keeps an honest label
 * so a future return transition renders correctly on day one. */
export function submissionStatusAr(status: SubmissionStatusFE): {
  label: string;
  color: 'green' | 'amber' | 'red' | 'brand';
  hint: string;
} {
  switch (status) {
    case 'SUBMITTED':
      return {
        label: 'بانتظار التقييم',
        color: 'amber',
        hint: 'وصلت إجابتك إلى قائمة تصحيح أستاذ المقرّر — سيصلك إشعار لحظة رصد الدرجة.',
      };
    case 'LATE':
      return {
        label: 'متأخر — بانتظار التقييم',
        color: 'amber',
        hint: 'سُجِّل تسليمك متأخراً؛ الحسم النهائي يعود إلى أستاذ المقرّر وسيصلك إشعار بالنتيجة.',
      };
    case 'GRADED':
      return {
        label: 'مُقيَّم',
        color: 'green',
        hint: 'رصد الأستاذ درجتك — راجع الدرجة وملاحظاته.',
      };
    case 'RETURNED':
      return {
        label: 'أعاده الأستاذ',
        color: 'red',
        hint: 'أعاد الأستاذ هذا التسليم إليك — راجع ملاحظاته.',
      };
    case 'DRAFT':
      return {
        label: 'مسوّدة',
        color: 'brand',
        hint: 'لم يُسلَّم هذا العمل بعد — أكمله قبل الموعد النهائي.',
      };
  }
}

export interface SubmitAssignmentInput {
  textAnswer?: string;
  fileUrl?: string;
}

/**
 * Client-side validation for the student submission form — shared with the
 * unit tests. Mirrors the server contract:
 *   - at least one of textAnswer / fileUrl must be non-empty
 *   - fileUrl (when present) must be an external https:// URL or an
 *     internal papers path (^/api/v1/files/papers/)
 * Returns an Arabic error message, or null when the draft is valid.
 */
export function validateSubmissionDraft(draft: SubmitAssignmentInput): string | null {
  const text = draft.textAnswer?.trim() ?? '';
  const file = draft.fileUrl?.trim() ?? '';
  if (!text && !file) {
    return 'أدخل إجابة نصية أو رابط ملف على الأقل قبل التسليم.';
  }
  // r158 (lead): the error copy no longer teaches the internal
  // /api/v1/files/papers/ namespace (a student cannot produce it — the
  // hint now says what they can actually do). The internal path STAYS
  // accepted here for compatibility with server-shaped links.
  if (file && !(/^https:\/\//.test(file) || file.startsWith('/api/v1/files/papers/'))) {
    return 'رابط الملف يجب أن يبدأ بـ https:// — وإجابتك النصيّة وحدها تكفي للتسليم.';
  }
  return null;
}

export function useSubmitAssignment(offeringId: string, assignmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    // Envelope matches WS-B1's mounted route: 201 → { data: <submission> }
    // (the submission row sits directly in `data`).
    mutationFn: (input: SubmitAssignmentInput) =>
      unwrap<Submission>(
        api.post(`/offerings/${offeringId}/assignments/${assignmentId}/submit`, input),
      ),
    onSuccess: () => {
      // Refresh the student agenda (submitted items drop out of the
      // upcoming list) and the teacher dashboard (needs-review count).
      qc.invalidateQueries({ queryKey: ['me', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
    },
  });
}

// 15-d P1-3: a grade flows into more than the two dashboards — the
// student's results page (['me','results'] recentAssignments / course
// gradePct) and, for the graded offering, the Intelligence page's student
// rows and analytics (avgGrade / passRate). The offering keys need the
// offering's id, so the signature takes it as an optional second param:
// call sites that cannot know it (the dashboard feed target carries only
// courseCode today) keep compiling and still refresh everything
// session-wide they could before.
export function useGradeSubmission(submissionId: string, offeringId?: string) {
  const qc = useQueryClient();
  return useMutation({
    // Envelope: { data: <graded submission> } with status GRADED.
    mutationFn: (input: { grade: number; feedback?: string }) =>
      unwrap<Submission>(
        api.post(`/submissions/${submissionId}/grade`, { grade: input.grade, feedback: input.feedback }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['me', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['me', 'results'] });
      /* r164-e: the Assignments page's «جميع الواجبات» list renders the
       * per-assignment submission counts from ['teacher','me',
       * 'assignments'] (60s staleTime) — without this invalidation a
       * landed grade left those counts stale on the very page the
       * teacher graded from. */
      qc.invalidateQueries({ queryKey: ['teacher', 'me', 'assignments'] });
      if (offeringId) {
        qc.invalidateQueries({ queryKey: ['teacher', 'offering', offeringId, 'students'] });
        qc.invalidateQueries({ queryKey: ['teacher', 'offering', offeringId, 'analytics'] });
      }
    },
  });
}
