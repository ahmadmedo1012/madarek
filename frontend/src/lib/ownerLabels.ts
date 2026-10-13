/**
 * Shared Arabic label maps for the operational-alert enums
 * (severity / category) the backend writes on OperationalAlert rows.
 *
 * Hoisted from OwnerAlertsPage (17-a2, audit 15-a P1-6) by wave 22-b
 * (audit 4-A7 P1-1): the System page renders the exact same enums in
 * its «التنبيهات التشغيلية المفتوحة» feed but was printing them raw
 * («warning · البنية التحتية» in Latin inside an Arabic RTL sentence).
 * One vocabulary for both surfaces — an operator reading the ops page
 * during an incident sees the same words the alerts page uses.
 *
 * Unknown enum values are the CALLER's concern: render them inside a
 * `<bdi>` so a raw Latin run never flows un-isolated through RTL copy
 * (the console's bdi discipline).
 */

/** severity enum → Arabic label (الحرج/الخطأ/التحذير/المعلومة). */
export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'حرج',
  error: 'خطأ',
  warning: 'تحذير',
  info: 'معلومة',
};

/**
 * severity enum → Badge color. `info` maps to the neutral brand tone —
 * an informational alert is not a success state (green), it simply
 * carries no urgency.
 */
export const SEVERITY_COLORS: Record<string, 'red' | 'amber' | 'brand'> = {
  critical: 'red',
  error: 'red',
  warning: 'amber',
  info: 'brand',
};

/**
 * The critical pair, mirrored from the backend's own counting rule —
 * owner.routes.ts GET /system counts critical alerts with
 * `severity: { in: ['critical', 'error'] }`, and the owner's console
 * must never disagree with its own server about what counts as urgent
 * (audit 6A10-2): an 'error'-severity alert IS a critical alert on
 * every owner surface (the alerts-page critical KPI, the dashboard's
 * action-strip badge), the same way the system page's criticalCount
 * already includes it. Structural `{ severity }` argument so any alert
 * shape (OperationalAlert, the system feed's rows) filters point-free.
 */
export function isCriticalAlert(alert: { severity: string }): boolean {
  return alert.severity === 'critical' || alert.severity === 'error';
}

/** category enum → Arabic label (what the alert is about). */
export const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: 'البنية التحتية',
  security: 'الأمان',
  performance: 'الأداء',
  system: 'النظام',
  storage: 'التخزين',
  database: 'قاعدة البيانات',
  api: 'واجهة البرمجة',
  // r151a (R5-A5 P3): these three are the categories the production
  // writers ACTUALLY emit — raiseOperationalAlert derives the category
  // from the alert-code prefix (operational-alerts.ts), and the only
  // live callers write APP_* (errorHandler 5xx paths), HTTP_500
  // (errorHandler unhandled) and SYNC_* (zu-sync stale-run reaper).
  // Without these entries every real server-fault alert rendered a raw
  // Latin «http»/«app»/«sync» badge — the exact leak this map exists
  // to prevent. The seed writes no alerts, so demo data never showed it.
  app: 'التطبيق',
  http: 'الخادم',
  sync: 'المزامنة',
};
