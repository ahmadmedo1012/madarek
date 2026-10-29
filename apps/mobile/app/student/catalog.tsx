/**
 * /student/catalog — دليل المقرّرات (web CatalogPage parity, read-only):
 * the institution's course catalog with search + pagination. Enrollment
 * in this product is ADMIN-MEDIATED — the honest-door banner says so
 * and the cards render catalogue info only (no enroll button).
 */
import { View } from "react-native";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Info } from "lucide-react-native";
import { learningApi } from "@/api/learning";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge } from "@/components/ui/surfaces";
import { SearchBar } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn } from "@/lib/format";
import { countAr } from "@/features/student/more";
import { CourseWell, PushFrame } from "@/features/student/components";

const PAGE_SIZE = 12;

export default function CatalogScreen() {
  const scope = useInstitutionScope();
  const p = usePalette();
  const slug = useSession((s) => s.user?.currentInstitution?.slug ?? null);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);

  /* 250ms debounce — the LibraryPage convention; a changed term restarts at page 1. */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  const catalog = useQuery({
    queryKey: ["courses", "catalog", debouncedQ, page, scope],
    queryFn: () =>
      learningApi.courses({ page, limit: PAGE_SIZE, q: debouncedQ || undefined, institutionSlug: slug ?? undefined }),
    placeholderData: (prev) => prev,
  });

  const rows = catalog.data?.data ?? [];
  const meta = catalog.data?.meta;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  /* A narrowed search can leave the pointer past the last page — fold back. */
  useEffect(() => {
    if (meta && page > Math.max(1, meta.totalPages)) {
      setPage(Math.max(1, meta.totalPages));
    }
  }, [meta, page]);

  const searching = debouncedQ.length > 0;

  return (
    <PushFrame
      title="دليل المقرّرات"
      kicker="مرجع للقراءة فقط"
      refreshing={catalog.isFetching && !catalog.isLoading}
      onRefresh={() => catalog.refetch()}
    >
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

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="ابحث باسم المقرّر أو رمزه…"
        onClear={() => {
          setQ("");
          setDebouncedQ("");
        }}
      />

      {catalog.isError ? (
        <ErrorState message={(catalog.error as Error).message} onRetry={() => catalog.refetch()} />
      ) : !slug ? (
        <EmptyState
          icon={<BookOpen size={22} color="#62625F" />}
          title="لم تُحدَّد مؤسستك بعد"
          message="اختر مؤسستك من مبدّل المؤسسة لعرض دليل مقرّراتها."
        />
      ) : catalog.isLoading ? (
        <SkeletonList rows={6} rowHeight={72} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={searching ? "لا توجد مقرّرات تطابق البحث" : "لا توجد مقرّرات بعد"}
          message={
            searching
              ? `لم نجد مقرّراً يطابق «${debouncedQ}» — جرّب كلمات أخرى.`
              : "لم تُضف مقرّرات إلى دليل مؤسستك حتى الآن — ستظهر هنا فور إضافتها من المسجل العام."
          }
        />
      ) : (
        <>
          <SectionBar
            index={1}
            title="مقرّرات المؤسسة"
            action={
              <T variant="xs" color="muted">
                {latn(meta?.total ?? rows.length)}
              </T>
            }
          />
          <T variant="sm" color="muted">
            {countAr(meta?.total ?? rows.length, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])}
            {searching ? ` · نتائج البحث عن «${debouncedQ}»` : ""}
          </T>
          <RowList>
            {rows.map((c, i) => (
              <LedgerRow key={c.id} last={i === rows.length - 1} accessibilityLabel={`مقرّر ${c.name}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <CourseWell emoji={c.iconEmoji} color={c.themeColor} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="bodyLg" weight="bold" numberOfLines={1}>
                      {c.name}
                    </T>
                    <T variant="xs" color="muted" numberOfLines={1}>
                      {c.department?.name ?? "قسم غير محدَّد"}
                    </T>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                  <Badge label={c.code} tone="grey" mono />
                  {c.credits != null && c.credits > 0 ? (
                    <T variant="xs" color="secondary">
                      {countAr(c.credits, ["ساعة معتمدة واحدة", "ساعتان معتمدتان", "ساعات معتمدة", "ساعة معتمدة"])}
                    </T>
                  ) : null}
                  {c.institution ? (
                    <T variant="xs" color="faint" numberOfLines={1}>
                      {c.institution.name}
                    </T>
                  ) : null}
                </View>
              </LedgerRow>
            ))}
          </RowList>

          {meta && totalPages > 1 ? (
            <View style={{ gap: sp[8] }}>
              <T variant="xs" color="muted">
                {`الصفحة ${latn(page)} من ${latn(totalPages)} · ${countAr(meta.total, [
                  "مقرّر واحد",
                  "مقرّران",
                  "مقرّرات",
                  "مقرّراً",
                ])}`}
              </T>
              <View style={{ flexDirection: "row", gap: sp[8] }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="السابق"
                    kind="ghost"
                    small
                    disabled={page <= 1}
                    onPress={() => setPage((v) => Math.max(1, v - 1))}
                    accessibilityLabel="الصفحة السابقة"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="التالي"
                    kind="ghost"
                    small
                    disabled={page >= totalPages}
                    onPress={() => setPage((v) => Math.min(totalPages, v + 1))}
                    accessibilityLabel="الصفحة التالية"
                  />
                </View>
              </View>
            </View>
          ) : null}
        </>
      )}
    </PushFrame>
  );
}
