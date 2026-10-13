/**
 * 12-… — r157 (W2-F7 / audit 6A11): the speed menu's full keyboard.
 *
 * The menu is inline-by-design (NOT a portal — it must survive
 * fullscreen), and its keyboard handler lives on the .vpc-speed HOST
 * so one handler owns the whole menu while open:
 *   · ArrowDown/ArrowUp rove with WRAP (last→first / first→last),
 *     Home/End jump to the edges;
 *   · Escape and Tab close the menu and refocus the trigger (the menu
 *     unmounts, so Tab would otherwise strand focus on <body>);
 *   · Enter/Space select via the native <button> items (no custom
 *     activation) — pinned here through aria-checked + playbackRate.
 *
 * jsdom note (mirrors the real browser): a click does NOT move focus
 * in jsdom — every click is followed by an explicit trigger().focus()
 * / item.focus() so document.activeElement matches what a real
 * browser would have.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { RefObject } from 'react';
import { VideoPlayerChrome } from '../../src/components/player/VideoPlayerChrome';

function renderChrome() {
  // The host page's video ref — the chrome drives THE SAME element.
  const videoRef = { current: null as HTMLVideoElement | null };
  render(
    <VideoPlayerChrome videoRef={videoRef as RefObject<HTMLVideoElement>} checkpointTimes={[]}>
      <video ref={(el) => { videoRef.current = el; }} />
    </VideoPlayerChrome>,
  );
  return { getVideo: () => videoRef.current! };
}

/* Open the menu and mirror the real browser's focus-after-click. */
function openMenu() {
  const trigger = screen.getByRole('button', { name: 'سرعة التشغيل' });
  fireEvent.click(trigger);
  trigger.focus();
  const menu = screen.getByRole('menu', { name: 'سرعة التشغيل' });
  return {
    trigger,
    menu,
    items: within(menu).getAllByRole('menuitemradio'),
  };
}

describe('VideoPlayerChrome speed menu keyboard (r157 / 6A11)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('ArrowDown/ArrowUp rove with wrap; Home/End jump to the edges', () => {
    renderChrome();
    const { items } = openMenu();
    expect(items).toHaveLength(5);

    // Roving: focus the middle item, ArrowDown → next.
    items[2]!.focus();
    fireEvent.keyDown(items[2]!, { key: 'ArrowDown' });
    expect(items[3]).toHaveFocus();

    // WRAP: ArrowDown from the LAST item → the first.
    items[4]!.focus();
    fireEvent.keyDown(items[4]!, { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();

    // WRAP (up): ArrowUp from the FIRST item → the last.
    fireEvent.keyDown(items[0]!, { key: 'ArrowUp' });
    expect(items[4]).toHaveFocus();

    // Home / End from anywhere.
    items[2]!.focus();
    fireEvent.keyDown(items[2]!, { key: 'Home' });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0]!, { key: 'End' });
    expect(items[4]).toHaveFocus();

    // The menu stays open — navigation only, no dismissal.
    expect(screen.getByRole('menu', { name: 'سرعة التشغيل' })).toBeInTheDocument();
  });

  it('Escape closes the menu and refocuses the trigger', () => {
    renderChrome();
    const { trigger, items } = openMenu();

    items[2]!.focus();
    fireEvent.keyDown(items[2]!, { key: 'Escape' });

    expect(screen.queryByRole('menu', { name: 'سرعة التشغيل' })).toBeNull();
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('Tab closes the menu and refocuses the trigger (no body-strand)', () => {
    renderChrome();
    const { trigger, items } = openMenu();

    items[3]!.focus();
    fireEvent.keyDown(items[3]!, { key: 'Tab' });

    // The menu unmounts — a raw Tab would have left focus nowhere.
    expect(screen.queryByRole('menu', { name: 'سرعة التشغيل' })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('selecting an item sets the rate, closes the menu, and aria-checked follows', () => {
    const { getVideo } = renderChrome();
    const video = getVideo();

    // Initial state: 1× is the checked rate.
    const first = openMenu();
    expect(first.items[1]).toHaveAttribute('aria-checked', 'true');

    // Select 2× (the last item) — a real click on a real button.
    fireEvent.click(first.items[4]!);
    expect(video.playbackRate).toBe(2);
    // Closed after select + focus handed back to the trigger.
    expect(screen.queryByRole('menu', { name: 'سرعة التشغيل' })).toBeNull();
    expect(first.trigger).toHaveFocus();

    // Reopen: the checked mark followed the live rate.
    const second = openMenu();
    expect(second.items[4]).toHaveAttribute('aria-checked', 'true');
    expect(second.items[1]).toHaveAttribute('aria-checked', 'false');
  });
});
