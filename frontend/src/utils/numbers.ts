// numbers.ts
export function toWestern(str: string | number): string {
  if (str === undefined || str === null) return '';
  return String(str).replace(/[٠-٩]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) - 1632 + 48)
  );
}

export function formatNum(
  val: number | string,
  options?: Intl.NumberFormatOptions
): string {
  const clean = typeof val === 'string' ? parseFloat(toWestern(val)) : val;
  if (isNaN(clean)) return '';
  return new Intl.NumberFormat('en-US', options).format(clean);
}

export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-EG-u-nu-latn', options).format(d);
}

export function formatTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-LY-u-nu-latn', options).format(d);
}

