/**
 * /student/assignments — التكاليف (cross-offering pending list, web
 * CoursesPage «الواجبات القادمة» contract): the dashboard agenda's
 * overdue-aware pending assignments, each with the direct «تسليم» sheet.
 * Submission history lives in each course's detail page — the honest note
 * says so.
 *
 * R334 Round 2 (3-h Comms):
 *   · the list is a DataList (FlashList v2) — bounded-height body, not a
 *     ScrollView .map;
 *   · status chips (pending / late today; the wire also knows submitted /
 *     graded — the helper models all four, the pending-only feed reaches
 *     two — honesty documented in docs/mobile/screens/comms-agenda.md);
 *   · due-date COUNTDOWN text («متبقٍ ٥ ساعات» / «متأخر يومان») ticking
 *     once a minute through useNow (render stays pure);
 *   · errors through humanizeError (never raw error.message).
 */
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Send from "lucide-react-native/icons/send";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useNow } from "@/hooks/useNow";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, SectionBar } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { DataList, makeRow } from "@/components/ui/data";
import { dueLabel, latn } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { countAr } from "@/features/student/more";
import { AssignSubmitSheet, type SubmitTarget } from "@/features/student/components";

const ASSIGNMENT_KIND_LABEL: Record<string, string> = {
  HOMEWORK: "واجب",
  QUIZ: "اختبار قصير",
  PROJECT: "مشروع",
  EXAM: "اختبار",
};

type AssignmentLike = {
  id: string;
  offeringId: string;
  courseCode?: string;
  title: string;
  dueAt: string | null;
  overdue?: boolean;
  type?: string;
};

/* ══ Pure status + countdown model (exported for colocated tests — see
      src/features/messages/agenda-logic.test.ts for WHY the tests live
      there: app/ cannot host test files without breaking the render-net
      route walk). ═══════════════════════════════════════════════════ */

export type AssignmentStatus = "pending" | "submitted" | "graded" | "late";

/**
 * The four-state assignment chip model. The /me/dashboard agenda only
 * surfaces UNsubmitted work (with an `overdue` flag), so today's feed
 * reaches "pending" | "late" — "submitted"/"graded" exist for the richer
 * per-course surfaces that already render this helper.
 */
export function assignmentStatus(
  a: { dueAt?: string | null; overdue?: boolean; submittedAt?: string | null; gradedAt?: string | null },
  now: number,
): AssignmentStatus {
  if (a.gradedAt) return "graded";
  if (a.submittedAt) return "submitted";
  if (a.overdue) return "late";
  if (a.dueAt && new Date(a.dueAt).getTime() < now) return "late";
  return "pending";
}

/**
 * Due-date countdown — «متبقٍ ٥ ساعات» / «متبقٍ يومان» / «متأخر ٤ أيام».
 * Null when there is no due date. Western digits (latn) per numerals
 * policy; pure function of (dueAt, now).
 */
export function dueCountdown(dueAt: string | null | undefined, now: number): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt).getTime();
  if (Number.isNaN(due)) return null;
  const diffMs = due - now;
  const overdue = diffMs < 0;
  const absMs = Math.abs(diffMs);
  const hours = Math.round(absMs / 3_600_000);
  const days = Math.round(hours / 24);
  if (days >= 1) {
    return overdue
      ? countAr(days, ["متأخر يوم واحد", "متأخر يومان", "متأخر أيام", "متأخر يومًا"])
      : countAr(days, ["متبقٍ يوم واحد", "متبقٍ يومان", "متبقٍ أيام", "متبقٍ يومًا"]);
  }
  if (hours >= 1) {
    return overdue
      ? countAr(hours, ["متأخر ساعة واحدة", "متأخر ساعتان", "متأخر ساعات", "متأخر ساعةً"])
      : countAr(hours, ["متبقية ساعة واحدة", "متبقية ساعتان", "متبقية ساعات", "متبقية ساعةً"]);
  }
  const minutes = Math.max(1, Math.round(absMs / 60_000));
  return overdue
    ? `متأخر ${latn(minutes)} دقيقة`
    : `متبقٍ ${latn(minutes)} دقيقة`;
}

const STATUS_META: Record<AssignmentStatus, { label: string; tone: "grey" | "rose" | "sky" | "mint" }> = {
  pending: { label: "بانتظار التسليم", tone: "grey" },
  submitted: { label: "مُسلَّم", tone: "sky" },
  graded: { label: "مُقيَّم", tone: "mint" },
  late: { label: "متأخر", tone: "rose" },
};

