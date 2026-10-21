import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { StrictMode } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { CursorManager, resolveCursorState } from '../../src/components/motion/CursorManager';

/* ── matchMedia stub: answers per-query so useReducedMotion ('reduce')
   and the fine-pointer gate ('hover: hover'/'pointer: fine') can be
   staged independently, matching the house mock style. ────────────── */

type MediaListener = (e: MediaQueryListEvent) => void;

function installMatchMedia({ fine = true, reduced = false }: { fine?: boolean; reduced?: boolean } = {}) {
  const mediaAdds: Array<{ query: string; cb: MediaListener }> = [];
  const mediaRemoves: Array<{ query: string; cb: MediaListener }> = [];

  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches = query.includes('hover: hover') || query.includes('pointer: fine')
      ? fine
      : query.includes('reduce')
        ? reduced
        : false;
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn((_type: 'change', cb: MediaListener) => {
        mediaAdds.push({ query, cb });
      }),
      removeEventListener: vi.fn((_type: 'change', cb: MediaListener) => {
        mediaRemoves.push({ query, cb });
      }),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });

  return { mediaAdds, mediaRemoves };
}

/* ── rAF stub: counted but never executed — the component's frame body
   is browser layout territory (no jsdom layout assertions here); the
   tests assert scheduling/cancelling and synchronous DOM writes. ───── */

let rafCalls = 0;
let rafCancels = 0;

function installRafStub() {
  rafCalls = 0;
  rafCancels = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => ++rafCalls));
  vi.stubGlobal('cancelAnimationFrame', vi.fn(() => {
    rafCancels++;
  }));
}

/* ── pointer event dispatch helper: works whether or not the DOM
   implementation ships a PointerEvent constructor. ─────────────────── */

function firePointer(
  type: string,
  target: EventTarget,
  init: { clientX?: number; clientY?: number; relatedTarget?: EventTarget | null } = {},
) {
  const Ctor = typeof window.PointerEvent === 'function' ? window.PointerEvent : window.MouseEvent;
  target.dispatchEvent(
    new Ctor(type, { bubbles: true, cancelable: true, composed: true, ...init }),
  );
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
}

describe('CursorManager gating', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    installRafStub();
  });

  afterEach(() => {
    setInnerWidth(originalInnerWidth);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders null on coarse pointers — pipeline dormant, gate watch only', () => {
    const { mediaAdds, mediaRemoves } = installMatchMedia({ fine: false });
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const { container, unmount } = render(<CursorManager />);
    expect(container.innerHTML).toBe('');
    // Only the gate watch stays live (resize + fine-pointer media, so a
    // later-attached mouse can still activate); the pointer pipeline
    // (pointermove/over/out/down/up/scroll) attaches nothing.
    expect(winAdd.mock.calls.every((call) => call[0] === 'resize')).toBe(true);
    unmount();
    expect(winRemove.mock.calls.length).toBe(winAdd.mock.calls.length);
    expect(mediaRemoves.length).toBe(mediaAdds.length);
  });

  it('renders null below the desktop width gate', () => {
    installMatchMedia({ fine: true });
    setInnerWidth(800);
    const { container } = render(<CursorManager />);
    expect(container.innerHTML).toBe('');
  });

  it('renders null under reduced motion even on a fine, wide desktop', () => {
    installMatchMedia({ fine: true, reduced: true });
    const { container } = render(<CursorManager />);
    expect(container.innerHTML).toBe('');
  });

  it('mounts the layer on a fine pointer at 1280px with motion allowed', () => {
    installMatchMedia({ fine: true, reduced: false });
    setInnerWidth(1280);
    const { container } = render(<CursorManager />);

    const layer = container.querySelector('.cursor-layer');
    expect(layer).not.toBeNull();
    expect(layer?.getAttribute('aria-hidden')).toBe('true');
    expect(layer?.getAttribute('role')).toBe('presentation');

    // Full structure: dot (core + ring) and the lines wrapper.
    expect(container.querySelector('.cursor-dot')).not.toBeNull();
    expect(container.querySelector('.cursor-dot-core')).not.toBeNull();
    expect(container.querySelector('.cursor-dot-ring')).not.toBeNull();
    expect(container.querySelector('.cursor-lines')).not.toBeNull();
    expect(container.querySelector('.cursor-line-h')).not.toBeNull();
    expect(container.querySelector('.cursor-line-v')).not.toBeNull();
    expect(container.querySelector('.cursor-readout')).not.toBeNull();

    // Inert start: no data-active until the first pointermove; lines off.
    expect(layer?.hasAttribute('data-active')).toBe(false);
    expect(layer?.getAttribute('data-state')).toBe('default');
    expect(layer?.getAttribute('data-lines')).toBe('off');
  });
});

