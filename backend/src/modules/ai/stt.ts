/**
 * r323 B2.3 — the speech-to-text generation layer (pure).
 *
 * The teacher can generate a transcript from the lecture's audio/video
 * with an OpenAI-compatible /audio/transcriptions endpoint (Groq
 * Whisper, OpenAI Whisper, local Whisper servers — the same provider
 * grammar as the AI chain). The result is normalised to WebVTT and
 * lands in the SAME storage seat the upload path uses (transcriptKeyFor)
 * so the player's <track> and the knowledge indexer read one format.
 *
 * Pure here: config resolution, the response normaliser (verbose_json
 * segments AND the bare-text fallback), the VTT builder, and the size
 * gate. The worker (routes/curriculum) owns prisma + storage + fetch.
 */

/** The provider cap (OpenAI + Groq free tier) — refuse EARLY with the
 * honest Arabic message rather than downloading a 500 MB lecture into
 * a multipart that will be rejected. */
export const STT_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface SttConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface SttEnvShape {
  STT_API_URL?: string;
  STT_API_KEY?: string;
  STT_MODEL?: string;
}

export function isSttConfigured(env: SttEnvShape): boolean {
  return Boolean(env.STT_API_URL && env.STT_API_KEY);
}

export function sttConfigFrom(env: SttEnvShape): SttConfig | null {
  if (!isSttConfigured(env)) return null;
  return {
    baseUrl: env.STT_API_URL!.replace(/\/+$/, ''),
    apiKey: env.STT_API_KEY!,
    model: env.STT_MODEL || 'whisper-large-v3',
  };
}

/** A normalised cue. `start`/`end` in SECONDS (the verbose_json unit). */
export interface SttSegment {
  start: number;
  end: number;
  text: string;
}

/** verbose_json → segments. Also tolerates the providers that return
 * {segments:[…]} with string timestamps, and the bare {text} fallback
 * (one cue spanning the whole file — honest, not fabricated timing). */
export function parseSttResponse(json: unknown, durationSec?: number): SttSegment[] {
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    if (Array.isArray(obj.segments)) {
      const out: SttSegment[] = [];
      for (const raw of obj.segments) {
        if (!raw || typeof raw !== 'object') continue;
        const seg = raw as Record<string, unknown>;
        const start = Number(seg.start);
        const end = Number(seg.end);
        const text = typeof seg.text === 'string' ? seg.text.trim() : '';
        if (!Number.isFinite(start) || !Number.isFinite(end) || !text) continue;
        out.push({ start, end: Math.max(end, start), text });
      }
      if (out.length > 0) return out;
    }
    if (typeof obj.text === 'string' && obj.text.trim()) {
      const end = Number.isFinite(durationSec) ? Number(durationSec) : 0;
      return [{ start: 0, end, text: obj.text.trim() }];
    }
  }
  throw new Error('stt: unrecognised transcription response shape');
}

/** seconds → the WebVTT clock (HH:MM:SS.mmm). */
export function vttClock(sec: number): string {
  const clamped = Math.max(0, sec);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped - Math.floor(clamped)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** Normalised cues → a valid WebVTT document (the player <track> +
 * the knowledge indexer both consume it; the same bytes as the upload
 * path stores). */
export function buildVttFromSegments(segments: SttSegment[]): string {
  const cues = segments
    .map((s, i) => {
      const end = i + 1 < segments.length ? Math.min(s.end, segments[i + 1]!.start) || s.end : s.end;
      return `${i + 1}\n${vttClock(s.start)} --> ${vttClock(Math.max(end, s.start))}\n${s.text}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${cues}`;
}

/** The multipart body for POST {baseUrl}/audio/transcriptions — built
 * from the standard undici FormData/Blob (Node 18+, no new deps). */
export function buildTranscriptionRequest(
  cfg: SttConfig,
  file: { bytes: Buffer; filename: string; mime: string },
): { url: string; body: FormData; headers: Record<string, string> } {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(file.bytes)], { type: file.mime }), file.filename);
  form.append('model', cfg.model);
  form.append('response_format', 'verbose_json');
  form.append('language', 'ar');
  return {
    url: `${cfg.baseUrl}/audio/transcriptions`,
    body: form,
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
  };
}

/** The audio/video mime the multipart needs (the provider sniffs too,
 * but a honest mime avoids the strict servers' 415s). */
export function mimeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.ogg') || lower.endsWith('.ogv')) return 'audio/ogg';
  if (lower.endsWith('.mp3')) return 'audio/mpeg';
  if (lower.endsWith('.m4a')) return 'audio/mp4';
  if (lower.endsWith('.wav')) return 'audio/wav';
  return 'application/octet-stream';
}
