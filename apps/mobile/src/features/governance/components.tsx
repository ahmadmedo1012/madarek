/**
 * Governance local kit — shared by the ADMIN (registrar), QUALITY and
 * OWNER consoles (the GOV surface). CONTRACTS.md: shared files are
 * frozen; anything missing lives here, inside the area's own folder.
 *
 * Contents:
 *  - countAr / latn helpers (web lib/format parity, Western digits).
 *  - pageOf — defensive page normalizer. The transport unwraps `{data}`
 *    envelopes, so a paginated body `{data:[…], meta}` may arrive as the
 *    bare rows array OR as `{data, meta}` (whichever the client of the
 *    day returns). pageOf handles both, never fabricating a total.
 *  - PagerFooter — honest pagination (real meta when present, else a
 *    prev/next pair driven by the fetched page shape).
 *  - Honest ledger renderers for unknown JSON payloads (HonestLedger) —
 *    numbers via latn, arrays as counted rows, labels from the
 *    known-key map, never fabricated values.
 *  - Label/tone maps mirrored from the web console (paper lifecycle,
 *    alert severities/categories, audit actions, exam kinds, feedback).
 *  - FlagToggle — the Heron square switch (44px floor) for owner flags.
 *  - Local row types for the endpoints the frozen API modules type as
 *    `unknown` (defensive optional fields — render what is present).
 */
import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Check from "lucide-react-native/icons/check";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import X from "lucide-react-native/icons/x";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp, type StatusToneName } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { StatLine, Avatar } from "@/components/ui/data";
import { CountUp, RingProgress } from "@/motion";
import { fonts } from "@/design/fonts";
import { type as typeScale } from "@/design/tokens";
import { latn } from "@/lib/format";

/* ══════════════════════ Counted Arabic plurals ═══════════════════ */