describe('resolveCursorState', () => {
  it('maps interactive elements to "link"', () => {
    expect(resolveCursorState(document.createElement('a'))).toBe('link');
    expect(resolveCursorState(document.createElement('button'))).toBe('link');
    const roleBtn = document.createElement('div');
    roleBtn.setAttribute('role', 'button');
    expect(resolveCursorState(roleBtn)).toBe('link');
    const roleLink = document.createElement('span');
    roleLink.setAttribute('role', 'link');
    expect(resolveCursorState(roleLink)).toBe('link');
    const btn = document.createElement('div');
    btn.className = 'btn';
    expect(resolveCursorState(btn)).toBe('link');
    const nav = document.createElement('div');
    nav.className = 'nav-item';
    expect(resolveCursorState(nav)).toBe('link');
    expect(resolveCursorState(document.createElement('summary'))).toBe('link');
    expect(resolveCursorState(document.createElement('label'))).toBe('link');
  });

  it('maps text fields to "text"', () => {
    expect(resolveCursorState(document.createElement('input'))).toBe('text');
    expect(resolveCursorState(document.createElement('textarea'))).toBe('text');
    expect(resolveCursorState(document.createElement('select'))).toBe('text');
    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    expect(resolveCursorState(editable)).toBe('text');
    const emptyEditable = document.createElement('div');
    emptyEditable.setAttribute('contenteditable', '');
    expect(resolveCursorState(emptyEditable)).toBe('text');
  });

  it('maps data-cursor="drag" to "drag", including for descendants', () => {
    const drag = document.createElement('div');
    drag.setAttribute('data-cursor', 'drag');
    expect(resolveCursorState(drag)).toBe('drag');
    const child = document.createElement('span');
    drag.appendChild(child);
    expect(resolveCursorState(child)).toBe('drag');
  });

  it('data-cursor="none" forces "hidden" and wins over inner opt-ins', () => {
    const surface = document.createElement('div');
    surface.setAttribute('data-cursor', 'none');
    expect(resolveCursorState(surface)).toBe('hidden');
    const inner = document.createElement('button');
    surface.appendChild(inner);
    expect(resolveCursorState(inner)).toBe('hidden');
    const dragInner = document.createElement('div');
    dragInner.setAttribute('data-cursor', 'drag');
    surface.appendChild(dragInner);
    expect(resolveCursorState(dragInner)).toBe('hidden');
  });

  it('falls back to "default" for plain elements and null', () => {
    expect(resolveCursorState(document.createElement('div'))).toBe('default');
    expect(resolveCursorState(document.createElement('p'))).toBe('default');
    expect(resolveCursorState(null)).toBe('default');
  });
});

