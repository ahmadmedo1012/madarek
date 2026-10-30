/**
 * (tabs)/intelligence — الذكاء الأكاديمي. Web parity:
 * TeacherIntelligencePage (global at-risk panel + per-offering analytics
 * + the template-simulated curriculum suggestion with its honest badge).
 */
import { RoleTabFrame } from "@/components/shell/TabFrame";

import { useMemo, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Lightbulb, Sparkles } from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn, pct } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, SimulatedBadge } from "@/components/ui/surfaces";
import { Avatar, KpiCard, LedgerRow, RowList, StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";
import {
  OfferingPicker,
  arCount,
  riskInfo,
  useTeacherOfferings,
} from "@/features/teacher/components";

/** Wire shape of GET /teacher/risks (teacher.routes.ts — RosterStudent & course). */
type RiskRow = {
  studentId?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  offeringId?: string;
  courseName?: string;
  riskScore?: number | null;
  riskLevel?: string | null;
  risk?: string | null;
  suggestion?: string | null;
  signals?: string[];
  avatarInitials?: string | null;
  avatarColor?: string | null;
  attendancePct?: number | null;
  avgGrade?: number | null;
  watchPct?: number | null;
};

/** Honest analytics labels — known keys map to Arabic, unknown keys keep
 * their raw name (latn values, nulls skipped). */
const ANALYTICS_LABELS: Record<string, string> = {
  enrolled: "مسجَّلون",
  totalSessions: "جلسات الحضور",
  overallAttendance: "الحضور العام",
  avgGrade: "متوسط الدرجات",
  avgGradePct: "متوسط الدرجات",
  passRate: "نسبة النجاح",
  assignmentCount: "التكاليف",
  examCount: "الاختبارات",
  attendancePct: "الحضور",
  avgWatchedPct: "متوسط المشاهدة",
  completedPct: "نسبة الإكمال",
  activeStudents: "طلاب نشطون",
};
const ANALYTICS_PCT = new Set([
  "overallAttendance",
  "avgGrade",
  "avgGradePct",
  "passRate",
  "attendancePct",
  "avgWatchedPct",
  "completedPct",
]);

function analyticsValue(key: string, v: unknown): string {
  if (typeof v === "number") return ANALYTICS_PCT.has(key) ? pct(v) : latn(v);
  if (typeof v === "string") return v;
  return latn(Number(v));
}

/** The simulated outline rendered as honest text lines (no fake depth). */
function OutlineText({ outline }: { outline: unknown }) {
  const p = usePalette();
  const lines: string[] = [];
  const walk = (node: unknown, prefix: string) => {
    if (node === null || node === undefined) return;
    if (typeof node === "string" || typeof node === "number") {
      lines.push(`${prefix}${String(node)}`);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, `${prefix}${latn(i + 1)}. `));
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const title = obj.title ?? obj.name ?? obj.chapter ?? obj.label;
      if (typeof title === "string") lines.push(`${prefix}${title}`);
      const topics = obj.topics ?? obj.items ?? obj.lessons;
      if (Array.isArray(topics)) {
        for (const t of topics) {
          if (typeof t === "string") lines.push(`${prefix}  · ${t}`);
        }
      }
      const est = obj.estLectures ?? obj.lectures;
      if (typeof est === "number") lines.push(`${prefix}  (${arCount(est, ["محاضرة واحدة", "محاضرتان", "محاضرات", "محاضرة"])})`);
    }
  };
  if (Array.isArray(outline)) outline.forEach((ch) => walk(ch, ""));
  else walk(outline, "");

  if (lines.length === 0) {
    return (
      <T variant="sm" color="muted">
        لا يوجد مخطط في الاستجابة — الاقتراح قالبيّ ويُعرض كما وصل.
      </T>
    );
  }
  return (
    <View style={{ gap: sp[4] }}>
      {lines.map((l, i) => (
        <T key={i} variant="sm" color={l.startsWith("  ") ? "muted" : "text"}>
          {l.trim()}
        </T>
      ))}
      <T variant="xs" color="faint" style={{ paddingTop: sp[4] }}>
        محتوى الخطوط أعلاه هو نص مقترح آليًا — راجعه قبل اعتماده في منهجك.
      </T>
    </View>
  );
}

