/**
 * r305-overlay-conduct — the Heron Shell Contract's ONE overlay
 * interaction grammar, pinned end-to-end across the shared primitives
 * (Task 2-c). The per-primitive suites (Dropdown / Modal / Sheet /
 * Popover / Lightbox / CommandPalette-NotificationPanel) stay the
 * ownership contracts; this file pins the CROSS-PRIMITIVE conduct:
 *
 *   1. Open/close lifecycle — mouse toggle, outside click, Escape.
 *   2. Topmost-only Escape — a blocking layer above keeps a layer below
 *      from closing out from under it (one press, one layer); the top
 *      layer CONSUMES the key even when it declines to close
 *      (closeOnEscape=false — the lib/overlayStack contract).
 *   3. Topmost-only keyboard — a buried dropdown neither dismisses on
 *      Tab nor walks its items while a higher layer owns the keys.
 *   4. Focus: initial placement, Tab containment, and focus return to
 *      the trigger on EVERY keyboard-relevant close path (Esc, Tab,
 *      item/action activation) — anchored panels no longer drop focus
 *      on <body> when their panel unmounts.
 *   5. Scroll lock: blocking layers acquire the ref-counted lock
 *      exactly once per open and release on close — and never touch
 *      body.style.overflow.
 *   6. Chord inerting: while any layer is open, document chords that
 *      honour the overlayStack guard (lib/overlayStack P1-6 idiom) are
 *      inert; a consumed Escape never reaches an unguarded listener.
 *   7. Exit window: anchored panels stay mounted through the
 *      data-closing exit and leave on the token-driven safety net.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useRef, useState, type ReactNode } from 'react';
import { act, cleanup, render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../../src/components/overlays/CommandPalette';
import { Dropdown, DropdownItem } from '../../src/components/overlays/Dropdown';
import { Modal } from '../../src/components/overlays/Modal';
import { Popover } from '../../src/components/overlays/Popover';
import { Sheet } from '../../src/components/overlays/Sheet';
import { NotificationPanel } from '../../src/components/overlays/NotificationPanel';
import { overlayStack } from '../../src/lib/overlayStack';
import { SCROLL_LOCK_BODY_CLASS } from '../../src/lib/scrollLock';

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

afterEach(() => {
  // Unmount FIRST — the registration/lock cleanups drain the overlay
  // stack — then assert the platform was left exactly as it was found.
  cleanup();
  expect(overlayStack.isEmpty()).toBe(true);
  document.body.classList.remove(SCROLL_LOCK_BODY_CLASS);
});

/* ═══════════════════ Dropdown — the menu grammar ═══════════════════ */

function MenuHarness({
  open,
  onClose,
  onSelect,
  closeOnEscape,
}: {
  open: boolean;
  onClose: () => void;
  onSelect?: () => void;
  closeOnEscape?: boolean;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={ref} type="button" data-testid="trigger">
        القائمة
      </button>
      <Dropdown
        open={open}
        onClose={onClose}
        anchorRef={ref}
        ariaLabel="إجراءات"
        closeOnEscape={closeOnEscape}
      >
        <DropdownItem onSelect={onSelect ?? (() => {})}>إجراء</DropdownItem>
      </Dropdown>
    </>
  );
}

/** Toggle host: the trigger owns the open state — the mouse path the
 *  topbar user menu actually drives. */
function ToggleMenuHost() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        data-testid="trigger"
        onClick={() => setOpen((v) => !v)}
      >
        القائمة
      </button>
      <Dropdown open={open} onClose={() => setOpen(false)} anchorRef={ref} ariaLabel="إجراءات">
        <DropdownItem onSelect={() => {}}>إجراء</DropdownItem>
      </Dropdown>
    </>
  );
}

