import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { useStaggerEntrance } from "@/motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import GraduationCap from "lucide-react-native/icons/graduation-cap";
import UserMinus from "lucide-react-native/icons/user-minus";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { DataList, LedgerRow, ProgressBar, makeRow, usePagedList } from "@/components/ui/data";
import { SearchBar, SelectField } from "@/components/ui/fields";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import type { AdminUserRow } from "@/api/admin";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { clamp01, initials, latn } from "@/lib/format";
import {
  UserAvatar,
  avatarUrlOf,
  type OfferingPickRow,
  type StudentEnrollmentRow,
} from "@/features/governance/components";

const PAGE_LIMIT = 20;

/** (tabs) Students roster — «إدارة الطلاب» (web AdminStudentsPage parity).
 *  DataList migration (R334 audit P0): FlashList rows + accumulate-style
 *  pagination (usePagedList + onEndReached) instead of ScrollView+map. */
export default function AdminStudents() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const entering = useStaggerEntrance({ base: 40, step: 60 });

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

  const users = usePagedList<AdminUserRow>({
    queryKey: ["admin", "users", { role: "STUDENT", q: appliedQ }, scope],
    fetchPage: (page) =>
      adminApi.users({ role: "STUDENT", page, q: appliedQ || undefined, limit: PAGE_LIMIT }),
    limit: PAGE_LIMIT,
  });

  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/admin/alerts" />
      {/* T-50 (review-3 §4.1): admin registry was a zero-motion seat —
          the title + search block takes the kit stagger. */}
      <Animated.View entering={entering(0)} style={{ paddingHorizontal: sp[20], gap: sp[16], paddingTop: sp[16] }}>
        <View>
          <T variant="h2" weight="bold">
            إدارة الطلاب
          </T>
          <T variant="body" color="muted">
            قائمة الطلاب المسجَّلين في الجامعة، مع البحث وإدارة التسجيلات.
          </T>
        </View>

        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="ابحث بالاسم أو البريد…"
          onClear={() => {
            haptics.selection();
            setQ("");
          }}
        />
      </Animated.View>
      <View style={{ flex: 1 }}>
        <DataList
          data={users.items}
          renderItem={({ item }) => (
            <StudentRow
              item={item}
              onSelect={(row) => {
                haptics.selection();
                setSelected(row);
              }}
            />
          )}
          keyExtractor={(s) => s.id}
          isLoading={users.isLoading}
          isError={users.isError}
          errorMessage={humanizeError(users.query.error)}
          onRetry={() => users.refetch()}
          refetch={users.refetch}
          isRefetching={users.isRefetching}
          onEndReached={users.onEndReached}
          isFetchingNextPage={users.isFetchingNextPage}
          hasNextPage={users.hasNextPage}
          loadMoreError={users.loadMoreError}
          onRetryLoadMore={users.retryLoadMore}
          emptyTitle={appliedQ ? "لا توجد نتائج" : "لا يوجد طلاب بعد"}
          emptyMessage={
            appliedQ
              ? "جرّب تعديل البحث لعرض نتائج أوسع."
              : "ستظهر القائمة فور تسجيل أوّل طالب في النظام."
          }
          contentPadding={{ horizontal: 20, top: 8, bottom: 24 }}
        />
      </View>

      {selected ? (
        <EnrollmentManager
          student={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: ["admin", "users"] });
          }}
        />
      ) : null}
    </Screen>
  );
}

/* ─── roster row (module scope, memo-stable) ─── */

