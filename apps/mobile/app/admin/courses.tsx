
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react-native";
import { Screen } from "@/components/ui";
import { StackHeader as NavHeader } from "@/components/shell/AppTopBar";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Field, SearchBar, SelectField } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import type { AdminUserRow } from "@/api/admin";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn, num } from "@/lib/format";
import {
  countAr,
  pageOf,
  PagerFooter,
  UNIT,
  type CourseRow,
  type FacultyNode,
} from "@/features/governance/components";

const PAGE_LIMIT = 20;

interface CourseDraft {
  code: string;
  name: string;
  nameEn: string;
  description: string;
  credits: string;
  departmentId: string | null;
}

const EMPTY_DRAFT: CourseDraft = {
  code: "",
  name: "",
  nameEn: "",
  description: "",
  credits: "3",
  departmentId: null,
};

/** Pushed: /admin/courses — «إدارة المقرّرات» with CRUD + offerings. */
export default function AdminCourses() {
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

  const courses = useQuery({
    queryKey: ["admin", "courses", { page, q: appliedQ }, scope],
    queryFn: async () =>
      pageOf<CourseRow>(await adminApi.courses({ page, limit: PAGE_LIMIT, q: appliedQ || undefined })),
    placeholderData: (prev) => prev,
  });
  const facs = useQuery({
    queryKey: ["admin", "faculties", scope],
    queryFn: async () => (await adminApi.faculties()) as FacultyNode[],
  });

  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = editingId !== null && draft !== null;
  const [deleting, setDeleting] = useState<CourseRow | null>(null);
  const [offeringCourse, setOfferingCourse] = useState<CourseRow | null>(null);

  const invalidateCourses = () => {
    qc.invalidateQueries({ queryKey: ["admin", "courses"] });
    qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    qc.invalidateQueries({ queryKey: ["admin", "reports"] });
  };

  const createCourse = useMutation({
    mutationFn: () =>
      adminApi.createCourse({
        code: draft!.code.trim(),
        name: draft!.name.trim(),
        nameEn: draft!.nameEn.trim() || undefined,
        description: draft!.description.trim() || undefined,
        credits: Number(draft!.credits) || 3,
        departmentId: draft!.departmentId!,
      }),
    onSuccess: () => {
      invalidateCourses();
      toast.success(`أُضيف مقرّر «${draft?.name}» إلى السجلّ.`, "تمّت الإضافة");
      setDraft(null);
      setEditingId(null);
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر حفظ المقرّر"),
  });

  const updateCourse = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        code: draft!.code.trim(),
        name: draft!.name.trim(),
        credits: Number(draft!.credits) || 3,
      };
      if (draft!.nameEn.trim()) payload.nameEn = draft!.nameEn.trim();
      if (draft!.description.trim()) payload.description = draft!.description.trim();
      if (draft!.departmentId) payload.departmentId = draft!.departmentId;
      return adminApi.updateCourse(editingId!, payload);
    },
    onSuccess: () => {
      invalidateCourses();
      toast.success(`حُفظت تعديلات «${draft?.name}».`, "تمّ الحفظ");
      setDraft(null);
      setEditingId(null);
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر حفظ المقرّر"),
  });

  const deleteCourse = useMutation({
    mutationFn: (id: string) => adminApi.deleteCourse(id),
    onSuccess: () => {
      invalidateCourses();
      toast.success(`حُذف «${deleting?.name}» من السجلّ.`, "تمّ الحذف");
      setDeleting(null);
    },
    onError: (e) =>
      toast.error(
        (e as ApiError).message || "تعذّر حذف المقرّر — قد تكون له شُعب أو مفاهيم مرتبطة.",
        "فشل الحذف",
      ),
  });

  const departmentOptions = (facs.data ?? []).flatMap((f) =>
    (f.departments ?? []).map((d) => ({ id: d.id, label: `${f.name} · ${d.name}` })),
  );

  const rows = courses.data?.rows ?? [];

  return (
    <Screen scroll>
      <NavHeader title="إدارة المقرّرات" kicker="لوحة المسجل العام" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <T variant="body" color="muted">
          {courses.data
            ? countAr(courses.data.meta?.total ?? rows.length, UNIT.course) + " في الجامعة"
            : "قراءة سجلّ المقرّرات…"}
        </T>

        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="ابحث بالاسم أو الكود…"
          onClear={() => {
            setQ("");
            setPage(1);
          }}
        />

        <Button
          label="مقرر جديد"
          kind="primary"
          icon={<Plus size={14} color="#FFFFFF" />}
          onPress={() => {
            setEditingId(null);
            setDraft({ ...EMPTY_DRAFT });
          }}
        />

        {courses.isLoading ? (
          <SkeletonList rows={5} />
        ) : courses.isError ? (
          <ErrorState message={(courses.error as Error).message} onRetry={() => courses.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={appliedQ ? "لا توجد نتائج" : "لا توجد مقرّرات بعد"}
            message={appliedQ ? "جرّب تعديل البحث لعرض نتائج أوسع." : "أضف أول مقرّر من الزر أعلاه."}
            actionLabel={appliedQ ? "مسح البحث" : undefined}
            onAction={appliedQ ? () => setQ("") : undefined}
          />
        ) : (
          <View style={{ gap: 12 }}>
            <RowList>
              {rows.map((c, i) => (
                <LedgerRow key={c.id} last={i === rows.length - 1}>
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="bold" numberOfLines={1}>
                          {c.name}
                        </T>
                      </View>
                      <MonoLabel>{c.code}</MonoLabel>
                    </View>
                    <T variant="xs" color="muted" numberOfLines={1}>
                      {c.faculty ?? "—"}
                      {c.department ? ` · ${c.department}` : ""} · س.م {latn(c.credits ?? 0)}
                    </T>
                    <T variant="xs" color="faint">
                      {latn(c.totalEnrollments ?? 0)} تسجيل · {latn(c.totalLectures ?? 0)} محاضرة ·{" "}
                      {latn(c.offeringCount ?? 0)} شعبة
                    </T>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", paddingTop: 8 }}>
                    <Button
                      label="شعبة جديدة"
                      kind="ghost"
                      small
                      icon={<Plus size={13} color="#282828" />}
                      onPress={() => setOfferingCourse(c)}
                    />
                    <Button
                      label="تعديل"
                      kind="ghost"
                      small
                      onPress={() => {
                        setEditingId(c.id);
                        setDraft({
                          code: c.code,
                          name: c.name,
                          nameEn: "",
                          description: "",
                          credits: String(c.credits ?? 3),
                          departmentId: c.departmentId ?? null,
                        });
                      }}
                    />
                    <Button
                      label="حذف"
                      kind="ghost"
                      small
                      icon={<Trash2 size={13} color="#C72E00" />}
                      onPress={() => setDeleting(c)}
                    />
                  </View>
                </LedgerRow>
              ))}
            </RowList>
            <PagerFooter
              page={page}
              rowsLength={rows.length}
              limit={PAGE_LIMIT}
              meta={courses.data?.meta ?? null}
              unit={UNIT.course}
              onPage={setPage}
              loading={courses.isFetching}
            />
          </View>
        )}
      </View>

      {/* Create / edit course sheet */}
      <Sheet
        open={draft !== null}
        onClose={() => {
          setDraft(null);
          setEditingId(null);
        }}
        title={editingId ? "تعديل المقرّر" : "إضافة مقرّر جديد"}
        footer={
          <Button
            label={
              createCourse.isPending || updateCourse.isPending
                ? "جارٍ الحفظ…"
                : editingId
                  ? "حفظ التعديلات"
                  : "إضافة المقرّر"
            }
            disabled={
              !draft ||
              !draft.code.trim() ||
              !draft.name.trim() ||
              (!editingId && !draft.departmentId) ||
              createCourse.isPending ||
              updateCourse.isPending
            }
            onPress={() => (editingId ? updateCourse.mutate() : createCourse.mutate())}
          />
        }
      >
        {draft ? (
          <View style={{ gap: 12 }}>
            <Field
              label="كود المقرّر"
              value={draft.code}
              onChangeText={(code) => setDraft({ ...draft, code })}
              placeholder="CS101"
            />
            <Field
              label="اسم المقرّر"
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              placeholder="مقدمة في علوم الحاسب"
            />
            <Field
              label="الاسم بالإنجليزية (اختياري)"
              value={draft.nameEn}
              onChangeText={(nameEn) => setDraft({ ...draft, nameEn })}
              placeholder="Introduction to Computer Science"
            />
            <Field
              label="الوصف (اختياري)"
              value={draft.description}
              onChangeText={(description) => setDraft({ ...draft, description })}
              placeholder="وصف موجز للمقرّر"
              multiline
            />
            <Field
              label="الساعات المعتمدة"
              value={draft.credits}
              onChangeText={(credits) => setDraft({ ...draft, credits })}
              hint="بين 1 و10 — الحدّ الذي يقبله الخادم"
              keyboardType="numeric"
            />
            <SelectField
              label="القسم"
              value={
                departmentOptions.find((d) => d.id === draft.departmentId) ?? null
              }
              options={departmentOptions}
              onSelect={(id) => setDraft({ ...draft, departmentId: id })}
              loading={facs.isLoading}
              placeholder="اختر القسم…"
              sheetTitle="القسم"
              emptyLabel="لا توجد أقسام بعد"
            />
          </View>
        ) : null}
      </Sheet>

      {/* Offering create sheet */}
      {offeringCourse ? (
        <OfferingSheet
          course={offeringCourse}
          onClose={() => setOfferingCourse(null)}
          onCreated={() => invalidateCourses()}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="حذف المقرّر"
        message={
          deleting
            ? `سيُحذف «${deleting.name}» نهائيًا من السجلّ الجامعي. لا يمكن التراجع عن هذا الإجراء.`
            : ""
        }
        confirmLabel="حذف نهائي"
        danger
        loading={deleteCourse.isPending}
        onConfirm={() => deleting && deleteCourse.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </Screen>
  );
}

/* ─── «فتح شعبة» sheet (web AdminCoursesPage offering modal parity) ─── */

function OfferingSheet({
  course,
  onClose,
  onCreated,
}: {
  course: CourseRow;
  onClose: () => void;
  onCreated: () => void;
}) {
  const qc = useQueryClient();
  const [term, setTerm] = useState("");
  const [room, setRoom] = useState("");
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const teachers = useQuery({
    queryKey: ["admin", "users", { role: "TEACHER", offeringPicker: true }],
    queryFn: async () => pageOf<AdminUserRow>(await adminApi.users({ role: "TEACHER", limit: 100 })),
    staleTime: 60_000,
  });

  const create = useMutation({
    mutationFn: () =>
      adminApi.createOffering({
        courseId: course.id,
        teacherId: teacherId!,
        term: term.trim(),
        room: room.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "courses"] });
      onCreated();
      toast.success(
        `فُتحت شعبة «${course.name}» للفصل «${term.trim()}».`,
        "تمّ فتح الشعبة",
      );
      onClose();
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر فتح الشعبة"),
  });

  const teacherOptions = (teachers.data?.rows ?? []).map((t) => ({
    id: t.id,
    label: `${t.firstName} ${t.lastName}`.trim(),
    sub: t.email,
  }));

  return (
    <Sheet
      open
      onClose={onClose}
      title="فتح شعبة"
      footer={
        <Button
          label={create.isPending ? "جارٍ الفتح…" : "فتح الشعبة"}
          disabled={!term.trim() || !teacherId || create.isPending}
          onPress={() => create.mutate()}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <T variant="body" color="muted">
          سيُدرَّس مقرّر «{course.name}» ({course.code}) في الشعبة الجديدة.
        </T>
        <Field
          label="الفصل الدراسي"
          value={term}
          onChangeText={setTerm}
          placeholder="2024-FALL"
          hint="نص حرّ من 1 إلى 50 حرفًا — مثال: 2024-FALL"
          maxLength={50}
        />
        <SelectField
          label="الأستاذ"
          value={teacherOptions.find((t) => t.id === teacherId) ?? null}
          options={teacherOptions}
          onSelect={setTeacherId}
          loading={teachers.isLoading}
          placeholder="اختر الأستاذ…"
          sheetTitle="أساتذة المؤسسة"
          emptyLabel="لا أساتذة بعد"
        />
        <Field
          label="القاعة (اختياري)"
          value={room}
          onChangeText={setRoom}
          placeholder="قاعة A12"
        />
        <StatLine label="السعة" value={num(null, "افتراض الخادم")} hint="أقصى عدد طلاب يمكن تسجيلهم في الشعبة" />
      </View>
    </Sheet>
  );
}


