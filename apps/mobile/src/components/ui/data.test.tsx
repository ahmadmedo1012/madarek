/**
 * R334 B4 — DataList / makeRow / usePagedList tests (colocated, RNTL 14).
 *
 * Verified HERE (jest-expo, platform=ios → the native FlashList path):
 *   · first-load tri-state defaults = the existing states.tsx exports
 *   · pull-to-refresh wiring (refreshControl ↔ refetch/isRefetching)
 *   · pagination wiring: onEndReached gating, loading footer, error
 *     footer retry, and the usePagedList accumulation contract
 *   · sticky header + RTL + padding passthroughs onto FlashList
 *   · the web FlatList fallback behind the same API (Platform override)
 *   · makeRow memo blocking re-renders on stable item props
 *   · backward-compat smoke: RowList/LedgerRow/Avatar still render
 *
 * Mechanism note: FlashList is wrapped by a spy (rendering the REAL
 * component) so the tests can read the exact props DataList hands it —
 * the DataList→FlashList contract. The web FlatList cannot be spied the
 * same way (spreading requireActual "react-native" detonates its lazy
 * TurboModule getters under jest), so the fallback is asserted through
 * what mounts: rows, footer copy, the RefreshControl fiber, zero
 * FlashLists. RNTL 14 removed getByType and host trees strip native
 * props, so host assertions walk `root.queryAll` / `unstable_fiber`.
 *
 * NOT verified here: real scroll physics, recycling on device, browser
 * output — no emulator in this sandbox (honesty label).
 */
import React, { act } from "react";
import { Platform, RefreshControl } from "react-native";
import { fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FlashListProps } from "@shopify/flash-list";
import type { Paginated } from "@/api/types";
import { Avatar, DataList, LedgerRow, makeRow, RowList, usePagedList } from "./data";
import { T } from "./text";

/* ── the FlashList prop capture (spy around the real component) ─────── */

const mockFlashListProps: FlashListProps<unknown>[] = [];

jest.mock("@shopify/flash-list", () => {
  const actual = jest.requireActual("@shopify/flash-list");
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- factory must load React lazily (jest hoists the mock above real imports)
  const React = require("react");
  const FlashListSpy = (props: FlashListProps<unknown>) => {
    mockFlashListProps.push(props);
    const Real = actual.FlashList;
    return <Real {...props} />;
  };
  return { ...actual, __esModule: true, FlashList: FlashListSpy };
});

/*
 * NOTE: react-native itself is NOT mocked — spreading requireActual
 * "react-native" forces every lazy export getter (DevMenu, Clipboard…)
 * and detonates the TurboModule registry under jest. The web-fallback
 * FlatList is asserted through what mounts: rows, footer copy, the
 * RefreshControl fiber, and the absence of any FlashList.
 */

/** Props from the last FlashList the DataList under test rendered. */
function lastListProps<T>(): FlashListProps<T> {
  const props = mockFlashListProps[mockFlashListProps.length - 1];
  if (!props) throw new Error("DataList did not render a FlashList in this test");
  return props as FlashListProps<T>;
}

/** The minimal fiber shape the walk below needs (root.unstable_fiber). */
type AnyFiber = {
  type: unknown;
  memoizedProps: unknown;
  child: AnyFiber | null;
  sibling: AnyFiber | null;
} | null;

/**
 * Props of the MOUNTED RefreshControl. Host trees strip the control's own
 * props from its host instance (validAttributes) and the web ScrollView
 * drops the refreshControl element prop entirely — so walk the fiber tree
 * (RNTL 14's documented escape hatch, `root.unstable_fiber`) to the
 * composite RefreshControl and read the props DataList wired into it.
 */
