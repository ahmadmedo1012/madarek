/**
 * r171c — WCAG 1.4.3 pin for the UserAvatar initials ink escalation.
 *
 * The 21-c luminance gate picked the better of the two TOKEN inks
 * (#FFFFFF / #191918) — which is ≥4.5:1 for the whole seed palette
 * (worst case #6B7280 4.83:1), but NOT for the whole hue wheel: the
 * mid-violet band measured live on the admin user tables + message
 * inbox rows sits in the pocket where BOTH token inks are under AA at
 * the 11–13px/600 the initials render at:
 *
 *   ground     white-ink  dark-ink  (r171c, computed — browser-verified
 *   #9269DB      3.99       4.41      on the same math via axe-core
 *   #8E66D6      4.18       4.21      4.10.3 + computed styles)
 *   #835FC7      4.74       3.71   ← token white already clears AA
 *
 * The fix escalates: token max < 4.5 → try the pure extremes
 * (#000000 / #FFFFFF) and ship the max-ratio one. Pure black measures
 * 5.27:1 / 5.02:1 on the two failing grounds; mathematically the pure
 * pair can never miss — max((L+0.05)/0.05, 1.05/(L+0.05)) ≥ √21 ≈
 * 4.58 for every single ground — pinned here by a full coarse-grid
 * sweep, not just the two measured hexes.
 *
 * The seed palette must keep its exact 21-c inks (no behavior drift
 * for grounds that already pass): #4F8EF7 → dark 5.48, #9B6FE8 → dark
 * 4.89, #3DD68C → dark 9.38, #D4A537 → dark 7.74, #6B7280 → white
 * 4.83 — the seeded users render pixel-identical.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { UserAvatar, __test__ } from '../../src/components/primitives';

const { avatarInk, contrastRatio, parseHexColor, AVATAR_INKS, AVATAR_PURE_INKS, AVATAR_AA_TEXT } = __test__;

/** Ratio of an ink hex against a ground hex — the same math the
 * component uses (re-derived here so the pin measures, not trusts). */
function ratio(ink: string, ground: string): number {
  const i = parseHexColor(ink);
  const g = parseHexColor(ground);
  if (!i || !g) throw new Error(`unparseable hex: ${ink} / ${ground}`);
  return contrastRatio(i, g);
}

