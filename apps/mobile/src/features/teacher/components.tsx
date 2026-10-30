/**
 * Teacher feature components — shared local primitives for the TEACHER
 * screens (tabs + pushed routes). Mirrors the web vocabulary:
 * frontend/src/pages/teacher/* + components/curriculum/*.
 *
 * Everything here is teacher-owned (no shared-file edits): query hooks
 * keyed with useInstitutionScope(), the offering picker, risk/label maps
 * (the web's exact Arabic copy), the roster card reused by
 * (tabs)/students and students/[offeringId], and small chip rows.
 */
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { teacherApi, type RosterStudent, type TeacherOffering } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp, type StatusToneName } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Badge, Sheet } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { SelectField } from "@/components/ui/fields";
import { Avatar, LedgerRow, ProgressBar, RowList, StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";

/* ─── Arabic counted nouns (web lib/format.countAr parity) ─────────── */

/** countAr: [واحد, اثنان, 3–10, >10] — digits ride latn(). */
export function arCount(n: number, forms: [string, string, string, string]): string {
  if (n === 1) return forms[0];
  if (n === 2) return forms[1];
  if (n >= 3 && n <= 10) return `${latn(n)} ${forms[2]}`;
  return `${latn(n)} ${forms[3]}`;
}

/* ─── Label vocabularies (byte-mirrored from the web pages) ───────── */

export const ASSIGNMENT_KIND_LABEL: Record<string, string> = {
  HOMEWORK: "واجب",
  QUIZ: "اختبار قصير",
  PROJECT: "مشروع",
  EXAM: "اختبار",
};

export const MATERIAL_TYPE_LABEL: Record<string, string> = {
  PDF: "PDF",
  PPT: "PPT",
  VIDEO: "فيديو",
  DOC: "DOC",
  ZIP: "ZIP",
  IMAGE: "صورة",
  OTHER: "أخرى",
};

export const GRADE_KIND_LABEL: Record<string, string> = {
  HOMEWORK: "واجب",
  QUIZ_1: "اختبار قصير 1",
  QUIZ_2: "اختبار قصير 2",
  MIDTERM: "نصفي",
  PROJECT: "مشروع",
  FINAL: "نهائي",
};
export const GRADE_KINDS = Object.keys(GRADE_KIND_LABEL);

export const EXAM_KIND_LABEL: Record<string, string> = {
  QUIZ: "اختبار قصير",
  MIDTERM: "نصفي",
  FINAL: "نهائي",
  PRACTICE: "تدريبي",
};

export const EXAM_STATUS_LABEL: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING_REVIEW: "بانتظار المراجعة",
  APPROVED: "معتمد",
  REJECTED: "مرفوض",
  PUBLISHED: "منشور",
  CLOSED: "مُغلق",
};
export const EXAM_STATUS_TONE: Record<string, StatusToneName> = {
  DRAFT: "lavender",
  PENDING_REVIEW: "yellow",
  APPROVED: "mint",
  REJECTED: "rose",
  PUBLISHED: "copper",
  CLOSED: "grey",
};

export const ATTEMPT_STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "قيد الأداء",
  SUBMITTED: "بانتظار التصحيح",
  GRADED: "مُصحَّحة",
  EXPIRED: "منتهية بانتهاء الوقت",
};
export const ATTEMPT_STATUS_TONE: Record<string, StatusToneName> = {
  IN_PROGRESS: "lavender",
  SUBMITTED: "yellow",
  GRADED: "mint",
  EXPIRED: "rose",
};

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MCQ: "اختيار من متعدد",
  TRUE_FALSE: "صواب أو خطأ",
  SHORT: "إجابة قصيرة",
  ESSAY: "مقالي",
};

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

export const PAPER_STATUS_LABEL: Record<string, string> = {
  UPLOADED: "بانتظار الفحص",
  SCANNING: "جارٍ الفحص",
  CHECKS_PASSED: "بانتظار التقييم",
  CHECKS_FAILED: "تعذّر اجتياز الفحص",
  GRADED: "مُقيَّم",
  PUBLISHED: "مُنشور",
};
export const PAPER_STATUS_TONE: Record<string, StatusToneName> = {
  UPLOADED: "sky",
  SCANNING: "sky",
  CHECKS_PASSED: "yellow",
  CHECKS_FAILED: "rose",
  GRADED: "copper",
  PUBLISHED: "mint",
};

