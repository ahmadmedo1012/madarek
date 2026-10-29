/**
 * Student Learning shared kit — local components/helpers owned by the
 * Student Learning Core agent (dashboard / courses / lecture player /
 * matrix / catalog / schedule / calendar / results / materials /
 * assignments / university / map / profile).
 *
 * Mirrors the web vocabulary exactly (frontend/src/pages/student/*):
 * «سدّ الفجوة», «أكمل من حيث توقفت», «الخطوة التالية», checkpoint marks
 * أ ب ج د هـ و, the WebVTT cue parser (lib/vtt.ts), and the honest
 * submission sheet (SubmitAssignmentModal). Anything generic that already
 * lives in the sibling More module (countAr / SectionNote / letters) is
 * imported, never duplicated.
 */
import { useEffect, useState, type ReactNode } from "react";
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react-native";
import { teacherApi } from "@/api/teacher";
import { ApiError } from "@/api/client";
import type { KnowledgeGap, Submission } from "@/api/types";
import type { MaterialRow } from "@/api/student";
import type { ResultCourse, StudentDashboard } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp, type StatusToneName } from "@/design/tokens";
import { Screen, SectionBar } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, Sheet } from "@/components/ui/surfaces";
import { Field } from "@/components/ui/fields";
import { LedgerRow, RowList } from "@/components/ui/data";
import { dueLabel, latn } from "@/lib/format";
import { StackHeader } from "@/components/shell/AppTopBar";
import { countAr } from "@/features/student/more";

/* ══ Time formatting (web formatMmSs — mm:ss, Western glyphs) ══════ */

/** m:ss media clock (padded minutes, latn digits — web formatMmSs). */
export function mmss(sec: number | null | undefined): string {
  const total = Math.max(0, Math.floor(sec ?? 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(latn(m)).padStart(2, "0")}:${String(latn(s)).padStart(2, "0")}`;
}

/* ══ WebVTT cues (the web player's transcript parser, ported) ════ */

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
  const msGroup = m[4] ?? "0";
  const ms = Number(msGroup.padEnd(3, "0"));
  if (Number.isNaN(h) || Number.isNaN(min) || Number.isNaN(s)) return null;
  return h * 3600 + min * 60 + s + ms / 1000;
}

/** Parse a WebVTT (forgivingly SRT) document into cues — lib/vtt.ts parity. */
export function parseVttCues(source: string): VttCue[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const cues: VttCue[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    const arrow = line.indexOf("-->");
    if (arrow < 0) {
      i += 1;
      continue;
    }
    const startRaw = line.slice(0, arrow).trim().split(/\s+/).pop() ?? "";
    const rest = line.slice(arrow + 3);
    const endRaw = rest.trim().split(/\s+/)[0] ?? "";
    const start = clockToSeconds(startRaw);
    const end = clockToSeconds(endRaw);
    if (start === null || end === null || end < start) {
      i += 1;
      continue;
    }
    const body: string[] = [];
    i += 1;
    while (i < lines.length && (lines[i] ?? "").trim() !== "") {
      body.push(lines[i] ?? "");
      i += 1;
    }
    const text = body.join("\n").trim();
    if (text) cues.push({ start, end: Math.max(end, start), text });
  }
  return cues;
}

/** Cue timestamp cell: mm:ss under an hour, h:mm:ss beyond (formatCueClock). */
export function cueClock(sec: number): string {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(latn(n)).padStart(2, "0");
  return h > 0 ? `${latn(h)}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

/* ══ Frames ═════════════════════════════════════════════════════════ */

/** Standard scrollable body for tab/pushed screens (paper, padded, gap). */
export function ScrollBody({
  children,
  refreshing,
  onRefresh,
  style,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <ScrollView
      style={style}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={p.accent} colors={[p.accent]} />
        ) : undefined
      }
      contentContainerStyle={{ flexGrow: 1, gap: sp[16], paddingHorizontal: sp[20], paddingBottom: sp[24] }}
    >
      {children}
    </ScrollView>
  );
}

/**
 * PushFrame — every pushed screen's shell: safe areas, the drafting back
 * header (content, not native nav bars), then the scrollable sheet body.
 */
export function PushFrame({
  title,
  kicker,
  right,
  refreshing,
  onRefresh,
  children,
}: {
  title: string;
  kicker?: string;
  right?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
}) {
  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title={title} kicker={kicker} right={right} />
      <ScrollBody refreshing={refreshing} onRefresh={onRefresh}>
        {children}
      </ScrollBody>
    </Screen>
  );
}

/* ══ Course identity well (thumb-tile grammar, API-tinted) ════════ */

