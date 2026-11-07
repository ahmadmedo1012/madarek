import { memo, useCallback, useMemo, type ReactElement, type ReactNode } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type FlatListProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { FlashList, type FlashListProps, type RenderTarget } from "@shopify/flash-list";
import { useInfiniteQuery, type InfiniteData, type UseInfiniteQueryResult } from "@tanstack/react-query";
import { usePalette } from "@/design/theme";
import { sp, type Spacing } from "@/design/tokens";
import { latn, num } from "@/lib/format";
import type { PageMeta, Paginated } from "@/api/types";
import { T } from "./text";
import { EmptyState, ErrorState, Refreshable, Skeleton, SkeletonList } from "./states";

/** StatLine — mono drafting metric row: label · value. */
export function StatLine({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number | null | undefined;
  hint?: string | null;
  tone?: "accent" | "danger" | "gold";
}) {
  const p = usePalette();
  const color =
    tone === "accent" ? p.accentInk : tone === "gold" ? p.goldInk : tone === "danger" ? p.accentInk : p.text;
  return (
    <View style={{ minHeight: 44, justifyContent: "center", paddingVertical: sp[6] }}>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <T variant="sm" color="muted">
            {label}
          </T>
        </View>
        <T variant="bodyLg" weight="bold" style={{ color }}>
          {typeof value === "number" ? latn(value) : (value ?? "—")}
        </T>
      </View>
      {hint ? (
        <T variant="sm" color="faint">
          {hint}
        </T>
      ) : null}
    </View>
  );
}

