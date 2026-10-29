import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Headset } from "lucide-react-native";
import { catalogApi } from "@/api/catalog";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { num } from "@/lib/format";
import { SectionNote, countAr } from "@/features/student/more";

/**
 * /student/ar — واقع افتراضي ومعزز (web ArVrPage parity): the honest
 * read-only catalog of seeded AR/VR experiences — an index for browsing,
 * no launch action (the operator is not built yet).
 */
export default function ArScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["ar-experiences", scope],
    queryFn: () => catalogApi.arExperiences(),
    placeholderData: (p) => p,
  });
  const rows = feed.data ?? [];

  return (
    <Screen scroll>
      <StackHeader title="واقع افتراضي ومعزز" kicker="تجارب AR / VR" />
      <SectionNote>فهرس تجارب AR/VR للمقرّرات العمليّة — فهرس للاستعراض، والتشغيل غير متاح بعد.</SectionNote>

      {feed.isLoading ? (
        <SkeletonList rows={3} rowHeight={72} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Headset size={24} color={p.textFaint} />}
          title="لا توجد تجارب AR/VR بعد"
          message="ستظهر هنا حين يضيفها المسجل العام."
        />
      ) : (
        <RowList>
          {rows.map((e, i) => (
            <LedgerRow key={e.id} last={i === rows.length - 1} accessibilityLabel={`تجربة: ${e.title}`}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <View style={{ flex: 1 }}>
                  <T variant="bodyLg" weight="bold">
                    {e.title}
                  </T>
                </View>
                <Badge label={e.type === "VR" ? "VR" : "AR"} tone={e.type === "VR" ? "lavender" : "copper"} mono />
              </View>
              {e.description ? (
                <T variant="sm" color="secondary" numberOfLines={3}>
                  {e.description}
                </T>
              ) : null}
            </LedgerRow>
          ))}
        </RowList>
      )}

      <Card style={{ gap: sp[4] }}>
        <T variant="sm" weight="bold">
          {`التجارب المفهرسة: ${num(rows.length)}`}
        </T>
        <T variant="xs" color="muted">
          {countAr(rows.length, ["تجربة واحدة مفهرسة", "تجربتان مفهرستان", "تجارب مفهرسة", "تجربةً مفهرسة"])} —
          فهرس للاستعراض فقط حتى إطلاق المشغّل.
        </T>
      </Card>
    </Screen>
  );
}