/** Square tinted tile carrying the course's own emoji (API data, no icons). */
export function CourseWell({
  emoji,
  color,
  size = 40,
}: {
  emoji?: string | null;
  color?: string | null;
  size?: number;
}) {
  const p = usePalette();
  const tint = color && /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color) ? color.slice(0, 7) : null;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tint ? `${tint}24` : p.surfaceHover,
        borderWidth: 1,
        borderColor: tint ? `${tint}55` : p.border,
      }}
    >
      <T variant="bodyLg" weight="bold" style={{ fontSize: size * 0.45 }}>
        {emoji && emoji.trim().length > 0 ? emoji : "📘"}
      </T>
    </View>
  );
}

/* ══ Priority gaps (dashboard + matrix share the exact row contract) ══ */

/**
 * GapList — «سدّ الفجوة» rows: a gap WITH a recommendation is a whole-row
 * link to the lecture that teaches the concept; without one it stays an
 * honest non-link (or falls back to the matrix on the dashboard).
 */
export function GapList({
  gaps,
  max,
  fallbackToMatrix,
  emptyNote,
}: {
  gaps: KnowledgeGap[];
  max?: number;
  fallbackToMatrix?: boolean;
  emptyNote?: string;
}) {
  const tones = useStatusTones();
  const rows = gaps.slice(0, max ?? gaps.length);
  if (rows.length === 0) {
    return (
      <T variant="sm" color="muted">
        {emptyNote ?? "لا فجوات مكتشفة بعد — أجب عن نقاط التفاعل في محاضراتك لترسم خريطة إتقانك."}
      </T>
    );
  }
  return (
    <RowList>
      {rows.map((g, i) => {
        const meta = `${g.courseName} · ${latn(Math.round(g.level * 100))}% الآن`;
        if (g.recommendedLectureId) {
          return (
            <LedgerRow
              key={g.conceptId}
              last={i === rows.length - 1}
              accessibilityLabel={`سدّ الفجوة: ${g.conceptName}`}
              onPress={() => router.push(`/student/lectures/${g.recommendedLectureId}` as never)}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <CircleAlert size={16} color={tones.yellow.ink} />
                <T variant="body" weight="bold" style={{ flex: 1 }}>
                  {g.conceptName}
                </T>
                <Badge label="سدّ الفجوة" tone="copper" />
              </View>
              <T variant="sm" color="muted">
                {meta}
              </T>
            </LedgerRow>
          );
        }
        return (
          <LedgerRow
            key={g.conceptId}
            last={i === rows.length - 1}
            accessibilityLabel={fallbackToMatrix ? `عرض المصفوفة: ${g.conceptName}` : g.conceptName}
            onPress={
              fallbackToMatrix ? () => router.push("/student/matrix" as never) : undefined
            }
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <CircleAlert size={16} color={tones.yellow.ink} />
              <T variant="body" weight="bold" style={{ flex: 1 }}>
                {g.conceptName}
              </T>
              <Badge label="لا توصية بعد" tone="grey" />
            </View>
            <T variant="sm" color="muted">
              {meta}
            </T>
          </LedgerRow>
        );
      })}
    </RowList>
  );
}

/* ══ Assignment submission sheet (course detail + assignments list) ══ */

export interface SubmitTarget {
  id: string;
  title: string;
  dueAt?: string | null;
  type?: string | null;
  courseName?: string | null;
}

