/**
 * r323 B2.3 — transcript ingest (SRT/VTT) pure layer.
 *
 * The teacher pastes or uploads a captions file; the platform stores it
 * as WebVTT (the ONLY format <track> browsers universally render) and
 * the knowledge indexer (modules/ai/knowledge.ts) consumes the same
 * bytes into timestamped RAG chunks. Pure here: format detection,
 * SRT→VTT conversion (comma → dot millisecond separator — that is the
 * ENTIRE grammar difference for well-formed SRT), and the bounded
 * size gate mirrored by the route.
 */

/** 2 MiB — a 3-hour lecture's captions never come near this. */
export const TRANSCRIPT_MAX_BYTES = 2 * 1024 * 1024;

export function isSrtOrVttFilename(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.srt') || lower.endsWith('.vtt');
}

/**
 * Detect the format from the CONTENT (the extension can lie): VTT has
 * a `WEBVTT` header; SRT starts with a numbered cue block. Null = the
 * bytes are neither — the route refuses with the Arabic message.
 */
export function detectTranscriptFormat(text: string): 'srt' | 'vtt' | null {
  const head = text.slice(0, 200).trim();
  if (/^WEBVTT/i.test(head)) return 'vtt';
  if (/^\d+\s*\n\d{1,2}:\d{2}:\d{2}[,.]\d{1,3} -->/m.test(text.slice(0, 400))) return 'srt';
  return null;
}

/** SRT timestamps use a comma before milliseconds; VTT uses a dot. */
function srtTimestampToVtt(line: string): string {
  return line.replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, '$1.$2');
}

/**
 * SRT → VTT. Adds the WEBVTT header and converts every timestamp line.
 * Already-VTT input returns unchanged (idempotent). Conversion is
 * textual (not a re-parse) so a cue the parser tolerates survives
 * byte-faithful — but the route still VALIDATES the result parses
 * (≥ 1 cue) before storing.
 */
export function srtToVtt(text: string): string {
  if (detectTranscriptFormat(text) === 'vtt') return text;
  const body = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  const converted = body
    .split('\n')
    .map((line) => (line.includes('-->') ? srtTimestampToVtt(line) : line))
    .join('\n');
  return `WEBVTT\n\n${converted}\n`;
}

/** Quick sanity: does the (converted) VTT actually hold a usable cue? */
export function transcriptHasCues(vttText: string): boolean {
  return /\d{1,2}:\d{2}:\d{2}\.\d{1,3} --> \d{1,2}:\d{2}:\d{2}\.\d{1,3}/.test(vttText);
}

/**
 * The stored key + serving path for one lecture's transcript. The
 * lectures namespace carries video AND its text sidecar; the serving
 * route's gate admits both (content-type decides on the way out).
 */
export function transcriptKeyFor(lectureId: string): string {
  return `lectures/${lectureId}.vtt`;
}

export function transcriptServingPathFor(lectureId: string): string {
  return `/api/v1/files/lectures/${lectureId}.vtt`;
}