/** web lib/format.countAr parity: [one, two, few(3–10), many(11+)]. */
export function countAr(n: number, forms: [string, string, string, string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (n >= 3 && n <= 10) return `${latn(n)} ${forms[2]}`;
  return `${latn(n)} ${forms[3]}`;
}

export const UNIT = {
  user: ["مستخدم واحد", "مستخدمان", "مستخدمين", "مستخدماً"] as [string, string, string, string],
  student: ["طالب واحد", "طالبان", "طلاب", "طالباً"] as [string, string, string, string],
  teacher: ["أستاذ واحد", "أستاذان", "أساتذة", "أستاذاً"] as [string, string, string, string],
  course: ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"] as [string, string, string, string],
  faculty: ["كلّيّة واحدة", "كلّيّتان", "كلّيّات", "كلّيّة"] as [string, string, string, string],
  paper: ["ورقة واحدة", "ورقتان", "أوراق", "ورقة"] as [string, string, string, string],
  event: ["حدث واحد", "حدثان", "أحداث", "حدثاً"] as [string, string, string, string],
  alert: ["تنبيه واحد", "تنبيهان", "تنبيهات", "تنبيهاً"] as [string, string, string, string],
  report: ["تقرير واحد", "تقريران", "تقارير", "تقريراً"] as [string, string, string, string],
};

/* ══════════════════════ Page normalization ════════════════════════ */

export interface MaybePageMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface PageSlice<T> {
  rows: T[];
  meta: MaybePageMeta | null;
}

/**
 * Normalizes whatever a paginated endpoint produced into rows + meta.
 * `meta` is only set when the payload actually carried one — a missing
 * meta is never replaced with a fabricated total.
 */
export function pageOf<T>(value: unknown): PageSlice<T> {
  if (Array.isArray(value)) return { rows: value as T[], meta: null };
  if (value && typeof value === "object") {
    const obj = value as { data?: unknown; meta?: unknown };
    if (Array.isArray(obj.data)) {
      const meta =
        obj.meta && typeof obj.meta === "object" ? (obj.meta as MaybePageMeta) : null;
      return { rows: obj.data as T[], meta };
    }
  }
  return { rows: [], meta: null };
}

/** Coerces unknown values into finite numbers (null when absent). */
export function numOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

export function textOf(value: unknown, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number") return latn(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return fallback;
}

/**
 * PagerFooter — the mobile twin of the web TablePaginationFooter.
 * Real meta → «الصفحة X من Y · N وحدة»; without meta the footer stays
 * honest: page number + prev/next (next armed only while the current
 * page came back full — an over-asked page renders the empty state).
 */
export function PagerFooter({
  page,
  rowsLength,
  limit,
  meta,
  unit,
  onPage,
  loading,
}: {
  page: number;
  rowsLength: number;
  limit: number;
  meta: MaybePageMeta | null;
  unit: [string, string, string, string];
  onPage: (p: number) => void;
  loading?: boolean;
}) {
  const p = usePalette();
  const total = numOf(meta?.total);
  const totalPages = numOf(meta?.totalPages);
  const hasPrev = page > 1;
  const hasNext = totalPages ? page < totalPages : rowsLength >= limit;
  const countLabel =
    total !== null
      ? `الصفحة ${latn(page)}${totalPages ? ` من ${latn(totalPages)}` : ""} · ${countAr(total, unit)}`
      : `الصفحة ${latn(page)} · ${countAr(rowsLength, unit)}`;
  return (
    <View
      style={{
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: p.border,
        paddingTop: sp[8],
        gap: sp[8],
      }}
    >
      <T variant="sm" color="muted" align="center">
        {countLabel}
      </T>
      <View style={{ flexDirection: "row", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <Button
            label="السابق"
            kind="ghost"
            small
            disabled={!hasPrev || loading}
            onPress={() => onPage(Math.max(1, page - 1))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="التالي"
            kind="ghost"
            small
            disabled={!hasNext || loading}
            onPress={() => onPage(page + 1)}
          />
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════ Honest unknown-JSON rendering ═══════════════ */

/** Known payload keys → Arabic labels (never a fabricated value). */
const KNOWN_LABELS: Record<string, string> = {
  totalStudents: "الطلاب",
  students: "الطلاب",
  totalTeachers: "الأساتذة",
  teachers: "الأساتذة",
  totalCourses: "المقرّرات",
  courses: "المقرّرات",
  totalFaculties: "الكلّيات",
  faculties: "الكلّيات",
  totalDepartments: "الأقسام",
  departments: "الأقسام",
  totalOfferings: "الشُّعب",
  offerings: "الشُّعب",
  totalEnrollments: "التسجيلات",
  enrollments: "التسجيلات",
  totalUsers: "إجمالي المستخدمين",
  users: "المستخدمون",
  activeUsers: "حسابات نشطة",
  admins: "المسجلون العامّون",
  quality: "فريق الجودة",
  owners: "المالكون",
  lectures: "المحاضرات",
  materials: "الملفات",
  assignments: "الواجبات",
  attendance: "الحضور",
  papers: "البحوث",
  permissionChanges: "تغييرات الصلاحيات",
  roleChanges: "تغييرات الأدوار",
  newUsersThisMonth: "مستخدمون جدد هذا الشهر",
  successCount: "محاولات ناجحة",
  failureCount: "محاولات فاشلة",
  total: "الإجمالي",
  recentAuditLogs: "سجلّات آخر 7 أيام",
  recentEventsLast7Days: "أحداث آخر 7 أيام",
  activeSessions: "جلسات نشطة الآن",
  aiRequestsPerMin: "طلبات الذكاء الاصطناعي / دقيقة",
  liveBroadcasts: "بثّ مباشر جارٍ",
  activeExams: "اختبارات جارية",
  totalRequests: "إجمالي الطلبات",
  totalTokens: "إجمالي التوكنات",
  successRate: "معدّل النجاح",
  avgLatencyMs: "متوسّط الاستجابة",
  avgEnrolment: "متوسط التسجيل في العرض",
  idle: "بدون حصص هذا الفصل",
  one: "حصّة واحدة",
  two: "حصّتان",
  three: "3 حصص",
  fourPlus: "4 حصص فأكثر",
  adoptionPct: "نسبة التبنّي",
  onlineExams: "اختبارات إلكترونية منشورة",
  examAttempts: "محاولات أداء",
  labSessions: "جلسات معامل افتراضيّة",
  moocEnrollments: "تسجيلات MOOC",
  researchPapers: "أوراق علميّة في النظام",
  liveSessions: "جلسات بثّ مباشر",
  materialsUploaded: "ملفات تعليمية مرفوعة",
  presentRate: "نسبة الحضور",
  lateRate: "نسبة التأخر",
  absentRate: "نسبة الغياب",
  completionRate: "معدل الإكمال",
  completedLectures: "محاضرات مكتملة",
  totalLectures: "إجمالي المحاضرات",
  totalEvents: "إجمالي أحداث المشاهدة",
  videoEvents: "أحداث المشاهدة",
  weeklyActive: "النشاط الأسبوعي",
  factCount: "حقول مُزامنة",
  staleCount: "حقول قديمة",
  openCount: "تنبيهات مفتوحة",
  criticalCount: "تنبيهات حرجة",
  critical: "حرجة",
  warning: "تحذيرات",
  info: "معلومات",
  submitted: "مُقدَّم",
  graded: "مُقيَّم",
  published: "منشور",
  month: "الشهر",
  date: "التاريخ",
  success: "ناجحة",
  failure: "فاشلة",
  count: "العدد",
  reason: "السبب",
  code: "الكود",
  name: "الاسم",
  enrolled: "المسجَّلون",
  courseCount: "المقرّرات",
  attendancePct: "نسبة الحضور",
  page: "الصفحة",
  limit: "حدّ الصفحة",
  totalPages: "إجمالي الصفحات",
};

function labelOfKey(key: string): string {
  const direct = KNOWN_LABELS[key];
  if (direct) return direct;
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced || key;
}

/**
 * Honest ledger for an unknown payload object: every entry renders as a
 * StatLine (numbers via latn), a nested ledger (plain objects), or a
 * counted rows list (arrays of scalars/objects). null/undefined keys
 * are skipped — never a fabricated placeholder.
 */
export function HonestLedger({
  value,
  exclude = [],
  depth = 0,
}: {
  value: unknown;
  exclude?: string[];
  depth?: number;
}): ReactNode {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return <StatLine label="القيمة" value={textOf(value)} />;
  }
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([k, v]) => !exclude.includes(k) && v !== null && v !== undefined,
  );
  if (entries.length === 0) return null;
  return (
    <View>
      {entries.map(([key, v]) => {
        const label = labelOfKey(key);
        if (typeof v === "number" && Number.isFinite(v)) {
          const isPct = /Rate|Pct|percent/i.test(key);
          return (
            <StatLine
              key={key}
              label={label}
              value={isPct ? `${latn(Math.round(v))}%` : latn(v)}
            />
          );
        }
        if (typeof v === "boolean") {
          return <StatLine key={key} label={label} value={v ? "نعم" : "لا"} />;
        }
        if (typeof v === "string") {
          return <StatLine key={key} label={label} value={v || "—"} />;
        }
        if (Array.isArray(v)) {
          const scalars = v.every((x) => typeof x === "number" || typeof x === "string");
          if (scalars) {
            return (
              <View key={key}>
                <StatLine label={label} value={countAr(v.length, ["عنصر واحد", "عنصران", "عناصر", "عنصراً"])} />
                {v.slice(0, 12).map((x, i) => (
                  <StatLine
                    key={`${key}-${i}`}
                    label={`${latn(i + 1)}`}
                    value={typeof x === "number" ? latn(x) : x}
                  />
                ))}
              </View>
            );
          }
          return (
            <View key={key}>
              <StatLine label={label} value={countAr(v.length, ["سجلّ واحد", "سجلّان", "سجلّات", "سجلاً"])} />
              {v.slice(0, 10).map((row, i) => (
                <View key={`${key}-row-${i}`} style={{ paddingStart: depth > 0 ? 0 : sp[12] }}>
                  {row && typeof row === "object" ? (
                    <HonestLedger value={row} depth={depth + 1} />
                  ) : (
                    <StatLine label={`${label} ${latn(i + 1)}`} value={textOf(row)} />
                  )}
                </View>
              ))}
            </View>
          );
        }
        return (
          <View key={key}>
            <T variant="sm" weight="bold" style={{ paddingTop: sp[6] }}>
              {label}
            </T>
            <HonestLedger value={v} depth={depth + 1} />
          </View>
        );
      })}
    </View>
  );
}

/* ══════════════════════ Label / tone maps (web parity) ════════════ */

/** Research lifecycle (lib/paperStatus.ts ladder). */
export const PAPER_STATUS_LABEL: Record<string, string> = {
  UPLOADED: "مرفوعة",
  SCANNING: "قيد الفحص",
  CHECKS_PASSED: "اجتازت الفحص",
  CHECKS_FAILED: "لم تجتز الفحص",
  GRADED: "مقيَّمة",
  PUBLISHED: "منشورة",
};
export const PAPER_STATUS_TONE: Record<string, StatusToneName> = {
  UPLOADED: "yellow",
  SCANNING: "copper",
  CHECKS_PASSED: "lavender",
  CHECKS_FAILED: "rose",
  GRADED: "yellow",
  PUBLISHED: "mint",
};

/** R334 strings rule: an UNKNOWN enum never renders raw to the user —
 *  the honest Arabic fallback is «غير معروف» (we disclose the gap, not
 *  the internal code). Known values keep their web-parity labels. */
export const UNKNOWN_LABEL = "غير معروف";

export function PaperStatusChip({ status }: { status?: string | null }) {
  const key = status ?? "";
  const known = key in PAPER_STATUS_LABEL;
  return (
    <Badge label={known ? PAPER_STATUS_LABEL[key] : key ? UNKNOWN_LABEL : "—"} tone={PAPER_STATUS_TONE[key] ?? "grey"} />
  );
}

/** Exam kinds (lib/courseMeta.ts EXAM_KIND_LABEL parity). */
export const EXAM_KIND_LABEL: Record<string, string> = {
  QUIZ: "اختبار قصير",
  MIDTERM: "نصفي",
  FINAL: "نهائي",
  PRACTICE: "تدريبي",
};

/** Operational alert severities (lib/ownerLabels.ts parity). */
export const SEVERITY_LABEL: Record<string, string> = {
  critical: "حرج",
  CRITICAL: "حرج",
  error: "خطأ",
  warning: "تحذير",
  WARNING: "تحذير",
  info: "معلومة",
  INFO: "معلومة",
};
export const SEVERITY_TONE: Record<string, StatusToneName> = {
  critical: "rose",
  CRITICAL: "rose",
  error: "rose",
  warning: "yellow",
  WARNING: "yellow",
  info: "sky",
  INFO: "sky",
};

export function SeverityChip({ severity }: { severity?: string | null }) {
  const key = severity ?? "";
  const known = key in SEVERITY_LABEL;
  return (
    <Badge
      label={known ? SEVERITY_LABEL[key] : key ? UNKNOWN_LABEL : "—"}
      tone={SEVERITY_TONE[key] ?? "grey"}
    />
  );
}

/** Operational alert categories (lib/ownerLabels.ts parity). */
export const ALERT_CATEGORY_LABEL: Record<string, string> = {
  infrastructure: "البنية التحتية",
  security: "الأمان",
  performance: "الأداء",
  system: "النظام",
  storage: "التخزين",
  database: "قاعدة البيانات",
  api: "واجهة البرمجة",
  app: "التطبيق",
  http: "الخادم",
  sync: "المزامنة",
  attendance: "الحضور",
  plagiarism: "الاقتباس",
  content: "المحتوى",
};

export function alertCategoryLabel(category?: string | null): string {
  if (!category) return "—";
  return ALERT_CATEGORY_LABEL[category] ?? "أخرى";
}

/** Roles — labels from the shared session map, tones per web ROLE_COLORS. */
export const ROLE_TONE: Record<string, StatusToneName> = {
  STUDENT: "copper",
  TEACHER: "mint",
  ADMIN: "lavender",
  QUALITY: "yellow",
  OWNER: "yellow",
};
export function RoleChip({ role, label }: { role?: string | null; label: string }) {
  return <Badge label={label} tone={role ? (ROLE_TONE[role] ?? "grey") : "grey"} />;
}

/** Avatar URL coercion — only a real string from the payload counts;
 *  anything else (missing, null, non-string) renders initials only. */
export function avatarUrlOf(row: unknown): string | null {
  const url = (row as { avatarUrl?: unknown } | null | undefined)?.avatarUrl;
  return typeof url === "string" && url.trim().length > 0 ? url.trim() : null;
}

/** UserAvatar — expo-image remote avatar over the initials Avatar: the
 *  initials stay visible while the image loads (placeholder) and FOREVER
 *  if the URL fails (onError) — a broken image box never reaches the user.
 *  No URL at all → the plain initials circle (the roster default). */
export function UserAvatar({
  url,
  initials,
  color,
  size = 44,
}: {
  url?: string | null;
  initials: string;
  color?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return <Avatar initials={initials} color={color} size={size} />;
  }
  return (
    <View style={{ width: size, height: size }}>
      <Avatar initials={initials} color={color} size={size} />
      <Image
        source={{ uri: url }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`صورة الحساب ${initials}`}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

/** Audit-log actions (OwnerActivityPage ACTION_LABEL parity). */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "user.login": "تسجيل دخول ناجح",
  "auth.login": "تسجيل دخول ناجح",
  "user.logout": "تسجيل خروج",
  "user.created": "إنشاء حساب",
  "user.role_changed": "تغيير صلاحيات مستخدم",
  "user.status_changed": "تعديل حالة الحساب",
  "course.created": "إنشاء مقرّر",
  "course.updated": "تحديث مقرّر",
  "enrollment.created": "تسجيل في مقرّر",
  "material.uploaded": "رفع ملف",
  "material.deleted": "حذف ملف",
  "paper.published": "نشر بحث",
  "announcement.created": "بثّ إعلان",
  "competition.created": "إنشاء مسابقة",
  "sync.run": "تشغيل المزامنة",
  "institution.create": "إنشاء مؤسسة",
  "institution.update": "تحديث مؤسسة",
  "institution.admin.provision": "تعيين مسجل عام",
  "institution.membership.revoke": "إلغاء عضوية",
  "institution.membership.restore": "استعادة عضوية",
  ROLE_CHANGE: "تغيير صلاحيات مستخدم",
  STATUS_CHANGE: "تعديل حالة الحساب",
  CAPABILITY_OVERRIDE: "تجاوز صلاحية",
  USER_SCOPE_CHANGE: "تعديل نطاق مستخدم",
  TEACHER_POSITION: "تعيين موقع أستاذ",
  TEACHER_VERIFY: "توثيق أستاذ",
  ENROLLMENT_CREATED: "تسجيل طالب في مقرّر",
  ENROLLMENT_REMOVED: "إلغاء تسجيل طالب",
  ALERT_RESOLVED: "حلّ تنبيه تشغيليّ",
  SETTING_UPDATED: "تحديث إعداد المنصّة",
  FEATURE_FLAG_TOGGLED: "تبديل ميزة",
  "theme.update": "تغيير مظهر المنصّة",
  "onboarding.complete": "إكمال جولة التعريف",
  "milestone.fire": "تحقيق إنجاز",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABEL[action] ?? "عمليّة إداريّة";
}

/** Resource-type label with the same no-raw-enum rule. */
export function resourceLabel(resourceType?: string | null): string {
  if (!resourceType) return "";
  return RESOURCE_LABEL[resourceType] ?? "مورد";
}

/** Audit resource types (Prisma models) → Arabic. */
export const RESOURCE_LABEL: Record<string, string> = {
  User: "مستخدم",
  TeacherProfile: "ملف أستاذ",
  UserPermission: "صلاحية مستخدم",
  OperationalAlert: "تنبيه تشغيليّ",
  PlatformSetting: "إعداد منصّة",
  FeatureFlag: "ميزة",
  Institution: "مؤسسة",
  Membership: "عضوية",
  Course: "مقرّر",
  Enrollment: "تسجيل",
};

/** Feedback inbox grammar (FeedbackInboxPage parity). */
export const FEEDBACK_STATUS_LABEL: Record<string, string> = {
  open: "مفتوحة",
  triage: "تحت المعالجة",
  fixed: "أُصلحت",
  dismissed: "مرفوضة",
};
export const FEEDBACK_NEXT: Record<string, string[]> = {
  open: ["triage", "fixed", "dismissed"],
  triage: ["fixed", "dismissed"],
  fixed: [],
  dismissed: [],
};
export function feedbackKindTone(kind?: string | null): StatusToneName {
  return kind === "BUG" ? "rose" : kind === "IDEA" ? "sky" : "grey";
}
export function feedbackKindLabel(kind?: string | null): string {
  return kind === "BUG" ? "مشكلة" : kind === "IDEA" ? "اقتراح" : kind ? UNKNOWN_LABEL : "—";
}

/** Login-failure reasons (owner login-analytics `topReasons`) — the raw
 *  backend codes (INVALID_CREDENTIALS, …) must never render raw. */
export const LOGIN_REASON_LABEL: Record<string, string> = {
  INVALID_CREDENTIALS: "بيانات دخول غير صحيحة",
  USER_NOT_FOUND: "حساب غير موجود",
  INVALID_PASSWORD: "كلمة مرور غير صحيحة",
  ACCOUNT_SUSPENDED: "الحساب معلَّق",
  USER_INACTIVE: "حساب غير مفعَّل",
  RATE_LIMITED: "محاولات كثيرة",
  TOKEN_EXPIRED: "انتهت الجلسة",
  MISSING_CREDENTIALS: "بيانات ناقصة",
  VALIDATION_ERROR: "بيانات غير صالحة",
  UNKNOWN: "سبب غير محدَّد",
};
export function loginReasonLabel(reason?: string | null): string {
  if (!reason) return "—";
  return LOGIN_REASON_LABEL[reason] ?? "سبب آخر";
}

/** Sync run statuses (AdminSyncPage parity). */
export const SYNC_STATUS_LABEL: Record<string, string> = {
  RUNNING: "قيد التنفيذ",
  SUCCESS: "ناجحة",
  PARTIAL: "جزئية",
  FAILED: "فاشلة",
};
/** Semantic tone per sync status (ok/warn/error → mint/yellow/rose). */
export const SYNC_STATUS_TONE: Record<string, StatusToneName> = {
  RUNNING: "yellow",
  SUCCESS: "mint",
  PARTIAL: "yellow",
  FAILED: "rose",
};
/** The one sync-status renderer — unknown enums render «غير معروفة»,
 *  never the raw `SYNC_*`-style code (R334 audit P0 strings fix). */
export function syncStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return SYNC_STATUS_LABEL[status] ?? "غير معروفة";
}
export function SyncStatusChip({ status }: { status?: string | null }) {
  return <Badge label={syncStatusLabel(status)} tone={SYNC_STATUS_TONE[status ?? ""] ?? "grey"} />;
}
export const SYNC_CATEGORY_LABEL: Record<string, string> = {
  identity: "هوية الجامعة",
  contact: "بيانات التواصل",
  strategic: "الخطة الاستراتيجية",
  grading: "نظام التقييم",
  programs: "الدراسة والشهادات",
  memberships: "العضويات",
  colleges: "الكلّيّات",
  general: "عام",
};

/** Institution statuses. */
export const INST_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "نشطة",
  SUSPENDED: "معلّقة",
};
/** The one institution-status renderer — same no-raw-enum rule as the
 *  other chips: an unknown status reads «غير معروف», never the code. */
export function instStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return INST_STATUS_LABEL[status] ?? UNKNOWN_LABEL;
}
export function InstitutionStatusChip({ status }: { status?: string | null }) {
  return <Badge label={instStatusLabel(status)} tone={status === "ACTIVE" ? "mint" : status === "SUSPENDED" ? "rose" : "grey"} />;
}

/** Feedback-inbox statuses — label helper with the no-raw-enum fallback. */
export function feedbackStatusLabel(status?: string | null): string {
  if (!status) return "—";
  return FEEDBACK_STATUS_LABEL[status] ?? UNKNOWN_LABEL;
}

/** Exam question types (web QTYPE_LABEL parity — exam-moderation rows). */
export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MCQ: "اختيار من متعدد",
  TRUE_FALSE: "صح أم خطأ",
  SHORT: "إجابة قصيرة",
  ESSAY: "سؤال مقالي",
};
export function questionTypeLabel(type?: string | null): string {
  if (!type) return "—";
  return QUESTION_TYPE_LABEL[type] ?? UNKNOWN_LABEL;
}

/** Question difficulty (web DIFFICULTY_LABEL parity). */
export const DIFFICULTY_LABEL: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
};
export const DIFFICULTY_TONE: Record<string, StatusToneName> = {
  EASY: "mint",
  MEDIUM: "yellow",
  HARD: "rose",
};
export function difficultyLabel(level?: string | null): string {
  if (!level) return "—";
  return DIFFICULTY_LABEL[level] ?? UNKNOWN_LABEL;
}