export const LIVE_STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "مجدولة",
  LIVE: "مباشرة الآن",
  ENDED: "منتهية",
  CANCELLED: "ملغاة",
};
export const LIVE_STATUS_TONE: Record<string, StatusToneName> = {
  SCHEDULED: "yellow",
  LIVE: "rose",
  ENDED: "mint",
  CANCELLED: "grey",
};

/** The platform's ONE grade taxonomy (web lib/courseMeta.GRADE_BANDS). */
export const GRADE_BANDS: { key: string; label: string; tone: StatusToneName; range: string; min: number }[] = [
  { key: "EXCELLENT", label: "ممتاز", tone: "mint", range: "85 فأعلى", min: 85 },
  { key: "VERY_GOOD", label: "جيّد جدّاً", tone: "copper", range: "75–84", min: 75 },
  { key: "GOOD", label: "جيّد", tone: "yellow", range: "65–74", min: 65 },
  { key: "PASS", label: "مقبول", tone: "sky", range: "50–64", min: 50 },
  { key: "WEAK", label: "ضعيف", tone: "rose", range: "أقلّ من 50", min: 0 },
];

export function gradeBand(avg: number): { label: string; tone: StatusToneName; range: string } {
  for (const b of GRADE_BANDS) if (avg >= b.min) return b;
  return GRADE_BANDS[GRADE_BANDS.length - 1]!;
}

/**
 * The risk vocabulary. The wire sends riskLevel (OK/WATCH/AT_RISK/
 * CRITICAL — teacher.routes.ts) and the mobile API module also allows a
 * legacy `risk` (high/medium/low); both vocabularies map to the web's
 * Arabic labels + Heron chip tones.
 */
const RISK_LEVEL: Record<string, { label: string; tone: StatusToneName }> = {
  OK: { label: "مستقر", tone: "mint" },
  WATCH: { label: "تحت المراقبة", tone: "yellow" },
  AT_RISK: { label: "في خطر", tone: "yellow" },
  CRITICAL: { label: "حرج", tone: "rose" },
};
const RISK_WORD: Record<string, { label: string; tone: StatusToneName }> = {
  low: { label: "منتظم", tone: "mint" },
  medium: { label: "متابعة", tone: "yellow" },
  high: { label: "خطر", tone: "rose" },
};

export function riskInfo(raw: string | null | undefined): { label: string; tone: StatusToneName } | null {
  if (!raw) return null;
  const key = String(raw);
  return RISK_LEVEL[key] ?? RISK_WORD[key.toLowerCase()] ?? null;
}

/* ─── Offerings query + picker ─────────────────────────────────────── */

export function useTeacherOfferings() {
  const scope = useInstitutionScope();
  return useQuery({
    queryKey: ["teacher", "offerings", scope],
    queryFn: () => teacherApi.offerings(),
  });
}

export function offeringLabel(o: TeacherOffering): string {
  return `${o.course.name} (${o.course.code} · ${o.term})`;
}