describe('Dropdown — open/close lifecycle (r305 conduct)', () => {
  it('opens on trigger toggle and closes on a second trigger press (mouse)', async () => {
    render(<ToggleMenuHost />);
    const trigger = screen.getByTestId('trigger');
    fireEvent.click(trigger);
    await flush();
    expect(screen.getByRole('menu', { name: 'إجراءات' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // The trigger press is excluded from outside-click, so the second
    // click reaches the consumer's toggle and closes the menu.
    fireEvent.click(trigger);
    await flush();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // The panel lingers through the exit window, marked for the CSS pair.
    expect(document.querySelector('.dropdown')).toHaveAttribute('data-closing', 'true');
  });

  it('outside click closes the menu', async () => {
    const onClose = vi.fn();
    render(<MenuHarness open onClose={onClose} />);
    await flush();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    fireEvent.mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('Escape closes the menu and returns focus to the trigger', async () => {
    const onClose = vi.fn();
    render(<MenuHarness open onClose={onClose} />);
    await flush();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByTestId('trigger'));
  });

  it('arrow keys / Home / End walk the items', async () => {
    function ThreeItemHost() {
      const ref = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          <button ref={ref} type="button">trigger</button>
          <Dropdown open onClose={() => {}} anchorRef={ref} ariaLabel="قائمة">
            <DropdownItem onSelect={() => {}}>أ</DropdownItem>
            <DropdownItem onSelect={() => {}}>ب</DropdownItem>
            <DropdownItem onSelect={() => {}}>ج</DropdownItem>
          </Dropdown>
        </>
      );
    }
    render(<ThreeItemHost />);
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'أ' }));
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'ب' }));
    fireEvent.keyDown(document, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'ج' }));
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'ب' }));
    fireEvent.keyDown(document, { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'أ' }));
  });

  it('item activation (Enter) closes the menu and hands focus back to the trigger', async () => {
    const onSelect = vi.fn();
    function ActivatingHost() {
      const [open, setOpen] = useState(true);
      return (
        <MenuHarness
          open={open}
          onClose={() => setOpen(false)}
          onSelect={() => {
            onSelect();
            setOpen(false);
          }}
        />
      );
    }
    render(<ActivatingHost />);
    await flush();
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'إجراء' }), { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    // The close happens with focus still inside the menu — the trigger
    // (not <body>) receives it, so keyboard users keep their place.
    await flush();
    expect(document.activeElement).toBe(screen.getByTestId('trigger'));
  });

  it('stays mounted through the exit window, then unmounts on the token-driven safety net', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<MenuHarness open onClose={() => {}} />);
      rerender(<MenuHarness open={false} onClose={() => {}} />);
      expect(document.querySelector('.dropdown')).not.toBeNull();
      expect(document.querySelector('.dropdown')).toHaveAttribute('data-closing', 'true');
      // --motion-duration-short fallback (160ms in jsdom) + 80ms slack.
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(document.querySelector('.dropdown')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Dropdown — topmost-only keyboard under a higher layer (r305 conduct)', () => {
  /** Dropdown open first, then a Modal above it (the stacked case the
   *  grammar forbids from closing the buried menu out from under). The
   *  modal layer is stateful so a real close re-renders the stack — the
   *  second Escape must meet the menu as the promoted topmost layer. */
  function StackHost({ onCloseMenu }: { onCloseMenu: () => void }) {
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    const [modalOpen, setModalOpen] = useState(true);
    return (
      <>
        <button ref={anchorRef} type="button" data-testid="trigger">القائمة</button>
        <Dropdown open onClose={onCloseMenu} anchorRef={anchorRef} ariaLabel="إجراءات">
          <DropdownItem onSelect={() => {}}>إجراء</DropdownItem>
        </Dropdown>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          ariaLabel="تأكيد"
        >
          <button type="button" data-testid="modal-btn">متابعة</button>
        </Modal>
      </>
    );
  }

  it('a Modal above keeps the dropdown below from closing on Escape; the second press closes the menu', async () => {
    const onCloseMenu = vi.fn();
    render(<StackHost onCloseMenu={onCloseMenu} />);
    await flush();
    fireEvent.keyDown(document, { key: 'Escape' });
    // One press, one layer: the topmost (modal) closes; the menu stays.
    expect(onCloseMenu).not.toHaveBeenCalled();
    await flush(); // the modal's layer unregisters; the menu is promoted
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMenu).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByTestId('trigger'));
  });

  it('Tab and arrow keys do not act on a menu buried under a modal', async () => {
    const onCloseMenu = vi.fn();
    render(<StackHost onCloseMenu={onCloseMenu} />);
    await flush();
    // Park focus outside both layers (as a click on the scrim would).
    (document.activeElement as HTMLElement | null)?.blur();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(onCloseMenu).not.toHaveBeenCalled();
    // The top layer reclaimed the key: focus sits inside the modal card.
    expect(
      screen.getByRole('dialog', { name: 'تأكيد' }).contains(document.activeElement),
    ).toBe(true);
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(onCloseMenu).not.toHaveBeenCalled();
  });

  /** Controlled variant for the focus round-trip: the menu is always
   *  open; the modal above opens/closes via rerenders — the real-world
   *  order (menu exists and holds focus, THEN a modal opens over it). */
  function StackRoundTripHost({ modalOpen }: { modalOpen: boolean }) {
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    return (
      <>
        <button ref={anchorRef} type="button" data-testid="trigger">القائمة</button>
        <Dropdown open onClose={() => {}} anchorRef={anchorRef} ariaLabel="إجراءات">
          <DropdownItem onSelect={() => {}}>إجراء</DropdownItem>
        </Dropdown>
        <Modal open={modalOpen} onClose={() => {}} ariaLabel="تأكيد">
          <button type="button" data-testid="modal-btn">متابعة</button>
        </Modal>
      </>
    );
  }

  it('focus returns to the menu item when the modal above closes (stack round-trip)', async () => {
    const { rerender } = render(
      <StackRoundTripHost modalOpen={false} />,
    );
    await flush();
    // The menu auto-focused its item BEFORE the modal opened above it…
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'إجراء' }));
    rerender(<StackRoundTripHost modalOpen />);
    await flush();
    expect(
      screen.getByRole('dialog', { name: 'تأكيد' }).contains(document.activeElement),
    ).toBe(true);
    rerender(<StackRoundTripHost modalOpen={false} />);
    await flush();
    // …and the modal's close hands focus back to the layer below.
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'إجراء' }));
  });
});

