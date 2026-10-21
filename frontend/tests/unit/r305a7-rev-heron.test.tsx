/**
 * R305-A7 — teacher research review «Heron» regression pins (a7-teach).
 *
 * The r305-research-pdf-ai.css §B rebuild of ResearchReviewPage is a
 * marker + hierarchy + decision-surface change, and every pin here
 * binds to THAT contract — never to a styling accident:
 *
 *  1. The scoped sheet rides the module: `r305-research-pdf-ai.css` is
 *     imported directly AFTER `research.css` (later import wins the
 *     @layer pages tie), the page root carries the `.r305rp` marker,
 *     and the §B rules stay prefixed `.r305rp-rev-*` — the workspace
 *     families that ride the mobile Sheet PORTAL mirror under
 *     `body:has(.r305rp)` (§9 contract).
 *  2. The decision surface is unmistakable: a «سجل الحالة» record row
 *     renders the API's own timestamps (uploaded/scanned/graded/
 *     published) and says plainly which steps have not happened; the
 *     decisive action rides the ONE `r305rp-next` rail with the
 *     explicit before→after chip pair (بانتظار التقييم → مُقيَّم,
 *     مُقيَّم → مُنشور) — the old page took the decision blind.
 *  3. State is never color alone: the selected queue row shows the
 *     visible «تُعرض الآن» chip (aria-pressed was already there; the
 *     sighted cue now matches), a ≥7-day wait says «متأخر» in words,
 *     and the draft honesty chip flips «بلا تعديلات» ↔
 *     «مسودة غير محفوظة» beside the verb.
 *  4. In-flight is the canonical Button primitive contract: spinner +
 *     disabled + aria-busy on the real request — no fake success.
 *  5. A non-numeric score entry clamps to the honest floor (0) instead
 *     of posting NaN to a z.number() backend.
 *  6. A failed save surfaces the backend's Arabic message AND its
 *     UPPER_SNAKE support code (the D17-3 support-code chip).
 *
 * Data hooks are mocked at the useResources boundary (the same pattern
 * as ResearchReviewPage.test.tsx); apiErrorMessage stays the REAL
 * re-export so the language guard is exercised end-to-end.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import ResearchReviewPage from '../../src/pages/teacher/ResearchReviewPage';

const mocks = vi.hoisted(() => ({
  queue: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null,
    refetch: () => undefined,
  },
  grade: { isPending: false, mutateAsync: vi.fn() },
  publish: { isPending: false, mutateAsync: vi.fn() },
  profile: { data: null, isPending: false, isError: false, error: null, refetch: () => undefined },
  annotations: { data: [] as unknown[], isPending: false, isError: false, error: null, refetch: () => undefined },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useResearchQueue: () => mocks.queue,
    useGradePaper: () => mocks.grade,
    usePublishPaper: () => mocks.publish,
    useMyTeacherProfile: () => mocks.profile,
    useAnnotations: () => mocks.annotations,
  };
});

vi.mock('../../src/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const PAPER = {
  id: 'p1',
  title: 'أثر الذكاء الاصطناعي على التعليم العالي',
  status: 'CHECKS_PASSED',
  plagiarismPct: 8,
  aiContentPct: 12,
  uploadedAt: '2026-03-10T09:00:00.000Z',
  scannedAt: '2026-03-10T09:05:00.000Z',
  student: { id: 's1', firstName: 'سالم', lastName: 'الطاهر' },
};

const PAPER_2 = {
  ...PAPER,
  id: 'p2',
  title: 'أنماط التصميم في تطبيقات الويب',
};

/* A GRADED paper — the decision record's قُيِّم/نُشر steps and the
 * publish before→after both pin against it. */
const GRADED_PAPER = {
  ...PAPER,
  id: 'p3',
  status: 'GRADED',
  grade: 17,
  feedback: 'بحث متين منهجياً.',
  gradedAt: '2026-03-12T10:00:00.000Z',
};

const day = 86_400_000;

function renderPage() {
  return render(
    <MemoryRouter>
      <ResearchReviewPage />
    </MemoryRouter>,
  );
}

const queueRow = (title: string, status: string) =>
  screen.getByRole('button', { name: `${title} — ${status}` });

async function selectPaper(title: string, status: string) {
  fireEvent.click(queueRow(title, status));
  await screen.findByRole('heading', { name: title });
}

