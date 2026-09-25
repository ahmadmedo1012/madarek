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

/** category enum → Arabic label (what the alert is about). */
export const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: 'البنية التحتية',
  security: 'الأمان',
  performance: 'الأداء',
  system: 'النظام',
  storage: 'التخزين',
  database: 'قاعدة البيانات',
  api: 'واجهة البرمجة',
};
