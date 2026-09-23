/**
 * WS-F6 — OnboardingFlow frame-4 role wiring.
 *
 * The flow passes the authenticated role into <Illustration
 * name="onboarding-role-intro" role={role} />; the wrapper forwards it
 * to the scene, which keys its motif off it. The original bug: the
 * wrapper destructured `role: _role` and dropped it, so every role saw
 * the STUDENT book motif.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { OnboardingFlow } from '../../src/components/onboarding/OnboardingFlow';

vi.mock('../../src/hooks/useOnboardingState', () => ({
  useOnboardingState: () => ({
    shouldAutoStart: false,
    isOpen: true,
    isReplay: false,
    currentFrame: 3, // the role-keyed final frame
    open: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    skip: vi.fn(),
    finish: vi.fn(),
  }),
}));

const meState: { data: { id: string; role: string } | null } = { data: null };
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => meState,
}));

const roleIntro = (): HTMLElement =>
  document.querySelector('[data-illustration="onboarding-role-intro"]')!;
const teacherStand = 'line[x1="100"][y1="138"]'; // chalkboard stand
const studentDesk = 'rect[x="48"][y="138"]'; // open-book desk

describe('OnboardingFlow role frame', () => {
  it('renders the TEACHER motif for a teacher on frame 4', () => {
    meState.data = { id: 'u1', role: 'TEACHER' };
    render(<OnboardingFlow />);
    expect(roleIntro()).not.toBeNull();
    expect(roleIntro().querySelector(teacherStand)).not.toBeNull();
    expect(roleIntro().querySelector(studentDesk)).toBeNull();
    // Role copy keyed off the same value.
    expect(document.querySelector('.onboarding-flow-headline')!.textContent)
      .toBe('مرحباً بك أستاذنا');
  });

  it('renders the STUDENT motif when the profile is still loading', () => {
    meState.data = null;
    render(<OnboardingFlow />);
    expect(roleIntro().querySelector(studentDesk)).not.toBeNull();
    expect(roleIntro().querySelector(teacherStand)).toBeNull();
  });
});
