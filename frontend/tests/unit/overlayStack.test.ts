/**
 * overlayStack unit tests (wave 12-14, audit 11-e P1-2) — pure logic:
 *   - starts empty
 *   - register pushes layers in open order; top() exposes the last
 *   - isTop is true only for the topmost layer
 *   - unregister removes a layer wherever it sits (out-of-order closes)
 *   - unregister of an unknown id is a no-op
 *   - re-registering a known id moves it to the top (no duplicates —
 *     StrictMode's mount→cleanup→mount cycle must not grow the stack)
 *   - isEmpty / count track the registry
 */
import { afterEach, describe, expect, it } from 'vitest';
import { overlayStack } from '../../src/lib/overlayStack';

describe('overlayStack', () => {
  const registered: string[] = [];
  const open = (id: string, kind = 'modal') => {
    overlayStack.register(id, kind);
    registered.push(id);
  };
  afterEach(() => {
    registered.splice(0).forEach((id) => overlayStack.unregister(id));
    // Belt: every test must leave the stack exactly empty.
    expect(overlayStack.isEmpty()).toBe(true);
  });

  it('starts empty', () => {
    expect(overlayStack.isEmpty()).toBe(true);
    expect(overlayStack.count()).toBe(0);
    expect(overlayStack.top()).toBeNull();
  });

  it('register pushes in open order; top() exposes the last entry', () => {
    open('base', 'modal');
    open('upper', 'dropdown');
    expect(overlayStack.count()).toBe(2);
    expect(overlayStack.top()).toEqual({ id: 'upper', kind: 'dropdown' });
  });

  it('isTop is true only for the topmost layer', () => {
    open('base');
    open('upper');
    expect(overlayStack.isTop('base')).toBe(false);
    expect(overlayStack.isTop('upper')).toBe(true);
    expect(overlayStack.isTop('unknown')).toBe(false);
  });

  it('unregister of the top layer promotes the one below', () => {
    open('base');
    open('upper');
    overlayStack.unregister('upper');
    expect(overlayStack.count()).toBe(1);
    expect(overlayStack.isTop('base')).toBe(true);
  });

  it('unregister removes a layer even when it is not on top (out-of-order close)', () => {
    open('base');
    open('middle', 'popover');
    open('top', 'dropdown');
    overlayStack.unregister('middle');
    expect(overlayStack.count()).toBe(2);
    expect(overlayStack.top()).toEqual({ id: 'top', kind: 'dropdown' });
    expect(overlayStack.isTop('base')).toBe(false);
  });

  it('unregister of an unknown id is a no-op', () => {
    open('only');
    overlayStack.unregister('never-registered');
    expect(overlayStack.count()).toBe(1);
    expect(overlayStack.isTop('only')).toBe(true);
  });

  it('re-registering a known id moves it to the top instead of duplicating', () => {
    open('base');
    open('upper');
    overlayStack.register('base', 'modal'); // StrictMode remount cycle
    expect(overlayStack.count()).toBe(2);
    expect(overlayStack.isTop('base')).toBe(true);
    expect(overlayStack.isTop('upper')).toBe(false);
  });

  it('isEmpty flips with the last layer', () => {
    expect(overlayStack.isEmpty()).toBe(true);
    open('only');
    expect(overlayStack.isEmpty()).toBe(false);
    overlayStack.unregister('only');
    expect(overlayStack.isEmpty()).toBe(true);
  });
});