/** «تسليم الواجب» — text answer + optional file URL, web validation copy. */
export function AssignSubmitSheet({
  open,
  onClose,
  offeringId,
  assignment,
}: {
  open: boolean;
  onClose: () => void;
  offeringId: string;
  assignment: SubmitTarget;
}) {
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  const tones = useStatusTones();
  const [textAnswer, setTextAnswer] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState<Submission | null>(null);

  // A fresh sheet per assignment/open — drafts never leak across targets.
  useEffect(() => {
    if (open) {
      setTextAnswer("");
      setFileUrl("");
      setValidationError(null);
      setDone(null);
    }
  }, [open, assignment.id]);

  const submit = useMutation({
    mutationFn: () =>
      teacherApi.submitAssignment(offeringId, assignment.id, {
        textAnswer: textAnswer.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
      }),
    onSuccess: (s) => {
      setDone(s);
      qc.invalidateQueries({ queryKey: ["me", "dashboard", scope] });
      qc.invalidateQueries({ queryKey: ["offerings", offeringId] });
    },
    onError: (e) => {
      setValidationError((e as ApiError).message);
    },
  });

  const onSubmit = () => {
    const text = textAnswer.trim();
    const file = fileUrl.trim();
    if (!text && !file) {
      setValidationError("أدخل إجابة نصية أو رابط ملف على الأقل قبل التسليم.");
      return;
    }
    if (file && !(/^https?:\/\//.test(file) || file.startsWith("/api/v1/files/papers/"))) {
      setValidationError("رابط الملف يجب أن يبدأ بـ https:// — وإجابتك النصيّة وحدها تكفي للتسليم.");
      return;
    }
    setValidationError(null);
    submit.mutate();
  };

  const late = done?.status === "LATE";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="تسليم الواجب"
      footer={
        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <Button label={done ? "إغلاق" : "إلغاء"} kind="ghost" onPress={onClose} small />
          </View>
          {!done ? (
            <View style={{ flex: 1 }}>
              <Button label="تسليم الواجب" kind="primary" onPress={onSubmit} loading={submit.isPending} small />
            </View>
          ) : null}
        </View>
      }
    >
      <View style={{ gap: sp[12] }}>
        <View style={{ gap: 2 }}>
          <T variant="body" weight="bold">
            {assignment.title}
          </T>
          <T variant="xs" color="muted">
            {assignment.courseName ? `${assignment.courseName} · ` : ""}
            {assignment.dueAt ? `آخر موعد ${dueLabel(assignment.dueAt).text}` : "بلا موعد"}
          </T>
        </View>

        {done ? (
          <View
            style={{
              gap: sp[6],
              borderWidth: 1,
              borderColor: late ? tones.yellow.ink : tones.mint.ink,
              backgroundColor: late ? tones.yellow.bg : tones.mint.bg,
              padding: sp[12],
            }}
          >
            <T variant="body" weight="bold" style={{ color: late ? tones.yellow.deep : tones.mint.deep }}>
              {late ? "تمّ التسليم — بعد الموعد النهائي" : "تمّ التسليم بنجاح"}
            </T>
            <T variant="sm" style={{ color: late ? tones.yellow.deep : tones.mint.deep }}>
              {late
                ? "استُلمت إجابتك وسيُعلَّم تسليمك كمتأخر؛ الحسم النهائي يعود إلى أستاذ المقرّر."
                : "استُلمت إجابتك وستظهر للأستاذ بانتظار التقييم."}
            </T>
          </View>
        ) : (
          <>
            <Field
              label="إجابتك النصيّة"
              value={textAnswer}
              onChangeText={setTextAnswer}
              error={validationError}
              multiline
              placeholder="اكتب إجابتك هنا…"
              maxLength={8000}
            />
            <Field
              label="رابط ملف (اختياري)"
              value={fileUrl}
              onChangeText={setFileUrl}
              hint="رابط خارجي اختياري يبدأ بـ https:// (مثل ملف على Drive) — إجابتك النصيّة وحدها تكفي للتسليم."
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://…"
              maxLength={500}
            />
            {submit.isError && validationError ? (
              <T variant="sm" color="danger">
                {validationError}
              </T>
            ) : null}
          </>
        )}
      </View>
    </Sheet>
  );
}

/* ══ Materials → document viewer route ═════════════════════════════ */

export interface MaterialRoute {
  filename: string;
  path: string;
}

/** /document/<filename>?ns=materials&title=<name> — filename = last URL segment. */
export function materialRoute(url: string, name: string): MaterialRoute | null {
  const clean = url.split("?")[0] ?? "";
  const filename = clean.split("/").pop();
  if (!filename) return null;
  return {
    filename,
    path: `/document/${filename}?ns=materials&title=${encodeURIComponent(name)}`,
  };
}

/** Open a course material in the authenticated PDF surface. */
export function openMaterial(url: string, name: string): void {
  const route = materialRoute(url, name);
  if (!route) return;
  router.push(route.path as never);
}

/** Course attribution for /me/materials rows (backend nests course, mobile type flattens). */
export function materialCourseName(row: MaterialRow): string {
  const nested = (row as MaterialRow & { course?: { name?: string } | null }).course;
  return row.courseName ?? nested?.name ?? "—";
}

/* ══ /me/results normalizer (typed bare array, served as {courses, headline}) ══ */

export interface ResultsHeadline {
  avgGradePct: number | null;
  highest: { courseName: string; gradePct: number } | null;
  lowest: { courseName: string; gradePct: number } | null;
  courseCount: number;
}

export interface ResultsPayload {
  headline: ResultsHeadline | null;
  courses: ResultCourse[];
}

/**
 * The typed client declares ResultCourse[] while the deployed route serves
 * { headline, courses, … } — normalize BOTH shapes honestly (older deploys
 * and the type both stay valid).
 */
export function normalizeResults(raw: unknown): ResultsPayload {
  if (Array.isArray(raw)) return { headline: null, courses: raw as ResultCourse[] };
  const obj = raw as { courses?: unknown; headline?: unknown } | null | undefined;
  if (obj && Array.isArray(obj.courses)) {
    return { headline: (obj.headline as ResultsHeadline | null) ?? null, courses: obj.courses as ResultCourse[] };
  }
  return { headline: null, courses: [] };
}

