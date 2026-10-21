/**
 * R305-A7 (task 3-a) — student ResearchPage «Heron» scoping + honesty pins.
 *
 *   1. MARKER PRESENCE — the pending mirror, the error branch and the
 *      resolved page all mount exactly ONE `.r305rp` root (a page that
 *      carries the marker on only some branches flashes unstyled).
 *   2. THE HERO CONTRACT — the lifecycle summary is the page's ONE deep
 *      band, and the KPI numerals ride the formatted metric register
 *      (the old StatLine call passed RAW array lengths — the StatLine
 *      canon forbids the component formatting, so the caller must).
 *   3. SUBMISSION RAIL — «بحث جديد؟» rides the single copper
 *      .r305rp-next rail with its one primary action.
 *   4. STATUS NEVER COLOR ALONE — the paper status chip pairs the tone
 *      dot with the Arabic label (the canonical PAPER_STATUS_TONE
 *      ladder, translated onto the shared chip vocabulary).
 *   5. REGRESSION (scan pending honesty) — «ابدأ الفحص الآن» stays
 *      mounted, disabled, and honestly labelled while its request is
 *      in flight (the old markup VANISHED the button mid-flight: a
 *      state jump with no pending voice and no double-fire guard).
 *   6. REGRESSION (reviewer identity) — a GRADED paper shows the
      reviewer's name exactly as the API provides it (the old markup
 *      never rendered paper.reviewer at all); a reviewer-less paper
 *      invents nothing.
 *   7. IMPORT WIRING — the Heron sheet loads directly after the family
 *      sheet.
 *
 * Harness: the same partial useResources mock the neighboring
 * ResearchUploadForm tests established.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import StudentResearchPage from '../../src/pages/student/ResearchPage';
import { formatInt } from '../../src/utils/numbers';

const mocks = vi.hoisted(() => ({
  my: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
  enrollments: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
  upload: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
  uploadFile: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
  scan: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useMyResearch: () => mocks.my,
    useMyEnrollments: () => mocks.enrollments,
    useUploadPaper: () => mocks.upload,
    useUploadPaperFile: () => mocks.uploadFile,
    useScanPaper: () => mocks.scan,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.my = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
  mocks.scan = { isPending: false, isError: false, error: null, mutateAsync: vi.fn() };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentResearchPage />
    </MemoryRouter>,
  );
}

function paperFixture(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'p1',
    title: 'تحليل أداء قواعد البيانات الموزعة',
    abstract: null,
    fileUrl: null,
    status: 'UPLOADED',
    plagiarismPct: null,
    aiContentPct: null,
    grade: null,
    feedback: null,
    uploadedAt: new Date(Date.now() - 86_400_000).toISOString(),
    scannedAt: null,
    gradedAt: null,
    publishedAt: null,
    student: { id: 'st1', firstName: 'آمنة', lastName: 'العبيدي', avatarInitials: null, avatarColor: null },
    reviewer: null,
    offering: { id: 'off1', course: { name: 'هندسة البرمجيات', code: 'SE301' } },
    ...over,
  };
}

const PAGE_SRC = resolvePath(__dirname, '../../src/pages/student/ResearchPage.tsx');

/* ══════════════════════════════════════════════════════════════════
   1. Marker presence — every branch
   ══════════════════════════════════════════════════════════════════ */

