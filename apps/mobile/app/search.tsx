import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, GraduationCap, PlayCircle } from "lucide-react-native";
import { get } from "@/api/client";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { SearchBar } from "@/components/ui/fields";
import { Card, Badge } from "@/components/ui/surfaces";
import { EmptyState, SkeletonList } from "@/components/ui/states";
import type { SearchResults } from "@/api/types";

/** /search — global search across courses, lectures, papers, training tracks. */
export default function Search() {
  const p = usePalette();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");

  const results = useQuery({
    queryKey: ["search", "global", submitted],
    enabled: submitted.trim().length > 0,
    queryFn: () => get<SearchResults>("/search/global", { q: submitted.trim() }),
  });

  const sections = useMemo(() => {
    const r = results.data;
    if (!r) return [];
    return [
      {
        key: "courses",
        title: "المقرّرات",
        icon: <BookOpen size={18} color={p.text} />,
        rows: (r.courses ?? []).map((c) => ({ label: `${c.name} (${c.code})`, href: c.href })),
      },
      {
        key: "lectures",
        title: "المحاضرات",
        icon: <PlayCircle size={18} color={p.text} />,
        rows: (r.lectures ?? []).map((l) => ({ label: l.title, href: l.href })),
      },
      {
        key: "papers",
        title: "البحوث",
        icon: <FileText size={18} color={p.text} />,
        rows: (r.papers ?? []).map((x) => ({ label: x.title, href: x.href })),
      },
      {
        key: "tracks",
        title: "مسارات التدريب",
        icon: <GraduationCap size={18} color={p.text} />,
        rows: (r.tracks ?? []).map((t) => ({ label: t.title, href: t.href })),
      },
    ].filter((s) => s.rows.length > 0);
  }, [results.data, p.text]);

  const navigate = (href: string) => {
    // hrefs come from the backend in web form (/student/courses/123…);
    // our native routes mirror web paths.
    if (href.startsWith("/")) router.push(href as never);
  };

  return (
    <Screen scroll>
      <PageHeader title="البحث" kicker="كل الأقسام" compact />
      <SearchBar
        value={q}
        onChange={setQ}
        autoFocus
        placeholder="ابحث في المقرّرات والمحاضرات والبحوث…"
        onClear={() => {
          setQ("");
          setSubmitted("");
        }}
      />
      {q.trim().length >= 2 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="تنفيذ البحث"
          onPress={() => setSubmitted(q.trim())}
          style={{ alignSelf: "flex-start" }}
        >
          <T variant="sm" weight="bold" color="accentInk">
            تنفيذ البحث عن «{q.trim()}»
          </T>
        </Pressable>
      ) : null}

      {submitted.length === 0 ? (
        <EmptyState title="ابحث في المنصّة" message="ابدأ بكتابة كلمتين — نتائج فورية من مقرّرك ومحاضراتك وبحوث مكتبتك." />
      ) : results.isLoading ? (
        <SkeletonList rows={4} />
      ) : results.isError ? (
        <T variant="body" color="muted">
          تعذّر جلب النتائج — {(results.error as Error).message}
        </T>
      ) : sections.length === 0 ? (
        <EmptyState title="لا نتائج" message={`لا شيء يطابق «${submitted}» في نطاق حسابك الحالي.`} />
      ) : (
        sections.map((s) => (
          <View key={s.key} style={{ gap: sp[8] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              {s.icon}
              <T variant="h4" weight="bold" style={{ flex: 1 }}>
                {s.title}
              </T>
              <Badge label={String(s.rows.length)} tone="grey" mono />
            </View>
            {s.rows.map((r, i) => (
              <Card key={i} onPress={() => navigate(r.href)} accessibilityLabel={r.label}>
                <T variant="body" weight="medium" numberOfLines={1}>
                  {r.label}
                </T>
              </Card>
            ))}
          </View>
        ))
      )}
    </Screen>
  );
}
