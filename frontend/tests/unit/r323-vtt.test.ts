/**
 * r323 B2.2 — the VTT cue parser (pure) — the transcript panel's
 * grammar tests: the platform's own VTT output, SRT tolerance, cue
 * settings, multiline payloads, junk rejection, and the clock format.
 */
import { describe, expect, it } from 'vitest';
import { formatCueClock, parseVttCues } from '../../src/lib/vtt';

describe('parseVttCues', () => {
  it('parses the platform VTT (header, numbered cues, full clocks)', () => {
    const vtt = [
      'WEBVTT',
      '',
      '1',
      '00:00:01.000 --> 00:00:03.500',
      'مرحبًا بكم في المحاضرة الأولى',
      '',
      '2',
      '00:00:03.500 --> 00:00:07.250',
      'اليوم نبدأ بالأنظمة الرقمية',
      '',
    ].join('\n');
    const cues = parseVttCues(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({ start: 1, end: 3.5, text: 'مرحبًا بكم في المحاضرة الأولى' });
    expect(cues[1]!.start).toBe(3.5);
  });

  it('reads the short mm:ss.mmm clock and strips cue settings', () => {
    const vtt = 'WEBVTT\n\n00:01.250 --> 00:04.000 position:50% align:center\nسطر الإعداد';
    const cues = parseVttCues(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0]!.start).toBeCloseTo(1.25, 3);
    expect(cues[0]!.end).toBe(4);
    expect(cues[0]!.text).toBe('سطر الإعداد');
  });

  it('keeps multiline payloads joined and tolerates pasted SRT (comma ms)', () => {
    const srt = '1\n00:00:10,000 --> 00:00:13,000\nسطر أول\nسطر ثانٍ';
    const cues = parseVttCues(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0]!.start).toBe(10);
    expect(cues[0]!.text).toBe('سطر أول\nسطر ثانٍ');
  });

  it('drops broken timings and empty payloads without crashing', () => {
    const junk = [
      'WEBVTT',
      '',
      'xx --> yy',
      'بلا توقيت صالح',
      '',
      '00:00:05.000 --> 00:00:02.000', // inverted — dropped
      '',
      '00:00:06.000 --> 00:00:08.000',
      '', // empty payload — dropped
      '',
    ].join('\n');
    expect(parseVttCues(junk)).toEqual([]);
  });

  it('returns [] for garbage input (the panel renders its honest empty)', () => {
    expect(parseVttCues('')).toEqual([]);
    expect(parseVttCues('ليس ملف تراكات')).toEqual([]);
  });
});

describe('formatCueClock', () => {
  it('rides the player grammar: mm:ss under an hour, h:mm:ss beyond', () => {
    expect(formatCueClock(0)).toBe('00:00');
    expect(formatCueClock(65.9)).toBe('01:05');
    expect(formatCueClock(3723)).toBe('1:02:03');
  });
});
