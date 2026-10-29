import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, UserMinus } from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow, Avatar, ProgressBar } from "@/components/ui/data";
import { SearchBar, SelectField } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import type { AdminUserRow } from "@/api/admin";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { clamp01, initials, latn } from "@/lib/format";
import {
  countAr,
  pageOf,
  PagerFooter,
  UNIT,
  type OfferingPickRow,
  type StudentEnrollmentRow,
} from "@/features/governance/components";

const PAGE_LIMIT = 20;

/** (tabs) Students roster — «إدارة الطلاب» (web AdminStudentsPage parity). */
export default function AdminStudents() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [page, setPage] = useState(1);

  const appliedRef = useRef(appliedQ);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedRef.current) return;
      appliedRef.current = next;
      setAppliedQ(next);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const users = useQuery({
    queryKey: ["admin", "users", { role: "STUDENT", page, q: appliedQ }, scope],
    queryFn: async () => pageOf<AdminUserRow>(await adminApi.users({ role: "STUDENT", page, q: appliedQ || undefined, limit: PAGE_LIMIT })),
    placeholderData: (prev) => prev,
  });

  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const rows = users.data?.rows ?? [];

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/admin/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
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
            setQ("");
            setPage(1);
          }}
        />

        {users.isLoading ? (
          <SkeletonList rows={6} />
        ) : users.isError ? (
          <ErrorState message={(users.error as Error).message} onRetry={() => users.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={appliedQ ? "لا توجد نتائج" : "لا يوجد طلاب بعد"}
            message={
              appliedQ
                ? "جرّب تعديل البحث لعرض نتائج أوسع."
                : "ستظهر القائمة فور تسجيل أوّل طالب في النظام."
            }
            actionLabel={appliedQ ? "مسح البحث" : undefined}
            onAction={appliedQ ? () => setQ("") : undefined}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <RowList>
              {rows.map((s, i) => (
                <LedgerRow
                  key={s.id}
                  onPress={() => setSelected(s)}
                  accessibilityLabel={`بيانات وتسجيلات ${s.firstName} ${s.lastName}`}
                  last={i === rows.length - 1}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Avatar
                      initials={s.avatarInitials ?? initials(s.firstName, s.lastName)}
                      color={s.avatarColor}
                      size={36}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="bold" numberOfLines={1}>
                        {s.firstName} {s.lastName}
                      </T>
                      <T variant="xs" color="muted" numberOfLines={1}>
                        {s.email}
                      </T>
                      <T variant="xs" color="faint" numberOfLines={1}>
                        رقم القيد: {s.universityId || "—"}
                      </T>
                    </View>
                    <Badge label={s.isActive ? "نشط" : "موقوف"} tone={s.isActive ? "mint" : "rose"} />
                  </View>
                </LedgerRow>
              ))}
            </RowList>
            <PagerFooter
              page={page}
              rowsLength={rows.length}
              limit={PAGE_LIMIT}
              meta={users.data?.meta ?? null}
              unit={UNIT.student}
              onPage={setPage}
              loading={users.isFetching}
            />
          </View>
        )}
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
    onError: (e) => toast.error((e as ApiError).message, "تعذَّر التسجيل"),
  });

  const unenroll = useMutation({
    mutationFn: (enrollmentId: string) => adminApi.unenroll(enrollmentId),
    onSuccess: () => {
      invalidate(student.id);
      onChanged();
      toast.success("تمّ إلغاء التسجيل");
      setConfirming(null);
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذَّر إلغاء التسجيل"),
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
          <ErrorState message={(enrollments.error as Error).message} onRetry={() => enrollments.refetch()} compact />
        ) : (enrollments.data ?? []).length === 0 ? (
          <T variant="body" color="muted">
            لا تسجيلات حاليًا.
          </T>
        ) : (
          <RowList>
            {(enrollments.data ?? []).map((e, i, arr) => (
              <LedgerRow key={e.id} last={i === arr.length - 1}>
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
                    icon={<UserMinus size={13} color="#C72E00" />}
                    onPress={() => setConfirming(e)}
                  />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}

        <T variant="sm" weight="bold">
          تسجيل في مقرّر جديد
        </T>
        {offerings.isLoading ? (
          <Skeleton h={48} />
        ) : offerings.isError ? (
          <ErrorState message={(offerings.error as Error).message} onRetry={() => offerings.refetch()} compact />
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
              icon={<GraduationCap size={14} color="#FFFFFF" />}
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
