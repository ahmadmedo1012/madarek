/**
 * overlayStack × window.history — the r183-B7 overlay-history
 * side-channel (A4 finding 2: transient overlays were URL-blind — a
 * hardware/browser Back navigated the page UNDER the open drawer /
 * ⌘K palette and left it open with body scroll locked).
 *
 * The contract under test (see lib/overlayStack.ts header):
 *   - a BLOCKING layer (modal/sheet/command-palette/lightbox/
 *     sidebar-drawer) pushes a same-URL marker entry that carries the
 *     router's own state inside it;
 *   - a UI close consumes that entry with an invisible back (the
 *     popstate it fires is suppressed — no dismiss loop);
 *   - a hardware Back with a layer open translates to exactly ONE
 *     synthetic Escape on document — the platform's existing
 *     topmost-layer-only dismissal — and the URL lands on the entry
 *     below the marker (same URL → no navigation happened);
 *   - anchored micro-layers (dropdown/popover/notification-panel) do
 *     not participate;
 *   - a close after a navigation replaced the marker entry leaves
 *     history alone (the drawer/palette consumers replace on the
 *     marker — no zombie back, no stranded entries).
 *
 * jsdom implements history traversal with async popstate events
 * (verified by the scratch run before this suite was written), so
 * every back()/forward() is followed by a settle() tick.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { overlayStack, OVERLAY_HISTORY_MARKER } from '../../src/lib/overlayStack';

const state = () => (history.state ?? {}) as Record<string, unknown>;
const settle = () => new Promise((r) => setTimeout(r, 40));

/** Spy harness: counts synthetic Escape keydowns dispatched on
 *  document (what a hardware Back becomes while an overlay is open). */
function escapeSpy() {
  const seen: string[] = [];
  const onKey = (e: KeyboardEvent) => { seen.push(e.key); };
  document.addEventListener('keydown', onKey, true);
  return {
    keys: seen,
    detach: () => document.removeEventListener('keydown', onKey, true),
  };
}

beforeEach(() => {
  // A deterministic base entry that mimics react-router's own state
  // (usr/key/idx) — the marker entry must PRESERVE these.
  history.replaceState({ usr: null, key: 'base', idx: 0 }, '');
});

describe('overlayStack — history integration (r183-B7, A4 finding 2)', () => {
  it('register of a blocking layer pushes a same-URL marker entry that carries the router state', () => {
    overlayStack.register('m1', 'modal');
    const s = state();
    expect(s[OVERLAY_HISTORY_MARKER]).toBe('m1');
    // react-router's own state survived inside the marker entry, so a
    // back onto it is a no-op for the router (no re-navigation).
    expect(s.key).toBe('base');
    expect(s.idx).toBe(0);
    overlayStack.unregister('m1');
    return settle();
  });

  it('register of an anchored layer (dropdown/popover/notification-panel) does NOT touch history', () => {
    overlayStack.register('d1', 'dropdown');
    expect(state()[OVERLAY_HISTORY_MARKER]).toBeUndefined();
    overlayStack.register('p1', 'popover');
    expect(state()[OVERLAY_HISTORY_MARKER]).toBeUndefined();
    overlayStack.register('n1', 'notification-panel');
    expect(state()[OVERLAY_HISTORY_MARKER]).toBeUndefined();
    overlayStack.unregister('n1');
    overlayStack.unregister('p1');
    overlayStack.unregister('d1');
    return settle();
  });

  it('UI close (X/Esc/outside click) consumes its own entry: an invisible back, nothing dismissed', async () => {
    overlayStack.register('m1', 'modal');
    const spy = escapeSpy();
    overlayStack.unregister('m1'); // → history.back() (suppressed pop)
    await settle();
    spy.detach();
    // Back on the base entry: marker gone, router state intact, and
    // NO synthetic Escape fired (the layer is already closed — a
    // dismiss here would be the loop the suppress flag exists for).
    expect(state()[OVERLAY_HISTORY_MARKER]).toBeUndefined();
    expect(state().key).toBe('base');
    expect(spy.keys).toEqual([]);
  });

  it('hardware Back with a layer open dismisses the topmost overlay exactly like Escape — at the same URL', async () => {
    overlayStack.register('m1', 'modal');
    const spy = escapeSpy();
    history.back(); // the user's hardware/browser Back
    await settle();
    spy.detach();
    // The back became exactly one Escape press aimed at the topmost layer.
    expect(spy.keys).toEqual(['Escape']);
    // The URL/state landed on the entry BELOW the marker — the marker
    // pushed with no URL change, so this is the SAME page (the "first
    // Back closes the overlay, second Back navigates" contract).
    expect(state().key).toBe('base');
    expect(state()[OVERLAY_HISTORY_MARKER]).toBeUndefined();
    // The layer's real owner now closes itself (what every Esc handler
    // in the app does); that close must NOT fire another back — its
    // entry was already consumed by the pop.
    const lenBefore = history.length;
    overlayStack.unregister('m1');
    await settle();
    expect(history.length).toBe(lenBefore);
    expect(overlayStack.isEmpty()).toBe(true);
  });

  it('stacked layers: ONE Back dismisses ONE layer (the topmost); each keeps its own entry', async () => {
    overlayStack.register('drawer', 'sidebar-drawer');
    overlayStack.register('sheet', 'sheet');
    const spy = escapeSpy();
    history.back(); // from the sheet's entry → lands on the drawer's
    await settle();
    spy.detach();
    expect(spy.keys).toEqual(['Escape']); // one press, one layer
    // The sheet's owner closes it; the current entry is the DRAWER's
    // marker (not the sheet's) → no second back fires.
    overlayStack.unregister('sheet');
    await settle();
    expect(overlayStack.count()).toBe(1);
    expect(state()[OVERLAY_HISTORY_MARKER]).toBe('drawer');
    // The drawer's own UI close still consumes its own entry.
    overlayStack.unregister('drawer');
    await settle();
    expect(overlayStack.isEmpty()).toBe(true);
    expect(state()[OVERLAY_HISTORY_MARKER]).toBeUndefined();
  });

  it('a close after the marker was replaced by a navigation leaves history alone (no zombie back)', async () => {
    overlayStack.register('p1', 'command-palette');
    // The palette's select navigates with replace ON the marker entry
    // (CommandPaletteBody goTo, r183-B7) — simulate that landing:
    history.replaceState({ usr: null, key: 'dest', idx: 1 }, '', '/dest');
    overlayStack.unregister('p1');
    await settle();
    expect(state().key).toBe('dest'); // still on the destination
    expect(state()[OVERLAY_HISTORY_MARKER]).toBeUndefined();
    expect(overlayStack.isEmpty()).toBe(true);
  });

  it('a genuine popstate with NO overlay open is a plain SPA navigation (no synthetic Escape)', async () => {
    history.pushState({ key: 'two', idx: 1 }, '', '/two');
    const spy = escapeSpy();
    history.back();
    await settle();
    spy.detach();
    expect(spy.keys).toEqual([]);
    expect(state().key).toBe('base');
  });
});
