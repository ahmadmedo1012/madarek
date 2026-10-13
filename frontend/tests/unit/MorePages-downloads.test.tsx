/**
 * r157 (F8, 6A7) — Downloads honest link targets.
 *
 * The downloads table rendered every material's `url` as a raw
 * `<a target="_blank">`. With the seeded data that opens a dead browser
 * tab (example.invalid never resolves — RFC 2606). DownloadsPage now
 * routes each row through lib/materialHref.ts; these pins hold the
 * honest-target contract:
 *   1. RFC 2606 reserved hosts → «غير متوفر بعد», and NOT ONE anchor
 *      in the table (a dead link is worse than no link);
 *   2. paper-namespace URLs (the internal /api/v1/files/papers/… path)
 *      → the in-app /document viewer route, WITHOUT ?paper= (materials
 *      carry the material id, never a ResearchPaper id — the
 *      annotations-panel param needs the real paper row);
 *   3. real https → external new-tab contract (target=_blank
 *      rel="noreferrer");
 *   4. non-https external → honestly unavailable, no anchor.
 *
 * useStudentMaterials is mocked at the useResources boundary (the
 * MorePages-social pattern); materialHref itself is the REAL module —
 * it is the unit under pin.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DownloadsPage } from '../../src/pages/student/MorePages';
import type { StudentMaterial } from '../../src/hooks/useResources';

const mocks = vi.hoisted(() => ({
  materials: {
    data: [] as StudentMaterial[],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useStudentMaterials: () => mocks.materials,
  };
});

function materialFixture(over: Partial<StudentMaterial> & { id: string; name: string; url: string }): StudentMaterial {
  return {
    type: 'PDF',
    sizeBytes: 1024,
    createdAt: new Date('2025-03-01T09:00:00Z').toISOString(),
    course: { code: 'SE301', name: 'هندسة البرمجيات' },
    ...over,
  } as StudentMaterial;
}

/** The two seeded demo rows (seed.ts materialDefs — example.invalid). */
const SEEDED = [
  materialFixture({ id: 'm1', name: 'محاضرة_UML_الوحدة1.pdf', url: 'https://example.invalid/UML1.pdf' }),
  materialFixture({ id: 'm2', name: 'شرائح_DesignPatterns.pptx', url: 'https://example.invalid/dp.pptx', type: 'PPT' }),
];

function renderPage() {
  return render(
    <MemoryRouter>
      <DownloadsPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DownloadsPage — honest link targets (r157 6A7)', () => {
  beforeEach(() => {
    mocks.materials.data = [];
    mocks.materials.isPending = false;
    mocks.materials.isError = false;
  });

  it('RFC 2606 reserved-host rows render «غير متوفر بعد» with ZERO anchors in the table', () => {
    mocks.materials.data = SEEDED;
    const { container } = renderPage();

    // Both seeded rows say the honest thing…
    expect(screen.getAllByText('غير متوفر بعد')).toHaveLength(2);
    // …and the table exposes NO anchor at all — the old markup put a
    // dead <a href="https://example.invalid/…"> download button on
    // every row (a click opened a browser error tab).
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });

  it('paper-namespace URLs become in-app /document viewer links — and carry NO ?paper= param', () => {
    mocks.materials.data = [
      materialFixture({ id: 'm3', name: 'منهج_الشبكات.pdf', url: '/api/v1/files/papers/networks.pdf' }),
    ];
    renderPage();

    const link = screen.getByRole('link', { name: 'فتح' });
    // In-app viewer route (the in-app PdfViewer sends the Bearer token
    // on its fetch — a gated file opens in the app, not a 401 tab).
    expect(link.getAttribute('href')).toContain('/document/networks.pdf');
    // The viewer's title carries the material name…
    expect(link.getAttribute('href')).toContain('title=');
    // …but ?paper= is deliberately dropped: it feeds the annotations
    // panel with a ResearchPaper id, and /me/materials rows only ever
    // carry the MATERIAL's id — attaching it would mount the panel
    // against an id that is not a paper.
    expect(link.getAttribute('href')).not.toContain('paper=');
    // An in-app route is a plain anchor (no new-tab attributes).
    expect(link.getAttribute('target')).toBeNull();
  });

  it('real https URLs keep the external new-tab contract (target=_blank rel=noreferrer)', () => {
    mocks.materials.data = [
      materialFixture({ id: 'm4', name: 'مرجع_خارجي.pdf', url: 'https://ocw.example-school.edu/refs/os-notes.pdf' }),
    ];
    renderPage();

    const link = screen.getByRole('link', { name: 'تحميل' });
    expect(link.getAttribute('href')).toBe('https://ocw.example-school.edu/refs/os-notes.pdf');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noreferrer');
  });

  it('non-https external URLs are honestly unavailable — no insecure tab, no anchor', () => {
    mocks.materials.data = [
      materialFixture({ id: 'm5', name: 'شرائح_قديمة.ppt', url: 'http://legacy.example-school.edu/ppt.pptx', type: 'PPT' }),
    ];
    const { container } = renderPage();

    expect(screen.getByText('غير متوفر بعد')).toBeInTheDocument();
    expect(container.querySelectorAll('a')).toHaveLength(0);
  });
});
