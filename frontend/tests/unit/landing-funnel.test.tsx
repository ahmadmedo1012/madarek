/**
 * r164b → r188 — the landing → register → auth FUNNEL contract.
 *
 * Before r164b every primary CTA on the landing routed to `/auth` (the
 * LOGIN form) — including the finale's «أنشئ حسابك الجامعي», whose label
 * promised account CREATION. The r164b rewiring is carried into the
 * r188 folio landing intact:
 *   تعرّف → أنشئ حسابك / ابدأ الآن → /auth/register → /auth
 *
 *   · fs pins — the route contract is source-visible: 5 primary CTAs →
 *     /auth/register (header, mobile menu, hero, finale, footer), 5
 *     login affordances → /auth (the same surfaces' ghosts), the
 *     warm-up warms BOTH lazy boundaries, and no primary ever carries
 *     the login route.
 *   · rendered guest DOM — a real guest render (auth store untouched:
 *     user null, isHydrated false) sees the split live, the mobile menu
 *     is a both-way funnel (register primary + login ghost), and the
 *     finale closes the loop with an explicit login button beside the
 *     primary (r188: the returning-visitor line became a real ghost
 *     button — same route, clearer affordance).
 *   · 404 way-back — home (primary) + colleges + login (r164b).
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import LandingPage from '../../src/pages/LandingPage';
import NotFoundPage from '../../src/pages/NotFoundPage';

/* The r188 landing boots a ResizeObserver (the reveal belt); jsdom
 * ships neither it nor the visual rAF the canvas engines want. A
 * per-file no-op stub keeps the shared setup.ts untouched. */
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

/* Static source-contract helpers (assets.test.ts convention: pure fs
 * assertions lock in what interaction tests cannot see cheaply). */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
/** Drop /* … *‌/ blocks so rNNN tombstone prose (which quotes the OLD
 * copy it killed) can never satisfy a content pin. */
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

/** The landing mounts no queries of its own in the r188 folio world,
 * but a fresh retries-off client keeps the guest render self-contained
 * (no network in jsdom). */
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

/* ── source contract ─────────────────────────────────────────────── */

