/**
 * /student/materials — موادي التعليمية (web DownloadsPage parity):
 * every material across the active enrollments in one ledger — name,
 * type, size and course attribution; a tap downloads through the
 * authenticated PDF surface (/document/<filename>?ns=materials).
 */
import { useQuery } from "@tanstack/react-query";
import { FolderDown } from "lucide-react-native";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { sp } from "@/design/tokens";
import { View } from "react-native";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { sizeLabel } from "@/lib/format";
import { latn } from "@/lib/format";
import { countAr } from "@/features/student/more";
import {
  PushFrame,
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

export default function MaterialsScreen() {
  const scope = useInstitutionScope();
  const feed = useQuery({
    queryKey: ["me", "materials", scope],
    queryFn: () => studentApi.materials(),
  });

  const rows = feed.data ?? [];

  return (
    <PushFrame
      title="موادي التعليمية"
      kicker="ملفّات مقرّراتك في مكان واحد"
      refreshing={feed.isFetching && !feed.isLoading}
      onRefresh={() => feed.refetch()}
    >
      <SectionBar
        index={1}
        title="ملفّات حديثة"
        action={
          rows.length > 0 ? (
            <T variant="xs" color="muted">
              {latn(rows.length)}
            </T>
          ) : undefined
        }
      />

      {feed.isLoading ? (
        <SkeletonList rows={5} rowHeight={64} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FolderDown size={22} color="#62625F" />}
          title="لا توجد ملفّات بعد"
          message="ستظهر هنا فور رفع موادّ في أيٍّ من مقرّراتك المسجَّلة."
        />
      ) : (
        <View style={{ gap: sp[8] }}>
          <T variant="sm" color="muted">
            {filesCount(rows.length)}
          </T>
          <RowList>
            {rows.map((m, i) => (
              <LedgerRow
                key={m.id}
                last={i === rows.length - 1}
                accessibilityLabel={`ملف: ${m.name}`}
                onPress={() => openMaterial(m.url, m.name)}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                    {m.name}
                  </T>
                  <Badge label={MATERIAL_TYPE_LABEL[m.type] ?? m.type} tone="grey" mono />
                </View>
                <T variant="sm" color="muted" numberOfLines={1}>
                  {`${materialCourseName(m)} · ${MATERIAL_TYPE_LABEL[m.type] ?? m.type} · ${sizeLabel(m.sizeBytes)}`}
                </T>
              </LedgerRow>
            ))}
          </RowList>
          <T variant="xs" color="faint">
            {countAr(rows.length, ["ملفّ واحد", "ملفّان", "ملفّات", "ملفاً"])}
          </T>
        </View>
      )}
    </PushFrame>
  );
}
