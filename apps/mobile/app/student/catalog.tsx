/**
 * /student/catalog — دليل المقرّرات (R334 Round-2 recompose, web
 * CatalogPage parity + R341 M7 web-language parity: the [01] bar
 * carries the server's honest total as quiet mono meta; read-only):
 * DataList + usePagedList on the
 * paginated /courses endpoint (infinite scroll with the honest
 * load-more footer — the manual prev/next pager retired), 250ms
 * debounced search, a department FilterSheet (facets from /faculties,
 * server-side departmentId, draft→apply, haptics.selection), a
 * mount-on-demand course-card AppSheet (the read-only destination —
 * catalog rows have no offering to open), the library-room empty state,
 * and the OFFLINE branch keyed on the transport's NETWORK failure code
 * (NetInfo's subscription hook is not render-net-safe — see
 * docs/mobile/screens/courses.md). Enrollment is ADMIN-MEDIATED: the
 * honest-door banner says so; no enroll button anywhere.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Animated from "react-native-reanimated";
import BookOpen from "lucide-react-native/icons/book-open";
import Check from "lucide-react-native/icons/check";
import Info from "lucide-react-native/icons/info";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { catalogApi } from "@/api/catalog";
import { learningApi } from "@/api/learning";
import type { CourseCatalogRow } from "@/api/learning";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, SectionBar } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { SearchBar } from "@/components/ui/fields";
import { DataList, makeRow, usePagedList } from "@/components/ui/data";
import { EmptyState, ErrorState, OfflineState, SkeletonList } from "@/components/ui/states";
import { AppSheet, FilterSheet } from "@/components/ui/sheet";
import { StackHeader } from "@/components/shell/AppTopBar";
import { PressableScale, useStaggerEntrance } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { latn } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { CourseWell } from "@/features/student/components";
import { catalogDepartmentGroups } from "@/features/student/coursesLogic";

const PAGE_SIZE = 20;

/** Entrance stagger cap — beyond 8 children the rhythm stops (motion doc). */
const STAGGER_CAP = 8;

/** Map-safe stagger for one card (hook: one call per card component). */
function useCardEntrance(index: number) {
  const enter = useStaggerEntrance({ base: 60, step: 60 });
  return index < STAGGER_CAP ? enter(index) : undefined;
}

/** The transport's offline failure code (src/api/client.ts ApiError). */
function isNetworkFailure(e: unknown): boolean {
  return (e as { code?: string } | null | undefined)?.code === "NETWORK";
}

/* ══ catalog card — reference row; press opens the card sheet ═════════ */

const CatalogCard = makeRow<
  CourseCatalogRow,
  { index: number; onOpen: (c: CourseCatalogRow) => void }
>(({ item, index, onOpen }) => {
  const p = usePalette();
  const entering = useCardEntrance(index);
  return (
    <Animated.View entering={entering}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`بطاقة مقرّر ${item.name} — ${item.code}`}
        onPress={() => onOpen(item)}
        style={{
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
          gap: sp[8],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <CourseWell emoji={item.iconEmoji} color={item.themeColor} />
          <View style={{ flex: 1, gap: 2 }}>
            {/* 2 lines, not 1 — long course titles survive a 200% font. */}
            <T variant="bodyLg" weight="bold" numberOfLines={2}>
              {item.name}
            </T>
            <T variant="xs" color="muted" numberOfLines={1}>
              {item.department?.name ?? "قسم غير محدَّد"}
              {item.institution ? ` · ${item.institution.name}` : ""}
            </T>
          </View>
          <Badge label={item.code} tone="grey" mono />
        </View>
        {item.description ? (
          <T variant="sm" color="secondary" numberOfLines={2}>
            {item.description}
          </T>
        ) : null}
        {item.credits != null && item.credits > 0 ? (
          <T variant="xs" color="faint">
            {countAr(item.credits, ["ساعة معتمدة واحدة", "ساعتان معتمدتان", "ساعات معتمدة", "ساعة معتمدة"])}
          </T>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
});

/* ══ filter option row (radio semantics, check ends the RTL row) ══════ */

function FilterOptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        minHeight: touchFloor,
        justifyContent: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: sp[8],
      }}
    >
      <T
        variant="body"
        weight={selected ? "bold" : "medium"}
        style={{ flex: 1, color: selected ? p.accentInk : p.text }}
      >
        {label}
      </T>
      {selected ? <Check size={16} color={p.accentInk} /> : null}
    </Pressable>
  );
}

/* ══ the screen ═══════════════════════════════════════════════════════ */

