import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Card, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Field } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { num } from "@/lib/format";
import {
  countAr,
  ExpandChevron,
  useExpanded,
  type FacultyNode,
} from "@/features/governance/components";

/** (tabs) Faculties & departments — «الكلّيّات والأقسام» (web AdminFacultiesPage parity). */
export default function AdminFaculties() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const institutionId = useSession((s) => s.user?.currentInstitution?.id) ?? undefined;

  const facs = useQuery({
    queryKey: ["admin", "faculties", scope],
    queryFn: async () => (await adminApi.faculties()) as FacultyNode[],
  });

  const [facultyOpen, setFacultyOpen] = useState(false);
  const [fName, setFName] = useState("");
  const [fNameEn, setFNameEn] = useState("");
  const [fCity, setFCity] = useState("");
  const [fEmoji, setFEmoji] = useState("");

  const [deptTarget, setDeptTarget] = useState<FacultyNode | null>(null);
  const [dName, setDName] = useState("");

  const createFaculty = useMutation({
    mutationFn: () =>
      adminApi.createFaculty({
        institutionId,
        name: fName.trim(),
        city: fCity.trim(),
        nameEn: fNameEn.trim() || undefined,
        iconEmoji: fEmoji.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "faculties"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
      toast.success(`أُضيفت كلّيّة «${fName.trim()}».`, "تمّت الإضافة");
      setFacultyOpen(false);
      setFName("");
      setFNameEn("");
      setFCity("");
      setFEmoji("");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّرت إضافة الكلّيّة"),
  });

  const createDepartment = useMutation({
    mutationFn: () => adminApi.createDepartment({ facultyId: deptTarget!.id, name: dName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "faculties"] });
      toast.success(`أُضيف قسم «${dName.trim()}» إلى «${deptTarget?.name}».`, "تمّت الإضافة");
      setDeptTarget(null);
      setDName("");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّرت إضافة القسم"),
  });

  const { expanded, toggle } = useExpanded();

  const totalDepts =
    facs.data?.reduce((s, f) => s + (f.departmentCount ?? f.departments?.length ?? 0), 0) ?? 0;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/admin/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="h2" weight="bold">
              الكلّيّات والأقسام
            </T>
            <T variant="body" color="muted">
              جميع كلّيّات الجامعة وأقسامها مع إحصائيات حية.
            </T>
          </View>
          <Button
            label="كلية جديدة"
            kind="primary"
            small
            icon={<Plus size={14} color="#FFFFFF" />}
            onPress={() => setFacultyOpen(true)}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatLine label="الكلّيّات" value={num(facs.data?.length ?? null, "…")} />
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatLine label="الأقسام" value={num(totalDepts, "…")} hint="عبر الكلّيّات" />
        </View>

        <View>
          <SectionBar index={1} title="البنية الأكاديمية" />
          {facs.isLoading ? (
            <SkeletonList rows={5} />
          ) : facs.isError ? (
            <ErrorState message={(facs.error as Error).message} onRetry={() => facs.refetch()} />
          ) : facs.data && facs.data.length > 0 ? (
            <View style={{ gap: 8 }}>
              {facs.data.map((f) => {
                const depts = f.departments ?? [];
                const open = expanded.has(f.id);
                return (
                  <Card key={f.id}>
                    <View style={{ gap: 4 }}>
                      <T variant="bodyLg" weight="bold">
                        {f.iconEmoji ? `${f.iconEmoji} ` : ""}
                        {f.name}
                      </T>
                      {f.nameEn ? (
                        <T variant="xs" color="faint">
                          {f.nameEn}
                        </T>
                      ) : null}
                      <T variant="xs" color="muted">
                        {f.city || "—"} ·{" "}
                        {countAr(f.departmentCount ?? depts.length, ["قسم واحد", "قسمان", "أقسام", "قسماً"])} ·{" "}
                        {countAr(f.courseCount ?? 0, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])} ·{" "}
                        {countAr(f.studentCount ?? 0, ["طالب واحد", "طالبان", "طلاب", "طالباً"])}
                      </T>
                    </View>
                    {depts.length > 0 ? (
                      <LedgerRow
                        onPress={() => toggle(f.id)}
                        accessibilityLabel={open ? `طيّ أقسام ${f.name}` : `توسيع أقسام ${f.name}`}
                        style={{ marginTop: 8 }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <T variant="sm" weight="bold" style={{ flex: 1 }}>
                            {open ? "طيّ الأقسام" : "توسيع الأقسام"}
                          </T>
                          <ExpandChevron open={open} />
                        </View>
                      </LedgerRow>
                    ) : null}
                    {open && depts.length > 0 ? (
                      <View style={{ paddingTop: 4 }}>
                        <RowList>
                          {depts.map((d, i) => (
                            <LedgerRow key={d.id} last={i === depts.length - 1}>
                              <T variant="body" weight="medium">
                                {d.name}
                              </T>
                              <T variant="xs" color="muted">
                                {countAr(d.courses ?? 0, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])} ·{" "}
                                {countAr(d.teachers ?? 0, ["مدرّس واحد", "مدرّسان", "مدرّسون", "مدرّساً"])} ·{" "}
                                {countAr(d.students ?? 0, ["طالب واحد", "طالبان", "طلاب", "طالباً"])}
                              </T>
                            </LedgerRow>
                          ))}
                        </RowList>
                      </View>
                    ) : null}
                    <View style={{ paddingTop: 8 }}>
                      <Button
                        label="قسم جديد"
                        kind="ghost"
                        small
                        icon={<Plus size={14} color="#282828" />}
                        onPress={() => setDeptTarget(f)}
                      />
                    </View>
                  </Card>
                );
              })}
            </View>
          ) : (
            <EmptyState
              title="لا كليات بعد"
              message="أنشئ أول كلّيّة من الزر أعلاه — بعدها يمكنك إضافة الأقسام والمقرّرات."
              actionLabel="كلية جديدة"
              onAction={() => setFacultyOpen(true)}
            />
          )}
        </View>
      </View>

      <Sheet
        open={facultyOpen}
        onClose={() => setFacultyOpen(false)}
        title="إضافة كلّيّة جديدة"
        footer={
          <Button
            label={createFaculty.isPending ? "جارٍ الإضافة…" : "إضافة الكلّيّة"}
            disabled={!fName.trim() || !fCity.trim() || createFaculty.isPending}
            onPress={() => createFaculty.mutate()}
          />
        }
      >
        <View style={{ gap: 12 }}>
          <Field
            label="اسم الكلّيّة"
            value={fName}
            onChangeText={setFName}
            placeholder="كلية العلوم"
          />
          <Field
            label="الاسم بالإنجليزية (اختياري)"
            value={fNameEn}
            onChangeText={setFNameEn}
            placeholder="Faculty of Science"
          />
          <Field
            label="المدينة"
            value={fCity}
            onChangeText={setFCity}
            placeholder="حرم المعرفة"
            hint="الكلّيّات تتميّز بالاسم داخل كل مدينة — الاسم نفسه في مدينة أخرى لا يُعدّ تكرارًا"
          />
          <Field
            label="رمز تعبيري (اختياري)"
            value={fEmoji}
            onChangeText={setFEmoji}
            placeholder="🔬"
            maxLength={10}
          />
        </View>
      </Sheet>

      <Sheet
        open={deptTarget !== null}
        onClose={() => setDeptTarget(null)}
        title="إضافة قسم"
        footer={
          <Button
            label={createDepartment.isPending ? "جارٍ الإضافة…" : "إضافة القسم"}
            disabled={!dName.trim() || createDepartment.isPending}
            onPress={() => createDepartment.mutate()}
          />
        }
      >
        <View style={{ gap: 12 }}>
          <T variant="body" color="muted">
            سيُضاف القسم إلى «{deptTarget?.name}».
          </T>
          <Field label="اسم القسم" value={dName} onChangeText={setDName} placeholder="قسم الحاسوب" />
        </View>
      </Sheet>
    </Screen>
  );
}