describe('landing funnel — source contract (r164b → r188)', () => {
  const tsx = read('src/pages/LandingPage.tsx');
  const live = stripComments(tsx);

  it('the FIVE primary CTAs all route to /auth/register (header, mobile menu, hero, finale, footer)', () => {
    expect((live.match(/to="\/auth\/register"/g) ?? []).length).toBe(5);
    // …and none of them is the login route anymore.
    expect(live).not.toMatch(/to="\/auth"\s+className="(?:btn primary|btn accent)/);
  });

  it('login affordances route to /auth exactly five times (header, mobile, hero, finale, footer ghosts)', () => {
    // 5 register CTAs + 5 login surfaces = the whole funnel wiring.
    expect((live.match(/to="\/auth"/g) ?? []).length).toBe(5);
  });

  it('the finale never shows login copy under a create-account button (label ↔ copy ↔ destination tell one story)', () => {
    // The old defect, pinned dead: «سجِّل دخولك…» lede + «أنشئ حسابك
    // الجامعي» label + /auth destination in one section. Comments are
    // stripped so the r164b tombstone (which quotes the old lede) can't
    // satisfy the pin from beyond the grave.
    const finaleLive = stripComments(tsx);
    const lede = finaleLive.indexOf('fo-cta-lede');
    expect(lede).toBeGreaterThanOrEqual(0);
    const actions = finaleLive.indexOf('fo-cta-actions', lede);
    const ledeBlock = finaleLive.slice(lede, actions);
    expect(ledeBlock).toContain('أنشئ حسابك الجامعي');
    expect(ledeBlock).not.toContain('سجِّل دخولك');

    const actionsBlock = finaleLive.slice(actions, finaleLive.indexOf('fo-cta-meta', actions));
    expect(actionsBlock).toContain('to="/auth/register"');
    // The returning-visitor ghost sits AFTER the primary inside the
    // actions row, never inside the lede.
    expect(actionsBlock).toContain('تسجيل الدخول');
    expect(actionsBlock).toContain('to="/auth"');
  });

  it('the idle warm-up warms BOTH auth boundaries (r162 /auth + r164b /auth/register)', () => {
    const warmAt = tsx.indexOf('const warm = () => {');
    expect(warmAt).toBeGreaterThanOrEqual(0);
    const warmBody = tsx.slice(warmAt, tsx.indexOf('};', warmAt));
    expect(warmBody).toContain(`import('./AuthPage')`);
    expect(warmBody).toContain(`import('./RegisterPage')`);
  });

  it('the mobile menu carries a login affordance (≤1080px hides the header pair)', () => {
    const menuAt = tsx.indexOf('fo-mobile-menu');
    expect(menuAt).toBeGreaterThanOrEqual(0);
    const menu = tsx.slice(menuAt, tsx.indexOf('</header>', menuAt));
    expect(menu).toContain('تسجيل الدخول');
    expect(menu).toContain('to="/auth/register"');
  });
});

/* ── rendered guest DOM ───────────────────────────────────────────── */

describe('landing funnel — rendered guest DOM (r164b → r188)', () => {
  it('a guest sees the split immediately: header login → /auth, header primary → /auth/register', () => {
    const { container } = renderLanding();

    const login = container.querySelector<HTMLAnchorElement>(
      '.fo-header-actions .btn.ghost',
    );
    const primary = container.querySelector<HTMLAnchorElement>(
      '.fo-header-actions .btn.primary',
    );
    expect(login?.getAttribute('href')).toBe('/auth');
    expect(primary?.getAttribute('href')).toBe('/auth/register');
  });

  it('the hero primary carries the start promise: «أنشئ حسابك الجامعي» → /auth/register', () => {
    const { container } = renderLanding();

    const primary = container.querySelector<HTMLAnchorElement>(
      '.fo-hero-actions .fo-hero-cta',
    );
    expect(primary?.textContent).toContain('أنشئ حسابك الجامعي');
    expect(primary?.getAttribute('href')).toBe('/auth/register');
  });

  it('the finale closes the loop: primary → /auth/register AND a login ghost → /auth', () => {
    const { container } = renderLanding();

    const primary = container.querySelector<HTMLAnchorElement>(
      '.fo-cta-actions .btn.accent',
    );
    expect(primary?.textContent).toContain('أنشئ حسابك الجامعي');
    expect(primary?.getAttribute('href')).toBe('/auth/register');

    const login = container.querySelector<HTMLAnchorElement>(
      '.fo-cta-actions .btn.ghost',
    );
    expect(login?.textContent).toContain('تسجيل الدخول');
    expect(login?.getAttribute('href')).toBe('/auth');
  });

  it('ONE primary per content viewport: a single accent CTA in hero and finale each', () => {
    const { container } = renderLanding();

    expect(container.querySelectorAll('.fo-hero-actions .fo-hero-cta')).toHaveLength(1);
    expect(container.querySelectorAll('.fo-cta-actions .btn.accent')).toHaveLength(1);
  });

  it('the mobile menu is a both-way funnel: ONE register primary + a login ghost', () => {
    const { container } = renderLanding();

    // Burger contract (F2-5): the label flips with the state.
    fireEvent.click(screen.getByRole('button', { name: 'فتح القائمة' }));

    const menu = container.querySelector('.fo-mobile-menu');
    expect(menu).not.toBeNull();
    expect(menu?.querySelectorAll('.btn.primary')).toHaveLength(1);
    const primary = menu?.querySelector<HTMLAnchorElement>('.btn.primary');
    expect(primary?.getAttribute('href')).toBe('/auth/register');

    // Scoped to the menu: the header's ghost pair stays in the DOM in
    // jsdom (CSS hides it ≤1080px — layout isn't the query's business).
    const login = within(menu as HTMLElement).getByRole('link', { name: 'تسجيل الدخول' });
    expect(login.getAttribute('href')).toBe('/auth');
    // And it closes again (the menu's own click-to-close contract).
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق القائمة' }));
    expect(container.querySelector('.fo-mobile-menu')).toBeNull();
  });
});

/* ── 404 way-back ─────────────────────────────────────────────────── */

describe('404 way-back (r164b → r188)', () => {
  it('ONE primary (home) + two secondary exits: colleges browse and login', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('.nf-actions .btn.primary')).toHaveLength(1);

    const home = screen.getByRole('link', { name: /العودة إلى الرئيسية/ });
    const colleges = screen.getByRole('link', { name: /تصفّح الكلّيّات التجريبية/ });
    const login = screen.getByRole('link', { name: 'تسجيل الدخول' });
    expect(home.getAttribute('href')).toBe('/');
    expect(colleges.getAttribute('href')).toBe('/colleges');
    expect(login.getAttribute('href')).toBe('/auth');
  });
});
