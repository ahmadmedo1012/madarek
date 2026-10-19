/**
 * r183-B3 — student-surface pins (the A6 wave-B fixes).
 *
 *  · P1-2 chapter-concept contrast (A6/A3, measured 3.95:1 light /
 *    4.12:1 dark live): `.chapter-row.on .chapter-concept` now rides
 *    --text-secondary on the --accent-soft wash. Pinned BOTH as CSS
 *    wiring AND as computed contrast from live tokens.css (the
 *    icon-well-contrast pattern — token drift re-evaluates instead of
 *    passing on stale hexes).
 *  · P2 /student/university institution identity: the page derives its
 *    identity from the session's institution context — rendered pins
 *    for both branches (zawia-showcase keeps the labeled showcase
 *    facts; alandalus-demo gets its own name and drops the ZU facts),
 *    plus the «فروع خارجيّة … في 0 مدينة» contradiction pin.
 *  · P3 Arabic hashtags never ride font-mono (post chips + .trend-tag).
 *  · P3 the 0% progress note is the directive one.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { __test__ } from '../../src/lib/theme';

const { parseHex, contrastRatio } = __test__;

/* ── static source-contract helpers (assets.test.ts convention) ──── */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/* ══ 1. chapter-concept contrast (P1) ══════════════════════════════ */

/* ── Live token resolution from tokens.css (icon-well-contrast) ──── */

/** Extract the balanced `{ … }` body that follows the first occurrence
 * of `selector` (throws when absent — the pinned structure moved). */
function extractBlock(source: string, selector: string): string {
  const idx = source.indexOf(selector);
  if (idx === -1) throw new Error(`selector not found in tokens.css: ${selector}`);
  const start = source.indexOf('{', idx);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  throw new Error(`unbalanced block for selector: ${selector}`);
}

function parseDecls(body: string): Map<string, string> {
  const decls = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    decls.set(m[1]!, m[2]!.trim());
  }
  return decls;
}

/** Resolve a token through var() chains inside one theme map. */
function resolveToken(name: string, map: Map<string, string>): string {
  let value = map.get(name);
  if (value === undefined) throw new Error(`token not defined in theme: ${name}`);
  for (let hop = 0; hop < 6; hop++) {
    const v = value.trim();
    const varCall = v.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/);
    if (!varCall) return v;
    const next = map.get(varCall[1]!);
    if (next === undefined) throw new Error(`chain broken: ${name} → ${varCall[1]}`);
    value = next;
  }
  throw new Error(`var() chain too deep for ${name}`);
}

const TOKENS = read('src/styles/tokens.css');
const base = parseDecls(extractBlock(TOKENS, ':root {'));
const light = new Map([...base, ...parseDecls(extractBlock(TOKENS, '[data-theme="light"] {'))]);
const dark = new Map([...base, ...parseDecls(extractBlock(TOKENS, '[data-theme="dark"] {'))]);

const ratio = (themeMap: Map<string, string>, ink: string, wash: string) => {
  const inkRgb = parseHex(resolveToken(ink, themeMap));
  const washRgb = parseHex(resolveToken(wash, themeMap));
  if (!inkRgb || !washRgb) throw new Error(`unparseable hex for ${ink}/${wash}`);
  return contrastRatio(inkRgb, washRgb);
};

describe('r183-B3 — active chapter concept ink (A6/A3 P1-2, WCAG 1.4.3)', () => {
  const css = stripComments(read('src/styles/student.css'));

  it('the rule is wired: .chapter-row.on paints accent-soft, the concept line takes --text-secondary', () => {
    const rowRule = css.match(/\.chapter-row\.on \{[^}]*\}/)?.[0] ?? '';
    expect(rowRule).toContain('background: var(--accent-soft)');
    const rule = css.match(/\.chapter-row\.on \.chapter-concept \{[^}]*\}/)?.[0] ?? '';
    expect(rule).not.toBe('');
    expect(rule).toContain('color: var(--text-secondary)');
    // The failing base ink is explicitly NOT what the active row uses.
    expect(rule).not.toContain('--text-faint');
  });

  it('light: --text-secondary on --accent-soft clears 4.5:1 (pre-fix --text-faint: 3.95:1, live-measured A6)', () => {
    const fixed = ratio(light, '--text-secondary', '--accent-soft');
    expect(fixed).toBeGreaterThanOrEqual(4.5); // computed 6.784:1
    // …and the pair it replaces genuinely failed — the fix is necessary.
    expect(ratio(light, '--text-faint', '--accent-soft')).toBeLessThan(4.5);
  });

  it('dark: --text-secondary on --accent-soft clears 4.5:1 (pre-fix --text-faint: 4.12:1, live-measured A6)', () => {
    const fixed = ratio(dark, '--text-secondary', '--accent-soft');
    expect(fixed).toBeGreaterThanOrEqual(4.5); // computed 9.302:1
    expect(ratio(dark, '--text-faint', '--accent-soft')).toBeLessThan(4.5);
  });

  it('the siblings stay --accent-strong (the row keeps its hierarchy, both AA)', () => {
    expect(css).toContain('.chapter-row.on .chapter-title { color: var(--accent-strong); }');
    // Reference pair for the family: 8.62:1 light / 5.82:1 dark.
    expect(ratio(light, '--accent-strong', '--accent-soft')).toBeGreaterThanOrEqual(4.5);
    expect(ratio(dark, '--accent-strong', '--accent-soft')).toBeGreaterThanOrEqual(4.5);
  });
});

