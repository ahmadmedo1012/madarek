/**
 * /student/courses/[offeringId] — تفاصيل المقرّر (R334 Round-2 recompose):
 * a STICKY identity header (course well + progress ring + schedule
 * chips), segmented tabs «المحاضرات / المواد / الإعلانات»
 * (haptics.selection on switch), a DataList per tab (lectures can be
 * long), watch-state chips in semantic feedback tones (mint/copper/grey
 * — never a second accent), file-type icons + sizes on materials,
 * OFFERING-scoped announcements, and course actions (share/report) via
 * ActionSheet. expo-image carries lecture posters.
 */
import { Pressable, Share, StyleSheet, View } from "react-native";
import { useMemo, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Animated from "react-native-reanimated";
import { Image } from "expo-image";
import Archive from "lucide-react-native/icons/archive";
import FileText from "lucide-react-native/icons/file-text";
import Flag from "lucide-react-native/icons/flag";
import ImageIcon from "lucide-react-native/icons/image";
import Megaphone from "lucide-react-native/icons/megaphone";
import Ellipsis from "lucide-react-native/icons/ellipsis";
import Presentation from "lucide-react-native/icons/presentation";
import Share2 from "lucide-react-native/icons/share-2";
import Video from "lucide-react-native/icons/video";
import { learningApi } from "@/api/learning";
import { socialApi } from "@/api/social";
import type { Announcement, Lecture, Material } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { Screen } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { DataList, makeRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { ActionSheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { StackHeader } from "@/components/shell/AppTopBar";
import { PressableScale, RingProgress, useStaggerEntrance } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { dayName, fromNow, latn, pct, sizeLabel } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { CourseWell, mmss, openMaterial } from "@/features/student/components";
import {
  isOfferingAnnouncement,
  lectureChip,
  lecturesProgress,
  type ScopedAnnouncement,
} from "@/features/student/coursesLogic";

/* ══ shared bits ══════════════════════════════════════════════════════ */

/** Entrance stagger cap — beyond 8 children the rhythm stops (motion doc). */
const STAGGER_CAP = 8;

function useCardEntrance(index: number) {
  const enter = useStaggerEntrance({ base: 60, step: 60 });
  return index < STAGGER_CAP ? enter(index) : undefined;
}

type CourseTab = "lectures" | "materials" | "announcements";

const COURSE_TABS: { key: CourseTab; label: string }[] = [
  { key: "lectures", label: "المحاضرات" },
  { key: "materials", label: "المواد" },
  { key: "announcements", label: "الإعلانات" },
];

/* ══ segmented tabs (active state = the screen's one accent chrome) ═══ */

function CourseTabs({ tab, onChange }: { tab: CourseTab; onChange: (t: CourseTab) => void }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="أقسام المقرّر"
      style={{ flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}
    >
      {COURSE_TABS.map(({ key, label }) => {
        const active = tab === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (tab !== key) {
                haptics.selection();
                onChange(key);
              }
            }}
            style={{
              /* minHeight, not height — a 200% font may wrap the label;
               * the 44pt floor stays. */
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? p.accentSoft : "transparent",
            }}
          >
            <T variant="sm" weight={active ? "bold" : "medium"} style={{ color: active ? p.accentInk : p.textSecondary }}>
              {label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ══ lectures tab — watch-state chips + expo-image posters ════════════ */

const LectureRow = makeRow<Lecture, { index: number }>(({ item, index }) => {
  const p = usePalette();
  const entering = useCardEntrance(index);
  const chip = lectureChip(item);
  const checkpoints = item._count?.checkpoints ?? 0;
  const answered = item.answers?.length ?? 0;
  const pending = Math.max(0, checkpoints - answered);
  const poster = item.posterUrl && /^https?:\/\//.test(item.posterUrl) ? item.posterUrl : null;
  return (
    <Animated.View entering={entering}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`محاضرة ${latn(item.ordinal)}: ${item.title} — ${chip.label}`}
        onPress={() => router.push(`/student/lectures/${item.id}` as never)}
        style={{
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
          gap: sp[8],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          {poster ? (
            <Image
              source={{ uri: poster }}
              style={{ width: 72, height: 44, backgroundColor: p.surfaceHover }}
              contentFit="cover"
              transition={150}
              recyclingKey={item.id}
              accessibilityLabel={`غلاف محاضرة ${item.title}`}
            />
          ) : (
            <View
              style={{
                width: 72,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: p.surfaceHover,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: p.border,
              }}
            >
              <MonoLabel>{String(item.ordinal).padStart(2, "0")}</MonoLabel>
            </View>
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="bold" numberOfLines={1}>
              {item.title}
            </T>
            <T variant="xs" color="muted" numberOfLines={1}>
              {`${item.durationSec ? mmss(item.durationSec) : "—"} · ${countAr(item._count?.chapters ?? 0, [
                "فصل واحد",
                "فصلان",
                "فصول",
                "فصلاً",
              ])} · ${countAr(checkpoints, ["نقطة تفاعل واحدة", "نقطتا تفاعل", "نقاط تفاعل", "نقطة تفاعل"])}`}
            </T>
          </View>
          <Badge label={chip.label} tone={chip.tone} />
        </View>
        {pending > 0 ? (
          <T variant="xs" color="muted">
            {countAr(pending, [
              "نقطة تفاعل متبقية واحدة",
              "نقطتا تفاعل متبقيتان",
              "نقاط تفاعل متبقية",
              "نقطة تفاعل متبقية",
            ])}
          </T>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
});

/* ══ materials tab — file-type icons + sizes ══════════════════════════ */

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  PDF: "PDF",
  PPT: "PPT",
  DOC: "DOC",
  ZIP: "ZIP",
  VIDEO: "فيديو",
  IMAGE: "صورة",
  OTHER: "ملف",
};

function materialTypeLabel(type: string): string {
  return MATERIAL_TYPE_LABEL[type] ?? type;
}

const MATERIAL_ICON: Record<string, typeof FileText> = {
  PDF: FileText,
  DOC: FileText,
  PPT: Presentation,
  ZIP: Archive,
  VIDEO: Video,
  IMAGE: ImageIcon,
};

const MaterialRow = makeRow<Material, { index: number }>(({ item, index }) => {
  const p = usePalette();
  const entering = useCardEntrance(index);
  const Icon = MATERIAL_ICON[item.type?.toUpperCase?.() ?? ""] ?? FileText;
  return (
    <Animated.View entering={entering}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={`مادة: ${item.name} — ${materialTypeLabel(item.type)} ${sizeLabel(item.sizeBytes)}`}
        onPress={() => openMaterial(item.url, item.name)}
        style={{
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.surfaceHover,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: p.border,
            }}
          >
            <Icon size={18} color={p.textMuted} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="bold" numberOfLines={1}>
              {item.name}
            </T>
            <T variant="xs" color="muted" numberOfLines={1}>
              {`${materialTypeLabel(item.type)} · ${sizeLabel(item.sizeBytes)}`}
            </T>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
});

/* ══ announcements tab — OFFERING-scoped feed rows ════════════════════ */

const AnnouncementRow = makeRow<ScopedAnnouncement, { index: number }>(({ item, index }) => {
  const p = usePalette();
  const entering = useCardEntrance(index);
  const author = item.author ? `${item.author.firstName} ${item.author.lastName}` : null;
  return (
    <Animated.View entering={entering}>
      <View
        accessibilityLabel={`إعلان: ${item.title}`}
        style={{
          backgroundColor: p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: sp[12],
          gap: sp[6],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <View
            style={{
              width: 32,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: p.surfaceHover,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: p.border,
            }}
          >
            <Megaphone size={16} color={p.textMuted} />
          </View>
          <T variant="body" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
            {item.title}
          </T>
          {item.pinned ? <Badge label="مثبّت" tone="yellow" /> : null}
        </View>
        {item.body ? (
          <T variant="sm" color="secondary" numberOfLines={3}>
            {item.body}
          </T>
        ) : null}
        <T variant="xs" color="faint">
          {`${fromNow(item.publishedAt)}${author ? ` · ${author}` : ""}`}
        </T>
      </View>
    </Animated.View>
  );
});

/* ══ the screen ═══════════════════════════════════════════════════════ */

export default function CourseDetailScreen() {
  const { offeringId } = useLocalSearchParams<{ offeringId: string }>();
  const scope = useInstitutionScope();
  const p = usePalette();

  const full = useQuery({
    queryKey: ["offerings", offeringId, "full", scope],
    queryFn: () => learningApi.offeringFull(offeringId),
    enabled: !!offeringId,
  });

  const announcements = useQuery({
    queryKey: ["announcements", "feed", scope],
    queryFn: () => socialApi.announcements(),
    enabled: !!offeringId,
  });

  const [tab, setTab] = useState<CourseTab>("lectures");
  /** Mount-on-demand: the sheet engine loads on first OPEN, not on screen mount. */
  const [actionsMounted, setActionsMounted] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const lectures = useMemo(
    () => [...(full.data?.lectures ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [full.data],
  );
  const materials = full.data?.materials ?? [];
  const schedule = useMemo(
    () => [...(full.data?.schedule ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [full.data],
  );
  const course = full.data?.course;
  const teacher = full.data?.teacher;
  const progress = lecturesProgress(lectures);

  const offeringAnnouncements = useMemo(
    () =>
      (announcements.data ?? [])
        .filter((a: Announcement): a is ScopedAnnouncement =>
          isOfferingAnnouncement(a as ScopedAnnouncement, offeringId),
        ),
    [announcements.data, offeringId],
  );

  const shareCourse = async () => {
    if (!course) return;
    try {
      await Share.share({
        message: `مقرّر «${course.name}» (${course.code})${
          teacher ? ` — د. ${teacher.firstName} ${teacher.lastName}` : ""
        } · فصل ${full.data?.term ?? ""}`,
        title: "مشاركة المقرّر",
      });
    } catch (e) {
      toast.error(humanizeError(e), "تعذّرت المشاركة");
    }
  };

  /* ── first-load tri-state for the whole screen ── */
  if (full.isLoading) {
    return (
      <Screen scroll={false} padded={false}>
        <StackHeader title="تفاصيل المقرّر" />
        <View style={{ paddingHorizontal: sp[20], paddingTop: sp[8] }}>
          <SkeletonList rows={6} rowHeight={72} />
        </View>
      </Screen>
    );
  }
  if (full.isError || !full.data) {
    return (
      <Screen scroll={false} padded={false}>
        <StackHeader title="تفاصيل المقرّر" onBack={() => router.back()} />
        <View style={{ paddingHorizontal: sp[20], paddingTop: sp[8] }}>
          <ErrorState message={humanizeError(full.error)} onRetry={() => full.refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader
        title={course?.name ?? "تفاصيل المقرّر"}
        kicker={course?.code}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إجراءات المقرّر"
            onPress={() => {
              setActionsMounted(true);
              setActionsOpen(true);
            }}
            style={{ width: touchFloor, height: touchFloor, alignItems: "center", justifyContent: "center" }}
          >
            <Ellipsis size={22} color={p.text} />
          </Pressable>
        }
      />

      {/* sticky identity header — never scrolls away */}
      <View style={{ paddingHorizontal: sp[20], gap: sp[12] }}>
        <Card style={{ gap: sp[10] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
            <CourseWell emoji={course?.iconEmoji} color={course?.themeColor} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              {/* 2 lines, not 1 — long course titles survive a 200% font. */}
              <T variant="bodyLg" weight="bold" numberOfLines={2}>
                {course?.name}
              </T>
              <T variant="xs" color="muted" numberOfLines={1}>
                {course?.department?.name ?? "قسم غير محدَّد"}
                {course?.faculty ? ` · ${course.faculty.name}` : ""}
              </T>
            </View>
            <RingProgress
              size={48}
              thickness={4}
              progress={progress / 100}
              accessibilityLabel={`تقدّمك في المنهج ${pct(progress)}`}
            >
              <T variant="xs" weight="bold">{pct(progress)}</T>
            </RingProgress>
          </View>

          <T variant="sm" color="secondary">
            {teacher ? `د. ${teacher.firstName} ${teacher.lastName}` : "بلا أستاذ مسجَّل"}
            {course?.credits
              ? ` · ${countAr(course.credits, ["ساعة معتمدة واحدة", "ساعتان معتمدتان", "ساعات معتمدة", "ساعة معتمدة"])}`
              : ""}
          </T>
          <T variant="xs" color="muted">
            {`فصل ${full.data.term} · القاعة ${full.data.room ?? "تُحدَّد لاحقاً"}`}
          </T>
          {course?.description ? (
            <T variant="body" color="secondary" numberOfLines={3}>
              {course.description}
            </T>
          ) : null}
          {schedule.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6] }}>
              {schedule.map((s) => (
                <View
                  key={s.id}
                  style={{
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: p.border,
                    paddingHorizontal: sp[8],
                    paddingVertical: 3,
                    backgroundColor: p.surfaceHover,
                  }}
                >
                  <T variant="xs" color="secondary">
                    {`${dayName(s.dayOfWeek)} ${s.startTime}`}
                  </T>
                </View>
              ))}
            </View>
          ) : null}
          <T variant="xs" color="muted">
            {`${pct(progress)} · ${countAr(
              lectures.filter((l) => l.watchEvents?.[0]?.completed).length,
              ["محاضرة مكتملة", "محاضرتان مكتملتان", "محاضرات مكتملة", "محاضرة مكتملة"],
            )} من ${latn(lectures.length)}`}
          </T>
        </Card>

        <CourseTabs tab={tab} onChange={setTab} />
      </View>

      {/* the tab body — DataList IS the scroller (flex: 1) */}
      <View style={{ flex: 1, paddingTop: sp[12] }}>
        {tab === "lectures" ? (
          <DataList
            data={lectures}
            renderItem={({ item, index }) => <LectureRow item={item} index={index} />}
            keyExtractor={(l) => l.id}
            refetch={() => full.refetch()}
            isRefetching={full.isRefetching}
            emptyTitle="لا توجد محاضرات"
            emptyMessage="لم تُرفع محاضرات بعد — سيضيفها الأستاذ تباعاً مع تقدّم الفصل."
            emptySlot={
              <EmptyState
                room="lecture-hall"
                title="لا توجد محاضرات"
                message="لم تُرفع محاضرات بعد — سيضيفها الأستاذ تباعاً مع تقدّم الفصل."
              />
            }
            contentPadding={{ horizontal: 20, bottom: 24 }}
          />
        ) : tab === "materials" ? (
          <DataList
            data={materials}
            renderItem={({ item, index }) => <MaterialRow item={item} index={index} />}
            keyExtractor={(m) => m.id}
            refetch={() => full.refetch()}
            isRefetching={full.isRefetching}
            emptyTitle="لا توجد ملفات"
            emptyMessage="ستظهر مواد المقرّر هنا فور رفع الأستاذ لها."
            emptySlot={
              <EmptyState
                room="library"
                title="لا توجد ملفات"
                message="ستظهر مواد المقرّر هنا فور رفع الأستاذ لها."
              />
            }
            contentPadding={{ horizontal: 20, bottom: 24 }}
          />
        ) : (
          <DataList
            data={offeringAnnouncements}
            renderItem={({ item, index }) => <AnnouncementRow item={item} index={index} />}
            keyExtractor={(a) => a.id}
            isLoading={announcements.isLoading}
            isError={announcements.isError}
            errorMessage={humanizeError(announcements.error)}
            onRetry={() => announcements.refetch()}
            refetch={() => announcements.refetch()}
            isRefetching={announcements.isRefetching}
            emptyTitle="لا توجد إعلانات"
            emptyMessage="ستظهر إعلانات هذا المقرّر هنا فور نشرها."
            emptySlot={
              <EmptyState
                room="building"
                title="لا توجد إعلانات"
                message="ستظهر إعلانات هذا المقرّر هنا فور نشرها."
              />
            }
            contentPadding={{ horizontal: 20, bottom: 24 }}
          />
        )}
      </View>

      {actionsMounted ? (
        <ActionSheet
          open={actionsOpen}
          onClose={() => setActionsOpen(false)}
          title="إجراءات المقرّر"
          actions={[
            {
              label: "مشاركة المقرّر",
              icon: <Share2 size={18} color={p.text} />,
              onPress: () => void shareCourse(),
            },
            {
              label: "الإبلاغ عن مشكلة",
              icon: <Flag size={18} color={p.text} />,
              onPress: () => router.push("/report" as never),
            },
          ]}
        />
      ) : null}
    </Screen>
  );
}