/** Platform-setting categories (free-form on the backend, `general` the
 *  default) — known values get Arabic, everything else reads «فئة أخرى». */
export const SETTING_CATEGORY_LABEL: Record<string, string> = {
  general: "عام",
  platform: "المنصّة",
  storage: "التخزين",
  ai: "الذكاء الاصطناعيّ",
  notifications: "الإشعارات",
  security: "الأمان",
};
export function settingCategoryLabel(category?: string | null): string {
  if (!category) return "—";
  return SETTING_CATEGORY_LABEL[category] ?? "فئة أخرى";
}

/** The 17 platform capabilities (GOV contract map). */
export const CAPABILITY_LABEL: Record<string, string> = {
  RESEARCH_GRADE_OWN: "تصحيح بحوثه",
  RESEARCH_GRADE_ANY: "تصحيح أي بحث",
  RESEARCH_PUBLISH: "نشر البحوث",
  EXAMS_AUTHOR: "تأليف اختبارات",
  EXAMS_MODERATE: "اعتماد اختبارات",
  EXAMS_TAKE: "خوض اختبارات",
  CURRICULUM_EDIT_OWN: "تحرير منهجه",
  CURRICULUM_EDIT_ANY: "تحرير أي منهج",
  USERS_MANAGE: "إدارة المستخدمين",
  ROLES_ASSIGN: "منح الأدوار",
  TEACHERS_VERIFY: "توثيق الأساتذة",
  QUALITY_VIEW: "عرض الجودة",
  QUALITY_REPORT: "تقارير الجودة",
  ANNOUNCE_PLATFORM: "إعلانات المنصة",
  ANNOUNCE_FACULTY: "إعلانات الكلية",
  COMPETITIONS_RUN: "إدارة المسابقات",
  EVENTS_RUN: "إدارة الفعاليات",
};