export default function CatalogScreen() {
  const scope = useInstitutionScope();
  const p = usePalette();
  const slug = useSession((s) => s.user?.currentInstitution?.slug ?? null);

  /* Search: 250ms debounce (the LibraryPage convention); clearing is
   * instant. usePagedList keys on the committed term, and its
   * placeholderData keeps the previous rows mounted while the new key
   * resolves — no skeleton flash per keystroke. */
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  /* Department filter — draft→apply (FilterSheet), server-side. */
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [draftDepartmentId, setDraftDepartmentId] = useState<string | null>(null);
  /** Mount-on-demand: the sheet engine loads on first OPEN, not on mount. */
  const [filterMounted, setFilterMounted] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  /* Course-card sheet — the read-only row destination, same rule. */
  const [cardSheetMounted, setCardSheetMounted] = useState(false);
  const [card, setCard] = useState<CourseCatalogRow | null>(null);

  const list = usePagedList<CourseCatalogRow>({
    queryKey: ["courses", "catalog", { q: term, departmentId }, slug, scope],
    fetchPage: (page) =>
      learningApi.courses({
        page,
        limit: PAGE_SIZE,
        q: term || undefined,
        institutionSlug: slug ?? undefined,
        departmentId: departmentId ?? undefined,
      }),
    limit: PAGE_SIZE,
    enabled: !!slug,
    staleTime: 30_000,
  });

  /* Facets load with the sheet's first open, not on every catalog visit. */
  const faculties = useQuery({
    queryKey: ["catalog", "faculties", slug, scope],
    queryFn: () => catalogApi.faculties(slug ?? undefined),
    enabled: !!slug && filterMounted,
  });
  const departmentGroups = useMemo(
    () => catalogDepartmentGroups(faculties.data ?? []),
    [faculties.data],
  );
  const departmentName = useMemo(
    () =>
      departmentGroups.flatMap((g) => g.departments).find((d) => d.id === departmentId)?.name ??
      null,
    [departmentGroups, departmentId],
  );

  const openCard = useCallback((c: CourseCatalogRow) => {
    setCardSheetMounted(true);
    setCard(c);
  }, []);

  const openFilters = () => {
    setDraftDepartmentId(departmentId);
    setFilterMounted(true);
    setFilterOpen(true);
  };

  const selectDraftDepartment = (id: string | null) => {
    haptics.selection();
    setDraftDepartmentId(id);
  };

  const resetFilters = () => {
    setQ("");
    setTerm("");
    setDepartmentId(null);
  };

  const rows = list.items;
  const searching = term.length > 0;
  const filtering = searching || departmentId !== null;
  const offlineFailure = isNetworkFailure(list.query.error);
  const totalLabel = countAr(list.total, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"]);

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="دليل المقرّرات" kicker="مرجع للقراءة فقط" />

      <View style={{ paddingHorizontal: sp[20], gap: sp[12] }}>
        {/* The honest door — enrollment is admin-mediated */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: sp[8],
            borderWidth: 1,
            borderColor: p.accentSoft,
            backgroundColor: p.accentSoft,
            padding: sp[12],
          }}
        >
          <Info size={16} color={p.accentInk} />
          <T variant="sm" style={{ flex: 1, color: p.accentInk }}>
            التسجيل في المقرّرات تتم إدارته — تواصل مع شؤون الطلاب.
          </T>
        </View>

        {slug ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <View style={{ flex: 1 }}>
                <SearchBar
                  value={q}
                  onChange={setQ}
                  placeholder="ابحث باسم المقرّر أو رمزه…"
                  onClear={() => {
                    setQ("");
                    setTerm("");
                  }}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  departmentId
                    ? `تصفية حسب القسم — ${departmentName ?? "مفعّلة"}`
                    : "تصفية حسب القسم"
                }
                onPress={openFilters}
                style={({ pressed }) => ({
                  width: touchFloor,
                  height: touchFloor,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: departmentId ? p.accentInk : p.border,
                  backgroundColor: pressed ? p.surfaceHover : "transparent",
                })}
              >
                <SlidersHorizontal size={18} color={departmentId ? p.accentInk : p.textMuted} />
              </Pressable>
            </View>

            {/* R341 M7 — the section bar carries the server's honest
                total as its quiet mono meta (the web BarCount seat). */}
            <SectionBar
              index={1}
              title="مقرّرات المؤسسة"
              action={<BarCount n={list.total} a11y={totalLabel} />}
            />
            <T variant="sm" color="muted" numberOfLines={2}>
              {totalLabel}
              {searching ? ` · نتائج البحث عن «${term}»` : ""}
              {departmentName ? ` · ${departmentName}` : ""}
            </T>
          </>
        ) : null}
      </View>

      <View style={{ flex: 1, paddingTop: sp[12] }}>
        {!slug ? (
          <EmptyState
            icon={<BookOpen size={22} color={p.textMuted} />}
            title="لم تُحدَّد مؤسستك بعد"
            message="اختر مؤسستك من مبدّل المؤسسة لعرض دليل مقرّراتها."
          />
        ) : (
          <DataList
            data={rows}
            renderItem={({ item, index }) => (
              <CatalogCard item={item} index={index} onOpen={openCard} />
            )}
            keyExtractor={(c) => c.id}
            isLoading={list.isLoading}
            isError={list.isError}
            errorMessage={humanizeError(list.query.error)}
            onRetry={() => list.refetch()}
            refetch={() => list.refetch()}
            isRefetching={list.isRefetching}
            onEndReached={list.onEndReached}
            isFetchingNextPage={list.isFetchingNextPage}
            hasNextPage={list.hasNextPage}
            loadMoreError={list.loadMoreError ? humanizeError(list.query.error) : null}
            onRetryLoadMore={list.retryLoadMore}
            emptySlot={
              filtering ? (
                <EmptyState
                  title="لا توجد مقرّرات تطابق البحث"
                  message="لم نجد مقرّراً يطابق شروطك — جرّب كلمات أخرى أو أعد ضبط التصفية."
                  actionLabel="إزالة التصفية"
                  onAction={resetFilters}
                />
              ) : (
                <EmptyState
                  room="library"
                  title="لا توجد مقرّرات"
                  message="لم تُضف مقرّرات إلى دليل مؤسستك حتى الآن — ستظهر هنا فور إضافتها من المسجل العام."
                />
              )
            }
            loadingSlot={<SkeletonList rows={5} rowHeight={96} />}
            errorSlot={
              offlineFailure ? (
                <OfflineState onRetry={() => list.refetch()} />
              ) : (
                <ErrorState message={humanizeError(list.query.error)} onRetry={() => list.refetch()} />
              )
            }
            contentPadding={{ horizontal: 20, bottom: 24 }}
          />
        )}
      </View>

      {filterMounted ? (
        <FilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="تصفية حسب القسم"
          onApply={() => {
            setDepartmentId(draftDepartmentId);
            setFilterOpen(false);
          }}
          onReset={() => setDraftDepartmentId(null)}
        >
          {faculties.isLoading ? (
            <T variant="body" color="muted">
              جارٍ تحميل الأقسام…
            </T>
          ) : faculties.isError ? (
            <ErrorState
              compact
              message={humanizeError(faculties.error)}
              onRetry={() => faculties.refetch()}
            />
          ) : (
            <View style={{ gap: sp[4] }}>
              <FilterOptionRow
                label="كل الأقسام"
                selected={draftDepartmentId === null}
                onPress={() => selectDraftDepartment(null)}
              />
              {departmentGroups.map((g) => (
                <View key={g.facultyId}>
                  <T variant="h4" weight="bold" style={{ marginTop: sp[12] }}>
                    {g.facultyName}
                  </T>
                  {g.departments.map((d) => (
                    <FilterOptionRow
                      key={d.id}
                      label={d.name}
                      selected={draftDepartmentId === d.id}
                      onPress={() => selectDraftDepartment(d.id)}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
        </FilterSheet>
      ) : null}

      {cardSheetMounted ? (
        <AppSheet open={card !== null} onClose={() => setCard(null)} title="بطاقة المقرّر" snap="md" dynamic>
          {card ? (
            <View style={{ gap: sp[10] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <CourseWell emoji={card.iconEmoji} color={card.themeColor} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="bodyLg" weight="bold">
                    {card.name}
                  </T>
                  <T variant="xs" color="muted">
                    {card.department?.name ?? "قسم غير محدَّد"}
                    {card.institution ? ` · ${card.institution.name}` : ""}
                  </T>
                </View>
                <Badge label={card.code} tone="grey" mono />
              </View>
              <T variant="sm" color="secondary">
                {card.credits != null && card.credits > 0
                  ? countAr(card.credits, [
                      "ساعة معتمدة واحدة",
                      "ساعتان معتمدتان",
                      "ساعات معتمدة",
                      "ساعة معتمدة",
                    ])
                  : "بلا ساعات معتمدة مسجَّلة"}
              </T>
              {card.nameEn ? (
                <T variant="xs" color="faint">
                  {`الاسم بالإنجليزية: ${card.nameEn}`}
                </T>
              ) : null}
              {card.description ? (
                <T variant="body" color="secondary">
                  {card.description}
                </T>
              ) : null}
              <T variant="xs" color="muted">
                للاستفسار عن التسجيل تواصل مع شؤون الطلاب.
              </T>
            </View>
          ) : null}
        </AppSheet>
      ) : null}
    </Screen>
  );
}

/** R341 M7 — the section bar's quiet mono meta (web BarCount grammar):
 *  the honest row count as padded Latin digits in the faint mono voice —
 *  data riding the [01] bar, never a second accent moment. */
function BarCount({ n, a11y }: { n: number; a11y: string }) {
  return (
    <T variant="monoSm" color="faint" accessibilityLabel={a11y}>
      {latn(n).padStart(2, "0")}
    </T>
  );
}
