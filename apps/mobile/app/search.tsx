/**
 * /search — the discovery search screen (r353-F).
 *
 * GET /search/discover: the 15 typed categories of the backend's
 * discovery engine, one debounced (300ms) query per settled term, the
 * superseded term's GET aborted through TanStack's signal (the client
 * chains it onto the transport), the role filter riding the backend
 * `categories` param (a student never asks for people/bank rows), and
 * ONE-LINE rows — title + one meta. Pure mapping lives in
 * src/features/search/discoverLogic.ts (pinned by its colocated net).
 */
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react-native";
import Book from "lucide-react-native/icons/book";
import BookOpen from "lucide-react-native/icons/book-open";
import Briefcase from "lucide-react-native/icons/briefcase";
import Building from "lucide-react-native/icons/building";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import CirclePlay from "lucide-react-native/icons/circle-play";
import CircleQuestionMark from "lucide-react-native/icons/circle-question-mark";
import FileText from "lucide-react-native/icons/file-text";
import GraduationCap from "lucide-react-native/icons/graduation-cap";
import Landmark from "lucide-react-native/icons/landmark";
import Megaphone from "lucide-react-native/icons/megaphone";
import Network from "lucide-react-native/icons/network";
import Route from "lucide-react-native/icons/route";
import ScrollText from "lucide-react-native/icons/scroll-text";
import Users from "lucide-react-native/icons/users";
import { get } from "@/api/client";
import type { DiscoverKind, DiscoverResults } from "@/api/types";
import { useSession } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { SearchBar } from "@/components/ui/fields";
import { Card, Badge } from "@/components/ui/surfaces";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { Illustration } from "@/components/Illustration";
import { humanizeError } from "@/lib/errors";
import { discoverCategoriesForRole, flattenDiscoverSections } from "@/features/search/discoverLogic";

/** Kind → the row icon (the wire carries no emoji — the kind is the signal). */
const KIND_ICON: Record<DiscoverKind, LucideIcon> = {
  student: Users,
  teacher: GraduationCap,
  institution: Building,
  faculty: Landmark,
  department: Network,
  course: BookOpen,
  lecture: CirclePlay,
  material: FileText,
  paper: ScrollText,
  track: Route,
  book: Book,
  job: Briefcase,
  event: CalendarDays,
  announcement: Megaphone,
  question: CircleQuestionMark,
};

const MIN_QUERY = 2;

/** /search — platform-wide discovery across the 15 typed categories. */
export default function Search() {
  const p = usePalette();
  const role = useSession((s) => s.user?.role);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce 300ms — one query per settled term (the web pill's cadence).
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const categories = useMemo(() => discoverCategoriesForRole(role), [role]);

  const results = useQuery({
    queryKey: ["search", "discover", debounced, categories],
    enabled: debounced.length >= MIN_QUERY,
    queryFn: ({ signal }) =>
      get<DiscoverResults>(
        "/search/discover",
        { q: debounced, categories, pageSize: 5 },
        // r353-F: the superseded term's GET is aborted (the client
        // chains TanStack's signal onto the transport) instead of
        // racing the newer term.
        { signal },
      ),
  });

  const sections = useMemo(() => flattenDiscoverSections(results.data), [results.data]);

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
        placeholder="ابحث: مقرّرات، كليات، وظائف…"
        onClear={() => {
          setQ("");
          setDebounced("");
        }}
      />

      {debounced.length < MIN_QUERY ? (
        <EmptyState
          art={<Illustration id="r342/journey-route" width={342} accessibilityLabel="مسارات البحث" />}
          title="ابحث في المنصّة"
          message="حرفان — نتائج فورية من مقرّراتك ومكتبتك."
        />
      ) : results.isLoading ? (
        <SkeletonList rows={4} />
      ) : results.isError ? (
        <ErrorState
          message={humanizeError(results.error)}
          onRetry={() => results.refetch()}
        />
      ) : sections.length === 0 ? (
        <EmptyState title="لا نتائج" message={`لا شيء يطابق «${debounced}» في نطاق حسابك الحالي.`} />
      ) : (
        sections.map((s) => {
          const Icon = KIND_ICON[s.rows[0]?.kind ?? "course"] ?? BookOpen;
          return (
            <View key={s.key} style={{ gap: sp[8] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <Icon size={18} color={p.text} />
                <T variant="h4" weight="bold" style={{ flex: 1 }}>
                  {s.title}
                </T>
                <Badge label={String(s.rows.length)} tone="grey" mono />
              </View>
              {s.rows.map((r) => {
                const RowIcon = KIND_ICON[r.kind] ?? BookOpen;
                return (
                  <Card
                    key={r.id}
                    onPress={r.href ? () => navigate(r.href!) : undefined}
                    accessibilityLabel={r.title}
                  >
                    {/* ONE-LINE row: title + one meta on the same line. */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      <RowIcon size={16} color={p.textFaint} />
                      <T variant="body" weight="medium" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {r.title}
                      </T>
                      {r.meta ? (
                        <T variant="xs" color="muted" numberOfLines={1} style={{ flex: 1 }}>
                          {r.meta}
                        </T>
                      ) : null}
                    </View>
                  </Card>
                );
              })}
            </View>
          );
        })
      )}
    </Screen>
  );
}
