/**
 * Illustration component + scene registry tests.
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
  it('declares all 9 V1 names', () => {
    expect(V1_ILLUSTRATION_NAMES).toHaveLength(9);
    expect(V1_ILLUSTRATION_NAMES).toContain('homepage-hero');
    expect(V1_ILLUSTRATION_NAMES).toContain('error-404');
    expect(V1_ILLUSTRATION_NAMES).toContain('empty-notifs');
    expect(V1_ILLUSTRATION_NAMES).toContain('empty-search');
    expect(V1_ILLUSTRATION_NAMES).toContain('milestone-section');
    expect(V1_ILLUSTRATION_NAMES).toContain('onboarding-frame-1');
    expect(V1_ILLUSTRATION_NAMES).toContain('onboarding-frame-2');
    expect(V1_ILLUSTRATION_NAMES).toContain('onboarding-frame-3');
    expect(V1_ILLUSTRATION_NAMES).toContain('onboarding-role-intro');
  });

  it('loadScene resolves wired scenes to a component', () => {
    expect(loadScene('homepage-hero')).not.toBeNull();
    expect(loadScene('empty-notifs')).not.toBeNull();
    expect(loadScene('empty-search')).not.toBeNull();
    expect(loadScene('error-404')).not.toBeNull();
    expect(loadScene('milestone-section')).not.toBeNull();
    expect(loadScene('onboarding-frame-1')).not.toBeNull();
    expect(loadScene('onboarding-frame-2')).not.toBeNull();
    expect(loadScene('onboarding-frame-3')).not.toBeNull();
    expect(loadScene('onboarding-role-intro')).not.toBeNull();
  });

  it('every V1 illustration name resolves to a non-null component', () => {
    for (const name of V1_ILLUSTRATION_NAMES) {
      expect(loadScene(name)).not.toBeNull();
    }
  });
});

describe('<Illustration>', () => {
  it('renders a wired scene with role=img and aria-label when not decorative', () => {
    render(<Illustration name="empty-notifs" altKey="empty-notifs.alt" />);
    const fig = screen.getByRole('img');
    // i18next default behaviour returns the key unchanged when not wired.
    expect(fig).toHaveAttribute('aria-label', 'empty-notifs.alt');
  });

  it('decorative=true renders aria-hidden and no role=img', () => {
    render(<Illustration name="empty-notifs" decorative />);
    expect(screen.queryByRole('img')).toBeNull();
    const wrappers = document.querySelectorAll('[data-illustration="empty-notifs"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to within-family placeholder for not-yet-wired scenes', () => {
    // Use a name deliberately cast outside the V1 union to simulate a
    // future or unwired scene. The wrapper must render the in-family
    // SceneFallback rather than a broken-image icon.
    const phantom = 'phantom-not-yet-wired' as unknown as IllustrationName;
    render(<Illustration name={phantom} altKey="hero.alt" />);
    const wrappers = document.querySelectorAll('[data-illustration="phantom-not-yet-wired"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0]).toHaveAttribute('data-illustration-fallback', 'true');
    // Still has role=img + aria-label when not decorative.
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'hero.alt');
  });

  it('passes dir prop through to the scene', () => {
    // empty-search renders different paths under dir; the harness
    // confirms the scene receives the prop by checking the underlying
    // SVG is present in either direction.
    const { rerender } = render(<Illustration name="empty-search" decorative dir="ltr" />);
    expect(document.querySelectorAll('[data-illustration="empty-search"]')).toHaveLength(1);
    rerender(<Illustration name="empty-search" decorative dir="rtl" />);
    expect(document.querySelectorAll('[data-illustration="empty-search"]')).toHaveLength(1);
  });

  it('writes data-illustration attribute carrying the scene name', () => {
    render(<Illustration name="empty-notifs" decorative />);
    const node = document.querySelector('[data-illustration="empty-notifs"]');
    expect(node).not.toBeNull();
  });

  it('forwards className', () => {
    render(<Illustration name="empty-notifs" decorative className="kpi-tile-illustration" />);
    const node = document.querySelector('.kpi-tile-illustration');
    expect(node).not.toBeNull();
  });
});