/* ══ Screen ═════════════════════════════════════════════════════════ */

export default function AssignmentsScreen() {
  const scope = useInstitutionScope();
  const now = useNow(60_000);
  const feed = useQuery({
    queryKey: ["me", "dashboard", scope],
    queryFn: () => studentApi.dashboard(),
  });

  const pending = feed.data?.agenda.assignments ?? [];
  const [target, setTarget] = useState<SubmitTarget | null>(null);

  const openSubmit = useCallback((a: AssignmentLike) => {
    haptics.selection();
    setTarget({
      id: a.id,
      title: a.title,
      dueAt: a.dueAt,
      type: a.type,
      courseName: a.courseCode ?? undefined,
    });
  }, []);

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="التكاليف" kicker="واجباتك المستحقة فعلياً ولم تُسلّمها بعد" />
      <DataList
        data={pending as AssignmentLike[]}
        renderItem={(info) => (
          <AssignmentRow item={info.item} now={now} onSubmit={openSubmit} />
        )}
        keyExtractor={(a) => a.id}
        isLoading={feed.isLoading}
        isError={feed.isError}
        errorMessage={feed.isError ? humanizeError(feed.error) : null}
        onRetry={() => feed.refetch()}
        refetch={feed.refetch}
        isRefetching={feed.isRefetching}
        ListHeaderComponent={
          <View style={{ gap: sp[8], paddingBottom: sp[8] }}>
            <SectionBar
              index={1}
              title="تكليفات معلّقة"
              action={
                pending.length > 0 ? (
                  <T variant="xs" color="muted">
                    {latn(pending.length)}
                  </T>
                ) : undefined
              }
            />
            <T variant="sm" color="muted">
              لعرض سجل تكاليف كل مقرر وتقييماتها، افتح صفحة المقرّر من مقرّراتي.
            </T>
          </View>
        }
        emptyTitle="لا تكاليف بانتظارك"
        emptyMessage="ستظهر هنا التكليفات المستحقة فور إضافتها من أساتذة مقرّراتك."
        contentPadding={{ horizontal: 16, top: 12, bottom: 24 }}
        extraData={now}
      />

      {/* «تسليم» sheet — the shared honest submission flow. */}
      {target ? (
        <AssignSubmitSheet
          key={target.id}
          open={!!target}
          onClose={() => setTarget(null)}
          offeringId={pending.find((a) => a.id === target.id)?.offeringId ?? ""}
          assignment={target}
        />
      ) : null}
    </Screen>
  );
}

/* ── one assignment row ──────────────────────────────────────────────── */

const AssignmentRow = makeRow<
  AssignmentLike,
  { now: number; onSubmit: (a: AssignmentLike) => void }
>(({ item: a, now, onSubmit }) => {
  const p = usePalette();
  const status = assignmentStatus(a, now);
  const meta = STATUS_META[status];
  const due = dueLabel(a.dueAt);
  const countdown = dueCountdown(a.dueAt, now);
  const kindLabel = ASSIGNMENT_KIND_LABEL[a.type ?? ""] ?? a.type;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`تكليف: ${a.title}، ${meta.label}`}
      onPress={() => router.push(`/student/courses/${a.offeringId}` as never)}
      style={({ pressed }) => ({
        minHeight: 72,
        justifyContent: "center",
        paddingHorizontal: sp[4],
        paddingVertical: sp[10],
        backgroundColor: pressed ? p.surfaceHover : "transparent",
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
        gap: 4,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="bold" numberOfLines={1}>
            {a.title}
          </T>
          <T variant="sm" color="muted" numberOfLines={1}>
            {`${kindLabel ? `${kindLabel} · ` : ""}${a.courseCode ?? ""}`}
          </T>
        </View>
        <Badge label={due.text} tone={due.overdue ? "rose" : "yellow"} />
        <Badge label={meta.label} tone={meta.tone} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        {countdown ? (
          <T variant="xs" color={status === "late" ? "danger" : "faint"}>
            {countdown}
          </T>
        ) : null}
        <View style={{ flex: 1 }} />
        <Button
          label="تسليم"
          kind="accent"
          small
          onPress={() => onSubmit(a)}
          icon={<Send size={14} color={p.accentFg} />}
          accessibilityLabel={`تسليم ${a.title}`}
        />
      </View>
    </Pressable>
  );
});