/** The decision rail (the ONE r305rp-next emphasized region). */
const decisionRail = () => document.querySelector('.r305rp-rev-decision') as HTMLElement;

afterEach(() => {
  mocks.queue = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
  mocks.grade = { isPending: false, mutateAsync: vi.fn() };
  mocks.publish = { isPending: false, mutateAsync: vi.fn() };
  mocks.annotations = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
});

/* ── 1. The scoped Heron sheet wiring (source pins) ─────────────── */

describe('R305-A7 — the scoped Heron sheet wiring', () => {
  const pageSrc = () =>
    readFileSync(resolvePath(__dirname, '../../src/pages/teacher/ResearchReviewPage.tsx'), 'utf8');
  const sheetSrc = () =>
    readFileSync(resolvePath(__dirname, '../../src/styles/r305-research-pdf-ai.css'), 'utf8');

  it('r305-research-pdf-ai.css is imported directly after research.css (later import wins the layer tie)', () => {
    const source = pageSrc();
    const familyAt = source.indexOf("import '../../styles/research.css'");
    const heronAt = source.indexOf("import '../../styles/r305-research-pdf-ai.css'");
    expect(familyAt).toBeGreaterThan(-1);
    expect(heronAt).toBeGreaterThan(familyAt);
  });

  it('the page root carries the .r305rp marker wrapping the whole frame', () => {
    const { container } = renderPage();
    const root = container.querySelector('.r305rp');
    expect(root, 'no .r305rp marker anywhere in the rendered page').not.toBeNull();
    // The marker is the ROOT (its parent is the test container) and it
    // wraps the page frame — the scoped sheet reaches every section.
    expect(root!.parentElement).toBe(container);
    expect(root!.querySelector('.pf-page')).not.toBeNull();
  });

  it('every §B rule stays prefixed .r305rp-rev-* and the workspace families mirror into the Sheet portal', () => {
    const source = sheetSrc();
    const from = source.indexOf('a7-teach appends here');
    const to = source.indexOf('§C · PDF reader workspace');
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const sectionB = source.slice(from, to);

    // Every selector block in §B names a rev-prefixed class — no bare
    // legacy-class restyling, no unscoped page rules.
    const blocks = sectionB.split('}').filter((chunk) => chunk.includes('{'));
    expect(blocks.length).toBeGreaterThan(10);
    for (const block of blocks) {
      expect(block).toContain('.r305rp-rev-');
    }

    // The workspace rides the mobile Sheet PORTAL (body-mounted): each
    // workspace family carries its body:has(.r305rp) mirror.
    for (const family of ['masthead', 'record', 'decision', 'err-code', 'empty-sub']) {
      expect(
        sectionB.includes(`body:has(.r305rp) .r305rp-rev-${family}`),
        `missing portal mirror for .r305rp-rev-${family}`,
      ).toBe(true);
    }
  });
});

/* ── 2. The decision record — the API's own timestamps ──────────── */

describe('R305-A7 — سجل الحالة: the decision record (D1)', () => {
  it('a waiting paper shows the scan date and says plainly which steps have not happened', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    expect(screen.getByText('سجل الحالة')).toBeInTheDocument();
    // The scanned step carries its API date (scannedAt → short ar-LY)…
    const scannedItem = screen.getByText(
      (_c, el) => el instanceof HTMLElement
        && el.classList.contains('r305rp-rev-record-item')
        && (el.textContent ?? '').startsWith('فُحص'),
    );
    expect(scannedItem.textContent).toContain('10 مارس');
    // …and the not-yet steps are WORDS, not blank dashes.
    expect(screen.getByText('لم يُقيَّم بعد')).toBeInTheDocument();
    expect(screen.getByText('لم يُنشر بعد')).toBeInTheDocument();
  });

  it('a graded paper shows its graded date in the record (the decision leaves a trace)', async () => {
    mocks.queue.data = [GRADED_PAPER];
    renderPage();
    await selectPaper(GRADED_PAPER.title, 'مُقيَّم');

    const gradedItem = screen.getByText(
      (_c, el) => el instanceof HTMLElement
        && el.classList.contains('r305rp-rev-record-item')
        && (el.textContent ?? '').includes('12 مارس'),
    );
    expect(gradedItem).toBeInTheDocument();
    expect(screen.queryByText('لم يُقيَّم بعد')).toBeNull();
  });
});

/* ── 3. The decision rail — before → after + ONE verb (D2) ──────── */