describe('CursorManager behavior', () => {
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    installRafStub();
    installMatchMedia({ fine: true, reduced: false });
  });

  afterEach(() => {
    setInnerWidth(originalInnerWidth);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('becomes active on the first pointermove', () => {
    const { container } = render(<CursorManager />);
    const layer = container.querySelector('.cursor-layer') as HTMLElement;
    expect(layer.hasAttribute('data-active')).toBe(false);

    firePointer('pointermove', window, { clientX: 40, clientY: 60 });
    expect(layer.getAttribute('data-active')).toBe('true');
    expect(rafCalls).toBeGreaterThan(0); // follow loop scheduled
  });

  it('delegates data-state from pointerover targets', () => {
    const { container } = render(<CursorManager />);
    const layer = container.querySelector('.cursor-layer') as HTMLElement;

    const button = document.createElement('button');
    document.body.appendChild(button);
    firePointer('pointerover', button);
    expect(layer.getAttribute('data-state')).toBe('link');

    const plain = document.createElement('div');
    document.body.appendChild(plain);
    firePointer('pointerover', plain);
    expect(layer.getAttribute('data-state')).toBe('default');

    const drag = document.createElement('div');
    drag.setAttribute('data-cursor', 'drag');
    document.body.appendChild(drag);
    firePointer('pointerover', drag);
    expect(layer.getAttribute('data-state')).toBe('drag');
  });

  it('suppresses the dot on data-cursor="none" surfaces', () => {
    const { container } = render(<CursorManager />);
    const layer = container.querySelector('.cursor-layer') as HTMLElement;

    const surface = document.createElement('div');
    surface.setAttribute('data-cursor', 'none');
    document.body.appendChild(surface);
    firePointer('pointerover', surface);
    expect(layer.getAttribute('data-state')).toBe('hidden');
  });

  it('turns construction lines on inside a data-cursor-lines container and off on leave', () => {
    const { container } = render(<CursorManager />);
    const layer = container.querySelector('.cursor-layer') as HTMLElement;

    const host = document.createElement('div');
    host.setAttribute('data-cursor-lines', 'cross');
    const inner = document.createElement('span');
    host.appendChild(inner);
    document.body.appendChild(host);

    firePointer('pointerover', inner);
    expect(layer.getAttribute('data-lines')).toBe('on');
    expect(layer.getAttribute('data-lines-axis')).toBe('cross');

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    firePointer('pointerout', inner, { relatedTarget: outside });
    expect(layer.getAttribute('data-lines')).toBe('off');
  });

  it('honours the axis limit on data-cursor-lines', () => {
    const { container } = render(<CursorManager />);
    const layer = container.querySelector('.cursor-layer') as HTMLElement;

    const host = document.createElement('div');
    host.setAttribute('data-cursor-lines', 'y');
    document.body.appendChild(host);

    firePointer('pointerover', host);
    expect(layer.getAttribute('data-lines')).toBe('on');
    expect(layer.getAttribute('data-lines-axis')).toBe('y');
  });

  it('shows press feedback and restores the state on release', () => {
    const { container } = render(<CursorManager />);
    const layer = container.querySelector('.cursor-layer') as HTMLElement;

    firePointer('pointermove', window, { clientX: 10, clientY: 10 });
    const button = document.createElement('button');
    document.body.appendChild(button);
    firePointer('pointerover', button);
    expect(layer.getAttribute('data-state')).toBe('link');

    fireEvent.pointerDown(window);
    expect(layer.getAttribute('data-state')).toBe('down');

    fireEvent.pointerUp(window);
    expect(layer.getAttribute('data-state')).toBe('link');
  });
});

describe('CursorManager cleanup', () => {
  let originalInnerWidth: number;
  let mediaAdds: Array<{ query: string; cb: MediaListener }>;
  let mediaRemoves: Array<{ query: string; cb: MediaListener }>;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    installRafStub();
    ({ mediaAdds, mediaRemoves } = installMatchMedia({ fine: true, reduced: false }));
  });

  afterEach(() => {
    setInnerWidth(originalInnerWidth);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('removes every window/document/media listener and cancels the rAF on unmount', () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');

    const { unmount, container } = render(<CursorManager />);
    expect(container.querySelector('.cursor-layer')).not.toBeNull();

    // Leave a pending rAF behind so the cleanup must cancel it.
    firePointer('pointermove', window, { clientX: 10, clientY: 10 });

    const winAdded = winAdd.mock.calls.length;
    const docAdded = docAdd.mock.calls.length;
    const mediaAdded = mediaAdds.length;
    expect(winAdded).toBeGreaterThan(0);
    expect(docAdded).toBeGreaterThan(0);
    expect(mediaAdded).toBeGreaterThan(0);
    expect(rafCalls).toBeGreaterThan(0);

    unmount();

    expect(winRemove.mock.calls.length).toBe(winAdded);
    expect(docRemove.mock.calls.length).toBe(docAdded);
    expect(mediaRemoves.length).toBe(mediaAdded);
    expect(rafCancels).toBe(rafCalls);
  });

  it('is StrictMode-safe: double mount leaves zero net listeners', () => {
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRemove = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRemove = vi.spyOn(document, 'removeEventListener');

    const { unmount, container } = render(
      <StrictMode>
        <CursorManager />
      </StrictMode>,
    );
    expect(container.querySelector('.cursor-layer')).not.toBeNull();

    firePointer('pointermove', window, { clientX: 5, clientY: 5 });

    const winAdded = winAdd.mock.calls.length;
    const docAdded = docAdd.mock.calls.length;
    expect(winAdded).toBeGreaterThan(0);
    expect(docAdded).toBeGreaterThan(0);

    unmount();

    expect(winRemove.mock.calls.length).toBe(winAdded);
    expect(docRemove.mock.calls.length).toBe(docAdded);
    expect(rafCancels).toBe(rafCalls);
  });
});
