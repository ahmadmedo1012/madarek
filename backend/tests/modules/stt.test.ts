/**
 * r323 B2.3 — the STT pure layer (config, response normaliser, VTT
 * builder, size gate) — the contract tests.
 */
import { describe, expect, it } from 'vitest';
import {
  STT_MAX_UPLOAD_BYTES,
  buildTranscriptionRequest,
  buildVttFromSegments,
  isSttConfigured,
  mimeForFilename,
  parseSttResponse,
  sttConfigFrom,
  vttClock,
  type SttSegment,
} from '../../src/modules/ai/stt.js';

describe('stt config', () => {
  it('refuses when the key or the url is absent (the honest-degradation rule)', () => {
    expect(isSttConfigured({})).toBe(false);
    expect(isSttConfigured({ STT_API_URL: 'https://api.groq.com/openai/v1' })).toBe(false);
    expect(isSttConfigured({ STT_API_KEY: 'gsk_x' })).toBe(false);
    expect(isSttConfigured({ STT_API_URL: 'https://x', STT_API_KEY: 'k' })).toBe(true);
  });

  it('normalises the base url and defaults the model to whisper-large-v3', () => {
    const cfg = sttConfigFrom({ STT_API_URL: 'https://api.groq.com/openai/v1/', STT_API_KEY: 'k' });
    expect(cfg?.baseUrl).toBe('https://api.groq.com/openai/v1');
    expect(cfg?.model).toBe('whisper-large-v3');
    expect(sttConfigFrom({ STT_API_URL: 'https://x/v1', STT_API_KEY: 'k', STT_MODEL: 'whisper-1' })?.model)
      .toBe('whisper-1');
  });
});

describe('stt response normaliser', () => {
  it('maps verbose_json segments (seconds) to cues, trimming junk rows', () => {
    const segs = parseSttResponse({
      segments: [
        { start: 0.5, end: 3.2, text: ' مرحبًا بكم في المحاضرة ' },
        { start: 3.2, end: 6.0, text: 'اليوم نتحدث عن الأنظمة' },
        { start: 7, end: 8, text: '' }, // dropped: empty text
        { start: 'x', end: 9, text: 'كذبة' }, // dropped: non-numeric
      ],
    });
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual({ start: 0.5, end: 3.2, text: 'مرحبًا بكم في المحاضرة' });
  });

  it('falls back to ONE whole-file cue for the bare-text providers (no fabricated timing)', () => {
    const segs = parseSttResponse({ text: 'نص كامل بلا توقيتات' }, 120);
    expect(segs).toEqual([{ start: 0, end: 120, text: 'نص كامل بلا توقيتات' }]);
  });

  it('throws the worker-facing error on an unrecognised shape', () => {
    expect(() => parseSttResponse({ hello: 1 })).toThrow(/unrecognised/);
  });
});

describe('stt vtt builder', () => {
  it('emits a valid WEBVTT doc with sequential cues and non-overlapping ends', () => {
    const segs: SttSegment[] = [
      { start: 0, end: 3.5, text: 'أول جملة' },
      { start: 3, end: 8, text: 'ثاني جملة' },
    ];
    const vtt = buildVttFromSegments(segs);
    expect(vtt.startsWith('WEBVTT\n')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:03.000'); // capped at the next cue's start
    expect(vtt).toContain('00:00:03.000 --> 00:00:08.000'); // clamped to the next cue's start
    expect(vtt).toContain('أول جملة');
  });

  it('renders the clock with padded h/m/s and millisecond precision', () => {
    expect(vttClock(3723.25)).toBe('01:02:03.250');
    expect(vttClock(0)).toBe('00:00:00.000');
  });
});

describe('stt request builder + gates', () => {
  it('builds the multipart with model + Arabic language + verbose_json', () => {
    const { url, body, headers } = buildTranscriptionRequest(
      { baseUrl: 'https://api.groq.com/openai/v1', apiKey: 'k', model: 'whisper-large-v3' },
      { bytes: Buffer.from('x'), filename: 'lecture.mp4', mime: 'video/mp4' },
    );
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(headers.Authorization).toBe('Bearer k');
    expect(body.get('model')).toBe('whisper-large-v3');
    expect(body.get('language')).toBe('ar');
    expect(body.get('response_format')).toBe('verbose_json');
  });

  it('maps the common lecture containers to their mimes', () => {
    expect(mimeForFilename('a.mp4')).toBe('video/mp4');
    expect(mimeForFilename('a.webm')).toBe('video/webm');
    expect(mimeForFilename('a.m4a')).toBe('audio/mp4');
    expect(mimeForFilename('a.bin')).toBe('application/octet-stream');
  });

  it('pins the provider cap at 25 MiB (the honest early refusal)', () => {
    expect(STT_MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
  });
});