function refreshControlPropsOf(root: unknown): { refreshing: boolean; onRefresh: () => void } {
  const fiber = (root as { unstable_fiber?: AnyFiber } | null)?.unstable_fiber ?? null;
  const stack: AnyFiber[] = [fiber];
  while (stack.length > 0) {
    const f = stack.pop();
    if (!f) continue;
    if (f.type === RefreshControl) {
      return f.memoizedProps as { refreshing: boolean; onRefresh: () => void };
    }
    if (f.child) stack.push(f.child);
    if (f.sibling) stack.push(f.sibling);
  }
  throw new Error("RefreshControl is not mounted under this root");
}

/** Await the 0-ms load timer FlashList schedules after mount (act-clean). */
async function flushList() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  mockFlashListProps.length = 0;
});

/* ── Arabic sample data ─────────────────────────────────────────────── */

interface Notice {
  id: string;
  title: string;
}

const NOTICES: Notice[] = [
  { id: "n1", title: "محاضرة تمهيدية في الخوارزميات" },
  { id: "n2", title: "صدور نتيجة الامتحان النصفي" },
  { id: "n3", title: "تحديث جدول المعامل" },
];

const LIST_PROPS = {
  renderItem: ({ item }: { item: Notice; index: number }) => <T>{item.title}</T>,
  keyExtractor: (n: Notice) => n.id,
};

/* ── backward-compat smoke: the pre-existing ledger vocabulary ─────── */

describe("legacy ledger exports (kept byte-compatible)", () => {
  it("RowList + LedgerRow + Avatar still render", async () => {
    const { getByText } = await render(
      <RowList>
        <LedgerRow accessibilityLabel="صف الطالب أحمد" last>
          <Avatar initials="مد" />
        </LedgerRow>
      </RowList>,
    );
    expect(getByText("مد")).toBeTruthy();
  });
});

/* ── DataList: rows + FlashList wiring ──────────────────────────────── */

describe("DataList (native → FlashList v2)", () => {
  it("renders every row with its Arabic copy", async () => {
    const { getByText } = await render(<DataList<Notice> data={NOTICES} {...LIST_PROPS} />);
    await flushList();
    for (const n of NOTICES) expect(getByText(n.title)).toBeTruthy();
  });

  it("carries data + typed keyExtractor onto FlashList", async () => {
    await render(<DataList<Notice> data={NOTICES} {...LIST_PROPS} />);
    await flushList();
    const props = lastListProps<Notice>();
    expect(props.data).toHaveLength(3);
    expect(props.keyExtractor?.(NOTICES[1], 1)).toBe("n2");
  });

  it("contentContainer defaults to RTL; rtl={false} opts out", async () => {
    await render(<DataList<Notice> data={NOTICES} {...LIST_PROPS} />);
    await flushList();
    expect(lastListProps<Notice>().contentContainerStyle).toContainEqual({
      direction: "rtl",
    });

    await render(<DataList<Notice> data={NOTICES} {...LIST_PROPS} rtl={false} />);
    await flushList();
    expect(lastListProps<Notice>().contentContainerStyle).not.toContainEqual({
      direction: "rtl",
    });
  });

  it("contentPadding maps onto the content container (sp ladder)", async () => {
    await render(
      <DataList<Notice>
        data={NOTICES}
        {...LIST_PROPS}
        contentPadding={{ horizontal: 16, top: 12, bottom: 24 }}
      />,
    );
    await flushList();
    const style = lastListProps<Notice>().contentContainerStyle as unknown[];
    expect(style).toContainEqual({ paddingHorizontal: 16 });
    expect(style).toContainEqual({ paddingTop: 12 });
    expect(style).toContainEqual({ paddingBottom: 24 });
  });
});

/* ── DataList: first-load tri-state (defaults = states.tsx) ─────────── */

