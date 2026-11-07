import { useState } from "react";
import { View } from "react-native";
import { humanizeError } from "@/lib/errors";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, PageHeader } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Sheet } from "@/components/ui/surfaces";
import { DataList, LedgerRow, makeRow, usePagedList } from "@/components/ui/data";
import { ownerApi } from "@/api/owner";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { dateTime, fromNow } from "@/lib/format";
import {
  auditActionLabel,
  groupByDay,
  pageOf,
  resourceLabel,
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
  const feed = usePagedList<AuditRow>({
    queryKey: ["owner", "activity", PAGE_LIMIT],
    fetchPage: (page) =>
      ownerApi
        .activity(page, PAGE_LIMIT)
        .then((res) => pageOf<AuditRow>(res))
        // Defensive meta: only when the payload carried a real totalPages
        // (the route always sends one); otherwise bare rows and the honest
        // full-page guess in usePagedList.getNextPageParam. Never a
        // fabricated total.
        .then((slice) => {
          const m = slice.meta;
          return m && typeof m.totalPages === "number"
            ? {
                data: slice.rows,
                meta: {
                  page: m.page ?? page,
                  limit: m.limit ?? PAGE_LIMIT,
                  total: m.total ?? slice.rows.length,
                  totalPages: m.totalPages,
                },
              }
            : slice.rows;
        }),
    limit: PAGE_LIMIT,
  });
  const [detail, setDetail] = useState<AuditRow | null>(null);

  const rows = feed.items;
  const sections = groupByDay(rows, (r) => r.createdAt);
  const items: (AuditRow | string)[] = sections.flatMap((sec) => [sec.day, ...sec.rows]);

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="سجلّ النشاط والمراقبة" kicker="لوحة المالك" />
      <View style={{ paddingHorizontal: sp[20], gap: sp[16], paddingTop: sp[16] }}>
        <PageHeader title="سجلّ النشاط والمراقبة" kicker="جميع العمليّات المنفَّذة على المنصّة — حيّة من سجلّ التدقيق" />
      </View>
      <View style={{ flex: 1 }}>
        <DataList
          data={items}
          renderItem={({ item }) =>
            typeof item === "string" ? <DayHeader day={item} /> : <AuditEventRow item={item} onSelect={setDetail} />
          }
          keyExtractor={(item, i) => (typeof item === "string" ? `day-${item}-${i}` : item.id)}
          isLoading={feed.isLoading}
          isError={feed.isError}
          errorMessage={humanizeError(feed.query.error)}
          onRetry={() => feed.refetch()}
          refetch={feed.refetch}
          isRefetching={feed.isRefetching}
          onEndReached={feed.onEndReached}
          isFetchingNextPage={feed.isFetchingNextPage}
          hasNextPage={feed.hasNextPage}
          loadMoreError={feed.loadMoreError}
          onRetryLoadMore={feed.retryLoadMore}
          emptyTitle="لا توجد أحداث مسجَّلة بعد"
          emptyMessage="تُسجَّل الأحداث تلقائياً فور أول عمليّة على المنصّة."
          contentPadding={{ horizontal: 20, bottom: 24 }}
        />
      </View>

      {detail ? <AuditDetailSheet event={detail} onClose={() => setDetail(null)} /> : null}
    </Screen>
  );
}

/* ─── day header + event row (module scope, memo-stable) ─── */

function DayHeader({ day }: { day: string }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="header"
      style={{ paddingVertical: sp[8], borderBottomWidth: 1, borderBottomColor: p.border }}
    >
      <T variant="sm" weight="bold" color="muted">
        {day}
      </T>
    </View>
  );
}

const AuditEventRow = makeRow<AuditRow, { onSelect: (row: AuditRow) => void }>(
  ({ item, onSelect }) => {
    const summary = metadataSummary(item.metadata);
    return (
      <LedgerRow
        onPress={() => onSelect(item)}
        accessibilityLabel={`${auditActionLabel(item.action)} — التفاصيل`}
      >
        <T variant="body" weight="medium">
          {auditActionLabel(item.action)}
        </T>
        <T variant="xs" color="muted" numberOfLines={1}>
          {item.user
            ? `${`${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() || "النظام"}${item.user.email ? ` · ${item.user.email}` : ""}`
            : "النظام"}
          {item.resourceType ? ` · ${resourceLabel(item.resourceType)}` : ""} · {fromNow(item.createdAt)}
        </T>
        {summary ? (
          <T variant="xs" color="faint" numberOfLines={1}>
            {summary}
          </T>
        ) : null}
      </LedgerRow>
    );
  },
);

/* ─── tap-to-detail sheet: the full audit record ─── */

function AuditDetailSheet({ event, onClose }: { event: AuditRow; onClose: () => void }) {
  const actor = event.user
    ? `${event.user.firstName ?? ""} ${event.user.lastName ?? ""}`.trim() || "النظام"
    : "النظام";
  return (
    <Sheet open onClose={onClose} title="تفاصيل الحدث">
      <View style={{ gap: 12 }}>
        <T variant="h4" weight="bold">
          {auditActionLabel(event.action)}
        </T>
        <T variant="sm" color="muted">
          {actor}
          {event.user?.email ? ` · ${event.user.email}` : ""}
        </T>
        <T variant="sm" color="muted">
          {dateTime(event.createdAt)} · {fromNow(event.createdAt)}
        </T>
        {event.resourceType ? (
          <T variant="sm" color="muted">
            المورد: {resourceLabel(event.resourceType)}
            {event.resourceId ? ` · ${event.resourceId}` : ""}
          </T>
        ) : null}
        <T variant="sm" weight="bold">
          البيانات المرفقة
        </T>
        {event.metadata === null || event.metadata === undefined ? (
          <T variant="sm" color="faint">
            لا بيانات إضافية مسجَّلة لهذا الحدث.
          </T>
        ) : (
          <T variant="monoSm" color="muted" style={{ textAlign: "left" }}>
            {safeJson(event.metadata)}
          </T>
        )}
        <T variant="xs" color="faint">
          المعرف التقني للحدث يُحفظ في سجلّ التدقيق للمراجعة الفنية عند الحاجة.
        </T>
      </View>
    </Sheet>
  );
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2) ?? "—";
  } catch {
    return textOf(value);
  }
}
