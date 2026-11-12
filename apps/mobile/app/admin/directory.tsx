/**
 * admin/directory — r349-P4: «دليل التواصل» على الموبايل.
 *
 * The staff contact sheet over the shaped /directory payloads (web
 * PeopleDirectoryPage parity, mobile-sized): kind segmented (طلاب /
 * مدرّسون), debounced server search, infinite pagination. Each row is
 * the privacy-shaped payload itself — a masked phone renders masked,
 * a hidden one renders «خاص» — and the tap opens PersonContactSheet
 * (اتصال / واتساب / نسخ / طلب تواصل on the native lanes).
 *
 * The rows carry PROFILE ids (the shaper's ids), which is exactly what
 * /people/:id reads — unlike the (tabs) students/teachers rosters,
 * which ride the user-level /admin/users and can't reach the person
 * read without a join the API doesn't offer.
 */
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import Phone from "lucide-react-native/icons/phone";
import { useQueryClient } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { DataList, LedgerRow, makeRow, usePagedList } from "@/components/ui/data";
import { SearchBar, Segmented } from "@/components/ui/fields";
import { peopleApi, type Person } from "@/api/people";
import { PersonContactSheet, personDisplayName } from "@/features/common/PersonContactSheet";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useStaggerEntrance } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { initials } from "@/lib/format";
import { UserAvatar, avatarUrlOf } from "@/features/governance/components";
import { usePalette } from "@/design/theme";

const PAGE_LIMIT = 20;

const KIND_OPTIONS = [
  { id: "student", label: "الطلاب" },
  { id: "teacher", label: "المدرّسون" },
];

export default function AdminDirectory() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [kind, setKind] = useState<"student" | "teacher">("student");
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const entering = useStaggerEntrance({ base: 40, step: 60 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* Debounced server search — the same 300ms cadence as the roster tabs. */
  const appliedRef = useRef(appliedQ);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedRef.current) return;
      appliedRef.current = next;
      setAppliedQ(next);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const directory = usePagedList<Person>({
    queryKey: ["people", "directory", { kind, q: appliedQ }, scope],
    fetchPage: (page) =>
      peopleApi.directory({ kind, q: appliedQ || undefined, page, limit: PAGE_LIMIT }),
    limit: PAGE_LIMIT,
    staleTime: 30_000,
  });

  const closeSheet = () => {
    setSelectedId(null);
    // The sheet's contact-request may have changed nothing the list shows,
    // but the read audit trail and any follow-up notifications deserve a
    // fresh page on return.
    qc.invalidateQueries({ queryKey: ["people"] });
  };

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/admin/alerts" />
      <Animated.View entering={entering(0)} style={{ paddingHorizontal: 20, gap: 12, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            دليل التواصل
          </T>
          <T variant="body" color="muted">
            أرقام التواصل على ملفات المؤسّسة — يحكمها إعداد الظهور لدى كل صاحب ملف.
          </T>
        </View>
        <Segmented
          options={KIND_OPTIONS}
          selectedId={kind}
          onSelect={(id) => {
            haptics.selection();
            setKind(id as "student" | "teacher");
          }}
        />
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="ابحث بالاسم أو رقم الهاتف…"
          onClear={() => {
            haptics.selection();
            setQ("");
          }}
        />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <DataList
          data={directory.items}
          renderItem={({ item }) => (
            <DirectoryRow item={item} onPress={() => {
              haptics.selection();
              setSelectedId(item.id);
            }} />
          )}
          keyExtractor={(person) => person.id}
          isLoading={directory.isLoading}
          isError={directory.isError}
          errorMessage={humanizeError(directory.query.error)}
          onRetry={() => directory.refetch()}
          refetch={directory.refetch}
          isRefetching={directory.isRefetching}
          onEndReached={directory.onEndReached}
          isFetchingNextPage={directory.isFetchingNextPage}
          hasNextPage={directory.hasNextPage}
          loadMoreError={directory.loadMoreError}
          onRetryLoadMore={directory.retryLoadMore}
          emptyTitle={appliedQ ? "لا توجد نتائج" : "لا يوجد ملفات بعد"}
          emptyMessage={
            appliedQ
              ? "جرّب تعديل البحث أو البحث برقم الهاتف (أوّله تكفي)."
              : "ستظهر الملفات فور اعتماد أوّل طالب أو مدرّس في النظام."
          }
          contentPadding={{ horizontal: 20, top: 8, bottom: 24 }}
        />
      </View>
      {selectedId ? <PersonContactSheet personId={selectedId} onClose={closeSheet} /> : null}
    </Screen>
  );
}

/* ─── the shaped directory row (module scope, memo-stable) ─── */

const DirectoryRow = makeRow<Person, { onPress: (person: Person) => void }>(
  ({ item, onPress }) => {
    const name = personDisplayName(item);
    const sub =
      item.kind === "student"
        ? [
            item.faculty?.name,
            item.department?.name,
            item.universityId ? `رقم القيد: ${item.universityId}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || "—"
        : [
            item.department?.name,
            item.specialty,
          ]
            .filter(Boolean)
            .join(" · ") || "—";
    return (
      <LedgerRow onPress={() => onPress(item)} accessibilityLabel={`بيانات اتصال ${name}`}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <UserAvatar
            url={avatarUrlOf(item.user)}
            initials={item.user.avatarInitials ?? initials(item.user.firstName, item.user.lastName)}
            color={item.user.avatarColor}
            size={36}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" weight="bold" numberOfLines={1}>
              {name}
            </T>
            <T variant="xs" color="muted" numberOfLines={1}>
              {sub}
            </T>
          </View>
          <PhonePreview person={item} />
        </View>
      </LedgerRow>
    );
  },
);

/** The shaped phone as a trailing preview: the display, «مقنّع», or «خاص». */
function PhonePreview({ person }: { person: Person }) {
  const p = usePalette();
  if (person.phone.access === "HIDDEN" || !person.phone.display) {
    return <Badge label="خاص" tone="grey" />;
  }
  if (person.phone.access === "MASKED") {
    return <Badge label="مقنّع" tone="yellow" />;
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <Phone size={13} color={p.textMuted} />
      <T variant="xs" color="muted" style={{ direction: "ltr" }} numberOfLines={1}>
        {person.phone.display}
      </T>
    </View>
  );
}