describe('StudentResearchPage — the .r305rp marker (R305-A7)', () => {
  it('the pending mirror carries the marker (the first render IS the skeleton)', () => {
    mocks.my = { data: [], isPending: true, isError: false, error: null, refetch: () => undefined };
    renderPage();

    const roots = document.querySelectorAll('.r305rp');
    expect(roots.length).toBe(1);
    expect(roots[0]!.querySelector('.pf-page')).not.toBeNull();
  });

  it('the error branch carries the marker with its retry affordance', () => {
    mocks.my = { data: [], isPending: false, isError: true, error: new Error('forced'), refetch: () => undefined };
    renderPage();

    expect(document.querySelectorAll('.r305rp').length).toBe(1);
    expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument();
  });

  it('the resolved page mounts ONE marker root around the h1 + the deep band', () => {
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    renderPage();

    const roots = document.querySelectorAll('.r305rp');
    expect(roots.length).toBe(1);
    expect(roots[0]!.querySelector('h1')?.textContent).toBe('بحوثي العلمية');
    expect(roots[0]!.querySelector('.r305rp-band--deep')).not.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   2. The deep band + the formatted metric register
   ══════════════════════════════════════════════════════════════════ */

describe('StudentResearchPage — the lifecycle summary band (R305-A7)', () => {
  it('exactly ONE deep band carries the four lifecycle facts, label over formatted value', () => {
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    renderPage();

    const bands = document.querySelectorAll('.r305rp-band--deep');
    expect(bands.length).toBe(1);
    const band = bands[0]!;
    for (const label of ['إجمالي بحوثك', 'قيد المراجعة', 'مُقيَّمة', 'تعذّر اجتياز الفحص']) {
      expect(band.textContent).toContain(label);
    }
    const metrics = band.querySelectorAll('.r305rp-metric');
    expect(metrics).toHaveLength(4);
    // The total rides the FORMATTED register (formatInt → the platform's
    // one numeral convention), and the hint rides the band-secondary ink.
    expect(metrics[0]!.textContent).toContain(formatInt(1));
    expect(band.querySelectorAll('.r305rp-band-secondary')).toHaveLength(4);
  });

  it('a failed paper flags its metric with the danger dot + the honest hint (never color alone)', () => {
    mocks.my = {
      data: [paperFixture({ status: 'CHECKS_FAILED' })],
      isPending: false, isError: false, error: null, refetch: () => undefined,
    };
    renderPage();

    const band = document.querySelector('.r305rp-band--deep')!;
    expect(band.querySelector('.r305rp-res-flag')).not.toBeNull();
    expect(band.textContent).toContain('تحتاج إعادة رفع');
  });

  it('the KPI numerals are formatInt-formatted, not raw array lengths (source pin)', () => {
    // The behavioral difference only shows past the grouping floor, so
    // the caller-formatting contract is ALSO pinned at the source.
    const src = readFileSync(PAGE_SRC, 'utf8');
    expect(src).toMatch(/value:\s*formatInt\(papers\.length\)/);
    expect(src).not.toMatch(/value:\s*papers\.length/);
  });
});

/* ══════════════════════════════════════════════════════════════════
   3. The submission rail — the ONE copper emphasis
   ══════════════════════════════════════════════════════════════════ */

describe('StudentResearchPage — the submission rail (R305-A7)', () => {
  it('with papers present, «بحث جديد؟» rides exactly one .r305rp-next rail with its primary action', () => {
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    renderPage();

    const rails = document.querySelectorAll('.r305rp-next.r305rp-res-cta');
    expect(rails.length).toBe(1);
    expect(rails[0]!.textContent).toContain('بحث جديد؟');
    expect(screen.getByRole('button', { name: 'رفع بحث جديد' })).toBeInTheDocument();
  });

  it("with no papers the rail is replaced by the empty state's own CTA (no empty copper)", () => {
    renderPage();

    expect(document.querySelector('.r305rp-res-cta')).toBeNull();
    expect(screen.getByText('لم ترفع أي بحث بعد')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'رفع بحث جديد' })).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════════════
   4. Status chips — dot + Arabic label
   ══════════════════════════════════════════════════════════════════ */

describe('StudentResearchPage — status chips (R305-A7)', () => {
  it('the paper status chip pairs the tone dot with the canonical Arabic label', () => {
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    renderPage();

    const chip = screen.getByText('بانتظار الفحص').closest('.r305rp-chip')!;
    expect(chip.querySelector('.r305rp-chip-dot')).not.toBeNull();
    // UPLOADED is amber on the canonical ladder → the warning chip tone.
    expect(chip.className).toContain('r305rp-chip--warning');
  });

  it('a published paper reads «مُنشور في المكتبة» on the success chip', () => {
    mocks.my = {
      data: [paperFixture({ status: 'PUBLISHED', grade: 18, gradedAt: new Date().toISOString(), publishedAt: new Date().toISOString() })],
      isPending: false, isError: false, error: null, refetch: () => undefined,
    };
    renderPage();

    const chip = screen.getByText('مُنشور في المكتبة').closest('.r305rp-chip')!;
    expect(chip.className).toContain('r305rp-chip--success');
    expect(chip.querySelector('.r305rp-chip-dot')).not.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   5. REGRESSION — the scan start stays honest while in flight
   ══════════════════════════════════════════════════════════════════ */

describe('StudentResearchPage — scan pending honesty (R305-A7 regression)', () => {
  it('the scan button disables with «جارٍ بدء الفحص…» while its request is in flight — and cannot double-fire', async () => {
    let releaseScan: (v?: unknown) => void = () => undefined;
    mocks.scan = {
      isPending: false, isError: false, error: null,
      mutateAsync: vi.fn(() => new Promise((res) => { releaseScan = res; })),
    };
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    renderPage();

    const scanBtn = screen.getByRole('button', { name: 'ابدأ الفحص الآن' });
    fireEvent.click(scanBtn);

    await waitFor(() => expect(mocks.scan.mutateAsync).toHaveBeenCalledTimes(1));
    const inFlight = await screen.findByRole('button', { name: 'جارٍ بدء الفحص…' });
    expect(inFlight).toBeDisabled();

    // A second click attempt (double-fire) is a no-op: the request
    // stays exactly one.
    fireEvent.click(inFlight);
    expect(mocks.scan.mutateAsync).toHaveBeenCalledTimes(1);

    releaseScan({});
    await waitFor(() => expect(screen.getByRole('button', { name: 'ابدأ الفحص الآن' })).toBeInTheDocument());
  });
});

/* ══════════════════════════════════════════════════════════════════
   6. REGRESSION — the reviewer identity renders from the API's data
   ══════════════════════════════════════════════════════════════════ */

describe('StudentResearchPage — reviewer identity (R305-A7 regression)', () => {
  it('a GRADED paper shows «تقييم الأستاذ» with the reviewer the API sent', () => {
    mocks.my = {
      data: [paperFixture({
        status: 'GRADED',
        grade: 17.5,
        gradedAt: new Date().toISOString(),
        reviewer: { id: 't1', firstName: 'خالد', lastName: 'المنصوري' },
        feedback: 'المنهجية واضحة والنتائج موثقة.',
      })],
      isPending: false, isError: false, error: null, refetch: () => undefined,
    };
    renderPage();

    // The GRADED row is settled — its body is collapsed by default; the
    // disclosure opens the verdict block.
    fireEvent.click(screen.getByRole('button', { name: 'تفاصيل البحث: تحليل أداء قواعد البيانات الموزعة' }));

    const gradeHead = document.querySelector('.rs-row-grade-head')!;
    expect(gradeHead.textContent).toContain('تقييم الأستاذ');
    expect(gradeHead.textContent).toContain('خالد المنصوري');
    expect(screen.getByText('المنهجية واضحة والنتائج موثقة.')).toBeInTheDocument();
  });

  it('a graded paper WITHOUT a reviewer invents nothing — the label stands alone', () => {
    mocks.my = {
      data: [paperFixture({ status: 'GRADED', grade: 15, gradedAt: new Date().toISOString(), reviewer: null })],
      isPending: false, isError: false, error: null, refetch: () => undefined,
    };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'تفاصيل البحث: تحليل أداء قواعد البيانات الموزعة' }));

    const gradeHead = document.querySelector('.rs-row-grade-head')!;
    expect(gradeHead.textContent).toContain('تقييم الأستاذ:');
    expect(gradeHead.textContent).not.toContain('undefined');
  });
});

/* ══════════════════════════════════════════════════════════════════
   7. Import wiring
   ══════════════════════════════════════════════════════════════════ */

describe('StudentResearchPage — Heron sheet import wiring (R305-A7)', () => {
  it('r305-research-pdf-ai.css is imported DIRECTLY after research.css', () => {
    const src = readFileSync(PAGE_SRC, 'utf8');
    const researchIdx = src.indexOf("import '../../styles/research.css';");
    const heronIdx = src.indexOf("import '../../styles/r305-research-pdf-ai.css';");
    expect(researchIdx).toBeGreaterThan(-1);
    expect(heronIdx).toBeGreaterThan(researchIdx);
  });
});