function TeacherIntelligence() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];
  const [offeringId, setOfferingId] = useState<string>("");
  const effectiveId = offeringId || offerings[0]?.id || "";

  const risks = useQuery({
    queryKey: ["teacher", "risks", scope],
    queryFn: () => teacherApi.risks(),
  });
  const analytics = useQuery({
    queryKey: ["teacher", "offering", effectiveId, "analytics", scope],
    queryFn: () => teacherApi.analytics(effectiveId),
    enabled: effectiveId !== "",
  });

  const suggest = useMutation({
    mutationFn: () => teacherApi.curriculumSuggest(effectiveId),
    onSuccess: () => {
      toast.success("وصل الاقتراح — قالبيّ ومحاكى كما هو معلن.");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر الاقتراح"),
  });

  const riskRows = useMemo(() => {
    const rows = (risks.data ?? []) as unknown as RiskRow[];
    return rows.map((r) => ({
      key: (r.studentId ?? r.id ?? "") + ":" + (r.offeringId ?? ""),
      name: r.name ?? (`${r.firstName ?? ""} ${r.lastName ?? ""}`.trim() || "—"),
      courseName: r.courseName ?? "",
      riskScore: typeof r.riskScore === "number" ? r.riskScore : null,
      risk: (r.riskLevel ?? r.risk) ?? null,
      suggestion: r.suggestion ?? null,
      signals: Array.isArray(r.signals) ? r.signals.filter((s): s is string => typeof s === "string") : [],
      avatarInitials: r.avatarInitials ?? null,
      avatarColor: r.avatarColor ?? null,
    }));
  }, [risks.data]);

  const flagged = {
    WATCH: riskRows.filter((r) => r.risk === "WATCH" || r.risk === "medium").length,
    AT_RISK: riskRows.filter((r) => r.risk === "AT_RISK" || r.risk === "high").length,
    CRITICAL: riskRows.filter((r) => r.risk === "CRITICAL" || r.risk === "high").length,
  };

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/teacher/alerts" />
      <PageHeader
        title="الذكاء الأكاديمي"
        kicker="متابعة أداء طلابك مدعومة بتحليل لحظي للحضور والدرجات والمتابعة، مع توصيات تدخّل ذكية."
      />

      {/* طلاب يحتاجون متابعة — the global at-risk panel. */}
      <SectionBar index={1} title="طلاب يحتاجون متابعة" />
      {risks.isLoading ? (
        <SkeletonList rows={3} />
      ) : risks.isError ? (
        <ErrorState message={(risks.error as Error).message} onRetry={() => risks.refetch()} compact />
      ) : riskRows.length === 0 ? (
        <EmptyState
          title="جميع طلابك في وضع جيد"
          message="لا حاجة لتدخّل عاجل."
        />
      ) : (
        <View style={{ gap: sp[8] }}>
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            <KpiCard label="تحت المراقبة" value={flagged.WATCH} />
            <KpiCard label="في خطر" value={flagged.AT_RISK} />
            <KpiCard label="حرج" value={flagged.CRITICAL} tone="accent" />
          </View>
          <RowList>
            {riskRows.map((r, i) => {
              const info = riskInfo(r.risk);
              return (
                <LedgerRow key={r.key || i} last={i === riskRows.length - 1} accessibilityLabel={`طالب ${r.name}`}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <Avatar
                      initials={r.avatarInitials ?? r.name.slice(0, 2)}
                      color={r.avatarColor}
                      size={36}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                        <View style={{ flex: 1 }}>
                          <T variant="body" weight="medium" numberOfLines={1}>
                            {r.name}
                          </T>
                          <T variant="xs" color="muted" numberOfLines={1}>
                            {r.courseName}
                          </T>
                        </View>
                        {r.riskScore !== null ? (
                          <T variant="bodyLg" weight="bold">
                            {pct(r.riskScore)}
                          </T>
                        ) : null}
                        {info ? <Badge label={info.label} tone={info.tone} /> : null}
                      </View>
                      {r.signals.length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[4] }}>
                          {r.signals.map((s) => (
                            <Badge key={s} label={s} tone="yellow" />
                          ))}
                        </View>
                      ) : null}
                      {r.suggestion ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4] }}>
                          <Lightbulb size={12} color={p.goldInk} />
                          <T variant="xs" color="secondary" style={{ flex: 1 }}>
                            {r.suggestion}
                          </T>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </LedgerRow>
              );
            })}
          </RowList>
        </View>
      )}

      {/* مؤشّرات المقرّر — per-offering analytics, rendered honestly. */}
      <SectionBar index={2} title="مؤشّرات المقرّر" />
      {offerings.length === 0 ? (
        <Card>
          <T variant="body" color="muted">لم تُسند إليك مقرّرات بعد</T>
        </Card>
      ) : (
        <>
          <OfferingPicker offerings={offerings} value={effectiveId} onChange={setOfferingId} label="المقرّر" />
          {analytics.isLoading ? (
            <SkeletonList rows={3} rowHeight={44} />
          ) : analytics.isError ? (
            <ErrorState
              message={(analytics.error as Error).message}
              onRetry={() => analytics.refetch()}
              compact
            />
          ) : (
            <Card>
              {Object.entries((analytics.data ?? {}) as Record<string, unknown>)
                .filter(([, v]) => v !== null && v !== undefined)
                .map(([key, v]) => (
                  <StatLine
                    key={key}
                    label={ANALYTICS_LABELS[key] ?? key}
                    value={typeof v === "number" || typeof v === "string" ? analyticsValue(key, v) : "—"}
                  />
                ))}
            </Card>
          )}

          {/* اقتراح هيكل المنهج — محاكاة معلنة. */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <View style={{ flex: 1 }}>
                <T variant="h4" weight="bold">اقتراح هيكل منهج</T>
              </View>
              <SimulatedBadge note="اقتراح قالبيّ" />
            </View>
            <T variant="sm" color="muted" style={{ paddingVertical: sp[4] }}>
              اقتراح قالبيّ لهيكل منهج بمطابقة اسم المقرّر — لا تحليل ذكيّ للمحتوى (محاكاة حتى نموذج حقيقي).
            </T>
            <Button
              label={suggest.data ? "إعادة الاقتراح" : "اقتراح هيكل المنهج"}
              icon={<Sparkles size={16} color={p.primaryFg} />}
              kind="accent"
              loading={suggest.isPending}
              disabled={effectiveId === ""}
              onPress={() => suggest.mutate()}
            />
            {suggest.isError ? (
              <T variant="sm" color="danger" style={{ paddingTop: sp[8] }}>
                تعذَّر اقتراح هيكل المنهج.
              </T>
            ) : null}
            {suggest.data ? (
              <View style={{ gap: sp[8], paddingTop: sp[12] }}>
                <OutlineText outline={(suggest.data as { outline?: unknown }).outline} />
              </View>
            ) : null}
          </Card>
        </>
      )}
    </Screen>
  );
}


export default function TeacherIntelligenceTabbed() {
  return (
    <RoleTabFrame role="TEACHER">
      <TeacherIntelligence />
    </RoleTabFrame>
  );
}
