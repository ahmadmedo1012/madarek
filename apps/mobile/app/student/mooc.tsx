import { useQuery } from "@tanstack/react-query";
import { Linking, View } from "react-native";
import GraduationCap from "lucide-react-native/icons/graduation-cap";
import * as WebBrowser from "expo-web-browser";
import { catalogApi } from "@/api/catalog";
import type { MoocCourse } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { DataList, LedgerRow } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { num } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { SectionNote, countAr } from "@/features/student/more";

/** One external-course row — module scope for cheap FlashList re-renders. */
function MoocRow({ course, onOpen }: { course: MoocCourse; onOpen: (url: string | null | undefined) => void }) {
  return (
    <LedgerRow accessibilityLabel={`دورة: ${course.title}`}>
      <T variant="bodyLg" weight="bold">
        {course.title}
      </T>
      <View style={{ gap: sp[4] }}>
        <T variant="sm" color="secondary">
          {course.provider ?? "جهة خارجية"}
        </T>
      </View>
      {course.url ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Button
            label="سجّل الآن"
            kind="primary"
            small
            onPress={() => onOpen(course.url)}
            accessibilityLabel={`فتح صفحة التسجيل في ${course.title} — يفتح خارج التطبيق`}
          />
        </View>
      ) : null}
      <T variant="xs" color="faint">يفتح خارج التطبيق في متصفح النظام.</T>
    </LedgerRow>
  );
}

/**
 * /student/mooc — دورات MOOC (web MoocPage parity): the external-course
 * catalog. Registration happens on the provider's own site — the button
 * opens the real external page and says so honestly. The catalog rides
 * DataList (FlashList v2) — rows recycle as the registrar links more.
 */
export default function MoocScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["mooc", scope],
    queryFn: () => catalogApi.mooc(),
    placeholderData: (prev) => prev,
  });
  const rows = feed.data ?? [];

  const open = (url: string | null | undefined) => {
    if (!url) return;
    void WebBrowser.openBrowserAsync(url).catch(() => {
      void Linking.openURL(url).catch(() => toast.error("تعذّر فتح المتصفح الخارجي."));
    });
  };

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="دورات MOOC" kicker="دورات خارجية" />
      <DataList
        data={rows}
        renderItem={({ item }) => <MoocRow course={item} onOpen={open} />}
        keyExtractor={(m) => m.id}
        isLoading={feed.isLoading}
        isError={feed.isError}
        errorMessage={feed.isError ? humanizeError(feed.error) : null}
        onRetry={() => feed.refetch()}
        refetch={feed.refetch}
        isRefetching={feed.isRefetching}
        emptySlot={
          <EmptyState
            icon={<GraduationCap size={24} color={p.textFaint} />}
            title="لا توجد دورات خارجية مرتبطة"
            message="يربط المسجل العام دورات Coursera وedX المعتمدة بمقرّراتك؛ راجع المرشد الأكاديمي."
          />
        }
        ListHeaderComponent={
          <View style={{ paddingHorizontal: sp[16], paddingTop: sp[12], paddingBottom: sp[8], gap: sp[8] }}>
            <SectionNote>
              دورات من منصّات تعليم عالمية وبرامج تدريبية معتمدة — التسجيل يتم على موقع المنصّة نفسها.
            </SectionNote>
            {rows.length > 0 ? (
              <Card style={{ gap: sp[4] }}>
                <T variant="sm" weight="bold">{`الدورات المتاحة: ${num(rows.length)}`}</T>
                <T variant="xs" color="muted">
                  {countAr(rows.length, ["دورة خارجية واحدة", "دورتان خارجيتان", "دورات خارجية", "دورة خارجية"])} مرتبطة بالمقرّرات — التسجيل خارج التطبيق.
                </T>
              </Card>
            ) : null}
          </View>
        }
        contentPadding={{ horizontal: 16, bottom: 24 }}
      />
    </Screen>
  );
}