describe('avatarInk — WCAG 1.4.3 escalation (r171c)', () => {
  it('the mid-violet grounds that fail both token inks escalate to a pure extreme that clears AA', () => {
    // #9269DB: token max = dark 4.41 · #8E66D6: token max = dark 4.21 —
    // both under the 4.5 floor; pure black rescues at 5.27 / 5.02.
    for (const ground of ['#9269DB', '#8E66D6']) {
      const ink = avatarInk(ground);
      expect(ink, `ink for ${ground}`).toBeDefined();
      expect([AVATAR_PURE_INKS.black, AVATAR_PURE_INKS.white]).toContain(ink);
      const measured = ratio(ink!, ground);
      expect(measured, `${ink} on ${ground}`).toBeGreaterThanOrEqual(AVATAR_AA_TEXT);
      // …and it is strictly the rescue: the token pair really did fail.
      const tokenMax = Math.max(ratio(AVATAR_INKS.light, ground), ratio(AVATAR_INKS.dark, ground));
      expect(tokenMax, `token max on ${ground}`).toBeLessThan(AVATAR_AA_TEXT);
    }
  });

  it('grounds a token ink already clears keep that token ink — the seed palette is unchanged', () => {
    // [ground, expected ink, ratio for the record]
    const kept: Array<[string, string, number]> = [
      ['#4F8EF7', AVATAR_INKS.dark, 5.48], // seeded student — blue keeps the dark token
      ['#9B6FE8', AVATAR_INKS.dark, 4.89], // seeded admin (violet, still clears)
      ['#3DD68C', AVATAR_INKS.dark, 9.38], // seeded teacher
      ['#D4A537', AVATAR_INKS.dark, 7.74], // seeded quality
      ['#6B7280', AVATAR_INKS.light, 4.83], // seeded owner — the 21-c worst case
      ['#835FC7', AVATAR_INKS.light, 4.74], // measured band edge: white clears
    ];
    for (const [ground, expectedInk, recorded] of kept) {
      expect(avatarInk(ground), `ink for ${ground}`).toBe(expectedInk);
      const measured = ratio(expectedInk, ground);
      expect(measured, `${expectedInk} on ${ground}`).toBeGreaterThanOrEqual(AVATAR_AA_TEXT);
      // the recorded 21-c/r171c measurement, to 2 decimals — a drift in
      // the ink tokens themselves re-fails this pin honestly.
      expect(Math.abs(measured - recorded)).toBeLessThan(0.01);
    }
  });

  it('extreme grounds keep working (white ground → dark ink, black ground → white ink)', () => {
    expect(avatarInk('#FFFFFF')).toBe(AVATAR_INKS.dark);
    expect(ratio(AVATAR_INKS.dark, '#FFFFFF')).toBeGreaterThanOrEqual(AVATAR_AA_TEXT);
    expect(avatarInk('#000000')).toBe(AVATAR_INKS.light);
    expect(ratio(AVATAR_INKS.light, '#000000')).toBeGreaterThanOrEqual(AVATAR_AA_TEXT);
  });

  it('full coarse-grid sweep: the picked ink never ships below 4.5:1 when a pure extreme can save it', () => {
    // Every ground on a 6-step cube (0,51,…,255 per channel — 216
    // grounds spanning the whole wheel incl. every mid-tone band).
    // The mathematical floor is √21 ≈ 4.58 for the pure pair, so the
    // assertion is the contract itself: whatever avatarInk returns,
    // its measured ratio against the ground is ≥ 4.5.
    const steps = [0, 51, 102, 153, 204, 255];
    let worst: { ground: string; ratio: number } | null = null;
    for (const r of steps) {
      for (const g of steps) {
        for (const b of steps) {
          const ground = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
          const ink = avatarInk(ground);
          const measured = ratio(ink!, ground);
          expect(measured, `${ink} on ${ground}`).toBeGreaterThanOrEqual(AVATAR_AA_TEXT);
          if (!worst || measured < worst.ratio) worst = { ground, ratio: measured };
        }
      }
    }
    // …and the sweep's own worst case stays above the AA floor with
    // margin (recorded: 4.561 — a token-white pick just above the
    // gate; the escalated subset bottoms out at the √21 ≈ 4.58 pure
    // pair floor, so the overall floor is the 4.5 gate itself).
    expect(worst!.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the 21-c non-hex contract: var()/other → var(--text), undefined → no inline ink', () => {
    // The only non-hex callers pass neutral surface tokens where the
    // text role is the safe pair — the escalation never sees them.
    expect(avatarInk('var(--surface-3)')).toBe('var(--text)');
    expect(avatarInk(undefined)).toBeUndefined();
  });
});

describe('UserAvatar — the escalation reaches the DOM (r171c)', () => {
  it('renders the escalated pure ink inline for a failing mid-violet ground', () => {
    const { container } = render(<UserAvatar initials="أ" color="#9269DB" size={28} />);
    const avatar = container.querySelector('.avatar') as HTMLElement;
    // jsdom normalizes hex to rgb(): pure black ink on the violet ground.
    expect(avatar.style.color).toBe('rgb(0, 0, 0)');
    expect(avatar.style.backgroundColor).toBe('rgb(146, 105, 219)');
  });

  it('renders the token dark ink unchanged for a passing ground (#4F8EF7)', () => {
    const { container } = render(<UserAvatar initials="أح" color="#4F8EF7" />);
    const avatar = container.querySelector('.avatar') as HTMLElement;
    expect(avatar.style.color).toBe('rgb(25, 25, 24)');
    expect(avatar.style.backgroundColor).toBe('rgb(79, 142, 247)');
  });

  it('renders no inline ink when color is undefined (the CSS default pair applies)', () => {
    const { container } = render(<UserAvatar initials="أ" />);
    const avatar = container.querySelector('.avatar') as HTMLElement;
    expect(avatar.style.color).toBe('');
    expect(avatar.style.backgroundColor).toBe('');
  });
});
