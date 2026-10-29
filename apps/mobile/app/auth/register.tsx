import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, School } from "lucide-react-native";
import { ApiError, get } from "@/api/client";
import { useSession, ROLE_HOME } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { FormScreen, Screen, SectionBar } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Field, SecretField, SelectField } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { Card } from "@/components/ui/surfaces";
import { BrandMark } from "@/components/ui/brand";
import { LoadingScreen } from "@/components/ui/states";

interface InstitutionRow { id: string; name: string; slug: string }
interface FacultyRow { id: string; name: string; departments: { id: string; name: string }[] }

const YEARS = [1, 2, 3, 4, 5, 6, 7, 8].map((y) => ({ id: String(y), label: `السنة ${y}` }));
const RANKS = [
  { id: "LECTURER", label: "محاضر" },
  { id: "ASSISTANT_PROFESSOR", label: "أستاذ مساعد" },
  { id: "ASSOCIATE_PROFESSOR", label: "أستاذ مشارك" },
  { id: "PROFESSOR", label: "أستاذ" },
];

/** /auth/register — two-step wizard (role → academic identity). */
export default function Register() {
  const p = usePalette();
  const params = useLocalSearchParams<{ continue?: string }>();
  const register = useSession((s) => s.register);
  const [step, setStep] = useState<0 | 1>(0);
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [universityId, setUniversityId] = useState("");
  const [year, setYear] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [rank, setRank] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const institutions = useQuery({
    queryKey: ["institutions"],
    queryFn: () => get<InstitutionRow[]>("/institutions"),
  });

  const faculties = useQuery({
    queryKey: ["faculties", institutionId],
    enabled: !!institutionId,
    queryFn: async () => {
      const inst = institutions.data?.find((i) => i.id === institutionId);
      const rows = await get<FacultyRow[]>("/faculties", { institutionSlug: inst?.slug });
      return rows;
    },
  });

  const inviteCheck = useQuery({
    queryKey: ["invite", inviteCode, role],
    enabled: inviteCode.trim().length >= 4,
    queryFn: async () => {
      try {
        const res = await get<{ valid: boolean; scopeLabel?: string }>(`/invites/${encodeURIComponent(inviteCode.trim())}/validate`, { role });
        return { ok: true as const, scopeLabel: res?.valid ? (res.scopeLabel ?? null) : null };
      } catch (err) {
        return { ok: false as const, message: (err as ApiError).message };
      }
    },
  });

  const facultyOptions = useMemo(
    () => (faculties.data ?? []).map((f) => ({ id: f.id, label: f.name })),
    [faculties.data],
  );
  const departmentOptions = useMemo(() => {
    const f = (faculties.data ?? []).find((x) => x.id === facultyId);
    return (f?.departments ?? []).map((d) => ({ id: d.id, label: d.name }));
  }, [faculties.data, facultyId]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = "الاسم الأول مطلوب.";
    if (!lastName.trim()) errs.lastName = "اسم العائلة مطلوب.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "بريد إلكتروني غير صالح.";
    if (password.length < 12) errs.password = "كلمة المرور 12 حرفًا على الأقل (حتى 72).";
    else if (password.length > 72) errs.password = "كلمة المرور أطول من الحد (72 حرفًا).";
    if (!institutionId) errs.institution = "اختر المؤسّسة.";
    if (!facultyId) errs.faculty = "اختر الكلية.";
    if (role === "STUDENT") {
      if (!universityId.trim()) errs.universityId = "رقم التسجيل الجامعي مطلوب.";
      if (!year) errs.year = "اختر السنة.";
    } else {
      if (!specialty.trim()) errs.specialty = "التخصّص مطلوب.";
      if (!rank) errs.rank = "اختر الرتبة.";
    }
    if (inviteCode.trim() && !inviteCheck.data?.ok) errs.inviteCode = inviteCheck.data?.message ?? "رمز الدعوة غير صالح.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    setError(null);
    try {
      const user = await register({
        email: email.trim().toLowerCase(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        institutionId: institutionId!,
        facultyId: facultyId ?? undefined,
        departmentId: departmentId ?? undefined,
        universityId: role === "STUDENT" ? universityId.trim() : undefined,
        year: role === "STUDENT" && year ? Number(year) : undefined,
        specialty: role === "TEACHER" ? specialty.trim() : undefined,
        rank: role === "TEACHER" && rank ? rank : undefined,
        inviteCode: inviteCode.trim() || undefined,
      });
      const cont = params.continue ? decodeURIComponent(params.continue) : null;
      router.replace(
        (user.currentInstitution ? cont ?? ROLE_HOME[user.role] ?? "/student/dashboard" : "/select-institution") as never,
      );
    } catch (err) {
      const api = err as ApiError;
      setError(api.message ?? "تعذّر إنشاء الحساب.");
    } finally {
      setBusy(false);
    }
  };

  if (step === 0) {
    return (
      <FormScreen>
        <View style={{ flex: 1, gap: sp[16], padding: sp[24], justifyContent: "center" }}>
          <View style={{ alignItems: "center", gap: sp[8] }}>
            <BrandMark size={40} />
            <T variant="h2" weight="bold">إنشاء حساب</T>
            <T variant="sm" color="muted">خطوة 1 من 2 — اختر صفة حسابك</T>
          </View>
          {(["STUDENT", "TEACHER"] as const).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="button"
              onPress={() => setRole(r)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: sp[12],
                padding: sp[16],
                minHeight: 84,
                borderWidth: r === role ? 2 : StyleSheet.hairlineWidth,
                borderColor: r === role ? p.accent : p.border,
                backgroundColor: p.surface,
              }}
            >
              {r === "STUDENT" ? <GraduationCap size={28} color={p.text} /> : <School size={28} color={p.text} />}
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="h4" weight="bold">{r === "STUDENT" ? "طالب" : "أستاذ"}</T>
                <T variant="sm" color="muted">
                  {r === "STUDENT"
                    ? "دخول إلى المقرّرات والمحاضرات والاختبارات والبحوث"
                    : "دخول إلى التدريس والحضور والتصحيح والبحوث"}
                </T>
              </View>
            </Pressable>
          ))}
          <T variant="xs" color="faint">
            الأدوار الأخرى (المسجل العام، الجودة، المالك) تُمنح بتعيين فقط — تواصل مع إدارة مؤسّستك.
          </T>
          <Button label="التالي" onPress={() => setStep(1)} />
          <Button label="رجوع" kind="ghost" onPress={() => router.back()} small />
        </View>
      </FormScreen>
    );
  }

  return (
    <Screen scroll>
      <SectionBar index={1} title="بيانات الحساب الأكاديمي" />
      <T variant="xs" color="faint">
        الصفة: {role === "STUDENT" ? "طالب" : "أستاذ"} — للتغيير اضغط «رجوع».
      </T>
      <View style={{ gap: sp[12] }}>
        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <Field label="الاسم الأول" value={firstName} onChangeText={setFirstName} error={fieldErrors.firstName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="اسم العائلة" value={lastName} onChangeText={setLastName} error={fieldErrors.lastName} />
          </View>
        </View>
        <Field
          label="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          inputMode="email"
          error={fieldErrors.email}
        />
        <SecretField
          label="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          hint="12 حرفًا على الأقل — تجنّب كلمات المرور الشائعة."
        />
        <SelectField
          label="المؤسّسة"
          value={
            institutionId
              ? { id: institutionId, label: institutions.data?.find((i) => i.id === institutionId)?.name ?? "" }
              : null
          }
          options={(institutions.data ?? []).map((i) => ({ id: i.id, label: i.name }))}
          onSelect={setInstitutionId}
          loading={institutions.isLoading}
          error={fieldErrors.institution}
          sheetTitle="اختر المؤسّسة"
        />
        <SelectField
          label="الكلية"
          value={facultyId ? { id: facultyId, label: faculties.data?.find((f) => f.id === facultyId)?.name ?? "" } : null}
          options={facultyOptions}
          onSelect={(id) => {
            setFacultyId(id);
            setDepartmentId(null);
          }}
          loading={faculties.isLoading}
          disabled={!institutionId}
          error={fieldErrors.faculty}
          sheetTitle="اختر الكلية"
        />
        <SelectField
          label="القسم (اختياري)"
          value={departmentId ? { id: departmentId, label: departmentOptions.find((d) => d.id === departmentId)?.label ?? "" } : null}
          options={departmentOptions}
          onSelect={setDepartmentId}
          disabled={!facultyId}
          sheetTitle="اختر القسم"
          emptyLabel="لا توجد أقسام مسجّلة في هذه الكلية"
        />
        {role === "STUDENT" ? (
          <>
            <Field label="رقم التسجيل الجامعي" value={universityId} onChangeText={setUniversityId} error={fieldErrors.universityId} />
            <SelectField
              label="السنة الدراسية"
              value={year ? { id: year, label: YEARS.find((y) => y.id === year)?.label ?? "" } : null}
              options={YEARS}
              onSelect={setYear}
              error={fieldErrors.year}
              sheetTitle="اختر السنة"
            />
          </>
        ) : (
          <>
            <Field label="التخصّص" value={specialty} onChangeText={setSpecialty} error={fieldErrors.specialty} />
            <SelectField
              label="الرتبة الأكاديمية"
              value={rank ? { id: rank, label: RANKS.find((r) => r.id === rank)?.label ?? "" } : null}
              options={RANKS}
              onSelect={setRank}
              error={fieldErrors.rank}
              sheetTitle="اختر الرتبة"
            />
          </>
        )}
        <Field
          label="رمز دعوة (اختياري)"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          hint={inviteCode.trim() && inviteCheck.data?.ok ? `رمز صالح — ${inviteCheck.data.scopeLabel ?? ""}` : "إن كانت لديك دعوة من أستاذ أو إدارة."
          }
          error={fieldErrors.inviteCode}
        />
        {error ? (
          <Card style={{ borderColor: "#C72E00" }}>
            <T variant="sm" color="danger">{error}</T>
          </Card>
        ) : null}
        <Button label={busy ? "جارٍ الإنشاء…" : "إنشاء الحساب"} onPress={submit} loading={busy} />
        <Button label="رجوع" kind="ghost" onPress={() => setStep(0)} small />
      </View>
    </Screen>
  );
}