/* ══════════════════════ FlagToggle (Heron switch) ════════════════ */

/** Square Heron toggle — 44px floor, hairline frame, no shadows. */
export function FlagToggle({
  checked,
  disabled,
  onPress,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onPress: () => void;
  label: string;
}) {
  const p = usePalette();
  const tones = useStatusTones();
  const tone = checked ? tones.mint : tones.grey;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tone.ink,
          backgroundColor: pressed ? p.surfaceHover : tone.bg,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {checked ? <Check size={20} color={tone.ink} /> : <X size={20} color={p.textMuted} />}
    </Pressable>
  );
}

/* ══════════════════════ Expandable row helper ════════════════════ */

/** Chevron that flips with the open state (down = open). */
export function ExpandChevron({ open }: { open: boolean }) {
  const p = usePalette();
  return (
    <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
      <ChevronDown size={18} color={p.textMuted} />
    </View>
  );
}

/** `useExpanded` — a string set of expanded row ids. */
export function useExpanded(initial: string[] = []) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(initial));
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { expanded, toggle };
}

/* ══════════════════════ Dashboard metric hierarchy ═══════════════ */

/**
 * MetricHero — the ONE hero number of a governance dashboard: a large
 * CountUp with an optional determinate RingProgress (rates only). One
 * accent (paper/ink) — no decorative color stacking (Heron rule).
 */