/* ══ Grade kinds (web GRADE_KIND_LABEL — TeacherPages.tsx) ═════════ */

const GRADE_KIND_LABEL: Record<string, string> = {
  HOMEWORK: "واجب",
  QUIZ_1: "اختبار قصير 1",
  QUIZ_2: "اختبار قصير 2",
  MIDTERM: "نصفي",
  PROJECT: "مشروع",
  FINAL: "نهائي",
};

export function gradeKindLabel(kind: string): string {
  return GRADE_KIND_LABEL[kind] ?? kind;
}

/* ══ Mastery language (matrix 5-level, spec tone mapping) ══════════ */

export function masteryMeta(level: number, attempts: number): { label: string; tone: StatusToneName } {
  if (attempts === 0) return { label: "لم يُختبر", tone: "grey" };
  if (level >= 0.8) return { label: "إتقان", tone: "mint" };
  if (level >= 0.6) return { label: "جيد", tone: "sky" };
  if (level >= 0.4) return { label: "يحتاج مراجعة", tone: "yellow" };
  return { label: "ضعف", tone: "rose" };
}

/* ══ Africa/Tripoli civil-calendar helpers (calendar + schedule) ════ */

const TZ = "Africa/Tripoli";

export interface CivilDate {
  y: number;
  /** 1-based month. */
  m: number;
  d: number;
}

const civilFmt = new Intl.DateTimeFormat("en-u-nu-latn", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The audience-calendar date of an instant (Africa/Tripoli). */
export function civilOf(value: string | Date): CivilDate {
  const parts = civilFmt.formatToParts(value instanceof Date ? value : new Date(value));
  const get = (t: string): number => Number(parts.find((x) => x.type === t)?.value ?? "0");
  return { y: get("year"), m: get("month"), d: get("day") };
}

export function tripoliToday(): CivilDate {
  return civilOf(new Date());
}

export function civilKey(c: CivilDate): string {
  return `${c.y}-${String(c.m).padStart(2, "0")}-${String(c.d).padStart(2, "0")}`;
}

/** Day-of-week (0=Sunday) of a civil date — computed on the UTC clock. */
export function civilDow(c: CivilDate): number {
  return new Date(Date.UTC(c.y, c.m - 1, c.d, 12)).getUTCDay();
}

/** 42-cell month grid (Sunday-first), mirroring the web monthGrid. */
export function monthGridCells(y: number, m: number): { key: string; day: number; dow: number; inMonth: boolean }[] {
  const firstDow = civilDow({ y, m, d: 1 });
  const startMs = Date.UTC(y, m - 1, 1 - firstDow, 12);
  const cells: { key: string; day: number; dow: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i += 1) {
    const dt = new Date(startMs + i * 86_400_000);
    const cell: CivilDate = { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
    cells.push({ key: civilKey(cell), day: cell.d, dow: dt.getUTCDay(), inMonth: cell.m === m });
  }
  return cells;
}

/** «يناير 2026» — Arabic month + latn year on the Tripoli clock. */
const monthTitleFmt = new Intl.DateTimeFormat("ar-LY-u-nu-latn", {
  timeZone: TZ,
  month: "long",
  year: "numeric",
});

export function monthTitle(y: number, m: number): string {
  return monthTitleFmt.format(new Date(Date.UTC(y, m - 1, 15, 12)));
}

/** Today's Tripoli day-of-week (0=Sunday) for schedule anchoring. */
export function tripoliDow(): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

/* ══ Dashboard agenda helpers ═══════════════════════════════════════ */

export type AgendaClass = StudentDashboard["agenda"]["classes"][number];

/** «اليوم» / «غدًا» for the agenda's when flag. */
export function classWhenLabel(when: string): string {
  if (when === "today") return "اليوم";
  if (when === "tomorrow") return "غدًا";
  return when;
}

/* ══ Reused section shell (title + optional count + body) ══════════ */

export function IndexedSection({
  index,
  title,
  note,
  action,
  children,
}: {
  index: number | string;
  title: string;
  note?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: sp[8] }}>
      <SectionBar index={index} title={title} action={action} />
      {note ? (
        <T variant="sm" color="muted">
          {note}
        </T>
      ) : null}
      {children}
    </View>
  );
}

/* ══ Small display helpers ══════════════════════════════════════════ */

/** Course progress readout: «تابع 45%» / «ابدأ» grammar from the web rows. */
export function courseProgressHint(progressPct: number): string {
  if (progressPct <= 0) return "ابدأ";
  if (progressPct >= 100) return "مكتملة";
  return `تابع ${latn(Math.round(progressPct))}%`;
}

/** Counted files line for materials sections. */
export function filesCount(n: number): string {
  return countAr(n, ["ملف واحد متاح", "ملفان متاحان", "ملفات متاحة", "ملفاً متاحاً"]);
}
