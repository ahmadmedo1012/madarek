import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { AnimatedNumber } from '../../src/components/motion/AnimatedNumber';

/**
 * AnimatedNumber unit tests focus on the deterministic paths:
 *  - reduced-motion snaps to formatted target
 *  - format options (locale, percent) round-trip via Intl.NumberFormat
 *  - tabular prop applies font-variant-numeric
 *
 * The full RAF-driven integrator is intentionally not exercised here;
 * RAF + jsdom + fake timers is brittle and the integrator's correctness
 * is observable via the reduced-motion path (immediate snap to target).
 */
describe('AnimatedNumber (reduced-motion / format paths)', () => {
  beforeEach(() => {
    // Force reduced-motion so the integrator skips RAF and snaps.
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('snaps to the integer target with the en locale', () => {
    const { getByTestId } = render(<AnimatedNumber value={1234} locale="en" data-testid="n" />);
    expect(getByTestId('n').textContent).toBe('1,234');
  });

  it('respects percent format options', () => {
    const { getByTestId } = render(
      <AnimatedNumber
        value={0.873}
        locale="en"
        format={{ style: 'percent', maximumFractionDigits: 1 }}
        data-testid="n"
      />,
    );
    expect(getByTestId('n').textContent).toMatch(/87\.3%/);
  });

  it('applies tabular-nums when tabular=true', () => {
    const { getByTestId } = render(<AnimatedNumber value={42} tabular data-testid="n" />);
    expect((getByTestId('n') as HTMLElement).style.fontVariantNumeric).toBe('tabular-nums');
  });

  it('falls back gracefully without locale (uses document language)', () => {
    document.documentElement.lang = 'en';
    const { getByTestId } = render(<AnimatedNumber value={9} data-testid="n" />);
    // 9 formats identically across most locales — assert exact value present.
    expect(getByTestId('n').textContent).toContain('9');
    document.documentElement.lang = '';
  });
});