export function MetricHero({
  label,
  value,
  hint,
  suffix,
  progress,
}: {
  label: string;
  value: number | null;
  hint?: string;
  suffix?: string;
  /** 0..1 — renders the ring around the number when present. */
  progress?: number | null;
}) {
  const p = usePalette();
  const hasProgress = typeof progress === "number" && Number.isFinite(progress) && progress > 0;
  const body = (
    <View style={{ flex: 1, justifyContent: "center", gap: sp[4] }}>
      <T variant="sm" color="muted">
        {label}
      </T>
      {value === null ? (
        <T variant="h1" weight="bold">
          —
        </T>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[4] }}>
          {/* CountUp renders an animated TextInput — a View sibling, never a
           *  child of <T> (RN forbids nesting inputs inside Text). */}
          <CountUp
            value={value}
            testID="metric-hero-value"
            style={{
              fontSize: typeScale.h1,
              lineHeight: typeScale.h1 + 4,
              fontFamily: fonts.bodyBold,
              color: p.text,
            }}
          />
          {suffix ? (
            <T variant="h4" color="muted">
              {suffix}
            </T>
          ) : null}
        </View>
      )}
      {hint ? (
        <T variant="xs" color="faint">
          {hint}
        </T>
      ) : null}
    </View>
  );
  return (
    <View
      accessibilityLabel={`${label}: ${value === null ? "غير متوفّر" : latn(value)}${hint ? `، ${hint}` : ""}`}
      style={{
        backgroundColor: p.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        padding: sp[16],
        minHeight: 132,
        flexDirection: "row",
        alignItems: "center",
        gap: sp[12],
      }}
    >
      {body}
      {hasProgress ? (
        <RingProgress progress={Math.min(1, Math.max(0, progress as number))} size={64} thickness={5} color={p.accent}>
          <T variant="xs" weight="bold">
            {latn(Math.round((progress as number) * 100))}%
          </T>
        </RingProgress>
      ) : null}
    </View>
  );
}