/** «المقرّر» picker — a labeled SelectField over my offerings. */
export function OfferingPicker({
  offerings,
  value,
  onChange,
  label = "المقرّر",
  loading,
}: {
  offerings: TeacherOffering[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  loading?: boolean;
}) {
  const options = useMemo(
    () => offerings.map((o) => ({ id: o.id, label: offeringLabel(o) })),
    [offerings],
  );
  const current = offerings.find((o) => o.id === value) ?? null;
  return (
    <SelectField
      label={label}
      value={current ? { id: current.id, label: offeringLabel(current) } : null}
      options={options}
      onSelect={onChange}
      placeholder={offerings.length === 0 ? "— لا توجد مقرّرات —" : "اختر…"}
      loading={loading}
      sheetTitle={label}
    />
  );
}

/* ─── Roster — shared by (tabs)/students and students/[offeringId] ── */

/**
 * Normalizes one roster row. The wire (teacher.routes.ts) sends
 * { studentId, name, universityId, attendancePct, absences, lateCount,
 *   avgGrade, watchPct, riskScore, riskLevel, signals[], suggestion };
 * the mobile API type also allows firstName/lastName/gradePct/progress.
 * Both shapes read honestly — no key is invented.
 */
export interface RosterEntry {
  id: string;
  name: string;
  universityId: string;
  avatarInitials: string | null;
  avatarColor: string | null;
  year: number | null;
  progressPct: number | null;
  gradePct: number | null;
  attendancePct: number | null;
  risk: string | null;
  riskScore: number | null;
  absences: number | null;
  lateCount: number | null;
  watchPct: number | null;
  signals: string[];
  suggestion: string | null;
}

export function toRosterEntry(s: RosterStudent): RosterEntry {
  const raw = s as Record<string, unknown>;
  const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
  const nmb = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const first = typeof (raw.firstName as unknown) === "string" ? (raw.firstName as string) : "";
  const last = typeof (raw.lastName as unknown) === "string" ? (raw.lastName as string) : "";
  const name = str(raw.name) ?? `${first} ${last}`.trim();
  const signals = Array.isArray(raw.signals)
    ? (raw.signals as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return {
    id: str(raw.studentId) ?? s.id,
    name: name !== "" ? name : "—",
    universityId: str(s.universityId) ?? str(raw.universityId) ?? "—",
    avatarInitials: str(s.avatarInitials),
    avatarColor: str(s.avatarColor),
    year: nmb(s.year),
    progressPct: nmb(s.progressPct) ?? nmb(raw.watchPct),
    gradePct: nmb(s.gradePct) ?? nmb(raw.avgGrade),
    attendancePct: nmb(s.attendancePct),
    risk: str(s.risk) ?? str(raw.riskLevel),
    riskScore: nmb(raw.riskScore),
    absences: nmb(raw.absences),
    lateCount: nmb(raw.lateCount),
    watchPct: nmb(raw.watchPct),
    signals,
    suggestion: str(raw.suggestion),
  };
}

function pctOrDash(n: number | null): string {
  return n === null ? "—" : `${latn(Math.round(n))}%`;
}

/** One roster row — name, universityId, progress bar, risk badge, grades. */
export function RosterRow({
  entry,
  onPress,
  last,
}: {
  entry: RosterEntry;
  onPress?: () => void;
  last?: boolean;
}) {
  const risk = riskInfo(entry.risk);
  const band = entry.gradePct !== null ? gradeBand(entry.gradePct) : null;
  return (
    <LedgerRow onPress={onPress} last={last} accessibilityLabel={`الطالب ${entry.name}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <Avatar
          initials={entry.avatarInitials ?? entry.name.slice(0, 2)}
          color={entry.avatarColor}
          size={40}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
            <View style={{ flex: 1 }}>
              <T variant="body" weight="medium" numberOfLines={1}>
                {entry.name}
              </T>
            </View>
            {risk ? <Badge label={risk.label} tone={risk.tone} /> : null}
          </View>
          <T variant="xs" color="muted">
            {entry.universityId}
            {entry.year !== null ? ` · السنة ${latn(entry.year)}` : ""}
          </T>
        </View>
      </View>
      {entry.progressPct !== null ? (
        <ProgressBar
          ratio={Math.min(1, Math.max(0, entry.progressPct / 100))}
          accent
          label={`تقدّم ${entry.name}`}
        />
      ) : null}
      <View style={{ flexDirection: "row", gap: sp[6], alignItems: "center" }}>
        <T variant="sm" color="muted">
          الحضور {pctOrDash(entry.attendancePct)} · الدرجات {pctOrDash(entry.gradePct)}
        </T>
        {band ? <Badge label={band.label} tone={band.tone} /> : null}
      </View>
    </LedgerRow>
  );
}

/** Minimal labeled numeric input (score/maxScore/weight trio). */
export function QuickField({
  label,
  value,
  onChange,
  hint,
  accessibilityLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: sp[6] }}>
      <T variant="sm" weight="medium" color="secondary">
        {label}
      </T>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholderTextColor={p.textFaint}
        style={{
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          paddingHorizontal: sp[12],
          minHeight: 48,
          color: p.text,
          fontSize: 15,
          textAlign: "left",
        }}
      />
      {hint ? (
        <T variant="sm" color="muted">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/** Quick per-kind grade upsert for one student (the roster sheet's write half). */
function QuickGradeForm({
  offeringId,
  student,
  onDone,
}: {
  offeringId: string;
  student: RosterEntry;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [kind, setKind] = useState<string>("HOMEWORK");
  const [score, setScore] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [weight, setWeight] = useState("10");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const s = Number(score);
      const mx = Number(maxScore);
      const wt = Number(weight);
      if (score.trim() === "" || Number.isNaN(s) || s < 0) {
        throw new ApiError("BAD_GRADE", "أدخل درجة صحيحة.", 400);
      }
      if (Number.isNaN(mx) || !Number.isInteger(mx) || mx < 1 || mx > 100) {
        throw new ApiError("BAD_MAX", "الدرجة العظمى عدد صحيح بين 1 و100.", 400);
      }
      if (Number.isNaN(wt) || !Number.isInteger(wt) || wt < 0 || wt > 100) {
        throw new ApiError("BAD_WEIGHT", "الوزن عدد صحيح بين 0 و100.", 400);
      }
      if (s > mx) {
        throw new ApiError("OVER_MAX", `الدرجة يجب ألّا تتجاوز ${latn(mx)}.`, 400);
      }
      return teacherApi.upsertGrades(offeringId, [
        { studentId: student.id, kind, score: s, maxScore: mx, weight: wt },
      ]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher"] });
      toast.success("تمّ حفظ الدرجات المسجَّلة في هذا النوع.", "تمّ الحفظ");
      onDone();
    },
    onError: (e) => {
      setError(e instanceof ApiError ? e.message : "تعذَّر حفظ الدرجات — حاول مرة أخرى.");
    },
  });

  return (
    <View style={{ gap: sp[10] }}>
      <SelectField
        label="نوع التقييم"
        value={{ id: kind, label: GRADE_KIND_LABEL[kind] ?? kind }}
        options={GRADE_KINDS.map((k) => ({ id: k, label: GRADE_KIND_LABEL[k] }))}
        onSelect={(id) => setKind(id)}
        sheetTitle="نوع التقييم"
      />
      <QuickField label="الدرجة" value={score} onChange={setScore} hint="مثال: 85" />
      <QuickField label="الدرجة العظمى" value={maxScore} onChange={setMaxScore} hint="بين 1 و100" />
      <QuickField label="الوزن (% من الدرجات)" value={weight} onChange={setWeight} hint="بين 0 و100" />
      {error ? (
        <T variant="sm" color="danger">
          {error}
        </T>
      ) : null}
      <Button
        label="حفظ الدرجة"
        onPress={() => {
          setError(null);
          save.mutate();
        }}
        loading={save.isPending}
      />
    </View>
  );
}

/**
 * The per-offering roster: list + per-student sheet (stats + attendance
 * summary + quick grade upsert). Reused by both roster surfaces.
 */
export function OfferingRoster({
  offeringId,
  offeringName,
}: {
  offeringId: string;
  offeringName?: string | null;
}) {
  const scope = useInstitutionScope();
  const roster = useQuery({
    queryKey: ["teacher", "offering", offeringId, "students", scope],
    queryFn: () => teacherApi.students(offeringId),
    enabled: offeringId !== "",
  });
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = useMemo(() => (roster.data ?? []).map(toRosterEntry), [roster.data]);
  const selected = rows.find((r) => r.id === openId) ?? null;

  if (roster.isLoading) return <SkeletonList rows={5} />;
  if (roster.isError) {
    return <ErrorState message={(roster.error as Error).message} onRetry={() => roster.refetch()} />;
  }
  if (rows.length === 0) {
    return (
      <EmptyState
        title="لا يوجد طلاب مسجَّلون"
        message="لا توجد تسجيلات نشطة في هذا المقرّر بعد."
      />
    );
  }

  return (
    <View style={{ gap: sp[12] }}>
      <RowList>
        {rows.map((r, i) => (
          <RosterRow
            key={r.id}
            entry={r}
            last={i === rows.length - 1}
            onPress={() => setOpenId(r.id)}
          />
        ))}
      </RowList>
      <Sheet open={selected !== null} onClose={() => setOpenId(null)} title={selected?.name ?? ""}>
        {selected ? (
          <View style={{ gap: sp[10] }}>
            <StatLine label="الحضور" value={pctOrDash(selected.attendancePct)} />
            <StatLine label="متوسّط الدرجات" value={pctOrDash(selected.gradePct)} />
            <StatLine
              label="المتابعة"
              value={pctOrDash(selected.watchPct ?? selected.progressPct)}
              hint={
                selected.absences !== null && selected.lateCount !== null
                  ? `غياب ${latn(selected.absences)} · تأخّر ${latn(selected.lateCount)}`
                  : null
              }
            />
            {selected.riskScore !== null ? (
              <StatLine label="مؤشّر المخاطرة" value={`${latn(selected.riskScore)}%`} />
            ) : null}
            {selected.signals.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6] }}>
                {selected.signals.map((s) => (
                  <Badge key={s} label={s} tone="yellow" />
                ))}
              </View>
            ) : null}
            {selected.suggestion ? (
              <T variant="sm" color="secondary">
                {selected.suggestion}
              </T>
            ) : null}
            <View style={{ paddingTop: sp[8] }}>
              <T variant="h4" weight="bold">
                إدخال درجة سريع
              </T>
              <T variant="sm" color="muted" style={{ paddingBottom: sp[8] }}>
                {offeringName ? `${offeringName} · ` : ""}درجة واحدة تُرسَل فورًا لهذا الطالب.
              </T>
              <QuickGradeForm offeringId={offeringId} student={selected} onDone={() => setOpenId(null)} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}

/* ─── Status chip maps (attempts / sessions / papers / templates) ──── */

export const ATTEMPT_STATUS_MAP: Record<string, { label: string; tone: StatusToneName }> = Object.fromEntries(
  Object.entries(ATTEMPT_STATUS_LABEL).map(([k, label]) => [k, { label, tone: ATTEMPT_STATUS_TONE[k] }]),
);
export const LIVE_STATUS_MAP: Record<string, { label: string; tone: StatusToneName }> = Object.fromEntries(
  Object.entries(LIVE_STATUS_LABEL).map(([k, label]) => [k, { label, tone: LIVE_STATUS_TONE[k] }]),
);
export const PAPER_STATUS_MAP: Record<string, { label: string; tone: StatusToneName }> = Object.fromEntries(
  Object.entries(PAPER_STATUS_LABEL).map(([k, label]) => [k, { label, tone: PAPER_STATUS_TONE[k] }]),
);
export const EXAM_STATUS_MAP: Record<string, { label: string; tone: StatusToneName }> = Object.fromEntries(
  Object.entries(EXAM_STATUS_LABEL).map(([k, label]) => [k, { label, tone: EXAM_STATUS_TONE[k] }]),
);

export function StatusBadge({
  status,
  map,
}: {
  status: string;
  map: Record<string, { label: string; tone: StatusToneName }>;
}) {
  const info = map[status];
  if (!info) return <Badge label={status} tone="grey" />;
  return <Badge label={info.label} tone={info.tone} />;
}

/** Small inline action chip (44px floor) — used inside ledger trailing slots. */
export function ChipAction({
  label,
  onPress,
  tone = "grey",
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: StatusToneName;
  accessibilityLabel?: string;
}) {
  const tones = useStatusTones();
  const t = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        justifyContent: "center",
        backgroundColor: pressed ? t.bg : t.bg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.ink,
        paddingHorizontal: sp[10],
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <T variant="sm" weight="bold" style={{ color: t.ink }}>
        {label}
      </T>
    </Pressable>
  );
}
