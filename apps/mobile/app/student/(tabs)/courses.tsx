/**
 * /student/(tabs)/courses — مقرّراتي (R334 Round-2 recompose;
 * R341 M7 web-language parity):
 * DataList on FlashList v2 (the #1 list anti-pattern — ScrollView+map —
 * retired), a list/grid segmented toggle (haptics.selection), a
 * RingProgress per course card, a FilterSheet (فصل / قسم / تقدّم —
 * draft→apply state machine in coursesLogic), pull-to-refresh wired to
 * the query, real-geometry skeletons, the library-room empty state, and
 * a capped entrance stagger on the first cards (@/motion discipline:
 * ≤8 children, base+step ≤ 400ms).
 */
import { Pressable, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated from "react-native-reanimated";
import Check from "lucide-react-native/icons/check";
import LayoutGrid from "lucide-react-native/icons/layout-grid";
import List from "lucide-react-native/icons/list";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import { learningApi } from "@/api/learning";
import type { EnrollmentRow } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { Screen, SectionBar } from "@/components/ui/screen";
import { BidiText, T } from "@/components/ui/text";
import { DataList, makeRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { FilterSheet } from "@/components/ui/sheet";
import { PressableScale, RingProgress, useStaggerEntrance } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { dayName, latn, pct } from "@/lib/format";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { countAr } from "@/features/student/more";
import { CourseWell, courseProgressHint } from "@/features/student/components";
import {
  activeCourseFilterCount,
  applyCourseFilters,
  chunkPairs,
  courseFilterFacets,
  courseFiltersReducer,
  NO_COURSE_FILTERS,
  PROGRESS_FILTER_LABEL,
  PROGRESS_FILTER_OPTIONS,
  type CourseFilterAction,
  type CourseFilters,
  type CourseView,
} from "@/features/student/coursesLogic";

/* ══ card chrome (surface step + hairline — never a shadow) ═══════════ */

/** Entrance stagger cap — beyond 8 children the rhythm stops (motion doc). */
const STAGGER_CAP = 8;

/** Map-safe stagger for one card (hook: one call per card component). */
function useCardEntrance(index: number) {
  const enter = useStaggerEntrance({ base: 60, step: 60 });
  return index < STAGGER_CAP ? enter(index) : undefined;
}

function clampedPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function teacherLine(e: EnrollmentRow): string {
  const t = e.offering.teacher;
  return t ? `د. ${t.firstName} ${t.lastName}` : "بلا أستاذ مسجَّل";
}

/* ══ list card — well + identity + schedule + progress ring ═══════════ */

const CourseListCard = makeRow<EnrollmentRow, { index: number }>(({ item, index }) => {
  const p = usePalette();
  const entering = useCardEntrance(index);
  const c = item.offering.course;
  const slots = item.offering.schedule ?? [];
  const scheduleSummary = slots
    .slice(0, 2)
    .map((s) => `${dayName(s.dayOfWeek)} ${s.startTime}`)
    .join(" · ");
  return (
    <Animated.View entering={entering}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`مقرّر ${c.name} — التقدّم ${pct(item.progressPct)}`}
        onPress={() => router.push(`/student/courses/${item.offering.id}` as never)}
        style={{
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
          gap: sp[10],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <CourseWell emoji={c.iconEmoji} color={c.themeColor} />
          <View style={{ flex: 1, gap: 2 }}>
            {/* 2 lines, not 1 — long course titles survive a 200% font. */}
            <T variant="bodyLg" weight="bold" numberOfLines={2}>
              {c.name}
            </T>
            {/* BidiText — the Latin course code at the string end must not
                drag the «·» separator across the direction boundary (T-50). */}
            <BidiText variant="sm" color="secondary" numberOfLines={1}>
              {`${teacherLine(item)} · ${c.code}`}
            </BidiText>
            {slots.length > 0 ? (
              <T variant="xs" color="muted" numberOfLines={1}>
                {scheduleSummary}
                {slots.length > 2 ? " …" : ""}
              </T>
            ) : null}
          </View>
          {/* R341 M7 — the per-course progress rides NEUTRAL ink (the
              web CourseBar ruling): the one-accent discipline keeps
              orange for the screen's single CTA, never one ring per
              card. */}
          <RingProgress
            size={44}
            thickness={4}
            color={p.primary}
            progress={clampedPct(item.progressPct) / 100}
            accessibilityLabel={`تقدّم مقرّر ${c.name}: ${pct(item.progressPct)}`}
          >
            <T variant="xs" weight="bold">{pct(item.progressPct)}</T>
          </RingProgress>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          {/* One number, one verb: the ring carries the value, the hint
              carries the action (B4 re-review rule kept) — quiet ink,
              the web row's «تابع/ابدأ» ghost register. */}
          <T variant="xs" color="secondary" weight="bold">
            {courseProgressHint(item.progressPct)}
          </T>
          <View style={{ flex: 1 }} />
          <T variant="xs" color="faint">
            {item.offering.term ? `فصل ${item.offering.term}` : ""}
          </T>
        </View>
      </PressableScale>
    </Animated.View>
  );
});

/* ══ grid card — compact tile with the same ring ══════════════════════ */

const CourseGridCard = makeRow<EnrollmentRow, { index: number }>(({ item, index }) => {
  const p = usePalette();
  const entering = useCardEntrance(index);
  const c = item.offering.course;
  return (
    <Animated.View entering={entering} style={{ flex: 1, minWidth: 0 }}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`مقرّر ${c.name} — التقدّم ${pct(item.progressPct)}`}
        onPress={() => router.push(`/student/courses/${item.offering.id}` as never)}
        style={{
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
          gap: sp[8],
          flex: 1,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <CourseWell emoji={c.iconEmoji} color={c.themeColor} size={36} />
          <View style={{ flex: 1 }} />
          <RingProgress
            size={40}
            thickness={4}
            color={p.primary}
            progress={clampedPct(item.progressPct) / 100}
            accessibilityLabel={`تقدّم مقرّر ${c.name}: ${pct(item.progressPct)}`}
          >
            <T variant="xs" weight="bold">{pct(item.progressPct)}</T>
          </RingProgress>
        </View>
        <T variant="body" weight="bold" numberOfLines={2}>
          {c.name}
        </T>
        <BidiText variant="xs" color="secondary" numberOfLines={1}>
          {teacherLine(item)}
        </BidiText>
      </PressableScale>
    </Animated.View>
  );
});

/** One grid row = a pair of cards (DataList stays the virtualized scroller). */
const CoursePairRow = makeRow<EnrollmentRow[], { index: number }>(({ item, index }) => (
  <View style={{ flexDirection: "row", gap: sp[12] }}>
    {item.map((e, i) => (
      <CourseGridCard key={e.id} item={e} index={index * 2 + i} />
    ))}
  </View>
));

/* ══ segmented list/grid toggle ═══════════════════════════════════════ */

const VIEW_OPTIONS: { key: CourseView; label: string; Icon: typeof List }[] = [
  { key: "list", label: "قائمة", Icon: List },
  { key: "grid", label: "شبكة", Icon: LayoutGrid },
];

function ViewToggle({ view, onChange }: { view: CourseView; onChange: (v: CourseView) => void }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="طريقة عرض المقرّرات"
      style={{ flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}
    >
      {VIEW_OPTIONS.map(({ key, label, Icon }) => {
        const active = view === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={`عرض ${label}`}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (view !== key) {
                haptics.selection();
                onChange(key);
              }
            }}
            style={{
              /* minHeight, not height — a 200% font may wrap the label;
               * the 44pt floor stays. */
              minHeight: 44,
              paddingHorizontal: sp[12],
              flexDirection: "row",
              alignItems: "center",
              gap: sp[6],
              backgroundColor: active ? p.accentSoft : "transparent",
            }}
          >
            <Icon size={16} color={active ? p.accentInk : p.textMuted} />
            <T variant="sm" weight={active ? "bold" : "medium"} style={{ color: active ? p.accentInk : p.textSecondary }}>
              {label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

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

export default function StudentCourses() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["enrollments", "me", scope],
    queryFn: () => learningApi.enrollments(),
  });

  /* Stable empty array — a bare `?? []` re-creates it every render and
   * defeats the facets/filtered memo deps while the feed loads. */
  const rows = useMemo(() => feed.data ?? [], [feed.data]);
  const facets = useMemo(() => courseFilterFacets(rows), [rows]);

  const [view, setView] = useState<CourseView>("list");
  const [filters, setFilters] = useState<CourseFilters>(NO_COURSE_FILTERS);
  const [draft, setDraft] = useState<CourseFilters>(NO_COURSE_FILTERS);
  /** Mount-on-demand: the sheet engine loads on first OPEN, not on screen mount. */
  const [filterMounted, setFilterMounted] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => applyCourseFilters(rows, filters), [rows, filters]);
  const filteredEmpty = rows.length > 0 && filtered.length === 0;
  const activeCount = activeCourseFilterCount(filters);
  const enrolledLabel = countAr(rows.length, ["مقرّر مسجَّل واحد", "مقرّران مسجَّلان", "مقرّرات مسجَّلة", "مقرّراً مسجَّلاً"]);

  const setDraftAction = (action: CourseFilterAction) => {
    haptics.selection();
    setDraft((prev) => courseFiltersReducer(prev, action));
  };

  const openFilters = () => {
    setDraft(filters);
    setFilterMounted(true);
    setFilterOpen(true);
  };

  const listBody = (data: readonly EnrollmentRow[]) => (
    <DataList
      data={data}
      renderItem={({ item, index }) => <CourseListCard item={item} index={index} />}
      keyExtractor={(e) => e.id}
      isLoading={feed.isLoading}
      isError={feed.isError}
      errorMessage={humanizeError(feed.error)}
      onRetry={() => feed.refetch()}
      refetch={() => feed.refetch()}
      isRefetching={feed.isRefetching}
      emptyTitle="لا توجد مقرّرات"
      emptyMessage="لم تُسجَّل في مقرّرات بعد — الإضافة تتم عبر إدارة شؤون الطلاب وستظهر هنا فور اعتماد تسجيلك."
      emptySlot={
        filteredEmpty ? (
          <EmptyState
            title="لا توجد مقرّرات تطابق التصفية"
            message="جرّب تخفيف الشروط أو أعد ضبطها لعرض كل مقرّراتك."
            actionLabel="إزالة التصفية"
            onAction={() => setFilters(NO_COURSE_FILTERS)}
          />
        ) : (
          <EmptyState
            room="library"
            title="لا توجد مقرّرات"
            message="لم تُسجَّل في مقرّرات بعد — الإضافة تتم عبر إدارة شؤون الطلاب وستظهر هنا فور اعتماد تسجيلك."
            actionLabel="دليل المقرّرات"
            onAction={() => router.push("/student/catalog" as never)}
          />
        )
      }
      loadingSlot={<SkeletonList rows={5} rowHeight={104} />}
      errorSlot={<ErrorState message={humanizeError(feed.error)} onRetry={() => feed.refetch()} />}
      contentPadding={{ horizontal: 20, top: 4, bottom: 24 }}
    />
  );

  const gridBody = (data: readonly EnrollmentRow[]) => (
    <DataList
      data={chunkPairs(data)}
      renderItem={({ item, index }) => <CoursePairRow item={item} index={index} />}
      keyExtractor={(pair) => pair[0]?.id ?? "empty"}
      isLoading={feed.isLoading}
      isError={feed.isError}
      errorMessage={humanizeError(feed.error)}
      onRetry={() => feed.refetch()}
      refetch={() => feed.refetch()}
      isRefetching={feed.isRefetching}
      emptyTitle="لا توجد مقرّرات"
      emptyMessage="لم تُسجَّل في مقرّرات بعد — الإضافة تتم عبر إدارة شؤون الطلاب وستظهر هنا فور اعتماد تسجيلك."
      emptySlot={
        filteredEmpty ? (
          <EmptyState
            title="لا توجد مقرّرات تطابق التصفية"
            message="جرّب تخفيف الشروط أو أعد ضبطها لعرض كل مقرّراتك."
            actionLabel="إزالة التصفية"
            onAction={() => setFilters(NO_COURSE_FILTERS)}
          />
        ) : (
          <EmptyState
            room="library"
            title="لا توجد مقرّرات"
            message="لم تُسجَّل في مقرّرات بعد — الإضافة تتم عبر إدارة شؤون الطلاب وستظهر هنا فور اعتماد تسجيلك."
            actionLabel="دليل المقرّرات"
            onAction={() => router.push("/student/catalog" as never)}
          />
        )
      }
      loadingSlot={<SkeletonList rows={3} rowHeight={140} />}
      errorSlot={<ErrorState message={humanizeError(feed.error)} onRetry={() => feed.refetch()} />}
      contentPadding={{ horizontal: 20, top: 4, bottom: 24 }}
    />
  );

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/student/alerts" />
      <View style={{ paddingHorizontal: sp[20], gap: sp[12] }}>
        {/* R341 M7 — the section bar carries the honest enrolled count
            as its quiet mono meta (the web BarCount seat), view toggle
            stays the trailing control. */}
        <SectionBar
          index={1}
          title="مقرّراتي الدراسية"
          action={
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
              <BarCount n={rows.length} a11y={enrolledLabel} />
              <ViewToggle view={view} onChange={setView} />
            </View>
          }
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <T variant="sm" color="muted" style={{ flex: 1 }}>
            {enrolledLabel}
            {activeCount > 0 ? ` · ${latn(filtered.length)} بعد التصفية` : ""}
          </T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeCount > 0 ? `تصفية المقرّرات — ${latn(activeCount)} مُفعّلة` : "تصفية المقرّرات"}
            onPress={openFilters}
            style={({ pressed }) => ({
              minHeight: 44,
              paddingHorizontal: sp[12],
              flexDirection: "row",
              alignItems: "center",
              gap: sp[6],
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: activeCount > 0 ? p.accentInk : p.border,
              backgroundColor: pressed ? p.surfaceHover : "transparent",
            })}
          >
            <SlidersHorizontal size={16} color={activeCount > 0 ? p.accentInk : p.textMuted} />
            <T variant="sm" weight="medium" style={{ color: activeCount > 0 ? p.accentInk : p.textSecondary }}>
              تصفية
            </T>
            {activeCount > 0 ? <MonoCount value={activeCount} /> : null}
          </Pressable>
        </View>
      </View>

      {view === "grid" ? gridBody(filtered) : listBody(filtered)}

      {filterMounted ? (
        <FilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="تصفية المقرّرات"
          onApply={() => {
            setFilters(draft);
            setFilterOpen(false);
          }}
          onReset={() => setDraft(NO_COURSE_FILTERS)}
        >
          <View style={{ gap: sp[4] }}>
            <T variant="h4" weight="bold">الفصل</T>
            <FilterOptionRow
              label="كل الفصول"
              selected={draft.term === null}
              onPress={() => setDraftAction({ type: "term", value: null })}
            />
            {facets.terms.map((t) => (
              <FilterOptionRow
                key={t}
                label={t}
                selected={draft.term === t}
                onPress={() => setDraftAction({ type: "term", value: t })}
              />
            ))}

            <T variant="h4" weight="bold" style={{ marginTop: sp[12] }}>القسم</T>
            <FilterOptionRow
              label="كل الأقسام"
              selected={draft.department === null}
              onPress={() => setDraftAction({ type: "department", value: null })}
            />
            {facets.departments.map((d) => (
              <FilterOptionRow
                key={d}
                label={d}
                selected={draft.department === d}
                onPress={() => setDraftAction({ type: "department", value: d })}
              />
            ))}

            <T variant="h4" weight="bold" style={{ marginTop: sp[12] }}>التقدّم</T>
            {PROGRESS_FILTER_OPTIONS.map((key) => (
              <FilterOptionRow
                key={key}
                label={PROGRESS_FILTER_LABEL[key]}
                selected={draft.progress === key}
                onPress={() => setDraftAction({ type: "progress", value: key })}
              />
            ))}
          </View>
        </FilterSheet>
      ) : null}
    </Screen>
  );
}

/** R341 M7 — the section bar's quiet mono meta (web BarCount grammar):
 *  the honest row count as padded Latin digits in the faint mono voice —
 *  data riding the [01] bar, never a second accent. */
function BarCount({ n, a11y }: { n: number; a11y: string }) {
  return (
    <T variant="monoSm" color="faint" accessibilityLabel={a11y}>
      {latn(n).padStart(2, "0")}
    </T>
  );
}

/** Small count chip next to the filter label (latin digits, hairline well). */
function MonoCount({ value }: { value: number }) {
  const p = usePalette();
  return (
    <View
      style={{
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 4,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.accentInk,
      }}
    >
      <T variant="xs" weight="bold" style={{ color: p.accentInk }}>
        {latn(value)}
      </T>
    </View>
  );
}
