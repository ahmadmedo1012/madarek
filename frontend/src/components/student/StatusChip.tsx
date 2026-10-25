/**
 * StatusChip — R319 §B2 · the mono status chip register.
 *
 * «مؤشرات»: agenda rows, exam rows and course rows print their STATE as
 * a mono chip — square (radius 0), 1px hairline, ~10px Latin mono,
 * ink-on-paper. Orange (text + border) is reserved for LIVE ONLY — the
 * one signal state; everything else stays neutral ink:
 *
 *      [LIVE]  [DUE 3D]  [DONE]  [NEW]
 *
 * `dueChip(n)` maps a day-count to the honest deadline label
 * (DUE TODAY / DUE nD / OVERDUE / DUE) so every consumer derives the
 * same string from the same arithmetic.
 */
export type StatusChipTone = 'live' | 'due' | 'done' | 'new' | 'quiet';

export const STATUS_CHIP_TONES: readonly StatusChipTone[] = ['live', 'due', 'done', 'new', 'quiet'];

export function StatusChip({ label, tone = 'quiet' }: { label: string; tone?: StatusChipTone }) {
  return (
    <span className={`r319s-chip r319s-chip--${tone}`} dir="ltr">
      {label}
    </span>
  );
}

/** The deadline chip for a whole-day count (negative = overdue). */
export function dueChip(days: number): { label: string; tone: StatusChipTone } {
  if (days < 0) return { label: 'OVERDUE', tone: 'due' };
  if (days === 0) return { label: 'DUE TODAY', tone: 'due' };
  if (days <= 9) return { label: `DUE ${days}D`, tone: 'due' };
  return { label: 'DUE', tone: 'due' };
}

/** Whole days from `now` to `iso` (rounded — mirrors formatDue's math). */
export function dueDays(iso: string, now: Date = new Date()): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.MAX_SAFE_INTEGER;
  return Math.round((t - now.getTime()) / 86_400_000);
}
