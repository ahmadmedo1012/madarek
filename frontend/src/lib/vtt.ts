/**
 * r323 B2.2 — the WebVTT cue parser (pure).
 *
 * The lecture player's transcript panel (search + click-to-seek) runs
 * on this: it parses the SAME bytes the <track> element renders, so a
 * cue the browser accepts is a cue the panel lists — one grammar.
 *
 * Handles the forms the platform produces and its teachers paste:
 *   WEBVTT
 *
 *   1
 *   00:00:01.000 --> 00:00:03.500
 *   السطر الأول
 *
 *   00:01.250 --> 00:04.000 position:50% align:center   ← cue settings
 *   سطر يمكن أن يلتف
 *   على سطرين
 *
 * SRT (comma milliseconds) is tolerated for free — the comma → dot
 * conversion happens at ingest, but a pasted-in SRT cue must not crash
 * the panel (the chapter-time seat is format-forgiving by design).
 */

export interface VttCue {
  /** Seconds (float). */
  start: number;
  end: number;
  text: string;
}

function clockToSeconds(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
  if (!m) return null;
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const s = Number(m[3]);
  const msGroup = m[4] ?? '0';
  const ms = Number(msGroup.padEnd(3, '0'));
  if (Number.isNaN(h) || Number.isNaN(min) || Number.isNaN(s)) return null;
  return h * 3600 + min * 60 + s + ms / 1000;
}

/** Parse a WebVTT (or forgivingly SRT) document into cues. Returns an
 * empty array for anything with zero valid cues — the panel renders
 * its honest empty state and the <track> never depended on this. */
export function parseVttCues(source: string): VttCue[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const cues: VttCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const arrow = line.indexOf('-->');
    if (arrow < 0) { i += 1; continue; }
    const startRaw = line.slice(0, arrow).trim().split(/\s+/).pop() ?? '';
    const rest = line.slice(arrow + 3);
    const endRaw = rest.trim().split(/\s+/)[0] ?? '';
    const start = clockToSeconds(startRaw);
    const end = clockToSeconds(endRaw);
    if (start === null || end === null || end < start) {
      i += 1;
      continue;
    }
    // the payload: every line until a blank line (cue settings on the
    // timing line are already stripped by the split above)
    const body: string[] = [];
    i += 1;
    while (i < lines.length && lines[i]!.trim() !== '') {
      body.push(lines[i]!);
      i += 1;
    }
    const text = body.join('\n').trim();
    if (text) cues.push({ start, end: Math.max(end, start), text });
  }
  return cues;
}

/** The timestamp cell's text (mm:ss under an hour, h:mm:ss beyond) —
 * the panel's mono seat, matching formatMmSs's player grammar. */
export function formatCueClock(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}