const StudentRow = makeRow<AdminUserRow, { onSelect: (row: AdminUserRow) => void }>(
  ({ item, onSelect }) => (
    <LedgerRow
      onPress={() => onSelect(item)}
      accessibilityLabel={`بيانات وتسجيلات ${item.firstName} ${item.lastName}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <UserAvatar
          url={avatarUrlOf(item)}
          initials={item.avatarInitials ?? initials(item.firstName, item.lastName)}
          color={item.avatarColor}
          size={36}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="bold" numberOfLines={1}>
            {item.firstName} {item.lastName}
          </T>
          <T variant="xs" color="muted" numberOfLines={1}>
            {item.email}
          </T>
          <T variant="xs" color="faint" numberOfLines={1}>
            رقم القيد: {item.universityId || "—"}
          </T>
        </View>
        <Badge label={item.isActive ? "نشط" : "موقوف"} tone={item.isActive ? "mint" : "rose"} />
      </View>
    </LedgerRow>
  ),
);

/* ─── Enrollment manager sheet (web EnrollmentModal parity) ─── */

function EnrollmentManager({
  student,
  onClose,
  onChanged,
}: {
  student: AdminUserRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const enrollments = useQuery({
    queryKey: ["enrollments", "student", student.id, scope],
    queryFn: async () => (await adminApi.enrollments(student.id)) as StudentEnrollmentRow[],
  });
  const offerings = useQuery({
    queryKey: ["enrollments", "offerings", scope],
    queryFn: async () => (await adminApi.enrollmentOfferings()) as OfferingPickRow[],
    staleTime: 60_000,
  });

  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<StudentEnrollmentRow | null>(null);

  const invalidate = (studentId: string) => {
    qc.invalidateQueries({ queryKey: ["enrollments", "student", studentId] });
    qc.invalidateQueries({ queryKey: ["enrollments", "offerings"] });
  };

  const enroll = useMutation({
    mutationFn: () => adminApi.enroll({ studentId: student.id, offeringId: picked! }),
    onSuccess: () => {
      invalidate(student.id);
      onChanged();
      toast.success("تمّ التسجيل في المقرّر");
      setPicked(null);
    },
    onError: (e) => toast.error(humanizeError(e), "تعذَّر التسجيل"),
  });

  const unenroll = useMutation({
    mutationFn: (enrollmentId: string) => adminApi.unenroll(enrollmentId),
    onSuccess: () => {
      invalidate(student.id);
      onChanged();
      toast.success("تمّ إلغاء التسجيل");
      setConfirming(null);
    },
    onError: (e) => toast.error(humanizeError(e), "تعذَّر إلغاء التسجيل"),
  });

  const options = (offerings.data ?? []).map((o) => {
    const used = o._count?.enrollments ?? 0;
    const cap = o.capacity ?? 0;
    const full = cap > 0 && used >= cap;
    return {
      id: o.id,
      label: `${o.course?.name ?? "—"} (${o.course?.code ?? "—"})`,
      sub: `${o.term ?? "—"} · ${o.teacher?.firstName ?? ""} ${o.teacher?.lastName ?? ""}${
        full ? " — مكتمل" : ` — ${latn(used)}/${latn(cap)}`
      }`,
    };
  });

  return (
    <Sheet open onClose={onClose} title={`تسجيلات ${student.firstName} ${student.lastName}`}>
      <View style={{ gap: 12 }}>
        <T variant="sm" color="muted">
          إلغاء التسجيل يحذف تسجيل الطالب في المقرّر وتقدُّمه فيه نهائيًا — يمرّ كل إلغاء على تأكيد صريح قبل التنفيذ.
        </T>

        <T variant="sm" weight="bold">
          التسجيلات الحالية
        </T>
        {enrollments.isLoading ? (
          <View style={{ gap: 8 }}>
            <Skeleton h={44} />
            <Skeleton h={44} />
          </View>
        ) : enrollments.isError ? (
          <ErrorState message={humanizeError(enrollments.error)} onRetry={() => enrollments.refetch()} compact />
        ) : (enrollments.data ?? []).length === 0 ? (
          <T variant="body" color="muted">
            لا تسجيلات حاليًا.
          </T>
        ) : (
          <View style={{ gap: 8 }}>
            {(enrollments.data ?? []).map((e) => (
              <LedgerRow
                key={e.id}
                accessibilityLabel={`تسجيل في ${e.offering?.course?.name ?? "مقرّر"}${
                  typeof e.progressPct === "number"
                    ? ` — التقدُّم ${latn(Math.round(e.progressPct))}%`
                    : ""
                }`}
              >
                <View style={{ gap: 4 }}>
                  <T variant="body" weight="medium">
                    {e.offering?.course?.name ?? "—"}
                  </T>
                  <T variant="xs" color="muted">
                    {e.offering?.term ?? "—"} · {e.offering?.teacher?.firstName ?? ""}{" "}
                    {e.offering?.teacher?.lastName ?? ""}
                  </T>
                  {typeof e.progressPct === "number" ? (
                    <View style={{ paddingTop: 4 }}>
                      <ProgressBar ratio={clamp01(e.progressPct / 100)} label="التقدُّم" />
                      <T variant="xs" color="faint">
                        التقدُّم {latn(Math.round(e.progressPct))}%
                      </T>
                    </View>
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", paddingTop: 8 }}>
                  <Button
                    label="إلغاء التسجيل"
                    kind="ghost"
                    small
                    icon={<UserMinus size={13} color={p.accentInk} />}
                    onPress={() => setConfirming(e)}
                  />
                </View>
              </LedgerRow>
            ))}
          </View>
        )}

        <T variant="sm" weight="bold">
          تسجيل في مقرّر جديد
        </T>
        {offerings.isLoading ? (
          <Skeleton h={48} />
        ) : offerings.isError ? (
          <ErrorState message={humanizeError(offerings.error)} onRetry={() => offerings.refetch()} compact />
        ) : (offerings.data ?? []).length === 0 ? (
          <T variant="body" color="muted">
            لا توجد مقرّرات متاحة للتسجيل.
          </T>
        ) : (
          <View style={{ gap: 8 }}>
            <SelectField
              label="اختر المقرّر"
              value={options.find((o) => o.id === picked) ?? null}
              options={options}
              onSelect={setPicked}
              placeholder="— اختر مقرًّا —"
              sheetTitle="المقرّرات المتاحة"
            />
            <Button
              label={enroll.isPending ? "جارٍ التسجيل…" : "تسجيل"}
              kind="primary"
              icon={<GraduationCap size={14} color={p.primaryFg} />}
              disabled={!picked || enroll.isPending}
              onPress={() => enroll.mutate()}
            />
          </View>
        )}
      </View>

      <ConfirmDialog
        open={confirming !== null}
        title="إلغاء التسجيل"
        message={
          confirming
            ? `سيُحذف تسجيل الطالب في «${confirming.offering?.course?.name ?? "المقرّر"}» وتقدُّمه نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="إلغاء نهائي"
        danger
        loading={unenroll.isPending}
        onConfirm={() => confirming && unenroll.mutate(confirming.id)}
        onCancel={() => setConfirming(null)}
      />
    </Sheet>
  );
}