/* ══════ Decline-and-consume: the top layer owns Escape regardless ══════ */

/** An unguarded document listener mounted AFTER the overlays (the
 *  in-app shape: shell shortcut listeners register at shell mount,
 *  overlay traps arm on open — registration order here proves
 *  stopImmediatePropagation, not listener luck). */
function mountRawListener(seen: string[]) {
  const onRaw = (e: KeyboardEvent) => {
    seen.push(e.key);
  };
  document.addEventListener('keydown', onRaw, true);
  return () => document.removeEventListener('keydown', onRaw, true);
}

describe('decline-and-consume — closeOnEscape=false still consumes the key (r305 conduct)', () => {
  it('a declining topmost Dropdown consumes Escape: no close, no leak to unguarded listeners', async () => {
    const onClose = vi.fn();
    render(<MenuHarness open onClose={onClose} closeOnEscape={false} />);
    await flush();
    const seen: string[] = [];
    const detach = mountRawListener(seen);
    try {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
      expect(seen).toEqual([]); // the top layer consumed the press
    } finally {
      detach();
    }
  });

  it('a declining Popover above a Modal consumes Escape: neither layer closes, nothing leaks', async () => {
    const closePopover = vi.fn();
    const closeModal = vi.fn();
    function Host() {
      const ref = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          <button ref={ref} type="button" data-testid="pop-trigger">المشغّل</button>
          <Modal open onClose={closeModal} ariaLabel="حوار">
            <p>خلفية</p>
          </Modal>
          <Popover open onClose={closePopover} anchorRef={ref} ariaLabel="لوحة" closeOnEscape={false}>
            <p>محتوى</p>
          </Popover>
        </>
      );
    }
    render(<Host />);
    await flush();
    const seen: string[] = [];
    const detach = mountRawListener(seen);
    try {
      fireEvent.keyDown(document, { key: 'Escape' });
      // The top layer (popover) consumed the press even though it
      // declined to close — and the modal BELOW never acted on a key
      // aimed above it.
      expect(closePopover).not.toHaveBeenCalled();
      expect(closeModal).not.toHaveBeenCalled();
      expect(seen).toEqual([]);
    } finally {
      detach();
    }
  });

  it('a declining NotificationPanel consumes Escape: no close, no leak', async () => {
    const onClose = vi.fn();
    function DecliningBellHost() {
      const ref = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          <button ref={ref} type="button" data-testid="bell">الجرس</button>
          <NotificationPanel
            open
            onClose={onClose}
            anchorRef={ref}
            ariaLabel="الإشعارات"
            closeOnEscape={false}
          >
            <p>صندوقك</p>
          </NotificationPanel>
        </>
      );
    }
    render(<DecliningBellHost />);
    await flush();
    const seen: string[] = [];
    const detach = mountRawListener(seen);
    try {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
      expect(seen).toEqual([]);
    } finally {
      detach();
    }
  });
});

/* ═══════════════ Popover — anchored panel focus grammar ═════════════ */

