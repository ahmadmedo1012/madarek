/**
 * T3-F3 — Student assignment submission validation tests.
 *
 * Covers the at-least-one-field rule (and the fileUrl format rule) that
 * guards the submit modal in CoursesPage:
 *   - pure rule: validateSubmissionDraft
 *   - wiring: the modal renders the Arabic validation message, blocks
 *     mutateAsync on invalid drafts, and submits valid ones
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import {
  validateSubmissionDraft,
  type StudentDashboard,
} from '../../src/hooks/useResources';
import { SubmitAssignmentModal, type SubmitModalAssignment } from '../../src/pages/student/CoursesPage';

// Replace only the mutation hook; keep the real validators (and every
// other export) from the actual module.
const h = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useSubmitAssignment: () => ({
      mutateAsync: h.mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    }),
  };
});

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

const assignment: SubmitModalAssignment = {
  id: 'a1',
  title: 'مشروع UML للتصميم',
  type: 'PROJECT',
  dueAt: new Date(Date.now() + 86_400_000).toISOString(),
  courseName: 'هندسة البرمجيات',
  courseCode: 'SE101',
} satisfies StudentDashboard['agenda']['assignments'][number];

describe('validateSubmissionDraft (at-least-one-field rule)', () => {
  it('rejects a fully empty draft', () => {
    expect(validateSubmissionDraft({})).not.toBeNull();
    expect(validateSubmissionDraft({ textAnswer: '   ', fileUrl: '   ' })).not.toBeNull();
  });

  it('accepts a text answer alone', () => {
    expect(validateSubmissionDraft({ textAnswer: 'إجابتي' })).toBeNull();
  });

  it('accepts an external https file URL alone', () => {
    expect(validateSubmissionDraft({ fileUrl: 'https://example.com/paper.pdf' })).toBeNull();
  });

  it('accepts an internal papers path alone', () => {
    expect(validateSubmissionDraft({ fileUrl: '/api/v1/files/papers/p1.pdf' })).toBeNull();
  });

  it('rejects non-https external URLs', () => {
    expect(validateSubmissionDraft({ fileUrl: 'http://example.com/paper.pdf' })).not.toBeNull();
    expect(validateSubmissionDraft({ textAnswer: 'نص', fileUrl: 'ftp://x' })).not.toBeNull();
  });
});

describe('SubmitAssignmentModal validation wiring', () => {
  beforeEach(() => {
    h.mutateAsync.mockReset();
    h.mutateAsync.mockResolvedValue({ id: 's1', status: 'SUBMITTED' });
  });

  it('shows the Arabic error and does NOT submit when both fields are empty', async () => {
    render(<SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    expect(screen.getByRole('alert').textContent).toContain('أدخل إجابة نصية أو رابط ملف على الأقل');
    expect(h.mutateAsync).not.toHaveBeenCalled();
    // form still open — no success state
    expect(screen.queryByText('تمّ التسليم بنجاح')).toBeNull();
  });

  it('rejects an invalid file URL with the Arabic format error', async () => {
    render(<SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('رابط ملف (اختياري)'), {
      target: { value: 'http://example.com/x.pdf' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    expect(screen.getByRole('alert').textContent).toContain('https://');
    expect(h.mutateAsync).not.toHaveBeenCalled();
  });

  it('submits a valid text-only draft and shows the submitted state', async () => {
    render(<SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('إجابتك النصيّة'), {
      target: { value: '  إجابتي على الواجب  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    expect(h.mutateAsync).toHaveBeenCalledTimes(1);
    expect(h.mutateAsync).toHaveBeenCalledWith({ textAnswer: 'إجابتي على الواجب', fileUrl: undefined });
    expect(screen.getByText('تمّ التسليم بنجاح')).toBeInTheDocument();
  });

  it('accepts an internal papers path as the only field', async () => {
    render(<SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('رابط ملف (اختياري)'), {
      target: { value: '/api/v1/files/papers/p1.pdf' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    expect(h.mutateAsync).toHaveBeenCalledWith({ textAnswer: undefined, fileUrl: '/api/v1/files/papers/p1.pdf' });
  });

  it('flags a LATE submission with the warning state', async () => {
    h.mutateAsync.mockResolvedValue({ id: 's2', status: 'LATE' });
    render(<SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('إجابتك النصيّة'), {
      target: { value: 'إجابة متأخرة' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    expect(screen.getByText('تمّ التسليم — بعد الموعد النهائي')).toBeInTheDocument();
    expect(screen.getByText(/سيُعلَّم تسليمك كمتأخر/)).toBeInTheDocument();
  });
});
