/**
 * /student/materials — موادي التعليمية (web DownloadsPage parity):
 * every material across the active enrollments in one ledger — name,
 * type, size and course attribution; a tap downloads through the
 * authenticated PDF surface (/document/<filename>?ns=materials).
 *
 * R334 Phase D: DataList (FlashList) body, type-specific file icons,
 * course + type FilterSheet (client-side over the FULL feed — the
 * /me/materials endpoint returns everything, so the filters are honest),
 * EmptyState library room, humanized errors.
 */
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import CircleCheck from "lucide-react-native/icons/circle-check";
import File from "lucide-react-native/icons/file";
import FileArchive from "lucide-react-native/icons/file-archive";
import FileText from "lucide-react-native/icons/file-text";
import Image from "lucide-react-native/icons/image";
import Presentation from "lucide-react-native/icons/presentation";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Video from "lucide-react-native/icons/video";
import { studentApi, type MaterialRow } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { T } from "@/components/ui/text";
import { Screen, SectionBar } from "@/components/ui/screen";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { FilterSheet } from "@/components/ui/sheet";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { sizeLabel, latn } from "@/lib/format";
import { countAr } from "@/features/student/more";
import {
  filesCount,
  materialCourseName,
  openMaterial,
} from "@/features/student/components";

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  PDF: "PDF",
  PPT: "PPT",
  DOC: "DOC",
  ZIP: "ZIP",
  VIDEO: "فيديو",
  IMAGE: "صورة",
  OTHER: "ملف",
};

/** Type-specific file icon (PDF/DOC → text, PPT → deck, ZIP → archive…). */
function materialTypeIcon(type: string, color: string) {
  switch (type) {
    case "PDF":
    case "DOC":
      return <FileText size={20} color={color} />;
    case "PPT":
      return <Presentation size={20} color={color} />;
    case "ZIP":
      return <FileArchive size={20} color={color} />;
    case "VIDEO":
      return <Video size={20} color={color} />;
    case "IMAGE":
      return <Image size={20} color={color} />;
    default:
      return <File size={20} color={color} />;
  }
}

/** Pure: does a row pass the (course × type) filter? Exported for tests. */
export function materialMatches(
  row: MaterialRow,
  course: string | null,
  type: string | null,
): boolean {
  if (course && materialCourseName(row) !== course) return false;
  if (type && row.type !== type) return false;
  return true;
}

/** Mount-on-first-open gate for the AppSheet family (RNGH v3 cannot boot
 * under jest — arming at first open keeps the render-net green). */
function useArmOnOpen(open: boolean): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (open) setArmed(true);
  }, [open]);
  return armed || open;
}

const MaterialRowItem = makeRow<
  MaterialRow,
  { last: boolean; typeLabel: (t: string) => string }
>(({ item: m, last, typeLabel }) => {
  const p = usePalette();
  return (
    <LedgerRow
      last={last}
      accessibilityLabel={`ملف: ${m.name}`}
      onPress={() => openMaterial(m.url, m.name)}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <View style={{ width: 36, alignItems: "center", justifyContent: "center" }}>
          {materialTypeIcon(m.type, p.textSecondary)}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="bold" numberOfLines={1}>
            {m.name}
          </T>
          <T variant="sm" color="muted" numberOfLines={1}>
            {`${materialCourseName(m)} · ${typeLabel(m.type)} · ${sizeLabel(m.sizeBytes)}`}
          </T>
        </View>
        <Badge label={typeLabel(m.type)} tone="grey" mono />
      </View>
    </LedgerRow>
  );
});

