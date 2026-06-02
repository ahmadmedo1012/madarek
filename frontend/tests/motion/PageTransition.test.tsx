import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageTransition } from '../../src/components/motion/PageTransition';

describe('PageTransition', () => {
  beforeEach(() => {
    // Default: no reduced motion. matchMedia is stubbed in tests/setup.ts.
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset View Transitions API stub between tests.
    delete (document as Document & { startViewTransition?: unknown }).startViewTransition;
  });

  it('renders children inside the transition wrapper', () => {
    render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition>
          <p>route content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    expect(screen.getByText('route content')).toBeInTheDocument();
  });

  it('exposes the route key as a data attribute on the wrapper', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition>
          <p>route content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    const wrapper = container.querySelector('.page-transition');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-route-key')).toBeTruthy();
  });

  it('applies an additional className when provided', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition className="extra">
          <p>route content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    expect(container.querySelector('.page-transition.extra')).not.toBeNull();
  });

  it('does not throw when View Transitions API is unavailable', () => {
    // No startViewTransition on document → CSS fallback path.
    expect(() =>
      render(
        <MemoryRouter initialEntries={['/x']}>
          <PageTransition>
            <p>route content</p>
          </PageTransition>
        </MemoryRouter>,
      ),
    ).not.toThrow();
  });

  it('reduced-motion path: no exception, content renders', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    render(
      <MemoryRouter initialEntries={['/x']}>
        <PageTransition>
          <p>reduced content</p>
        </PageTransition>
      </MemoryRouter>,
    );
    expect(screen.getByText('reduced content')).toBeInTheDocument();
  });
});
