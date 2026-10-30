/**
 * Formatting utilities — Arabic-first, Africa/Tripoli display behavior,
 * Western (latn) digit glyphs for metrics and dates, per the platform
 * convention (web: Intl with ar-LY-u-nu-latn).
 *
 * R326 crash fix (cause a): NO module-scope `Intl.DateTimeFormat`. Hermes on
 * some iOS/Android builds throws `RangeError` for unsupported locale/option
 * combos (ar-LY-u-nu-latn + timeZone) at *import time*, which white-screens
 * the app the moment the student tree loads after login. Every formatter is
 * now a lazily-built, cached, try/catch-guarded factory with an explicit
 * fallback chain: `ar-LY-u-nu-latn` → `ar` → `en-US`.
 */

const TZ = "Africa/Tripoli";

type DateTimeFormatOptions = Intl.DateTimeFormatOptions;

/**
 * Build a formatter once per (locale-chain, options) key, guarded so an
 * unsupported locale never throws. Falls back ar-LY-u-nu-latn → ar → en-US.
 */
const cache = new Map<string, Intl.DateTimeFormat>();

function safeFormatter(key: string, build: (locale: string) => Intl.DateTimeFormat): Intl.DateTimeFormat {
  const hit = cache.get(key);
  if (hit) return hit;
  const locales = ["ar-LY-u-nu-latn", "ar", "en-US"];
  let fmt: Intl.DateTimeFormat | null = null;
  for (const locale of locales) {
    try {
      fmt = build(locale);
      break;
    } catch {
      // Unsupported locale/option combo on this engine — try the next rung.
    }
  }
  if (!fmt) {
    // Last resort: no options, default locale. Never throw from formatting.
    try {
      fmt = new Intl.DateTimeFormat();
    } catch {
      fmt = {
        format: (d: Date) =>
          `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
      } as unknown as Intl.DateTimeFormat;
    }
  }
  cache.set(key, fmt);
  return fmt;
}

function fmtDate(opts: DateTimeFormatOptions): Intl.DateTimeFormat {
  return safeFormatter(`date:${JSON.stringify(opts)}`, (loc) =>
    new Intl.DateTimeFormat(loc, { timeZone: TZ, ...opts }),
  );
}

/** Force Western digit glyphs regardless of device locale. */
export function latn(n: number): string {
  return String(n).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function num(n: number | null | undefined, fallback = "—"): string {
  if (n === null || n === undefined || Number.isNaN(n)) return fallback;
  return latn(n);
}

export function pct(n: number | null | undefined, fallback = "—"): string {
  if (n === null || n === undefined || Number.isNaN(n)) return fallback;
  return `${latn(Math.round(n))}%`;
}

const AR_DATE_OPTS: DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };
const AR_DATE_SHORT_OPTS: DateTimeFormatOptions = { day: "numeric", month: "short" };
const AR_TIME_OPTS: DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12: true };
const AR_WEEKDAY_OPTS: DateTimeFormatOptions = { weekday: "long" };

export function fullDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return fmtDate(AR_DATE_OPTS).format(new Date(d));
  } catch {
    return "—";
  }
}

export function shortDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return fmtDate(AR_DATE_SHORT_OPTS).format(new Date(d));
  } catch {
    return "—";
  }
}

export function timeOf(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return fmtDate(AR_TIME_OPTS).format(new Date(d));
  } catch {
    return "—";
  }
}

export function weekdayOf(d: string | Date | null | undefined): string {
  if (!d) return "—";
  try {
    return fmtDate(AR_WEEKDAY_OPTS).format(new Date(d));
  } catch {
    return "—";
  }
}

export function dateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return `${shortDate(d)} · ${timeOf(d)}`;
}

/** «قبل ٥ دقائق» style relative stamp (Western digits). */
export function fromNow(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const diffMs = Date.now() - new Date(d).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `قبل ${latn(min)} دقيقة`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `قبل ${latn(hours)} ساعة`;
  const days = Math.round(hours / 24);
  if (days < 30) return `قبل ${latn(days)} يومًا`;
  return fullDate(d);
}

/** Due/overdue-aware due formatting (from the web dashboard agenda). */
export function dueLabel(dueAt: string | Date | null | undefined): { text: string; overdue: boolean } {
  if (!dueAt) return { text: "بلا موعد", overdue: false };
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  const overdue = due < now;
  const absDays = Math.abs(Math.round((due - now) / 86400000));
  if (absDays === 0) return { text: `اليوم · ${timeOf(dueAt)}`, overdue };
  if (absDays === 1) return { text: overdue ? "أمس" : "غدًا", overdue };
  if (absDays <= 7) {
    const day = weekdayOf(dueAt);
    return { text: overdue ? `فات ${day}` : day, overdue };
  }
  return { text: shortDate(dueAt), overdue };
}

/** Tripoli wall-clock hour 0–23 (fallback: device clock) — never throws. */
function tripoliHour(now: Date): number {
  try {
    return Number(
      new Intl.DateTimeFormat("en-u-nu-latn", { timeZone: TZ, hour: "numeric", hour12: false }).format(now),
    );
  } catch {
    return now.getHours();
  }
}

export function greeting(now = new Date()): string {
  const h = tripoliHour(now);
  if (h < 6) return "ليلة سعيدة";
  if (h < 12) return "صباح الخير";
  if (h < 18) return "مساء النور";
  return "مساء الخير";
}

/** week index 0=Sunday..6=Saturday (platform ScheduleSlot.dayOfWeek). */
export const AR_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export function dayName(dayOfWeek: number): string {
  return AR_DAYS[dayOfWeek] ?? "—";
}

export function initials(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (!f && !l) return "؟";
  if (!l) return f.slice(0, 2);
  return (f[0] ?? "") + (l[0] ?? "");
}

/** Clamp helper for progress ratios. */
export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** File size label (MiB). */
export function sizeLabel(sizeBytes: number | string | null | undefined): string {
  const n = typeof sizeBytes === "string" ? Number(sizeBytes) : sizeBytes;
  if (!n || Number.isNaN(n)) return "—";
  if (n < 1024) return `${latn(n)} بايت`;
  if (n < 1024 * 1024) return `${latn(Math.round(n / 1024))} ك.ب`;
  return `${latn(Math.max(1, Math.round((n / (1024 * 1024)) * 10) / 10))} م.ب`;
}
