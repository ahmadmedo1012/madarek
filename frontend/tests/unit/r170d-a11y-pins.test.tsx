/**
 * r170d — WCAG 2.2 keyboard/ARIA pins for the student surfaces.
 *
 * Round r170-d swept the top student routes (dashboard, courses list +
 * detail, lecture player, exams list, alerts, profile, research) plus the
 * public landing and /auth with keyboard-only traversal + ARIA semantics.
 * The surfaces were already largely sound (names, labels, associations,
 * live regions, traps, Escape contracts — evidence in the worklog); ONE
 * verified defect shipped from this round and is pinned here:
 *
 *   1. SubmitAssignmentModal — a failed validation kept focus on the
 *      submit button (WCAG 2.2 / 3.3.1 error identification + focus
 *      management): the error text existed and was aria-describedby
 *      associated, but a keyboard user had to Tab blindly to find the
 *      flagged field. The fix moves focus to the first invalid control.
 *
 * Plus two landing pins locking the keyboard contracts the sweep VERIFIED
 * live (probe evidence: Enter opens, Tab reaches all 4 items, Escape
 * closes + refocuses the trigger, aria-expanded tells the truth):
 *
 *   2. landing megamenu — Escape closes the group and returns focus to
 *      the «المنصة» trigger, with aria-expanded flipping false.
 *   3. landing skip link — the keyboard-only entry into #main exists
 *      with an accessible name.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { SubmitAssignmentModal, type SubmitModalAssignment } from '../../src/pages/student/CoursesPage';
import type { StudentDashboard } from '../../src/hooks/useResources';
import LandingPage from '../../src/pages/LandingPage';

/* ── modal: same mutation-mock convention as SubmissionModal.test.tsx ── */
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
  offeringId: 'off-1',
  title: 'مشروع UML للتصميم',
  type: 'PROJECT',
  dueAt: new Date(Date.now() + 86_400_000).toISOString(),
  courseName: 'هندسة البرمجيات',
  courseCode: 'SE101',
} satisfies StudentDashboard['agenda']['assignments'][number];

describe('r170d — SubmitAssignmentModal: focus moves to the first invalid field (WCAG 3.3.1)', () => {
  beforeEach(() => {
    h.mutateAsync.mockReset();
    h.mutateAsync.mockResolvedValue({ id: 's1', status: 'SUBMITTED' });
  });

  it('empty submit → error announced, associated, aria-invalid, and FOCUS on the answer field', async () => {
    render(
      <MemoryRouter>
        <SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />
      </MemoryRouter>,
    );
    const textarea = screen.getByLabelText('إجابتك النصيّة') as HTMLTextAreaElement;
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    // error text exists, is role=alert, and is aria-describedby-ASSOCIATED
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('أدخل إجابة نصية أو رابط ملف على الأقل');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(textarea.getAttribute('aria-describedby')).toContain(alert.id);

    // r170d fix: the first invalid control now HOLDS focus (was: the
    // submit button kept it, leaving keyboard users to hunt blind).
    expect(document.activeElement).toBe(textarea);

    // the failed attempt must not submit
    expect(h.mutateAsync).not.toHaveBeenCalled();
  });

  it('invalid file URL submit → focus also lands on the answer field (shared error slot)', async () => {
    render(
      <MemoryRouter>
        <SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />
      </MemoryRouter>,
    );
    const textarea = screen.getByLabelText('إجابتك النصيّة') as HTMLTextAreaElement;
    fireEvent.change(screen.getByLabelText('رابط ملف (اختياري)'), {
      target: { value: 'http://example.com/x.pdf' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    expect(screen.getByRole('alert').textContent).toContain('https://');
    expect(document.activeElement).toBe(textarea);
    expect(h.mutateAsync).not.toHaveBeenCalled();
  });

  it('a valid submit never steals focus (no error → no focus move)', async () => {
    render(
      <MemoryRouter>
        <SubmitAssignmentModal assignment={assignment} offeringId="off1" onClose={() => {}} />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('إجابتك النصيّة'), {
      target: { value: 'إجابتي على الواجب' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'تسليم الواجب' }));
    await flush();

    expect(h.mutateAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByText('تمّ التسليم بنجاح')).toBeInTheDocument();
    // the textarea is unmounted in the done state — nothing to focus
    expect(document.activeElement).toBe(document.body);
  });
});

/* ── landing: keyboard contracts verified live by the r170d probe ── */

/* JourneyLightPath boots a ResizeObserver jsdom doesn't ship — the same
 * per-file stub landing-funnel.test.tsx applies. */
beforeAll(() => {
  if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
    class ResizeObserverStub {
      observe(): void { /* no-op */ }
      unobserve(): void { /* no-op */ }
      disconnect(): void { /* no-op */ }
    }
    Object.defineProperty(window, 'ResizeObserver', {
      configurable: true,
      writable: true,
      value: ResizeObserverStub,
    });
  }
});

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderLanding() {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('r170d — landing megamenu keyboard contract (Escape + aria-expanded)', () => {
  it('Enter opens, aria-expanded=true; Escape closes, aria-expanded=false and focus returns to the trigger', () => {
    renderLanding();
    const trigger = screen.getByRole('button', { name: /المنصة/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-haspopup')).toBe('true');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    // all four megamenu items are named (icon+title+desc), so a keyboard
    // walk announces them — pin the names the probe verified live
    // (scoped to the megamenu: «مدارات الكلّيّات» also appears in the
    // hero/finale copy, so a global query matches more than one link).
    const menu = document.querySelector('.landing-megamenu') as HTMLElement;
    expect(menu).not.toBeNull();
    const items = within(menu).getAllByRole('link');
    expect(items).toHaveLength(4);
    for (const name of ['رحلة التعلّم', 'مدارات الكلّيّات', 'المساعد الأكاديمي', 'قصة التقدّم']) {
      expect(items.some((a) => (a.textContent || '').includes(name))).toBe(true);
    }

    // focus is inside the group (first item), Escape fires there
    const firstItem = items[0] as HTMLAnchorElement;
    expect(firstItem).toBeDefined();
    firstItem.focus();
    expect(document.activeElement).toBe(firstItem);
    fireEvent.keyDown(firstItem.closest('.landing-nav-group') as HTMLElement, { key: 'Escape' });

    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // the handler refocuses the trigger — the keyboard user is never
    // stranded inside a closed menu.
    expect(document.activeElement).toBe(trigger);
  });
});

describe('r170d — landing skip link (keyboard-only entry to #main)', () => {
  it('exposes a named skip link pointing at the main landmark', () => {
    renderLanding();
    const skip = screen.getByRole('link', { name: /تخطَّ إلى المحتوى/ });
    expect(skip.getAttribute('href')).toBe('#main');
    expect(document.getElementById('main')).not.toBeNull();
  });
});

/* Source-level pin: the fix itself (CoursesPage) must keep the ref-based
 * focus call — a regression that swaps it for getElementById or drops it
 * shows up here, not just in the browser. */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const coursesSrc = readFileSync(path.join(root, 'src/pages/student/CoursesPage.tsx'), 'utf8');
describe('r170d — source contract: CoursesPage focus-on-error', () => {
  it('focuses the answer textarea ref when validation fails', () => {
    const stripped = coursesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(stripped).toContain('textAnswerRef.current?.focus()');
    expect(stripped).toContain('ref={textAnswerRef}');
  });
});
