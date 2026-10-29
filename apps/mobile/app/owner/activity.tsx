import { useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { ownerApi } from "@/api/owner";
import { dateTime } from "@/lib/format";
import {
  PagerFooter,
  RESOURCE_LABEL,
  UNIT,
  auditActionLabel,
  pageOf,
  textOf,
  type AuditRow,
} from "@/features/governance/components";

const PAGE_LIMIT = 30;

/** Honest metadata summary: label the first entries, skip nulls — never a
 *  fabricated value; deeper structure collapses to its JSON text. */
function metadataSummary(metadata: unknown): string | null {
  if (metadata === null || metadata === undefined) return null;
  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    const entries = Object.entries(metadata as Record<string, unknown>).filter(
      ([, v]) => v !== null && v !== undefined,
    );
    if (entries.length === 0) return null;
    return entries
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${typeof v === "object" ? "…" : textOf(v)}`)
      .join(" · ");
  }
  return textOf(metadata);
}

/**
 * Pushed: /owner/activity — «سجلّ النشاط والمراقبة» (web OwnerActivityPage
 * parity): the platform audit trail, paginated — action as a mono chip
 * with its Arabic label, the actor, an exact timestamp, and an honest
 * metadata summary per event.
 */
export default function OwnerActivity() {
  const [page, setPage] = useState(1);

  const feed = useQuery({
    queryKey: ["owner", "activity", page, PAGE_LIMIT],
    queryFn: async () => pageOf<AuditRow>(await ownerApi.activity(page, PAGE_LIMIT)),
    placeholderData: (prev) => prev,
  });

  const rows = feed.data?.rows ?? [];

  return (
    <Screen scroll>
      <StackHeader title="سجلّ النشاط والمراقبة" kicker="لوحة المالك" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            سجلّ النشاط والمراقبة
          </T>
          <T variant="body" color="muted">
            جميع العمليّات المنفَّذة على المنصّة — حيّة من سجلّ التدقيق
          </T>
        </View>

        <SectionBar index={1} title="سجلّ الأحداث" />

        {feed.isLoading ? (
          <SkeletonList rows={7} />
        ) : feed.isError ? (
          <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا توجد أحداث مسجَّلة بعد"
            message="تُسجَّل الأحداث تلقائياً فور أول عمليّة على المنصّة."
            actionLabel="تحديث السجلّ"
            onAction={() => feed.refetch()}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <RowList>
              {rows.map((ev, i) => {
                const summary = metadataSummary(ev.metadata);
                return (
                  <LedgerRow key={ev.id} last={i === rows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Badge label={ev.action} tone="grey" mono />
                      <T variant="xs" color="faint">
                        {dateTime(ev.createdAt)}
                      </T>
                    </View>
                    <T variant="body" weight="medium">
                      {auditActionLabel(ev.action)}
                    </T>
                    <T variant="xs" color="muted" numberOfLines={1}>
                      {ev.user
                        ? `${`${ev.user.firstName ?? ""} ${ev.user.lastName ?? ""}`.trim() || "النظام"}${ev.user.email ? ` · ${ev.user.email}` : ""}`
                        : "النظام"}
                      {ev.resourceType ? ` · ${RESOURCE_LABEL[ev.resourceType] ?? ev.resourceType}` : ""}
                    </T>
                    {summary ? (
                      <T variant="xs" color="faint" numberOfLines={2}>
                        {summary}
                      </T>
                    ) : null}
                  </LedgerRow>
                );
              })}
            </RowList>
            <PagerFooter
              page={page}
              rowsLength={rows.length}
              limit={PAGE_LIMIT}
              meta={feed.data?.meta ?? null}
              unit={UNIT.event}
              onPage={setPage}
              loading={feed.isFetching}
            />
          </View>
        )}
      </View>
    </Screen>
  );
}