export default function MaterialsScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["me", "materials", scope],
    queryFn: () => studentApi.materials(),
  });

  /* Referentially stable rows (feed.data is cached by TanStack) — keeps
   * the filter useMemos' deps from churning every render. */
  const rows = useMemo(() => feed.data ?? [], [feed.data]);

  /* Filter state (course × type) — client-side over the full feed. */
  const [filterOpen, setFilterOpen] = useState(false);
  const [course, setCourse] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [draftCourse, setDraftCourse] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<string | null>(null);
  const filterArmed = useArmOnOpen(filterOpen);

  const courses = useMemo(
    () => Array.from(new Set(rows.map((m) => materialCourseName(m)))).sort(),
    [rows],
  );
  const types = useMemo(
    () => Array.from(new Set(rows.map((m) => m.type))).filter((t) => t in MATERIAL_TYPE_LABEL),
    [rows],
  );
  const filtered = useMemo(
    () => rows.filter((m) => materialMatches(m, course, type)),
    [rows, course, type],
  );
  const filterActive = course !== null || type !== null;
  const typeLabel = (t: string) => MATERIAL_TYPE_LABEL[t] ?? t;

  return (
    <Screen scroll={false} padded={false}>
      <AppStatusBar />
      <StackHeader title="موادي التعليمية" kicker="ملفّات مقرّراتك في مكان واحد" />
      <View style={{ flex: 1 }}>
        <DataList
          data={filtered}
          renderItem={({ item, index }) => (
            <MaterialRowItem
              item={item}
              last={index === filtered.length - 1}
              typeLabel={typeLabel}
            />
          )}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={
            <View style={{ gap: sp[8] }}>
              <SectionBar
                index={1}
                title={filterActive ? "ملفّات حديثة — مُصفّاة" : "ملفّات حديثة"}
                action={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    {rows.length > 0 ? (
                      <T variant="xs" color="muted">
                        {latn(filtered.length)}
                      </T>
                    ) : null}
                    <Button
                      label="تصفية"
                      kind="ghost"
                      small
                      onPress={() => {
                        haptics.impact("light");
                        setDraftCourse(course);
                        setDraftType(type);
                        setFilterOpen(true);
                      }}
                      icon={<SlidersHorizontal size={14} color={p.text} />}
                    />
                  </View>
                }
              />
              {rows.length > 0 ? (
                <T variant="sm" color="muted">
                  {filterActive
                    ? `${countAr(filtered.length, ["ملفّ واحد مطابق", "ملفّان مطابقان", "ملفّات مطابقة", "ملفاً مطابقاً"])} من ${filesCount(rows.length)}`
                    : filesCount(rows.length)}
                </T>
              ) : null}
              {filterActive ? (
                <T variant="xs" color="muted">
                  تُطبَّق التصفية على كامل موادّك — أعد الضبط لعرض كل الملفات.
                </T>
              ) : null}
            </View>
          }
          isLoading={feed.isLoading}
          isError={feed.isError}
          errorMessage={feed.isError ? humanizeError(feed.error) : null}
          onRetry={() => feed.refetch()}
          refetch={feed.refetch}
          isRefetching={feed.isRefetching}
          emptySlot={
            <EmptyState
              room="library"
              title="لا توجد ملفات"
              message="ستظهر هنا فور رفع موادّ في أيٍّ من مقرّراتك المسجَّلة."
            />
          }
          contentPadding={{ horizontal: 20, bottom: 24 }}
          extraData={{ course, type }}
        />
      </View>
      {filterArmed ? (
        <FilterSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="تصفية المواد"
          onApply={() => {
            haptics.selection();
            setCourse(draftCourse);
            setType(draftType);
          }}
          onReset={() => {
            setDraftCourse(null);
            setDraftType(null);
          }}
        >
          <View style={{ gap: sp[4] }}>
            <T variant="sm" weight="bold">
              المقرّر
            </T>
            <FilterChip
              label="كل المقرّرات"
              selected={draftCourse === null}
              onPress={() => {
                haptics.selection();
                setDraftCourse(null);
              }}
            />
            {courses.map((c) => (
              <FilterChip
                key={c}
                label={c}
                selected={draftCourse === c}
                onPress={() => {
                  haptics.selection();
                  setDraftCourse(c);
                }}
              />
            ))}
            <T variant="sm" weight="bold" style={{ paddingTop: sp[8] }}>
              نوع الملف
            </T>
            <FilterChip
              label="كل الأنواع"
              selected={draftType === null}
              onPress={() => {
                haptics.selection();
                setDraftType(null);
              }}
            />
            {types.map((t) => (
              <FilterChip
                key={t}
                label={typeLabel(t)}
                selected={draftType === t}
                onPress={() => {
                  haptics.selection();
                  setDraftType(t);
                }}
              />
            ))}
          </View>
        </FilterSheet>
      ) : null}
    </Screen>
  );
}

/** Radio-style filter row (44pt target, check mark ends the row in RTL). */
function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Button
      label={label}
      kind={selected ? "primary" : "ghost"}
      small
      onPress={onPress}
      accessibilityLabel={selected ? `${label} — محدَّد` : label}
      icon={selected ? <CircleCheck size={14} color={p.primaryFg} /> : undefined}
      style={{ alignSelf: "flex-start" }}
    />
  );
}