/** KPI card — square metric slab for dashboards. */
export function KpiCard({
  label,
  value,
  suffix,
  tone,
  style,
}: {
  label: string;
  value: string | number | null | undefined;
  suffix?: string;
  tone?: "accent" | "gold";
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  return (
    <View
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
        <T
          variant="h3"
          weight="bold"
          style={{ color: tone === "accent" ? p.accentInk : tone === "gold" ? p.goldInk : p.text }}
        >
          {typeof value === "number" ? num(value) : (value ?? "—")}
        </T>
        {suffix ? (
          <T variant="sm" color="muted">
            {suffix}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/** Hairline progress bar (Heron: ink bar + hairline track). */
export function ProgressBar({
  ratio,
  height = 4,
  accent,
  label,
}: {
  ratio: number;
  height?: number;
  accent?: boolean;
  label?: string;
}) {
  const p = usePalette();
  const w = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
  return (
    <View accessibilityLabel={label} style={{ height, backgroundColor: p.border, overflow: "hidden" }}>
      <View
        style={{
          height,
          width: `${w * 100}%`,
          backgroundColor: accent ? p.accent : p.primary,
        }}
      />
    </View>
  );
}

/** Initials avatar — circle (the one Heron round primitive). */
export function Avatar({
  initials,
  color,
  size = 44,
}: {
  initials: string;
  color?: string | null;
  size?: number;
}) {
  const p = usePalette();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? p.accentSoft,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.rule,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <T variant="sm" weight="bold" style={{ color: color ? p.accentFg : p.text }}>
        {initials}
      </T>
    </View>
  );
}

/** RowList — bordered ledger of rows separated by hairlines. */
export function RowList({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View style={[{ borderWidth: StyleSheet.hairlineWidth, borderColor: p.border, backgroundColor: p.surface }, style]}>
      {children}
    </View>
  );
}

/** LedgerRow — one row inside a RowList (hairline separated, optional press). */
export function LedgerRow({
  children,
  onPress,
  accessibilityLabel,
  last,
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const base: StyleProp<ViewStyle> = [
    {
      paddingHorizontal: sp[16],
      paddingVertical: sp[12],
      minHeight: 48,
      gap: sp[4],
      borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
      borderColor: p.border,
    },
    style,
  ];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, { backgroundColor: pressed ? p.surfaceHover : "transparent" }]}
    >
      {children}
    </Pressable>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * R334 B4 — DataList: the ONE generic list (FlashList v2 behind a
 * screen-shaped API), plus makeRow + usePagedList. Everything above is
 * the pre-existing ledger vocabulary, kept byte-compatible: ~90 screens
 * import StatLine/KpiCard/ProgressBar/Avatar/RowList/LedgerRow today.
 *
 * Platform notes (verified against @shopify/flash-list 2.3.2 dist):
 *   · v2 needs NO estimatedItemSize (auto item sizing).
 *   · v2 is new-arch only — and `isNewArch` returns TRUE on web, where
 *     the recycler runs as pure JS. It mounts, but sticky-header rides
 *     Animated with useNativeDriver (unsupported on RN-web) and the
 *     recycling win is marginal for our row counts. CONSERVATIVE CALL:
 *     DataList renders a FlatList fallback on web behind the SAME API
 *     (see docs/mobile/foundations/lists.md §web).
 *   · Sticky section headers ARE supported natively (v2.3+): headers
 *     are ordinary data items; pass `stickyHeaderIndices` and read
 *     `target === "StickyHeader"` in renderItem. Horizontal lists throw.
 * ══════════════════════════════════════════════════════════════════════ */

/** Row render info handed to DataList rows (FlashList v2 shape, minus noise). */
export interface DataListRenderItemInfo<T> {
  item: T;
  index: number;
  /**
   * Why the row is rendering: "Cell" (visible row), "StickyHeader" (the
   * item is currently pinned — restyle it, e.g. solid ground), or
   * "Measurement" (invisible size probe — keep it cheap and honest).
   */
  target: RenderTarget;
}

export type DataListRenderItem<T> = (info: DataListRenderItemInfo<T>) => ReactElement | null;

/** contentContainer padding helpers — Spacing keys (2…240) from the sp ladder. */
export interface DataListContentPadding {
  horizontal?: Spacing;
  top?: Spacing;
  bottom?: Spacing;
}

export interface DataListProps<T> {
  /** Rows. `null`/`undefined` tolerated while the first page loads. */
  data: readonly T[] | null | undefined;
  renderItem: DataListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  /** Change this when renderItem depends on more than `item` (FlashList is a PureComponent). */
  extraData?: unknown;

  /* ── first-load states — default to the existing states.tsx exports ── */
  /** First page in flight and nothing cached → SkeletonList (states.tsx). */
  isLoading?: boolean;
  /** First page failed and nothing cached → ErrorState + onRetry (states.tsx). */
  isError?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Slot overrides for the three states above (components or elements). */
  loadingSlot?: ReactNode;
  errorSlot?: ReactNode;
  emptySlot?: ReactNode;
  /** Generic Arabic empty copy; screens should pass their own honest line. */
  emptyTitle?: string;
  emptyMessage?: string;

  /* ── pull-to-refresh (TanStack Query: `refetch` / `isRefetching`) ──── */
  refetch?: () => void;
  isRefetching?: boolean;

  /* ── pagination (TanStack Query: useInfiniteQuery / usePagedList) ──── */
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
  /** Truthy → compact error footer with a retry; string → shown as the message. */
  loadMoreError?: string | boolean | null;
  onRetryLoadMore?: () => void;

  /* ── sticky section headers (FlashList v2: headers are data items) ── */
  /** Indices into `data` that pin to the top while scrolling. */
  stickyHeaderIndices?: readonly number[];
  /** Gap between the list top and where headers pin (e.g. below a fixed bar). */
  stickyHeaderOffset?: number;

  /* ── layout ────────────────────────────────────────────────────────── */
  contentPadding?: DataListContentPadding;
  /** Heron is Arabic-first: content direction defaults to RTL. */
  rtl?: boolean;

  /* ── FlatList view windowing (M5) ────────────────────────────────── */
  /**
   * View-window tuning for the WEB FlatList fallback. Native FlashList
   * v2 recycles views and takes no window knobs, so this only shapes the
   * fallback — but both engines keep the FULL data and mount a bounded
   * window of rows (the M5 witness in data.test.tsx: 10 of 1000 rows).
   * Values mirror FlatListProps (initialNumToRender defaults to 10,
   * windowSize to 21 when omitted).
   */
  windowing?: {
    initialNumToRender?: number;
    maxToRenderPerBatch?: number;
    windowSize?: number;
    updateCellsBatchingPeriod?: number;
  };

  /* ── FlashList passthroughs ────────────────────────────────────────── */
  ListHeaderComponent?: FlashListProps<T>["ListHeaderComponent"];
  ItemSeparatorComponent?: FlashListProps<T>["ItemSeparatorComponent"];

  style?: StyleProp<ViewStyle>;
  /** Extra styles merged into the content container (after padding + RTL). */
  contentStyle?: StyleProp<ViewStyle>;
  /** Extra ScrollView props (keyboardShouldPersistTaps, nestedScrollEnabled…). */
  scrollProps?: Partial<ScrollViewProps>;
  testID?: string;
}

/** «جارٍ تحميل المزيد…» — the pagination footer loader (pulse line, no spinner). */
function LoadMoreFooter() {
  return (
    <View style={{ paddingVertical: sp[16], alignItems: "center", gap: sp[8] }}>
      <T variant="xs" color="faint">جارٍ تحميل المزيد…</T>
      <Skeleton w={120} h={8} />
    </View>
  );
}

const RTL_CONTENT: ViewStyle = { direction: "rtl" };

/**
 * DataList — the generic virtualized list on FlashList v2 (FlatList on
 * web). Owns the whole screen body: first-load tri-state (SkeletonList /
 * ErrorState / EmptyState — the SAME states.tsx exports screens use
 * inline today), pull-to-refresh, accumulate-style pagination with an
 * honest loading footer + retry footer, and sticky section headers.
 *
 * Mount it inside a parent with a bounded height (`flex: 1`); it does
 * not nest inside `<Screen scroll>` — DataList IS the scroller.
 */
export function DataList<T>(props: DataListProps<T>) {
  const p = usePalette();
  const {
    data,
    renderItem,
    keyExtractor,
    extraData,
    isLoading,
    isError,
    errorMessage,
    onRetry,
    loadingSlot,
    errorSlot,
    emptySlot,
    emptyTitle,
    emptyMessage,
    refetch,
    isRefetching,
    onEndReached,
    onEndReachedThreshold,
    isFetchingNextPage,
    hasNextPage,
    loadMoreError,
    onRetryLoadMore,
    stickyHeaderIndices,
    stickyHeaderOffset,
    contentPadding,
    rtl = true,
    windowing,
    ListHeaderComponent,
    ItemSeparatorComponent,
    style,
    contentStyle,
    scrollProps,
    testID,
  } = props;

  const rows = data ?? [];
  const padX = contentPadding?.horizontal !== undefined ? sp[contentPadding.horizontal] : undefined;

  /* ── first-load tri-state (rows empty) — mirrors every screen today ── */
  if (isLoading && rows.length === 0) {
    return (
      <View style={[{ paddingHorizontal: padX ?? sp[16], paddingTop: sp[8] }, style]} testID={testID}>
        {loadingSlot ?? <SkeletonList rows={6} />}
      </View>
    );
  }
  if (isError && rows.length === 0) {
    return (
      <View style={[{ paddingHorizontal: padX ?? sp[16], paddingTop: sp[8] }, style]} testID={testID}>
        {errorSlot ?? <ErrorState message={errorMessage ?? undefined} onRetry={onRetry} />}
      </View>
    );
  }
  if (rows.length === 0) {
    const empty =
      emptySlot ?? <EmptyState title={emptyTitle ?? "لا توجد بيانات بعد"} message={emptyMessage} />;
    if (!refetch) {
      return (
        <View style={[{ paddingHorizontal: padX ?? sp[16] }, style]} testID={testID}>
          {empty}
        </View>
      );
    }
    // Empty + refreshable: the pull gesture still works (the wrapper is
    // states.tsx `Refreshable`, reused as-is).
    return (
      <View style={[{ flex: 1 }, style]} testID={testID}>
        <Refreshable refreshing={!!isRefetching} onRefresh={refetch}>
          {empty}
        </Refreshable>
      </View>
    );
  }

  /* ── the list itself ────────────────────────────────────────────────── */
  const refreshControl = refetch ? (
    <RefreshControl refreshing={!!isRefetching} onRefresh={refetch} tintColor={p.accent} colors={[p.accent]} />
  ) : undefined;

  const footer: FlashListProps<T>["ListFooterComponent"] =
    loadMoreError ? (
      <View style={{ paddingVertical: sp[8] }}>
        <ErrorState
          compact
          message={typeof loadMoreError === "string" ? loadMoreError : undefined}
          onRetry={onRetryLoadMore ?? onEndReached}
        />
      </View>
    ) : isFetchingNextPage ? (
      <LoadMoreFooter />
    ) : undefined;

  const contentContainerStyle: StyleProp<ViewStyle> = [
    /* T-50 (review-3 P0-2): the list body grows to the viewport so a
       filling EmptyState can optically center instead of top-sticking.
       No effect on populated lists (content already exceeds viewport). */
    { flexGrow: 1 },
    padX !== undefined ? { paddingHorizontal: padX } : null,
    contentPadding?.top !== undefined ? { paddingTop: sp[contentPadding.top] } : null,
    contentPadding?.bottom !== undefined ? { paddingBottom: sp[contentPadding.bottom] } : null,
    rtl ? RTL_CONTENT : null,
    contentStyle,
  ];

  /* Web: same API over FlatList (see header notes + docs §web). */
  if (Platform.OS === "web") {
    return (
      <FlatList
        data={rows}
        renderItem={(info) => renderItem({ item: info.item, index: info.index, target: "Cell" })}
        keyExtractor={keyExtractor}
        extraData={extraData}
        initialNumToRender={windowing?.initialNumToRender}
        maxToRenderPerBatch={windowing?.maxToRenderPerBatch}
        windowSize={windowing?.windowSize}
        updateCellsBatchingPeriod={windowing?.updateCellsBatchingPeriod}
        refreshControl={refreshControl}
        onEndReached={hasNextPage === false ? undefined : onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        ListHeaderComponent={ListHeaderComponent as FlatListProps<T>["ListHeaderComponent"]}
        ListFooterComponent={footer}
        ItemSeparatorComponent={ItemSeparatorComponent as FlatListProps<T>["ItemSeparatorComponent"]}
        stickyHeaderIndices={stickyHeaderIndices ? [...stickyHeaderIndices] : undefined}
        contentContainerStyle={contentContainerStyle}
        style={style}
        testID={testID}
        {...scrollProps}
      />
    );
  }

  return (
    <FlashList
      data={rows}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      extraData={extraData}
      refreshControl={refreshControl}
      onEndReached={hasNextPage === false ? undefined : onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={footer}
      ItemSeparatorComponent={ItemSeparatorComponent}
      stickyHeaderIndices={stickyHeaderIndices}
      stickyHeaderConfig={
        stickyHeaderIndices
          ? {
              offset: stickyHeaderOffset ?? 0,
              // This branch only runs on native (web short-circuits to the
              // FlatList fallback above) — native scroll driver it is.
              useNativeDriver: true,
            }
          : undefined
      }
      contentContainerStyle={contentContainerStyle}
      style={style}
      testID={testID}
      {...scrollProps}
    />
  );
}

/**
 * makeRow — memoized row factory for DataList rows.
 *
 * STABILITY CONTRACT (why rows get slow without this):
 *   1. Call at MODULE scope, never inside a component — the wrapped
 *      component's identity must stay stable across renders.
 *   2. `item` identity comes from the TanStack Query cache: referentially
 *      stable between renders unless the data actually changed.
 *   3. Extra props must be stable too: `useCallback` handlers or
 *      module-scope functions. A fresh arrow in a render body defeats
 *      the memo on EVERY parent render — the classic silent regression.
 *   4. Keep the row pure: everything it renders comes from `item` +
 *      extras. Derived state belongs in the row or in usePagedList.
 *
 * ```tsx
 * const CourseRow = makeRow<Course>(({ item }) => (
 *   <LedgerRow accessibilityLabel={`مقرّر ${item.name}`}>…</LedgerRow>
 * ));
 * ```
 */
export function makeRow<TItem, TExtra extends object = Record<string, unknown>>(
  Row: (props: { item: TItem } & TExtra) => ReactElement | null,
) {
  return memo(Row);
}

/* ── usePagedList — the DataList pagination adapter ──────────────────── */

/** One normalized page: rows + the backend's page meta (when it sends one). */
export interface PagedPage<T> {
  rows: T[];
  meta: PageMeta | null;
}

export interface UsePagedListOptions<T> {
  /** TanStack key — include every input (scope, filters) as screens do today. */
  queryKey: readonly unknown[];
  /** Page fetcher over the existing api/* transport: `getPage(...)`/`get(...)` shapes both normalize. */
  fetchPage: (page: number) => Promise<Paginated<T> | T[]>;
  /** Page size — the hasNext fallback when an endpoint returns no meta. Default 20. */
  limit?: number;
  enabled?: boolean;
  staleTime?: number;
}

export interface UsePagedListResult<T> {
  /** Flattened rows across every loaded page — feed straight to DataList `data`. */
  items: T[];
  meta: PageMeta | null;
  /** Pages loaded so far (1 after first load). */
  page: number;
  totalPages: number;
  total: number;
  isLoading: boolean;
  /**
   * TanStack v5 passthrough: true after ANY failed fetch — including a
   * failed next page (cached pages stay in `items`; `loadMoreError` marks
   * the direction). DataList gates its full-screen ErrorState on
   * `isError && rows.length === 0`, so a next-page failure with rows on
   * screen renders the compact retry footer, never a blank error page.
   */
  isError: boolean;
  errorMessage: string | null;
  refetch: () => void;
  isRefetching: boolean;
  /** DataList `onEndReached` — guarded (no double-fire, no fire while a page loads). */
  onEndReached: () => void;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  /** Arabic message when the NEXT page failed (previous rows stay on screen). */
  loadMoreError: string | null;
  retryLoadMore: () => void;
  /** Raw TanStack result for advanced cases (invalidation, mutations). */
  query: UseInfiniteQueryResult<InfiniteData<PagedPage<T>, number>, Error>;
}

async function normalizePage<T>(res: Paginated<T> | T[]): Promise<PagedPage<T>> {
  if (Array.isArray(res)) return { rows: res, meta: null };
  return { rows: res.data ?? [], meta: res.meta ?? null };
}

/**
 * usePagedList — thin adapter from `useInfiniteQuery` to DataList's
 * pagination contract, aligned with the house query patterns
 * (placeholderData keeps the previous list while a filter key changes).
 *
 * ```tsx
 * const list = usePagedList({
 *   queryKey: ["admin", "users", { role: "STUDENT" }, scope],
 *   fetchPage: (page) => getPage("/users", { page, limit: 20, role: "STUDENT" }),
 * });
 * <DataList
 *   data={list.items} renderItem={UserRow} keyExtractor={(u) => u.id}
 *   isLoading={list.isLoading} isError={list.isError} errorMessage={list.errorMessage}
 *   onRetry={() => list.refetch()} refetch={list.refetch} isRefetching={list.isRefetching}
 *   onEndReached={list.onEndReached} isFetchingNextPage={list.isFetchingNextPage}
 *   hasNextPage={list.hasNextPage} loadMoreError={list.loadMoreError}
 *   onRetryLoadMore={list.retryLoadMore}
 * />
 * ```
 */
export function usePagedList<T>(opts: UsePagedListOptions<T>): UsePagedListResult<T> {
  const limit = opts.limit ?? 20;
  const query = useInfiniteQuery<PagedPage<T>, Error, InfiniteData<PagedPage<T>, number>, readonly unknown[], number>({
    queryKey: opts.queryKey,
    queryFn: async ({ pageParam }) => normalizePage(await opts.fetchPage(pageParam)),
    initialPageParam: 1,
    getNextPageParam: (last, all) => {
      const next = all.length + 1;
      if (last.meta) return next <= last.meta.totalPages ? next : undefined;
      // No meta: assume another full page might exist (honest guess; an
      // empty next page simply ends the list).
      return last.rows.length >= limit ? next : undefined;
    },
    enabled: opts.enabled,
    staleTime: opts.staleTime,
    placeholderData: (prev) => prev,
  });

  const items = useMemo(() => (query.data?.pages ?? []).flatMap((page) => page.rows), [query.data]);
  const lastPage = query.data?.pages.length ? query.data.pages[query.data.pages.length - 1] : null;
  const err = query.error instanceof Error ? query.error : null;

  // TanStack v5 hands back stable fetchNextPage/refetch identities; the
  // booleans flip as the query state moves. Destructuring lets the
  // callbacks below depend on exactly the fields they read — no whole
  // `query` dep that would re-create them on every render.
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage, refetch: refetchQuery } = query;

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  const retryLoadMore = useCallback(() => {
    void fetchNextPage();
  }, [fetchNextPage]);

  const refetch = useCallback(() => {
    void refetchQuery();
  }, [refetchQuery]);

  return {
    items,
    meta: lastPage?.meta ?? null,
    page: query.data?.pages.length ?? 0,
    totalPages: lastPage?.meta?.totalPages ?? 1,
    total: lastPage?.meta?.total ?? items.length,
    isLoading: query.isLoading,
    isError: query.isError,
    errorMessage: query.isError ? (err?.message ?? null) : null,
    refetch,
    isRefetching: query.isRefetching,
    onEndReached,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage,
    loadMoreError: query.isFetchNextPageError ? (err?.message ?? "تعذّر تحميل المزيد.") : null,
    retryLoadMore,
    query,
  };
}