/** MetricTile — a supporting tile under the hero (CountUp, hairline slab). */
export function MetricTile({
  label,
  value,
  suffix,
  style,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
}) {
  const p = usePalette();
  return (
    <View
      accessibilityLabel={`${label}: ${value === null ? "غير متوفّر" : latn(value)}`}
      style={[
        {
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
          flex: 1,
        },
        style,
      ]}
    >
      <T variant="sm" color="muted" numberOfLines={1}>
        {label}
      </T>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
        {value === null ? (
          <T variant="h3" weight="bold">
            —
          </T>
        ) : (
          <CountUp
            value={value}
            style={{
              fontSize: typeScale.h3,
              lineHeight: typeScale.h3 + 4,
              fontFamily: fonts.bodyBold,
              color: p.text,
            }}
          />
        )}
        {suffix ? (
          <T variant="sm" color="muted">
            {suffix}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/* ══════════════════════ Audit-day grouping (pure) ═════════════════ */

/** Day bucket for an ISO timestamp — «اليوم» / «أمس» / an Arabic date. */
export function auditDayLabel(iso?: string | null, now?: Date): string {
  if (!iso) return "بدون تاريخ";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "بدون تاريخ";
  const ref = now ?? new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(ref) - startOf(d)) / 86_400_000);
  if (days === 0) return "اليوم";
  if (days === 1) return "أمس";
  return d.toLocaleDateString("ar-LY", { day: "numeric", month: "long", year: "numeric" });
}

/** Groups audit rows into day sections (newest first), preserving order. */
export interface AuditSection<T> {
  day: string;
  rows: T[];
}
export function groupByDay<T>(
  rows: readonly T[],
  dateOf: (row: T) => string | null | undefined,
  now?: Date,
): AuditSection<T>[] {
  const sections: AuditSection<T>[] = [];
  const index = new Map<string, AuditSection<T>>();
  for (const row of rows) {
    const day = auditDayLabel(dateOf(row), now);
    let section = index.get(day);
    if (!section) {
      section = { day, rows: [] };
      index.set(day, section);
      sections.push(section);
    }
    section.rows.push(row);
  }
  return sections;
}

/* ══════════════════════ Local row types ═══════════════════════════ */

/** /admin/faculties row (catalog projection — all fields defensive). */
export interface FacultyNode {
  id: string;
  name: string;
  nameEn?: string | null;
  iconEmoji?: string | null;
  city?: string | null;
  departmentCount?: number;
  studentCount?: number;
  teacherCount?: number;
  courseCount?: number;
  departments?: { id: string; name: string; students?: number; teachers?: number; courses?: number }[];
}

/** /admin/courses row. */
export interface CourseRow {
  id: string;
  code: string;
  name: string;
  credits?: number | null;
  themeColor?: string | null;
  faculty?: string | null;
  facultyEmoji?: string | null;
  department?: string | null;
  departmentId?: string | null;
  offeringCount?: number;
  totalEnrollments?: number;
  totalLectures?: number;
  totalMaterials?: number;
}

/** /admin/papers row. */
export interface PaperRow {
  id: string;
  title: string;
  status?: string | null;
  plagiarismPct?: number | null;
  uploadedAt?: string | null;
  student?: { firstName?: string; lastName?: string } | null;
  offering?: { course?: { name?: string; code?: string } | null } | null;
}

/** /enrollments?studentId row. */
export interface StudentEnrollmentRow {
  id: string;
  progressPct?: number;
  offering?: {
    id?: string;
    term?: string | null;
    room?: string | null;
    course?: { name?: string; code?: string } | null;
    teacher?: { firstName?: string; lastName?: string } | null;
  } | null;
}

/** /enrollments/offerings row. */
export interface OfferingPickRow {
  id: string;
  term?: string | null;
  room?: string | null;
  capacity?: number | null;
  course?: { id?: string; name?: string; code?: string } | null;
  teacher?: { firstName?: string; lastName?: string } | null;
  _count?: { enrollments?: number } | null;
}

/** /quality/courses row. */
export interface QualityCourseRow {
  id: string;
  term?: string | null;
  course?: { name?: string; code?: string; themeColor?: string | null } | null;
  teacher?: { firstName?: string; lastName?: string } | null;
  _count?: { enrollments?: number; lectures?: number; materials?: number; assignments?: number } | null;
  metrics?: { attendanceRate?: number | null; completionRate?: number | null } | null;
}

/** /quality/professors row. */
export interface ProfessorRow {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarInitials?: string | null;
  avatarColor?: string | null;
  rank?: string | null;
  specialty?: string | null;
  faculty?: string | null;
  department?: string | null;
  offerings?: number;
  totals?: { enrollments?: number; materials?: number; lectures?: number; assignments?: number; attendance?: number } | null;
  satisfaction?: number;
  satisfactionEstimated?: boolean;
  responseHours?: number;
  responseHoursEstimated?: boolean;
  compliance?: number;
}

/** /quality/curriculum faculty tree. */
export interface CurriculumFaculty {
  id: string;
  name: string;
  iconEmoji?: string | null;
  departments?: {
    id: string;
    name: string;
    courses?: {
      id: string;
      name: string;
      code?: string;
      offerings?: { _count?: { lectures?: number; materials?: number; assignments?: number; enrollments?: number } | null }[];
      _count?: { offerings?: number; concepts?: number } | null;
    }[];
  }[];
}

/** /quality/alerts payload ({alerts, counts}). */
export interface QualityAlertsPayload {
  alerts?: {
    id: string;
    severity?: string | null;
    category?: string | null;
    title?: string;
    description?: string | null;
    occurredAt?: string | null;
  }[];
  counts?: { critical?: number; warning?: number; info?: number; total?: number } | null;
}

/** /owner/users row. */
export interface OwnerUserRow {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  isActive?: boolean;
  avatarInitials?: string | null;
  avatarColor?: string | null;
  /** Remote avatar (expo-image) — most owner rows carry initials only. */
  avatarUrl?: string | null;
  createdAt?: string;
  memberships?: {
    institution?: { id?: string; name?: string; slug?: string; status?: string } | null;
  }[];
}

/** /owner/institutions row. */
export interface InstitutionRow {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
  status?: string;
  createdAt?: string;
  membersCount?: number;
  facultiesCount?: number;
  activeMembershipCount?: number;
  facultyCount?: number;
  admins?: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    membershipId?: string;
    isActive?: boolean;
  }[];
}

/** /owner/activity row (AuditLog). */
export interface AuditRow {
  id: string;
  action: string;
  createdAt?: string;
  user?: { firstName?: string; lastName?: string; email?: string } | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: unknown;
}

/** /owner/realtime + dashboard stats + education + governance keys. */
export interface RealtimeRow {
  activeSessions?: number;
  aiRequestsPerMin?: number;
  liveBroadcasts?: number;
  activeExams?: number;
}
export interface OwnerStatsRow {
  totalUsers?: number;
  students?: number;
  teachers?: number;
  admins?: number;
  quality?: number;
  owners?: number;
  totalCourses?: number;
  totalOfferings?: number;
  totalEnrollments?: number;
  recentAuditLogs?: number;
}
export interface GovernanceRow {
  permissionChanges?: number;
  roleChanges?: number;
  newUsersThisMonth?: number;
  weeklyGrowth?: { week?: string; count?: number }[];
}
export interface LoginAnalyticsRow {
  successCount?: number;
  failureCount?: number;
  total?: number;
  daily?: { date?: string; success?: number; failure?: number }[];
  topReasons?: { reason?: string; count?: number }[];
}
export interface EducationRow {
  totals?: { totalCourses?: number; teachers?: number; totalOfferings?: number; avgEnrolment?: number } | null;
  byFaculty?: { name?: string; courseCount?: number }[];
  topCourses?: { code?: string; name?: string; facultyName?: string; enrolled?: number }[];
  workloadBuckets?: { idle?: number; one?: number; two?: number; three?: number; fourPlus?: number } | null;
  attendanceTrend?: { month?: string; attendancePct?: number | null }[];
}
export interface SystemRow {
  storage?: { driver?: string; persistent?: boolean; reachable?: boolean; checkedAt?: string | null } | null;
  sync?: { lastRunAt?: string | null; recent?: { id?: string; at?: string; action?: string; actor?: string; metadata?: unknown }[] } | null;
  alerts?: {
    openCount?: number;
    criticalCount?: number;
    open?: { id: string; severity?: string; category?: string; title?: string; message?: string | null; createdAt?: string; metadata?: unknown }[];
  } | null;
  activity?: { recentEventsLast7Days?: number } | null;
}
export interface AiMetricsRow {
  totalRequests?: number;
  totalTokens?: number;
  successRate?: number;
  avgLatencyMs?: number;
  byFeature?: { feature?: string; count?: number; tokens?: number }[];
  trend?: { date?: string; count?: number }[];
}