describe('Popover — activation close restores focus to the trigger (r305 conduct)', () => {
  it('a close with focus inside the panel (action activation) returns focus to the trigger', async () => {
    function ActivatingPopoverHost() {
      const [open, setOpen] = useState(true);
      const ref = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          <button ref={ref} type="button" data-testid="pop-trigger">المشغّل</button>
          <Popover open={open} onClose={() => setOpen(false)} anchorRef={ref} ariaLabel="لوحة">
            <button
              type="button"
              data-testid="pop-action"
              onClick={() => setOpen(false)}
            >
              فعل
            </button>
          </Popover>
        </>
      );
    }
    render(<ActivatingPopoverHost />);
    await flush();
    const action = screen.getByTestId('pop-action');
    action.focus(); // real browsers move focus on pointer-down
    fireEvent.click(action);
    await flush();
    // The panel unmounted under a focused control — the trigger (not
    // <body>) receives focus, so keyboard users keep their place.
    expect(document.activeElement).toBe(screen.getByTestId('pop-trigger'));
  });
});

/* ═══════════════ CommandPalette — blocking-layer grammar ═══════════ */

describe('CommandPalette — focus, Escape, chord inerting, scroll lock', () => {
  it('opens with initial focus in the search input', async () => {
    render(
      <CommandPalette open onClose={() => {}} ariaLabel="بحث">
        <input placeholder="ابحث" />
      </CommandPalette>,
    );
    await flush();
    expect(document.activeElement).toBe(screen.getByPlaceholderText('ابحث'));
  });

  it('Escape closes and restores focus to the opener', async () => {
    function PaletteHost() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>افتح</button>
          <CommandPalette open={open} onClose={() => setOpen(false)} ariaLabel="بحث">
            <input placeholder="ابحث" />
          </CommandPalette>
        </>
      );
    }
    render(<PaletteHost />);
    const trigger = screen.getByRole('button', { name: 'افتح' });
    trigger.focus();
    fireEvent.click(trigger);
    await flush();
    expect(document.activeElement).toBe(screen.getByPlaceholderText('ابحث'));
    fireEvent.keyDown(document, { key: 'Escape' });
    await flush();
    expect(document.activeElement).toBe(trigger);
  });

  it('registers while open (chord guard sees a non-empty stack) and unregisters on close', async () => {
    const { rerender } = render(
      <CommandPalette open onClose={() => {}} ariaLabel="بحث">
        <input />
      </CommandPalette>,
    );
    await flush();
    expect(overlayStack.isEmpty()).toBe(false);
    expect(overlayStack.top()?.kind).toBe('command-palette');
    rerender(
      <CommandPalette open={false} onClose={() => {}} ariaLabel="بحث">
        <input />
      </CommandPalette>,
    );
    await flush();
    expect(overlayStack.isEmpty()).toBe(true);
  });

  it('document chords honouring the overlayStack guard are inert while open, live again after close', async () => {
    const chords: string[] = [];
    const onChord = (e: KeyboardEvent) => {
      // The documented P1-6 idiom (lib/overlayStack header) — the same
      // guard AppShell's ⌘K and the global-shortcut consumers run.
      if (!overlayStack.isEmpty()) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') chords.push('k');
    };
    document.addEventListener('keydown', onChord, true);
    try {
      const { rerender } = render(
        <CommandPalette open onClose={() => {}} ariaLabel="بحث">
          <input />
        </CommandPalette>,
      );
      await flush();
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      expect(chords).toEqual([]); // an overlay owns the keyboard
      rerender(
        <CommandPalette open={false} onClose={() => {}} ariaLabel="بحث">
          <input />
        </CommandPalette>,
      );
      await flush();
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
      expect(chords).toEqual(['k']);
    } finally {
      document.removeEventListener('keydown', onChord, true);
    }
  });

  it('a consumed Escape never reaches an unguarded document listener (stopImmediatePropagation)', async () => {
    const onClose = vi.fn();
    render(
      <CommandPalette open onClose={onClose} ariaLabel="بحث">
        <input />
      </CommandPalette>,
    );
    await flush();
    // The unguarded listener mounts AFTER the overlay (the in-app shape:
    // shortcut listeners register at shell mount, overlay traps arm on
    // open) — the trap's consumption must shield it.
    const seen: string[] = [];
    const onRaw = (e: KeyboardEvent) => seen.push(e.key);
    document.addEventListener('keydown', onRaw, true);
    try {
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(seen).toEqual([]); // the top layer consumed the press
    } finally {
      document.removeEventListener('keydown', onRaw, true);
    }
  });

  it('acquires the ref-counted scroll lock exactly once per open and never writes body.style.overflow', () => {
    const { rerender } = render(
      <CommandPalette open onClose={() => {}} ariaLabel="بحث">
        <input />
      </CommandPalette>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    expect(document.body.style.overflow).toBe('');
    rerender(
      <CommandPalette open={false} onClose={() => {}} ariaLabel="بحث">
        <input />
      </CommandPalette>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });
});