describe('R305-A7 — the decisive rail: before → after (D2)', () => {
  it('a waiting paper shows بانتظار التقييم → مُقيَّم beside تأكيد التقييم', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    const rail = decisionRail();
    expect(rail).not.toBeNull();
    expect(rail.classList.contains('r305rp-next')).toBe(true);
    expect(within(rail).getByText('الآن')).toBeInTheDocument();
    expect(within(rail).getByText('بانتظار التقييم')).toBeInTheDocument();
    expect(within(rail).getByText('بعد حفظ التقييم')).toBeInTheDocument();
    expect(within(rail).getByText('مُقيَّم')).toBeInTheDocument();
    // Exactly ONE emphasized action region, and the decisive verb
    // inside it.
    expect(document.querySelectorAll('.r305rp-next').length).toBe(1);
    expect(within(rail).getByRole('button', { name: 'تأكيد التقييم' })).toBeInTheDocument();
  });

  it('a graded paper shows مُقيَّم → مُنشور beside نشر في المكتبة', async () => {
    mocks.queue.data = [GRADED_PAPER];
    renderPage();
    await selectPaper(GRADED_PAPER.title, 'مُقيَّم');

    const rail = decisionRail();
    expect(within(rail).getByText('بعد النشر')).toBeInTheDocument();
    expect(within(rail).getByText('مُنشور')).toBeInTheDocument();
    expect(within(rail).getByRole('button', { name: 'نشر في المكتبة' })).toBeInTheDocument();
  });

  it('the workspace masthead is the ONE deep band of the view', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    expect(document.querySelectorAll('.r305rp-band--deep').length).toBe(1);
    expect(document.querySelector('.r305rp-rev-masthead')).not.toBeNull();
  });
});

/* ── 4. State is never color alone (D3 + D4) ────────────────────── */

describe('R305-A7 — state never rides color alone (D3, D4)', () => {
  it('the selected queue row carries the visible «تُعرض الآن» marker, not just the accent ground', async () => {
    mocks.queue.data = [PAPER, PAPER_2];
    renderPage();

    // Nothing selected yet — no marker anywhere.
    expect(screen.queryByText('تُعرض الآن')).toBeNull();

    fireEvent.click(queueRow(PAPER.title, 'بانتظار التقييم'));
    await screen.findByRole('heading', { name: PAPER.title });
    expect(screen.getByText('تُعرض الآن')).toBeInTheDocument();
    expect(queueRow(PAPER.title, 'بانتظار التقييم')).toHaveAttribute('aria-pressed', 'true');
    expect(queueRow(PAPER_2.title, 'بانتظار التقييم')).toHaveAttribute('aria-pressed', 'false');
  });

  it('a ≥7-day wait says «متأخر» in words (the rose ink is no longer the only signal)', () => {
    const late = { ...PAPER, id: 'late', uploadedAt: new Date(Date.now() - 10 * day).toISOString() };
    const fresh = { ...PAPER_2, uploadedAt: new Date(Date.now() - 1 * day).toISOString() };
    mocks.queue.data = [late, fresh];
    renderPage();

    expect(queueRow(late.title, 'بانتظار التقييم').textContent).toContain('متأخر');
    expect(queueRow(fresh.title, 'بانتظار التقييم').textContent).not.toContain('متأخر');
  });
});

/* ── 5. The draft honesty chip (D5) ─────────────────────────────── */

describe('R305-A7 — the draft honesty chip (D5)', () => {
  it('flips «بلا تعديلات» → «مسودة غير محفوظة» as soon as the draft diverges', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    const rail = decisionRail();
    expect(within(rail).getByText('بلا تعديلات')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('ملاحظات للطالب'), { target: { value: 'مسودة جديدة' } });
    expect(within(rail).getByText('مسودة غير محفوظة')).toBeInTheDocument();
    expect(within(rail).queryByText('بلا تعديلات')).toBeNull();
  });
});

/* ── 6. In-flight: the canonical spinner contract (D6) ──────────── */

