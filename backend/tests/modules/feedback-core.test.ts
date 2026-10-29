/**
 * r323 B3.6 — the feedback loop pure layer — the guard tests.
 */
import { describe, expect, it } from 'vitest';
import {
  canTransitionStatus,
  pushConsoleEntry,
  screenshotOk,
  CONSOLE_RING_MAX,
  CONSOLE_TEXT_MAX,
} from '../../src/modules/feedback/core.js';

describe('pushConsoleEntry', () => {
  it('clips each text to 500 chars and keeps the ring at 20', () => {
    let ring: ReturnType<typeof pushConsoleEntry> = [];
    for (let i = 0; i < CONSOLE_RING_MAX + 5; i++) {
      ring = pushConsoleEntry(ring, 'x'.repeat(CONSOLE_TEXT_MAX + 100), i);
    }
    expect(ring.length).toBe(CONSOLE_RING_MAX);
    expect(ring[0]!.text.length).toBe(CONSOLE_TEXT_MAX);
    // the OLDEST fell off — the ring keeps the LAST 20
    expect(ring[0]!.t).toBe(5);
  });

  it('serializes objects and survives circular junk', () => {
    expect(pushConsoleEntry([], { code: 'P2002' })[0]!.text).toContain('P2002');
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(pushConsoleEntry([], circular)[0]!.text).toBe('[unserializable]');
    expect(pushConsoleEntry([], new Error('boom'))[0]!.text).toBe('boom');
  });
});

describe('screenshotOk', () => {
  it('admits a real JPEG/PNG data URL and refuses everything else', () => {
    expect(screenshotOk('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(screenshotOk('data:image/jpeg;base64,/9j/4AAQ=')).toBe(true);
    expect(screenshotOk('data:text/html;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
    expect(screenshotOk('https://evil.example/shot.png')).toBe(false);
    expect(screenshotOk('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=')).toBe(false);
    expect(screenshotOk('data:image/png;base64,' + 'A'.repeat(600_001))).toBe(false);
    expect(screenshotOk('')).toBe(false);
    expect(screenshotOk(undefined)).toBe(false);
  });
});

describe('canTransitionStatus', () => {
  it('walks the honest grammar: open → triage → fixed|dismissed (terminal)', () => {
    expect(canTransitionStatus('open', 'triage')).toBe(true);
    expect(canTransitionStatus('open', 'fixed')).toBe(true);
    expect(canTransitionStatus('open', 'dismissed')).toBe(true);
    expect(canTransitionStatus('triage', 'fixed')).toBe(true);
    expect(canTransitionStatus('triage', 'dismissed')).toBe(true);
    expect(canTransitionStatus('fixed', 'open')).toBe(false);
    expect(canTransitionStatus('fixed', 'triage')).toBe(false);
    expect(canTransitionStatus('dismissed', 'open')).toBe(false);
    expect(canTransitionStatus('open', 'open')).toBe(false);
  });
});
