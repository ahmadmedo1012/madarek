/**
 * r323 B2.3 — the transcript ingest pure layer (SRT/VTT detection,
 * conversion, sanity) + the storage-gate addition. DB-free.
 */
import { describe, expect, it } from 'vitest';
import {
  detectTranscriptFormat,
  isSrtOrVttFilename,
  srtToVtt,
  transcriptHasCues,
  transcriptKeyFor,
  transcriptServingPathFor,
  TRANSCRIPT_MAX_BYTES,
} from '../../src/modules/ai/transcript.js';
import { isServableLectureFile } from '../../src/http/routes/files.routes.js';

const SRT = [
  '1',
  '00:00:10,000 --> 00:00:14,000',
  'مرحبا بكم في المحاضرة',
  '',
  '2',
  '00:00:15,000 --> 00:00:18,300',
  'قوانين نيوتن',
].join('\n');

describe('detectTranscriptFormat', () => {
  it('reads the header and the numbered-cue shape', () => {
    expect(detectTranscriptFormat('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nنص')).toBe('vtt');
    expect(detectTranscriptFormat(SRT)).toBe('srt');
    expect(detectTranscriptFormat('random text without cues')).toBeNull();
  });
});

describe('srtToVtt', () => {
  it('adds the header and converts comma separators', () => {
    const vtt = srtToVtt(SRT);
    expect(vtt.startsWith('WEBVTT\n')).toBe(true);
    expect(vtt).toContain('00:00:10.000 --> 00:00:14.000');
    expect(vtt).toContain('00:00:18.300');
    expect(vtt).not.toContain(',');
    expect(vtt).toContain('قوانين نيوتن');
  });

  it('is idempotent for VTT input (no double header)', () => {
    const vtt = srtToVtt(SRT);
    expect(srtToVtt(vtt)).toBe(vtt);
  });

  it('normalizes CRLF', () => {
    expect(srtToVtt(SRT.replace(/\n/g, '\r\n'))).toContain('00:00:10.000 --> 00:00:14.000');
  });
});

describe('transcriptHasCues + constants', () => {
  it('sanity-checks the converted output', () => {
    expect(transcriptHasCues(srtToVtt(SRT))).toBe(true);
    expect(transcriptHasCues('WEBVTT\n\nلا توقيت هنا')).toBe(false);
  });

  it('keeps the documented cap and key shapes', () => {
    expect(TRANSCRIPT_MAX_BYTES).toBe(2 * 1024 * 1024);
    expect(transcriptKeyFor('lec1')).toBe('lectures/lec1.vtt');
    expect(transcriptServingPathFor('lec1')).toBe('/api/v1/files/lectures/lec1.vtt');
    expect(isSrtOrVttFilename('a.SRT')).toBe(true);
    expect(isSrtOrVttFilename('a.mp4')).toBe(false);
  });
});

describe('isServableLectureFile (the extended serving gate)', () => {
  it('admits video AND the .vtt sidecar, refuses everything else', () => {
    expect(isServableLectureFile('cabc.mp4')).toBe(true);
    expect(isServableLectureFile('lec1.vtt')).toBe(true);
    expect(isServableLectureFile('lec1.pdf')).toBe(false);
    expect(isServableLectureFile('../papers/x.pdf')).toBe(false);
    expect(isServableLectureFile('a/b.vtt')).toBe(false);
  });
});