describe('R305-A7 — in-flight requests (D6)', () => {
  it('a pending grade shows the spinner + disabled + aria-busy on the real request — no fake success', async () => {
    mocks.queue.data = [PAPER];
    mocks.grade.isPending = true;
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    const submit = screen.getByRole('button', { name: 'تأكيد التقييم' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(submit.querySelector('.motion-spinner')).not.toBeNull();
    // The sibling inputs freeze too (the draft cannot drift mid-save).
    expect(screen.getByLabelText('الدرجة (من 20)')).toBeDisabled();
    expect(screen.getByLabelText('ملاحظات للطالب')).toBeDisabled();
  });

  it('a pending publish freezes the whole action row the same way', async () => {
    mocks.queue.data = [GRADED_PAPER];
    mocks.publish.isPending = true;
    renderPage();
    await selectPaper(GRADED_PAPER.title, 'مُقيَّم');

    const publish = screen.getByRole('button', { name: 'نشر في المكتبة' });
    expect(publish).toBeDisabled();
    expect(publish).toHaveAttribute('aria-busy', 'true');
    expect(publish.querySelector('.motion-spinner')).not.toBeNull();
  });
});

/* ── 7. The score floor (D9) ────────────────────────────────────── */

describe('R305-A7 — the score field never posts NaN (D9)', () => {
  it('a non-numeric entry clamps to the honest floor instead of a NaN draft', async () => {
    mocks.queue.data = [PAPER];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    const score = screen.getByLabelText('الدرجة (من 20)') as HTMLInputElement;
    fireEvent.change(score, { target: { value: 'e' } });
    expect(score).toHaveValue(0);
    // The derived band reads the clamped value (ضعيف = 0..10).
    expect((screen.getByLabelText('التقدير') as HTMLInputElement).value).toBe('ضعيف');

    // And the submit path carries a real number, never NaN.
    fireEvent.submit(score.closest('form')!);
    await waitFor(() => {
      expect(mocks.grade.mutateAsync).toHaveBeenCalledWith({ id: 'p1', grade: 0, feedback: undefined });
    });
  });
});

/* ── 8. The support-code chip (message + code) ──────────────────── */

describe('R305-A7 — errors carry the Arabic message AND the backend code', () => {
  it('a failed save shows the Arabic message plus the UPPER_SNAKE support-code chip', async () => {
    mocks.queue.data = [PAPER];
    mocks.grade.mutateAsync.mockRejectedValueOnce({
      response: { status: 409, data: { error: { code: 'CONFLICT', message: 'يجب فحص الورقة قبل تصحيحها' } } },
    });
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    fireEvent.click(screen.getByRole('button', { name: 'تأكيد التقييم' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('يجب فحص الورقة قبل تصحيحها');
    const code = alert.querySelector('.r305rp-rev-err-code');
    expect(code).not.toBeNull();
    expect(code!.textContent).toBe('CONFLICT');
    // The draft survives the failure — the failure is never silent.
    expect(screen.getByRole('heading', { name: PAPER.title })).toBeInTheDocument();
  });
});

/* ── 9. The notes territory — honest empty state ────────────────── */

describe('R305-A7 — the margin-notes territory', () => {
  it('the empty thread renders the technical empty state with the honest pointer to the reader', async () => {
    mocks.queue.data = [PAPER];
    mocks.annotations.data = [];
    renderPage();
    await selectPaper(PAPER.title, 'بانتظار التقييم');

    expect(screen.getByText(/ملاحظات على البحث/)).toBeInTheDocument();
    expect(screen.getByText('لا ملاحظات بعد')).toBeInTheDocument();
    expect(screen.getByText(/افتح البحث في العارض/)).toBeInTheDocument();
  });
});

/* ── 10. The mobile Sheet portal carries the SAME workspace ─────── */

describe('R305-A7 — the mobile Sheet recomposition', () => {
  it('the portal workspace carries the decision rail — not a second layout', async () => {
    // Force the phone band BEFORE render: useIsNarrowLayout reads the
    // media query synchronously in its state initializer.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: () => false,
    }));

    mocks.queue.data = [PAPER];
    renderPage();
    fireEvent.click(queueRow(PAPER.title, 'بانتظار التقييم'));

    const sheet = await screen.findByRole('dialog', { name: 'مراجعة بحث' });
    // The same workspace anatomy rides the portal: masthead, record,
    // the decision rail with the before→after, and the decisive verb.
    expect(within(sheet).getByRole('heading', { name: PAPER.title })).toBeInTheDocument();
    expect(within(sheet).getByText('سجل الحالة')).toBeInTheDocument();
    expect(within(sheet).getByText('بعد حفظ التقييم')).toBeInTheDocument();
    expect(within(sheet).getByRole('button', { name: 'تأكيد التقييم' })).toBeInTheDocument();
  });
});
