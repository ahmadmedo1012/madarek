/**
 * scrollLock unit tests (wave 12-14, audit 11-e P2-12) — the
 * ref-counted single writer:
 *   - acquire applies ONE body class and injects the rule once
 *   - acquire is idempotent per holder (double-acquire cannot leak)
 *   - the class survives while any holder remains, drops with the last
 *   - release of an unknown holder is a no-op
 *   - body.style.overflow is NEVER written (legacy writers — e.g. the
 *     Sidebar drawer until it migrates — compose safely with a class)
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  SCROLL_LOCK_BODY_CLASS,
  acquireScrollLock,
  isScrollLocked,
  releaseScrollLock,
} from '../../src/lib/scrollLock';

const RULE_ID = 'mdrk-scroll-lock-rule';

describe('scrollLock', () => {
  const holders: string[] = [];
  const hold = (key: string) => {
    acquireScrollLock(key);
    holders.push(key);
  };
  afterEach(() => {
    holders.splice(0).forEach(releaseScrollLock);
    document.body.classList.remove(SCROLL_LOCK_BODY_CLASS);
    expect(isScrollLocked()).toBe(false);
  });

  it('acquire applies the single body class and reports locked', () => {
    expect(isScrollLocked()).toBe(false);
    hold('modal-a');
    expect(isScrollLocked()).toBe(true);
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
  });

  it('injects the one-rule stylesheet exactly once', () => {
    hold('modal-a');
    hold('modal-b');
    const rules = document.querySelectorAll(`#${RULE_ID}`);
    expect(rules).toHaveLength(1);
    expect(rules[0]!.textContent).toBe(
      `body.${SCROLL_LOCK_BODY_CLASS}{overflow:hidden;}`,
    );
  });

  it('acquire is idempotent per holder — double-acquire cannot leak', () => {
    acquireScrollLock('modal-a');
    acquireScrollLock('modal-a');
    holders.push('modal-a');
    releaseScrollLock('modal-a');
    // One logical holder → one release unlocks.
    expect(isScrollLocked()).toBe(false);
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });

  it('the class survives while other holders remain (stacked overlays)', () => {
    hold('modal-base');
    hold('modal-top');
    releaseScrollLock('modal-top');
    expect(isScrollLocked()).toBe(true);
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    releaseScrollLock('modal-base');
    expect(isScrollLocked()).toBe(false);
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });

  it('release of an unknown holder is a no-op', () => {
    hold('modal-a');
    releaseScrollLock('never-acquired');
    expect(isScrollLocked()).toBe(true);
  });

  it('never writes body.style.overflow — legacy inline writers compose', () => {
    document.body.style.overflow = 'auto'; // e.g. the Sidebar drawer's write
    hold('modal-a');
    expect(document.body.style.overflow).toBe('auto'); // untouched
    releaseScrollLock('modal-a');
    expect(document.body.style.overflow).toBe('auto'); // still untouched
    document.body.style.overflow = '';
  });
});
