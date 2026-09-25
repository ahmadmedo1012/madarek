/**
 * Unit tests — <ErrorBoundary> / <RouteErrorBoundary>
 * (audit 4-A14 P1-3: the platform had ZERO error boundaries, so the
 * /competitions/:id crash blanked the entire app — sidebar, topbar,
 * everything — with no recovery but a manual reload).
 *
 * Pins the contract:
 *   - children render untouched while nothing throws;
 *   - a throwing child swaps in the designed Arabic recovery surface
 *     (title «حدث خطأ غير متوقّع» + reload action + home link) and
 *     NEVER renders the raw (Latin) error message to the user;
 *   - RouteErrorBoundary recovers on navigation WITHOUT a page
 *     reload: the fallback's home link changes the route, the
 *     boundary clears, and the healthy route renders again.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { ErrorBoundary, RouteErrorBoundary } from '../../src/components/ErrorBoundary';

// JSX namespace for renderInRouter's parameter type (verbatimModuleSyntax).
import type React from 'react';

function Thrower(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'entries')");
}

// React surfaces boundary-caught errors through console.error —
// silence it so the test output stays readable (the component ALSO
// logs its own [ErrorBoundary] line).
let consoleSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleSpy.mockRestore();
});

describe('ErrorBoundary — render contract', () => {
  // The fallback uses <Link> (SPA recovery without reload), so even
  // the bare boundary is exercised inside a router context — it is a
  // route-level boundary by contract (see component docblock).
  const renderInRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>);

  it('renders children untouched while nothing throws', () => {
    renderInRouter(
      <ErrorBoundary>
        <p>محتوى سليم</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('محتوى سليم')).toBeInTheDocument();
  });

  it('replaces a crashing subtree with the designed Arabic recovery surface', () => {
    renderInRouter(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'حدث خطأ غير متوقّع' })).toBeInTheDocument();
    // Two ways out, per the 404-page grammar.
    expect(screen.getByRole('button', { name: 'إعادة تحميل الصفحة' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'العودة إلى الرئيسية' })).toBeInTheDocument();
  });

  it('never leaks the raw (Latin) error text into the UI', () => {
    renderInRouter(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(document.body.textContent).not.toContain("Cannot read properties");
  });

  it('logs the error for developers (console.error) — copy stays Arabic for users', () => {
    renderInRouter(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    );
    expect(consoleSpy).toHaveBeenCalled();
    const logged = consoleSpy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('[ErrorBoundary]');
  });
});

describe('RouteErrorBoundary — recovery on navigation (no reload)', () => {
  it('clears the fallback and renders the next route when the home link is used', () => {
    render(
      <MemoryRouter initialEntries={['/crashing']}>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/" element={<div>الصفحة الرئيسية السليمة</div>} />
            <Route path="/crashing" element={<Thrower />} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    // The crashed route shows the fallback, not a blank screen.
    expect(screen.getByRole('heading', { level: 1, name: 'حدث خطأ غير متوقّع' })).toBeInTheDocument();
    expect(screen.queryByText('الصفحة الرئيسية السليمة')).not.toBeInTheDocument();

    // The in-fallback home link recovers the app without a reload —
    // window.location.reload is NOT called.
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });
    fireEvent.click(screen.getByRole('link', { name: 'العودة إلى الرئيسية' }));

    expect(screen.getByText('الصفحة الرئيسية السليمة')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'حدث خطأ غير متوقّع' })).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it('the reload action really reloads (stale-deploy chunk failures need it)', () => {
    render(
      <MemoryRouter initialEntries={['/crashing']}>
        <RouteErrorBoundary>
          <Routes>
            <Route path="/" element={<div>home</div>} />
            <Route path="/crashing" element={<Thrower />} />
          </Routes>
        </RouteErrorBoundary>
      </MemoryRouter>,
    );

    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      writable: true,
    });
    fireEvent.click(screen.getByRole('button', { name: 'إعادة تحميل الصفحة' }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
