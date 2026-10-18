/**
 * r183-B8 — cross-cutting polish + performance-gate pins.
 *
 * Four small fixes + one governance gate, each pinned at the layer
 * where a regression would actually show:
 *   · App.tsx CollegesLayout — the guest public colleges funnel now
 *     ships the skip link («تخطَّ إلى المحتوى», AppShell's a11y
 *     pattern/anchor) — A10 finding 3: it was the ONLY probed surface
 *     without one;
 *   · colleges.css — the campus-filter chip strip keeps its hidden
 *     scrollbar but gains an inline-end edge FADE (mask over the
 *     scrolled content, token-compliant opaque stop) — A10 finding 4;
 *   · AuthPage — the login wall's sub line is journey-aware: a bounced
 *     deep-link visitor (state.from) reads a resume line instead of
 *     the generic platform pitch — A5 finding 2;
 *   · TeacherPages — assignment-modal due date carries the sibling
 *     datetime hint/dir/echo pattern (A7 finding 1) and the messages
 *     h1 follows the nav name «الرسائل» (A7 finding 2) — both pinned
 *     in TeacherPages.test.tsx (rendered layer);
 *   · CI — the build job runs scripts/check-bundle-size.mjs AFTER the
 *     frontend build, and the script pins the three A11 ceilings —
 *     A11 finding 1 (no performance/size gate existed at all).
 *
 * Source-contract asserts use the assets.test.ts convention (pure fs,
 * comment-stripped so tombstone prose quoting OLD copy can never
 * satisfy a pin).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const h = vi.hoisted(() => ({
  login: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  },
}));

vi.mock('../../src/lib/api', () => ({
  api: { get: vi.fn(async () => ({ data: { data: [] } })) },
  unwrap: (promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data),
  // AuthPage's (disabled) REG_NUMBER_AMBIGUOUS institutions query.
  listPublicInstitutions: vi.fn(async () => []),
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => h.login,
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import AuthPage from '../../src/pages/AuthPage';
import { useAuthStore } from '../../src/stores/auth.store';

/* ── static source-contract helpers (assets.test.ts convention) ──── */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── rendered AuthPage helpers (r183-public-funnel pattern) ───────── */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderAuth(state: unknown) {
  return render(
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[{ pathname: '/auth', state }]}>
        <AuthPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ user: null, currentInstitution: null });
});

/* ── fix 1: the public colleges funnel skip link ─────────────────── */
describe('r183-B8 — CollegesLayout skip link (A10 finding 3)', () => {
  const app = stripComments(read('src/App.tsx'));
  const fn = (() => {
    const idx = app.indexOf('function CollegesLayout');
    expect(idx).toBeGreaterThanOrEqual(0);
    const next = app.indexOf('\nfunction ', idx + 1);
    return app.slice(idx, next === -1 ? app.length : next);
  })();

  it('the guest branch ships the skip link — AppShell a11y pattern, #main anchor, first DOM child', () => {
    expect(fn).toContain('<a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>');
  });

  it('the #main target accepts programmatic focus after the skip (AppShell parity)', () => {
    expect(fn).toContain('<main id="main" tabIndex={-1}');
  });

  it('the product class is the AppShell family — not a bespoke public pill', () => {
    // base.css documents the contract as forward-compatible: ANY
    // <a class="skip-link" href="#main"> becomes the visible-on-focus
    // top-center pill — the guest layout must consume it, not invent a
    // second skip-link language (the authed branch mounts AppShell,
    // which emits its own).
    expect(fn).not.toContain('ln-skip-link');
  });
});

/* ── fix 2: the chip-strip edge fade ─────────────────────────────── */
describe('r183-B8 — campus-filter scroller affordance (A10 finding 4)', () => {
  const css = read('src/styles/colleges.css');

  it('the ≤768 chip strip gains an inline-end edge fade over the scrolled content', () => {
    // Mask, not paint: the fade composes with the toolbar's
    // translucent surface and can never introduce a second background.
    expect(css).toContain(
      'mask-image: linear-gradient(to left, transparent 0, var(--surface) 24px)',
    );
    // Prefixed twin for older Safari (backdrop-filter precedent).
    expect(css).toContain(
      '-webkit-mask-image: linear-gradient(to left, transparent 0, var(--surface) 24px)',
    );
  });

  it('the fade is token-compliant — no raw color literal in the rule (color-gate parity)', () => {
    const start = css.indexOf('r183-B8 (A10 finding 4)');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = css.indexOf('.college-grid', start);
    const rule = css.slice(start, end);
    expect(rule).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(|\boklch\(/);
    // The opaque stop consumes a design token.
    expect(rule).toContain('var(--surface)');
  });
});

/* ── fix 3: the login wall's journey-aware sub line ──────────────── */
describe('r183-B8 — AuthPage conditional sub copy (A5 finding 2)', () => {
  it('a bounced deep-link visitor (state.from) reads the resume-the-journey line', () => {
    renderAuth({ from: { pathname: '/colleges/f1' } });

    expect(screen.getByText('سجّل الدخول للمتابعة إلى الصفحة التي طلبها.')).toBeInTheDocument();
    expect(screen.queryByText(/سجِّل دخولك للوصول إلى مقرَّراتك/)).toBeNull();
  });

  it('a plain visit keeps the platform pitch', () => {
    renderAuth(null);

    expect(screen.getByText('سجِّل دخولك للوصول إلى مقرَّراتك ومواردك الأكاديمية.')).toBeInTheDocument();
    expect(screen.queryByText(/للمتابعة إلى الصفحة التي طلبها/)).toBeNull();
  });

  it('a fabricated state.from (off-app pathname) does NOT earn the resume line', () => {
    // readFromPath keeps the condition honest: only an in-app path the
    // login flow can actually resume counts.
    renderAuth({ from: { pathname: 'https://evil.example' } });

    expect(screen.getByText('سجِّل دخولك للوصول إلى مقرَّراتك ومواردك الأكاديمية.')).toBeInTheDocument();
  });
});

/* ── fix 6: the CI bundle-size gate ──────────────────────────────── */
describe('r183-B8 — CI bundle-size gate (A11 finding 1)', () => {
  it('the build job runs the size gate AFTER the frontend build step', () => {
    const ci = read('../.github/workflows/ci.yml');
    const buildJob = ci.slice(ci.indexOf('  build:'));
    const frontendBuild = buildJob.indexOf('npm --prefix frontend run build');
    const sizeGate = buildJob.indexOf('node scripts/check-bundle-size.mjs');
    expect(frontendBuild).toBeGreaterThanOrEqual(0);
    expect(sizeGate).toBeGreaterThan(frontendBuild);
    // One step, in the build job (not tacked onto another job).
    expect(buildJob.indexOf('node scripts/check-bundle-size.mjs', sizeGate + 1)).toBe(-1);
  });

  it('the script pins the three A11 ceilings — total / entry / pdf worker', () => {
    const script = read('../scripts/check-bundle-size.mjs');
    expect(script).toContain('LIMIT_TOTAL_KB = 650');
    expect(script).toContain('LIMIT_ENTRY_KB = 80');
    expect(script).toContain('LIMIT_PDF_KB = 110');
    // Fail-closed scanner errors are a distinct exit code, so a missing
    // dist can never read as a clean pass.
    expect(script).toContain('process.exit(2)');
    // Node builtins only — the CI step runs with no extra install
    // (no bare package specifier is ever imported; node: prefixes
    // excluded from the ban).
    expect(script).toMatch(/from 'node:(fs|path|url|zlib)'/);
    expect(script).not.toMatch(/from ["'](?!node:)[a-zA-Z@][^"']*["']/);
  });
});