/* ══ 2. /student/university institution identity (P2) ══════════════ */

const uni = vi.hoisted(() => ({
  faculties: [] as Array<{ id: string; name: string; city: string; iconEmoji?: string | null }>,
  slug: undefined as string | undefined,
}));

vi.mock('../../src/hooks/useResources', () => ({
  // UniversityInfoPage's live hooks — configurable per test:
  useFaculties: () => ({
    data: uni.faculties,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCurrentInstitutionSlug: () => uni.slug,
  // The rest of MorePages' named imports — stubbed at the module
  // boundary (the MorePages-social.test pattern); only the page
  // under test renders in this file.
  useMyAchievements: () => ({ data: [], isPending: false, isError: false }),
  useLeaderboard: () => ({ data: [], isPending: false, isError: false }),
  useMySkills: () => ({ data: [], isPending: false, isError: false }),
  usePosts: () => ({ data: [], isPending: false, isError: false, refetch: vi.fn() }),
  useCreatePost: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useReactToPost: () => ({ mutate: vi.fn(), isPending: false, isError: false, variables: undefined }),
  useStudentResults: () => ({ data: null, isPending: false, isError: false }),
  useMyEnrollments: () => ({ data: [], isPending: false, isError: false }),
  useNotificationsFeed: () => ({ data: [], isPending: false, isError: false }),
  useMarkNotifRead: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkAllNotifsRead: () => ({ mutate: vi.fn(), isPending: false }),
  notifDeepLink: () => ({ to: '/' }),
  useArExperiences: () => ({ data: [], isPending: false, isError: false }),
  useStudentMaterials: () => ({ data: [], isPending: false, isError: false }),
  useStudentDashboard: () => ({ data: null, isPending: false, isError: false }),
  useTrainingMe: () => ({ data: null, isPending: false, isError: false }),
  submissionStatusAr: () => '',
}));

vi.mock('../../src/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  unwrap: vi.fn(),
}));

import { UniversityInfoPage } from '../../src/pages/student/MorePages';
import { useAuthStore, type InstitutionSummary } from '../../src/stores/auth.store';

const STUDENT = {
  id: 'st1',
  email: 'amna@zu.edu.ly',
  firstName: 'آمنة',
  lastName: 'العبيدي',
  role: 'STUDENT',
} as const;

const ZAWIA: InstitutionSummary = {
  // r188: the demonstration tenant — fictional identity, legacy id kept.
  id: 'inst-zawia-showcase',
  name: 'جامعة مدارك التجريبية',
  nameEn: 'Madarek Demo University',
  slug: 'madarek-demo',
};

const ANDALUS: InstitutionSummary = {
  id: 'inst-alandalus-demo',
  name: 'مؤسّسة الأندلس التعليميّة',
  nameEn: null,
  slug: 'alandalus-demo',
};

const ZAWIA_FACULTIES = [
  { id: 'f1', name: 'كلية الآداب', city: 'حرم المعرفة', iconEmoji: null },
  { id: 'f2', name: 'كلية العلوم', city: 'حرم المعرفة', iconEmoji: null },
  { id: 'f3', name: 'كلية التربية', city: 'حرم الابتكار', iconEmoji: null },
];

