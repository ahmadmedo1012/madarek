/**
 * /student/assignments — التكاليف (cross-offering pending list, web
 * CoursesPage «الواجبات القادمة» contract): the dashboard agenda's
 * overdue-aware pending assignments, each with the direct «تسليم»
 * sheet. Submission history lives in each course's detail page — the
 * honest note below says so.
 */
import { View } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react-native";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { dueLabel } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { AssignSubmitSheet, PushFrame, type SubmitTarget } from "@/features/student/components";

const ASSIGNMENT_KIND_LABEL: Record<string, string> = {
  HOMEWORK: "واجب",
  QUIZ: "اختبار قصير",
  PROJECT: "مشروع",
  EXAM: "اختبار",
};


type AssignmentLike = { id: string; offeringId: string; courseCode?: string; title: string; dueAt: string | null; overdue?: boolean; type?: string };

export default function AssignmentsScreen() {
  const scope = useInstitutionScope();
  const p = usePalette();
  const feed = useQuery({
    queryKey: ["me", "dashboard", scope],
    queryFn: () => studentApi.dashboard(),
  });

  const pending = feed.data?.agenda.assignments ?? [];
  const [target, setTarget] = useState<SubmitTarget | null>(null);

  return (
    <PushFrame
      title="التكاليف"
      kicker="واجباتك المستحقة فعلياً ولم تُسلّمها بعد"
      refreshing={feed.isFetching && !feed.isLoading}
      onRefresh={() => feed.refetch()}
    >
      <SectionBar
        index={1}
        title="تكليفات معلّقة"
        action={
          pending.length > 0 ? (
            <T variant="xs" color="muted">
              {`${pending.length}`}
            </T>
          ) : undefined
        }
      />

      {feed.isLoading ? (
        <SkeletonList rows={4} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : pending.length === 0 ? (
        <EmptyState
          title="لا تكاليف بانتظارك"
          message="ستظهر هنا التكليفات المستحقة فور إضافتها من أساتذة مقرّراتك."
        />
      ) : (
        <View style={{ gap: sp[8] }}>
          <RowList>
            {pending.map((a, i) => {
              const due = dueLabel(a.dueAt);
              const kindLabel = ASSIGNMENT_KIND_LABEL[(a as AssignmentLike).type ?? ""] ?? (a as AssignmentLike).type;
              return (
                <LedgerRow
                  key={a.id}
                  last={i === pending.length - 1}
                  accessibilityLabel={`تكليف: ${a.title}`}
                  onPress={() => router.push(`/student/courses/${a.offeringId}` as never)}
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
                  </View>
                  <View style={{ flexDirection: "row", gap: sp[8], alignSelf: "flex-start" }}>
                    <Button
                      label="تسليم"
                      kind="accent"
                      small
                      onPress={() =>
                        setTarget({
                          id: a.id,
                          title: a.title,
                          dueAt: a.dueAt,
                          type: (a as AssignmentLike).type,
                          courseName: a.courseCode ?? undefined,
                        })
                      }
                      icon={<Send size={14} color={p.accentFg} />}
                      accessibilityLabel={`تسليم ${a.title}`}
                    />
                  </View>
                </LedgerRow>
              );
            })}
          </RowList>
          <T variant="xs" color="faint">
            {countAr(pending.length, ["تكليف واحد معلّق", "تكليفان معلّقان", "تكليفات معلّقة", "تكليفاً معلّقاً"])}
          </T>
        </View>
      )}

      <T variant="sm" color="muted">
        لعرض سجل تكاليف كل مقرر وتقييماتها، افتح صفحة المقرّر من مقرّراتي.
      </T>

      {target ? (
        <AssignSubmitSheet
          open={!!target}
          onClose={() => setTarget(null)}
          offeringId={feed.data?.agenda.assignments.find((a) => a.id === target.id)?.offeringId ?? ""}
          assignment={target}
        />
      ) : null}
    </PushFrame>
  );
}