describe("DataList first-load states", () => {
  it("isLoading → SkeletonList (the states.tsx default, 6 rows)", async () => {
    const { toJSON, queryByText } = await render(
      <DataList<Notice> data={null} isLoading {...LIST_PROPS} />,
    );
    // each SkeletonList row seats one 55%-wide pulse line — 6 rows ⇒ 6 hits
    const pulses = (JSON.stringify(toJSON()).match(/55%/g) ?? []).length;
    expect(pulses).toBe(6);
    expect(queryByText("صدور نتيجة الامتحان النصفي")).toBeNull();
    // and no FlashList is mounted in this state
    expect(mockFlashListProps).toHaveLength(0);
  });

  it("loadingSlot overrides the default", async () => {
    const { getByText } = await render(
      <DataList<Notice> data={null} isLoading loadingSlot={<T>تُحمَّل البرامج…</T>} {...LIST_PROPS} />,
    );
    expect(getByText("تُحمَّل البرامج…")).toBeTruthy();
  });

  it("isError → ErrorState with the message + retry fires onRetry", async () => {
    const onRetry = jest.fn();
    const { getByText } = await render(
      <DataList<Notice> data={[]} isError errorMessage="خطأ مخصّص" onRetry={onRetry} {...LIST_PROPS} />,
    );
    expect(getByText("تعذّر تحميل البيانات")).toBeTruthy();
    expect(getByText("خطأ مخصّص")).toBeTruthy();
    fireEvent.press(getByText("إعادة المحاولة"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("empty → EmptyState with the generic Arabic default", async () => {
    const { getByText } = await render(<DataList<Notice> data={[]} {...LIST_PROPS} />);
    expect(getByText("لا توجد بيانات بعد")).toBeTruthy();
  });

  it("emptyTitle/emptyMessage customize the default; emptySlot replaces it", async () => {
    const { getByText, rerender } = await render(
      <DataList<Notice> data={[]} emptyTitle="لا إشعارات بعد" emptyMessage="ستظهر الإعلانات هنا." {...LIST_PROPS} />,
    );
    expect(getByText("لا إشعارات بعد")).toBeTruthy();
    expect(getByText("ستظهر الإعلانات هنا.")).toBeTruthy();

    await rerender(<DataList<Notice> data={[]} emptySlot={<T>صندوق فارغ</T>} {...LIST_PROPS} />);
    expect(getByText("صندوق فارغ")).toBeTruthy();
  });

  it("empty + refetch stays pull-to-refreshable (states.tsx Refreshable)", async () => {
    const refetch = jest.fn();
    const { root } = await render(
      <DataList<Notice> data={[]} refetch={refetch} isRefetching {...LIST_PROPS} />,
    );
    // the Refreshable wrapper is a ScrollView + RefreshControl pair
    const rc = refreshControlPropsOf(root);
    expect(rc.refreshing).toBe(true);
    expect(rc.onRefresh).toBe(refetch);
    expect(mockFlashListProps).toHaveLength(0);
  });
});

/* ── DataList: pull-to-refresh + pagination wiring ──────────────────── */

describe("DataList refresh + pagination", () => {
  it("wires refetch/isRefetching into the RefreshControl (TanStack shape)", async () => {
    const refetch = jest.fn();
    await render(<DataList<Notice> data={NOTICES} refetch={refetch} isRefetching {...LIST_PROPS} />);
    await flushList();
    const rc = lastListProps<Notice>().refreshControl as { props: { refreshing: boolean; onRefresh: () => void } };
    expect(rc.props.refreshing).toBe(true);
    expect(rc.props.onRefresh).toBe(refetch);
  });

  it("no refetch prop → no RefreshControl at all", async () => {
    await render(<DataList<Notice> data={NOTICES} {...LIST_PROPS} />);
    await flushList();
    expect(lastListProps<Notice>().refreshControl).toBeUndefined();
  });

  it("onEndReached passes through while pages remain; gated at hasNextPage=false", async () => {
    const onEndReached = jest.fn();
    const first = await render(
      <DataList<Notice> data={NOTICES} onEndReached={onEndReached} hasNextPage {...LIST_PROPS} />,
    );
    await flushList();
    const passed = lastListProps<Notice>().onEndReached as () => void;
    expect(passed).toBe(onEndReached);
    passed();
    expect(onEndReached).toHaveBeenCalledTimes(1);

    await first.rerender(
      <DataList<Notice> data={NOTICES} onEndReached={onEndReached} hasNextPage={false} {...LIST_PROPS} />,
    );
    expect(lastListProps<Notice>().onEndReached).toBeUndefined();
  });

  it("isFetchingNextPage → honest loading footer (no spinner)", async () => {
    const { getByText } = await render(
      <DataList<Notice> data={NOTICES} isFetchingNextPage {...LIST_PROPS} />,
    );
    await flushList();
    expect(getByText("جارٍ تحميل المزيد…")).toBeTruthy();
  });

  it("idle pagination → no footer copy", async () => {
    const { queryByText } = await render(<DataList<Notice> data={NOTICES} {...LIST_PROPS} />);
    await flushList();
    expect(queryByText("جارٍ تحميل المزيد…")).toBeNull();
  });

  it("loadMoreError → compact error footer; retry fires onRetryLoadMore", async () => {
    const retry = jest.fn();
    const { getByText } = await render(
      <DataList<Notice> data={NOTICES} loadMoreError="انقطع الاتصال" onRetryLoadMore={retry} {...LIST_PROPS} />,
    );
    await flushList();
    expect(getByText("انقطع الاتصال")).toBeTruthy();
    fireEvent.press(getByText("إعادة المحاولة"));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});

/* ── DataList: sticky section headers (FlashList v2) ────────────────── */

describe("DataList sticky section headers", () => {
  it("passes indices + config (offset, native driver) to FlashList", async () => {
    await render(
      <DataList<Notice> data={NOTICES} stickyHeaderIndices={[0, 2]} stickyHeaderOffset={8} {...LIST_PROPS} />,
    );
    await flushList();
    const props = lastListProps<Notice>();
    expect(props.stickyHeaderIndices).toEqual([0, 2]);
    expect(props.stickyHeaderConfig).toMatchObject({ offset: 8, useNativeDriver: true });
  });
});

/* ── DataList: web fallback (same API, FlatList) ────────────────────── */

describe("DataList web fallback", () => {
  const withWebOS = <R,>(fn: () => Promise<R>): Promise<R> => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    return fn().finally(() => {
      Object.defineProperty(Platform, "OS", { value: original, configurable: true });
    });
  };

  it(
    "renders rows + footer + refresh behind the same API, with NO FlashList",
    () =>
      withWebOS(async () => {
        const refetch = jest.fn();
        const { getByText, root } = await render(
          <DataList<Notice>
            data={NOTICES}
            refetch={refetch}
            isRefetching
            isFetchingNextPage
            stickyHeaderIndices={[0]}
            {...LIST_PROPS}
          />,
        );
        // the fallback is real: every row renders, but FlashList never mounts
        for (const n of NOTICES) expect(getByText(n.title)).toBeTruthy();
        expect(mockFlashListProps).toHaveLength(0);
        expect(getByText("جارٍ تحميل المزيد…")).toBeTruthy();
        // the same refresh contract is mounted on web: a RefreshControl
        // wired to refetch, refreshing while the refetch is in flight
        const rc = refreshControlPropsOf(root);
        expect(rc.refreshing).toBe(true);
        expect(rc.onRefresh).toBe(refetch);
      }),
  );
});

/* ── DataList: view windowing (M5 — the transcript panel witness) ───── */

describe("DataList windowing (web FlatList fallback)", () => {
  const withWebOS = <R,>(fn: () => Promise<R>): Promise<R> => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    return fn().finally(() => {
      Object.defineProperty(Platform, "OS", { value: original, configurable: true });
    });
  };

  /** A 90-minute lecture's transcript (~1000 cues) behind a counting row. */
  const LONG: Notice[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `c${i}`,
    title: `سطر النص ${i}`,
  }));

  async function countMountedRows(
    windowing?: { initialNumToRender?: number; maxToRenderPerBatch?: number; windowSize?: number },
  ): Promise<number> {
    let renders = 0;
    const CountingRow = ({ item }: { item: Notice }) => {
      renders += 1;
      return <T>{item.title}</T>;
    };
    const { unmount } = await render(
      <DataList<Notice>
        data={LONG}
        renderItem={({ item }) => <CountingRow item={item} />}
        keyExtractor={(n) => n.id}
        style={{ height: 360 }}
        windowing={windowing}
        scrollProps={{ nestedScrollEnabled: true }}
      />,
    );
    await flushList();
    unmount();
    return renders;
  }

  it(
    "M5 before→after: a 1000-cue transcript mounts only the initial window (10), not 1000 rows",
    () =>
      withWebOS(async () => {
        const mounted = await countMountedRows();
        // BEFORE (the audit's .map shape): 200–1000 rows mounted at once.
        // AFTER: FlatList mounts just its initial window — the data stays whole.
        expect(mounted).toBeGreaterThan(0);
        expect(mounted).toBeLessThanOrEqual(10);
        expect(LONG).toHaveLength(1000);
      }),
  );

  it(
    "windowing.initialNumToRender shapes the mounted window (4 → 4 rows)",
    () =>
      withWebOS(async () => {
        expect(await countMountedRows({ initialNumToRender: 4 })).toBe(4);
      }),
  );

  it("windowing is a native no-op: FlashList still carries the full data", async () => {
    // native (platform=ios here) — FlashList v2 recycles; the windowing
    // object must not disturb the data handoff. Jest renders every row
    // (no real layout), so the count is NOT the native witness — the
    // FlatList-fallback counts above are.
    await render(
      <DataList<Notice>
        data={LONG}
        {...LIST_PROPS}
        windowing={{ initialNumToRender: 4, maxToRenderPerBatch: 8, windowSize: 9 }}
      />,
    );
    await flushList();
    expect(lastListProps<Notice>().data).toHaveLength(1000);
  });
});

/* ── makeRow ────────────────────────────────────────────────────────── */

describe("makeRow (memoized row factory)", () => {
  it("returns a memo-wrapped component that renders", async () => {
    const NoticeRow = makeRow<Notice>(({ item }) => <T>{item.title}</T>);
    expect(typeof NoticeRow).toBe("object"); // memo exotic component, not a function
    const { getByText } = await render(
      <DataList<Notice>
        data={NOTICES}
        renderItem={({ item }) => <NoticeRow item={item} />}
        keyExtractor={(n) => n.id}
      />,
    );
    await flushList();
    expect(getByText(NOTICES[0].title)).toBeTruthy();
  });

  it("memo blocks row re-renders while item identity is stable", async () => {
    let rowRenders = 0;
    const CountingRow = makeRow<Notice>(({ item }) => {
      rowRenders += 1;
      return <T>{item.title}</T>;
    });
    const Screen = () => (
      <DataList<Notice>
        data={NOTICES}
        renderItem={({ item }) => <CountingRow item={item} />}
        keyExtractor={(n) => n.id}
      />
    );
    const first = await render(<Screen />);
    await flushList();
    const initial = rowRenders;
    expect(initial).toBeGreaterThanOrEqual(NOTICES.length);

    // re-render with the SAME data — FlashList re-invokes renderItem (new
    // closures in the harness), but memo must block the inner row render.
    await first.rerender(<Screen />);
    expect(rowRenders).toBe(initial);
  });
});

/* ── usePagedList (useInfiniteQuery adapter) ────────────────────────── */

interface CourseRow {
  id: string;
  name: string;
}

const P1: CourseRow[] = [
  { id: "c1", name: "مقدمة في قواعد البيانات" },
  { id: "c2", name: "الرياضيات المتقطعة" },
];
const P2: CourseRow[] = [
  { id: "c3", name: "الشبكات العصبية" },
  { id: "c4", name: "أمن المعلومات" },
];

function paginated(rows: CourseRow[], page: number, totalPages: number): Paginated<CourseRow> {
  return { data: rows, meta: { page, limit: 2, total: rows.length * totalPages, totalPages } };
}

function hookClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
}

/** renderHook wrapper factory — each case gets a fresh QueryClient. */
function hookWrapper(client: QueryClient) {
  function HookWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return HookWrapper;
}

describe("usePagedList", () => {
  afterEach(async () => {
    // absorb TanStack's notifyManager flush timer (gcTime 0) inside act —
    // otherwise the last hook test leaks one out-of-act state update.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it("accumulates pages on onEndReached and stops at the meta end", async () => {
    const fetchPage = jest
      .fn<Promise<Paginated<CourseRow>>, [number]>()
      .mockResolvedValueOnce(paginated(P1, 1, 2))
      .mockResolvedValueOnce(paginated(P2, 2, 2));
    const { result } = await renderHook(
      () => usePagedList<CourseRow>({ queryKey: ["courses"], fetchPage }),
      { wrapper: hookWrapper(hookClient()) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(result.current.page).toBe(1);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => result.current.onEndReached());
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(result.current.items.map((c) => c.name)).toContain("أمن المعلومات");
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.totalPages).toBe(2);

    // exhausted — no third fetch
    await act(async () => result.current.onEndReached());
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("keeps rows when the next page fails; retryLoadMore recovers", async () => {
    const fetchPage = jest
      .fn<Promise<Paginated<CourseRow>>, [number]>()
      .mockResolvedValueOnce(paginated(P1, 1, 2))
      .mockRejectedValueOnce(new Error("انقطع الاتصال بالخادم"))
      .mockResolvedValueOnce(paginated(P2, 2, 2));
    const { result } = await renderHook(
      () => usePagedList<CourseRow>({ queryKey: ["courses"], fetchPage }),
      { wrapper: hookWrapper(hookClient()) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => result.current.onEndReached());
    await waitFor(() => expect(result.current.loadMoreError).toBe("انقطع الاتصال بالخادم"));
    // previous rows stay on screen. TanStack v5 semantics, documented in
    // UsePagedListResult: a failed fetchNextPage flips the query status, so
    // isError IS true — but `items` keep the cached pages and
    // loadMoreError marks the direction. DataList gates its full-screen
    // ErrorState on `isError && rows.length === 0`, so on screen this is
    // rows + the compact retry footer, never a blank error page.
    expect(result.current.items).toHaveLength(2);
    expect(result.current.isError).toBe(true);
    expect(result.current.isFetchingNextPage).toBe(false);

    await act(async () => result.current.retryLoadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(result.current.loadMoreError).toBeNull();
  });

  it("meta-less endpoints: a full page guesses hasNext, an empty page ends the list", async () => {
    const fetchPage = jest
      .fn<Promise<CourseRow[]>, [number]>()
      .mockResolvedValueOnce(P1) // 2 rows ≥ limit 2 → assume more
      .mockResolvedValueOnce([]); // empty page → end
    const { result } = await renderHook(
      () => usePagedList<CourseRow>({ queryKey: ["bare"], fetchPage, limit: 2 }),
      { wrapper: hookWrapper(hookClient()) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => result.current.onEndReached());
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
    expect(result.current.items).toHaveLength(2);
  });

  it("refetch re-runs the transport (page 1 again)", async () => {
    const fetchPage = jest
      .fn<Promise<Paginated<CourseRow>>, [number]>()
      .mockResolvedValue(paginated(P1, 1, 1));
    const { result } = await renderHook(
      () => usePagedList<CourseRow>({ queryKey: ["refetch"], fetchPage }),
      { wrapper: hookWrapper(hookClient()) },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => result.current.refetch());
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));
    expect(fetchPage).toHaveBeenLastCalledWith(1);
  });
});
