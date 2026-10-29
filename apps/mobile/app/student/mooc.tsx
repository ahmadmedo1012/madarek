import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { Linking } from "react-native";
import { GraduationCap } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { catalogApi } from "@/api/catalog";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { latn, num } from "@/lib/format";
import { SectionNote, countAr } from "@/features/student/more";
/**
 * /student/mooc — دورات MOOC (web MoocPage parity): the external-course
 * catalog. Registration happens on the provider's own site — the button
 * opens the real external page and says so honestly.
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
    <Screen scroll>
      <StackHeader title="دورات MOOC" kicker="دورات خارجية" />
      <SectionNote>
        دورات من منصّات تعليم عالمية وبرامج تدريبية معتمدة — التسجيل يتم على موقع المنصّة نفسها.
      </SectionNote>

      {feed.isLoading ? (
        <SkeletonList rows={5} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={24} color={p.textFaint} />}
          title="لا توجد دورات خارجية مرتبطة"
          message="يربط المسجل العام دورات Coursera وedX المعتمدة بمقرّراتك؛ راجع المرشد الأكاديمي."
        />
      ) : (
        <RowList>
          {rows.map((m, i) => (
            <LedgerRow key={m.id} last={i === rows.length - 1} accessibilityLabel={`دورة: ${m.title}`}>
              <T variant="bodyLg" weight="bold">
                {m.title}
              </T>
              <View style={{ gap: sp[4] }}>
                <T variant="sm" color="secondary">
                  {m.provider ?? "جهة خارجية"}
                </T>
              </View>
              {m.url ? (
                <View style={{ alignSelf: "flex-start" }}>
                  <Button
                    label="سجّل الآن"
                    kind="primary"
                    small
                    onPress={() => open(m.url)}
                    accessibilityLabel={`فتح صفحة التسجيل في ${m.title} — يفتح خارج التطبيق`}
                  />
                </View>
              ) : null}
              <T variant="xs" color="faint">
                يفتح خارج التطبيق في متصفح النظام.
              </T>
            </LedgerRow>
          ))}
        </RowList>
      )}
      <Card style={{ gap: sp[4] }}>
        <T variant="sm" weight="bold">
          {`الدورات المتاحة: ${num(rows.length)}`}
        </T>
        <T variant="xs" color="muted">
          {countAr(rows.length, ["دورة خارجية واحدة", "دورتان خارجيتان", "دورات خارجية", "دورة خارجية"])} مرتبطة بالمقرّرات — التسجيل خارج التطبيق.
        </T>
      </Card>
    </Screen>
  );
}
