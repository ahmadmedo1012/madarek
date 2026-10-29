/**
 * Formatting utilities — Arabic-first, Africa/Tripoli display behavior,
 * Western (latn) digit glyphs for metrics and dates, per the platform
 * convention (web: Intl with ar-LY-u-nu-latn).
 */

const TZ = "Africa/Tripoli";

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

const AR_DATE = new Intl.DateTimeFormat("ar-LY-u-nu-latn", {
  timeZone: TZ,
  day: "numeric",
  month: "long",
  year: "numeric",
});
const AR_DATE_SHORT = new Intl.DateTimeFormat("ar-LY-u-nu-latn", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
});
const AR_TIME = new Intl.DateTimeFormat("ar-LY-u-nu-latn", {
  timeZone: TZ,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const AR_WEEKDAY = new Intl.DateTimeFormat("ar-LY-u-nu-latn", {
  timeZone: TZ,
  weekday: "long",
});

export function fullDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return AR_DATE.format(new Date(d));
}

export function shortDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return AR_DATE_SHORT.format(new Date(d));
}

export function timeOf(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return AR_TIME.format(new Date(d));
}

export function weekdayOf(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return AR_WEEKDAY.format(new Date(d));
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
    const day = AR_WEEKDAY.format(new Date(dueAt));
    return { text: overdue ? `فات ${day}` : day, overdue };
  }
  return { text: shortDate(dueAt), overdue };
}

export function greeting(now = new Date()): string {
  const h = Number(
    new Intl.DateTimeFormat("en-u-nu-latn", { timeZone: TZ, hour: "numeric", hour12: false }).format(now),
  );
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
