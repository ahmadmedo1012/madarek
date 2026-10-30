import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, Sparkles } from "lucide-react-native";
import { socialApi } from "@/api/social";
import type { Competition } from "@/api/types";
import { ApiError } from "@/api/client";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { dueLabel, fromNow, latn } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge, Card, Sheet } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { StackHeader } from "@/components/shell/AppTopBar";
import { SignInPrompt, apiMessage, competitionStatus, isUnauthError, submissionEnded } from "@/features/common/components";

interface EntryRow {
  id: string;
  title: string;
  body?: string | null;
  score?: number | null;
  user?: { firstName: string; lastName: string } | null;
  submittedAt?: string | null;
}

/**
 * /competitions/[id] — competition detail: hero facts, my entry card, the
 * «المشاركة» sheet (students may enter while OPEN), entries list with
 * scores shown WHEN PRESENT. Scoring is admin/organizer-only on the
 * backend and its capability is unknown to this client — so NO score
 * controls render here, ever (honest: we don't guess permissions).
 * Web twin: CompetitionDetailPage.
 */
export default function CompetitionDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [entering, setEntering] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const q = useQuery({
    queryKey: ["competitions", params.id, scope],
    queryFn: () => socialApi.competition(params.id),
    enabled: !!params.id,
  });

  const enter = useMutation({
    mutationFn: () => socialApi.enterCompetition(params.id, { title: title.trim(), body: body.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["competitions"] });
      toast.success("وصلت مشاركتك — بالتوفيق!", "المشاركة");
      setEntering(false);
      setTitle("");
      setBody("");
    },
    onError: (e) => toast.error(apiMessage(e, "تعذّر تقديم المشاركة. تحقّق من البيانات وحاول مرة أخرى.")),
  });

  if (q.isLoading) {
    return (
      <Screen scroll>
        <StackHeader title="مسابقة" kicker="المسابقات الأكاديمية" />
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen scroll>
        <StackHeader title="مسابقة" kicker="المسابقات الأكاديمية" />
        {isUnauthError(q.error) ? (
          <SignInPrompt message="المسابقات تحتاج حسابًا — سجّل الدخول لعرضها والمشاركة فيها." />
        ) : (
          <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
        )}
      </Screen>
    );
  }
  if (!q.data) return null;

  const c = q.data;
  const ended = submissionEnded(c as Competition);
  const canEnter = c.status === "OPEN" && !ended;
  const st = competitionStatus(c.status);
  const due = dueLabel(c.deadline ?? null);
  const entries = (Array.isArray(c.entries) ? c.entries : []) as EntryRow[];
  const sortedEntries =
    c.status === "JUDGED"
      ? entries.slice().sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      : entries;

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("العنوان والوصف مطلوبان لتقديم المشاركة.");
      return;
    }
    enter.mutate();
  };

  return (
    <Screen scroll>
      <StackHeader title={c.title} kicker={c.category ?? "مسابقة"} />

      {/* Hero facts */}
      <View style={{ gap: sp[8], paddingBottom: sp[4] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          {ended ? <Badge label="انتهى التقديم" tone="yellow" /> : <Badge label={st.label} tone={st.tone} />}
          {c.prize ? <Badge label={`الجائزة: ${c.prize}`} tone="lavender" /> : null}
        </View>
        {c.description ? (
          <T variant="body" color="secondary">
            {c.description}
          </T>
        ) : null}
      </View>

      <Card style={{ paddingVertical: sp[4] }}>
        {c.deadline ? (
          <StatLine
            label="الموعد النهائي"
            value={due.text}
            hint={due.overdue ? "فات الموعد" : null}
            tone={due.overdue ? "danger" : undefined}
          />
        ) : null}
        <StatLine
          label="المشاركات"
          value={entries.length === 0 ? (canEnter ? "كن أوّل المشاركين" : "لا مشاركات") : latn(entries.length)}
        />
        {c.organizer ? (
          <StatLine
            label="المنظّم"
            value={`${c.organizer.firstName} ${c.organizer.lastName}`}
          />
        ) : null}
      </Card>

      {/* My entry card */}
      {c.myEntry ? (
        <Card style={{ gap: sp[6] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <Sparkles size={18} color={p.goldInk} />
            <T variant="body" weight="bold" style={{ flex: 1 }}>
              مشاركتي
            </T>
            {c.myEntry.score !== null && c.myEntry.score !== undefined ? (
              <Badge label={`نتيجتك: ${latn(c.myEntry.score)}/100`} tone="mint" />
            ) : (
              <Badge label="بانتظار التحكيم" tone="grey" />
            )}
          </View>
          <T variant="body" color="secondary">
            {c.myEntry.title}
          </T>
        </Card>
      ) : null}

      {/* Entry CTA — only while submissions are actually possible. */}
      {canEnter ? (
        <Button
          label={c.myEntry ? "تعديل مشاركتي" : "شارك الآن"}
          kind="primary"
          icon={<Send size={16} color={p.accentFg} />}
          onPress={() => setEntering(true)}
        />
      ) : null}

      {/* Entries list */}
      <T variant="h4" weight="bold">
        المشاركات
      </T>
      {entries.length === 0 ? (
        <EmptyState
          title="لم يشارك أحد بعد"
          message={canEnter ? "كن أوّل من يشارك!" : "انتهت مهلة التقديم على هذه المسابقة."}
          actionLabel={canEnter ? "قدّم مشاركتك" : undefined}
          onAction={canEnter ? () => setEntering(true) : undefined}
        />
      ) : (
        <>
          {c.status === "JUDGED" ? (
            <T variant="xs" color="faint">
              مرتَّبة حسب النتيجة
            </T>
          ) : (
            <T variant="xs" color="faint">
              يظهر العنوان فقط حتى يتمّ التحكيم
            </T>
          )}
          <RowList>
            {sortedEntries.map((e, i) => (
              <LedgerRow key={e.id} last={i === sortedEntries.length - 1} accessibilityLabel={e.title}>
                <View style={{ gap: sp[4] }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={2}>
                      {e.title}
                    </T>
                    {e.score !== null && e.score !== undefined ? (
                      <Badge label={`${latn(e.score)}/100`} tone={c.status === "JUDGED" ? "mint" : "sky"} />
                    ) : null}
                  </View>
                  {e.user ? (
                    <T variant="sm" color="muted">
                      {`${e.user.firstName} ${e.user.lastName}${e.submittedAt ? ` · ${fromNow(e.submittedAt)}` : ""}`}
                    </T>
                  ) : null}
                </View>
              </LedgerRow>
            ))}
          </RowList>
        </>
      )}

      {/* Scoring is admin-only on the backend and this client has no
          capability contract for it — no score controls are rendered. */}
      <T variant="xs" color="faint" style={{ textAlign: "center" }}>
        التحكيم يتمّ من منظّم المسابقة — تظهر النتائج هنا فور إعلانها.
      </T>

      <Sheet
        open={entering}
        onClose={() => setEntering(false)}
        title={c.myEntry ? "تعديل مشاركتي" : "تقديم مشاركة"}
        footer={
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            <View style={{ flex: 1 }}>
              <Button label="إلغاء" kind="ghost" onPress={() => setEntering(false)} small />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={enter.isPending ? "جارٍ الإرسال…" : "إرسال"}
                onPress={submit}
                loading={enter.isPending}
                small
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: sp[12] }}>
          <Field
            label="عنوان المشاركة"
            value={title}
            onChangeText={setTitle}
            placeholder="عنوان قصير لمشاركتك"
          />
          <Field
            label="الوصف / المحتوى"
            value={body}
            onChangeText={setBody}
            placeholder="اشرح مشاركتك…"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          {enter.isError ? (
            <T variant="sm" color="danger">
              {(enter.error as ApiError)?.message ?? "تعذّر تقديم المشاركة."}
            </T>
          ) : null}
        </View>
      </Sheet>
    </Screen>
  );
}