const ANDALUS_FACULTIES = [
  { id: 'g1', name: 'كلية الأندلس للعلوم', city: 'طرابلس', iconEmoji: null },
];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderUniversity(institution: InstitutionSummary | null, faculties: typeof ZAWIA_FACULTIES) {
  uni.faculties = faculties;
  uni.slug = institution?.slug;
  act(() => {
    useAuthStore.setState({ user: STUDENT, currentInstitution: institution });
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UniversityInfoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The rendered metric-change lines («موزَّعة على …» / «في …»). */
function changeLines(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('.metric-change')).map(
    (el) => el.textContent ?? '',
  );
}

describe('r183-B3 — /student/university derives its identity from the session institution (A6 P2)', () => {
  it('madarek-demo session: the fictional demo facts stay, labeled as the demonstration institution', () => {
    const { container } = renderUniversity(ZAWIA, ZAWIA_FACULTIES);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('جامعة مدارك التجريبية');
    // r188: the real-university facts (1988/decree/memberships) are GONE —
    // the demo tenant's synthetic profile is the only fact story.
    expect(screen.queryByText('1988')).toBeNull();
    expect(screen.queryAllByText(/بقرار رقم/)).toHaveLength(0);
    expect(screen.queryByText('العضويّات الدوليّة')).toBeNull();
    expect(screen.getByText('بطاقة تعريف المؤسّسة')).toBeInTheDocument();
    // The campus-split cards.
    expect(screen.getByText('داخل الحرم الجامعيّ')).toBeInTheDocument();
    expect(screen.getByText('فروع خارجيّة')).toBeInTheDocument();
    expect(container.querySelectorAll('.faculty-chip-row').length).toBe(3);
  });

  it("alandalus-demo session: the page carries the institution's OWN name — no ZU facts anywhere", () => {
    renderUniversity(ANDALUS, ANDALUS_FACULTIES);

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('مؤسّسة الأندلس التعليميّة');
    expect(screen.getByText(/مؤسّسة تعليميّة على منصّة مدارك/)).toBeInTheDocument();

    // The ZU-specific facts are dropped, never re-attributed.
    expect(screen.queryByText('سنة التأسيس')).toBeNull();
    expect(screen.queryByText('1988')).toBeNull();
    expect(screen.queryAllByText(/بقرار رقم 135/)).toHaveLength(0);
    expect(screen.queryByText('داخل الحرم الجامعيّ')).toBeNull();
    expect(screen.queryByText('فروع خارجيّة')).toBeNull();
    expect(screen.queryByText(/مؤسّسة تعليميّة حكوميّة/)).toBeNull();
    expect(screen.queryByText('العضويّات الدوليّة')).toBeNull();
    expect(screen.queryByText('جامعة السابع من أبريل')).toBeNull();
    expect(screen.queryByText('zu.edu.ly')).toBeNull();

    // Its own facts: the platform identifier + the scoped faculties.
    expect(screen.getByText('المعرّف على المنصّة')).toBeInTheDocument();
    expect(screen.getByText('alandalus-demo')).toBeInTheDocument();
    expect(screen.getByText('كلية الأندلس للعلوم')).toBeInTheDocument();
  });

  it('the «فروع خارجيّة» cities line counts the REAL outside cities (was «1 في 0 مدينة»)', () => {
    // All faculties outside حرم المعرفة: 1 faculty, 1 distinct campus.
    const outside = [{ id: 'g1', name: 'كلية الأندلس للعلوم', city: 'طرابلس', iconEmoji: null }];
    const { container } = renderUniversity(ZAWIA, outside);
    const lines = changeLines(container);
    expect(lines).toContain('في مدينة واحدة');
    expect(lines.some((l) => l.includes('0 مدينة'))).toBe(false);
  });

  it('zero outside faculties: no cities line at all (the old code said «في 0 مدينة» here)', () => {
    const inside = [
      { id: 'f1', name: 'كلية الآداب', city: 'حرم المعرفة', iconEmoji: null },
      { id: 'f2', name: 'كلية العلوم', city: 'حرم المعرفة', iconEmoji: null },
    ];
    const { container } = renderUniversity(ZAWIA, inside);
    expect(changeLines(container).some((l) => l.startsWith('في '))).toBe(false);
  });
});

/* ══ 3. Arabic hashtags never ride font-mono (P3) ══════════════════ */

describe('r183-B3 — Arabic hashtags drop the numeric-mono costume (A6 P3)', () => {
  it('the post hashtag chip is text-xxs only (no font-mono class)', () => {
    const more = stripComments(read('src/pages/student/MorePages.tsx'));
    const chip = more.match(/<span key=\{t\} className="([^"]+)"[^>]*>#\{t\}<\/span>/)?.[0] ?? '';
    expect(chip).not.toBe('');
    expect(chip).not.toContain('font-mono');
  });

  it('.trend-tag inherits the Arabic body face (student.css)', () => {
    const css = stripComments(read('src/styles/student.css'));
    const rule = css.match(/\.trend-tag \{[^}]*\}/)?.[0] ?? '';
    expect(rule).not.toBe('');
    expect(rule).toContain('font-family: inherit');
    expect(rule).not.toContain('var(--font-mono)');
    // The numeric rank/count columns KEEP mono — the digits belong there.
    expect(css.match(/\.trend-rank \{[^}]*\}/)?.[0] ?? '').toContain('var(--font-mono)');
    expect(css.match(/\.trend-count \{[^}]*\}/)?.[0] ?? '').toContain('var(--font-mono)');
  });
});

/* ══ 4. the 0% progress note is the directive one (P3) ═════════════ */

describe('r183-B3 — dashboard 0% progress note (A6 P3)', () => {
  it('R189 re-pin: enrolled + 0% reads «ابدأ أول محاضرة لتتقدّم», the >0% verdict stays for real progress', () => {
    const dash = stripComments(read('src/pages/student/DashboardPage.tsx'));
    /* R189: the verdict moved from the doughnut card's note into the
       stat strip's «إنجاز المقرّرات» trend cell — same ladder, same
       copy, new home. */
    expect(dash).toContain("courseProgressPct === 0 ? 'ابدأ أول محاضرة لتتقدّم'");
    // The verdict line survives for genuinely-late progress (1–49%).
    expect(dash).toContain("'تحتاج إلى دفعة إضافيّة'");
    // and the reassuring top band survives too.
    expect(dash).toContain("'متقدّم كثيراً عن المطلوب'");
  });
});