/* ═══════════════════ Modal / Sheet — trap + lock grammar ═══════════ */

describe('Modal — focus trap, Escape, scroll lock (r305 conduct)', () => {
  it('Tab cycles: last wraps to first, Shift+Tab from first wraps to last', async () => {
    render(
      <Modal open onClose={() => {}} ariaLabel='حوار'>
        <button type="button">الأول</button>
        <button type="button">الأخير</button>
      </Modal>,
    );
    await flush();
    screen.getByRole('button', { name: 'الأخير' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'الأول' }));
    screen.getByRole('button', { name: 'الأول' }).focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'الأخير' }));
  });

  it('Escape closes; the scroll lock is held while open and released on close — body.style.overflow untouched', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose} ariaLabel="حوار">
        <p>محتوى</p>
      </Modal>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    expect(document.body.style.overflow).toBe('');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(
      <Modal open={false} onClose={onClose} ariaLabel="حوار">
        <p>محتوى</p>
      </Modal>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });
});

describe('Sheet — trap + Escape + scroll lock (r305 conduct)', () => {
  it('Escape closes and focus returns to the opener; Tab stays contained', async () => {
    function SheetHost() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>مرشحات</button>
          <Sheet open={open} onClose={() => setOpen(false)} ariaLabel="تصفية">
            <button type="button">الأول</button>
            <button type="button">الأخير</button>
          </Sheet>
        </>
      );
    }
    render(<SheetHost />);
    const trigger = screen.getByRole('button', { name: 'مرشحات' });
    trigger.focus();
    fireEvent.click(trigger);
    await flush();
    // Tab containment: from the last control the cycle wraps to first.
    screen.getByRole('button', { name: 'الأخير' }).focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'الأول' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    await flush();
    expect(document.activeElement).toBe(trigger);
  });

  it('holds the ref-counted scroll lock while open, releases on close, never writes body.style.overflow', () => {
    const { rerender } = render(
      <Sheet open onClose={() => {}} ariaLabel="تصفية">
        <p>محتوى</p>
      </Sheet>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    expect(document.body.style.overflow).toBe('');
    rerender(
      <Sheet open={false} onClose={() => {}} ariaLabel="تصفية">
        <p>محتوى</p>
      </Sheet>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });
});

/* ═══════════════ NotificationPanel — anchored panel grammar ════════ */

describe('NotificationPanel — Escape + focus return on every close path', () => {
  function BellHarness({
    open,
    onClose,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    children?: ReactNode;
  }) {
    const ref = useRef<HTMLButtonElement | null>(null);
    return (
      <>
        <button ref={ref} type="button" data-testid="bell">
          الجرس
        </button>
        <NotificationPanel open={open} onClose={onClose} anchorRef={ref} ariaLabel="الإشعارات">
          {children ?? <p data-testid="inbox">صندوقك</p>}
        </NotificationPanel>
      </>
    );
  }

  it('Escape closes and returns focus to the bell trigger', () => {
    const onClose = vi.fn();
    render(<BellHarness open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByTestId('bell'));
  });

  it('a close with focus inside the panel (action activation) restores focus to the bell', async () => {
    function ActivatingBellHost() {
      const [open, setOpen] = useState(true);
      return (
        <BellHarness open={open} onClose={() => setOpen(false)}>
          <button type="button" data-testid="mark-read" onClick={() => setOpen(false)}>
            تحديد كمقروء
          </button>
        </BellHarness>
      );
    }
    render(<ActivatingBellHost />);
    const action = screen.getByTestId('mark-read');
    action.focus(); // real browsers move focus on pointer-down
    fireEvent.click(action);
    await flush();
    expect(document.activeElement).toBe(screen.getByTestId('bell'));
  });

  it('an outside click close does NOT yank focus back to the bell', async () => {
    const onClose = vi.fn();
    const outside = document.createElement('button');
    outside.textContent = 'خارج';
    document.body.appendChild(outside);
    try {
      render(<BellHarness open onClose={onClose} />);
      outside.focus();
      fireEvent.mouseDown(outside);
      expect(onClose).toHaveBeenCalledTimes(1);
      await flush();
      // Focus followed the pointer — the panel must not steal it back.
      expect(document.activeElement).toBe(outside);
    } finally {
      outside.remove();
    }
  });
});
