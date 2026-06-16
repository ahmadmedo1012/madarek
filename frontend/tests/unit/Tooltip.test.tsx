/**
 * Tooltip primitive unit tests.
 *
 * Coverage:
 *   - hidden by default
 *   - shows on hover (after delay)
 *   - shows immediately on focus (no delay)
 *   - hides on mouseleave
 *   - hides on blur
 *   - applies aria-describedby when open
 *   - removes aria-describedby when closed
 *   - hover delay can be customised via showDelayMs
 *   - portal mount with role=tooltip
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from '../../src/components/overlays/Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hidden by default', () => {
    render(
      <Tooltip content="help">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows on hover after delay', () => {
    render(
      <Tooltip content="help" showDelayMs={200}>
        <button type="button">trigger</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(screen.queryByRole('tooltip')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('tooltip')).toHaveTextContent('help');
  });

  it('hides on mouseleave', () => {
    render(
      <Tooltip content="help" showDelayMs={50}>
        <button type="button">trigger</button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole('button'));
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('shows immediately on focus (no delay)', () => {
    render(
      <Tooltip content="help" showDelayMs={1000}>
        <button type="button">trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('help');
  });

  it('hides on blur', () => {
    render(
      <Tooltip content="help">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    fireEvent.focus(screen.getByRole('button'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.blur(screen.getByRole('button'));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('sets aria-describedby on the trigger when open', () => {
    render(
      <Tooltip content="help">
        <button type="button">trigger</button>
      </Tooltip>,
    );
    const btn = screen.getByRole('button');
    expect(btn.getAttribute('aria-describedby')).toBeNull();
    fireEvent.focus(btn);
    expect(btn.getAttribute('aria-describedby')).toBeTruthy();
    fireEvent.blur(btn);
    expect(btn.getAttribute('aria-describedby')).toBeNull();
  });

  it('forwards original onMouseEnter / onMouseLeave handlers', () => {
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    render(
      <Tooltip content="help">
        <button type="button" onMouseEnter={onEnter} onMouseLeave={onLeave}>
          trigger
        </button>
      </Tooltip>,
    );
    fireEvent.mouseEnter(screen.getByRole('button'));
    fireEvent.mouseLeave(screen.getByRole('button'));
    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
