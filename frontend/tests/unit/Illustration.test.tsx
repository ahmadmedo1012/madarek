/**
 * Illustration component + scene registry tests (r280 re-pins).
 *
 * r280: the legacy registry slimmed to the four scenes that still have
 * consumers (MilestoneScene, OnboardingFlow frames 1–2 + role-intro);
 * everything else moved to the mk-ill kit
 * (`components/illustrations` — see MK-illustration.test.tsx there).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Illustration } from '../../src/components/Illustration';
import {
  V1_ILLUSTRATION_NAMES,
  loadScene,
  type IllustrationName,
} from '../../src/lib/illustrations';

describe('Illustration registry', () => {
  it('declares all 4 surviving names', () => {
    expect(V1_ILLUSTRATION_NAMES).toHaveLength(4);
    expect(V1_ILLUSTRATION_NAMES).toContain('milestone-section');
    expect(V1_ILLUSTRATION_NAMES).toContain('onboarding-frame-2');
    expect(V1_ILLUSTRATION_NAMES).toContain('onboarding-frame-3');
    expect(V1_ILLUSTRATION_NAMES).toContain('onboarding-role-intro');
  });

  it('loadScene resolves wired scenes to a component', () => {
    expect(loadScene('milestone-section')).not.toBeNull();
    expect(loadScene('onboarding-frame-2')).not.toBeNull();
    expect(loadScene('onboarding-frame-3')).not.toBeNull();
    expect(loadScene('onboarding-role-intro')).not.toBeNull();
  });

  it('every surviving name resolves to a non-null component', () => {
    for (const name of V1_ILLUSTRATION_NAMES) {
      expect(loadScene(name)).not.toBeNull();
    }
  });
});

describe('<Illustration>', () => {
  it('renders a wired scene with role=img and aria-label when not decorative', () => {
    render(<Illustration name="onboarding-frame-2" alt="جولة التعريف" />);
    const fig = screen.getByRole('img');
    // Alt text is a direct Arabic string (the app ships no i18n runtime).
    expect(fig).toHaveAttribute('aria-label', 'جولة التعريف');
  });

  it('decorative=true renders aria-hidden and no role=img', () => {
    render(<Illustration name="onboarding-frame-2" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    const wrappers = document.querySelectorAll('[data-illustration="onboarding-frame-2"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to within-family placeholder for not-yet-wired scenes', () => {
    // Use a name deliberately cast outside the surviving union to
    // simulate a future or unwired scene. The wrapper must render the
    // in-family SceneFallback rather than a broken-image icon.
    const phantom = 'phantom-not-yet-wired' as unknown as IllustrationName;
    render(<Illustration name={phantom} alt="رسم توضيحي غير متوفر" />);
    const wrappers = document.querySelectorAll('[data-illustration="phantom-not-yet-wired"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toHaveAttribute('data-illustration-fallback', 'true');
    // Still has role=img + aria-label when not decorative.
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'رسم توضيحي غير متوفر');
  });

  it('passes dir prop through to the scene', () => {
    // The harness confirms the scene receives the prop by checking
    // the underlying SVG is present in either direction.
    const { rerender } = render(<Illustration name="onboarding-frame-2" decorative dir="ltr" />);
    expect(document.querySelectorAll('[data-illustration="onboarding-frame-2"]')).toHaveLength(1);
    rerender(<Illustration name="onboarding-frame-2" decorative dir="rtl" />);
    expect(document.querySelectorAll('[data-illustration="onboarding-frame-2"]')).toHaveLength(1);
  });

  it('writes data-illustration attribute carrying the scene name', () => {
    render(<Illustration name="milestone-section" decorative />);
    const node = document.querySelector('[data-illustration="milestone-section"]');
    expect(node).not.toBeNull();
  });

  it('forwards className', () => {
    render(<Illustration name="onboarding-frame-2" decorative className="kpi-tile-illustration" />);
    const node = document.querySelector('.kpi-tile-illustration');
    expect(node).not.toBeNull();
  });
});

describe('<Illustration> role forwarding (onboarding-role-intro)', () => {
  // Per-role motifs — see scenes/onboarding/role-intro.tsx:
  //   STUDENT desk rect (x=48 y=138) · TEACHER stand line (x1=100 y1=138)
  //   ADMIN keyring circle (cx=100 cy=80) · QUALITY clipboard rect (x=62 y=68)
  //   OWNER roof path (M50 80 L 100 56 L 150 80 Z)
  const wrap = (): HTMLElement =>
    document.querySelector('[data-illustration="onboarding-role-intro"]')!;

  it('defaults to the STUDENT book-on-desk motif when no role is passed', () => {
    render(<Illustration name="onboarding-role-intro" decorative />);
    expect(wrap().querySelector('rect[x="48"][y="138"]')).not.toBeNull();
    expect(wrap().querySelector('line[x1="100"][y1="138"]')).toBeNull();
  });

  it.each([
    ['TEACHER', 'line[x1="100"][y1="138"]'],
    ['ADMIN', 'circle[cx="100"][cy="80"]'],
    ['QUALITY', 'rect[x="62"][y="68"]'],
    ['OWNER', 'path[d="M50 80 L 100 56 L 150 80 Z"]'],
  ] as const)('renders the %s motif via its marker %s', (role, marker) => {
    render(<Illustration name="onboarding-role-intro" role={role} decorative />);
    expect(wrap().querySelector(marker)).not.toBeNull();
    // …and NOT the default STUDENT desk.
    expect(wrap().querySelector('rect[x="48"][y="138"]')).toBeNull();
  });
});
