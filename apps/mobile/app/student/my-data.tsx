/**
 * student/my-data — r349-P4: «بياناتي واتصالي» على الموبايل.
 *
 * The student's real file over the SAME shaped self view the web's
 * MyProfileData rides (GET /me/profile → student.profile, the privacy
 * shaper's self lens): six sections — البيانات الشخصية · الاتصال ·
 * الأكاديمية · ولي الأمر · الوثائق · الأمان. The contact lane is the
 * self-editable half (phone/additional/emergency with the inline
 * Libyan validation — the phone-validation mirror), everything else
 * renders exactly what the shaped payload carries: the registrar's
 * documentary fields read-only, the custom fields as the institution
 * defined them, and the phone-visibility SETTING as the plain-Arabic
 * radiogroup (a PATCH away).
 */
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Eye from "lucide-react-native/icons/eye";
import EyeOff from "lucide-react-native/icons/eye-off";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { AppStatusBar } from "@/design/statusbar";
import { Screen, SectionBar, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge, Card, Hairline } from "@/components/ui/surfaces";
import { StatLine } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { studentApi } from "@/api/student";
import { peopleApi, type PatchMyProfileInput } from "@/api/people";
import type { CustomFieldValue, StudentProfileView } from "@/api/people";
import { checkLibyanPhone, foldDigits } from "@/lib/phone-validation";
import { humanizeError } from "@/lib/errors";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { ScrollBody } from "@/features/student/components";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";

const STUDY_TYPE_LABELS: Record<string, string> = {
  MORNING: "صباحي",
  EVENING: "مسائي",
  PARALLEL: "موازي",
};
const ENROLLMENT_LABELS: Record<string, string> = {
  ACTIVE: "مقيّد",
  SUSPENDED: "موقوف",
  DEFERRED: "مؤجّل",
  GRADUATED: "متخرّج",
  WITHDRAWN: "منسحب",
};
const GENDER_LABELS: Record<string, string> = {
  MALE: "ذكر",
  FEMALE: "أنثى",
  UNSPECIFIED: "غير محدد",
};

/** The contact lane's editable draft (the PATCH-able subset). */
interface ContactDraft {
  studentPhone: string;
  additionalPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
}

function draftFrom(view: StudentProfileView): ContactDraft {
  return {
    studentPhone: view.phone.display ?? "",
    additionalPhone: view.additionalPhone ?? "",
    emergencyContactName: view.emergencyContact.name ?? "",
    emergencyContactPhone: view.emergencyContact.phone ?? "",
  };
}

export default function StudentMyData() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();

  /* The same key the profile tab rides — the shaped view arrives warm. */
  const profile = useQuery({
    queryKey: ["me", "profile", scope],
    queryFn: () => studentApi.profile(),
  });

  const view = profile.data?.student?.profile ?? null;
  const customFields = profile.data?.student?.customFields ?? [];

  /* ── the contact draft + validation ── */
  const [draft, setDraft] = useState<ContactDraft | null>(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (view && !draft) setDraft(draftFrom(view));
  }, [view, draft]);

  const phoneChecks = useMemo(() => {
    if (!draft) return null;
    return {
      studentPhone: draft.studentPhone ? checkLibyanPhone(draft.studentPhone) : null,
      additionalPhone: draft.additionalPhone ? checkLibyanPhone(draft.additionalPhone) : null,
      emergencyContactPhone: draft.emergencyContactPhone
        ? checkLibyanPhone(draft.emergencyContactPhone)
        : null,
    };
  }, [draft]);

  const dirty =
    draft !== null &&
    view !== null &&
    (draft.studentPhone !== (view.phone.display ?? "") ||
      draft.additionalPhone !== (view.additionalPhone ?? "") ||
      draft.emergencyContactName !== (view.emergencyContact.name ?? "") ||
      draft.emergencyContactPhone !== (view.emergencyContact.phone ?? ""));

  const invalid =
    (phoneChecks?.studentPhone && !phoneChecks.studentPhone.ok) ||
    (phoneChecks?.additionalPhone && !phoneChecks.additionalPhone.ok) ||
    (phoneChecks?.emergencyContactPhone && !phoneChecks.emergencyContactPhone.ok) ||
    false;

  const save = useMutation({
    mutationFn: (input: PatchMyProfileInput) => peopleApi.patchMyProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "profile"] });
      toast.success("حُفظت بيانات الاتصال");
      setRevealed(false);
    },
    onError: (e) => toast.error(humanizeError(e), "تعذّر الحفظ"),
  });

  const setVisibility = (visibility: "INSTITUTION_STAFF" | "PRIVATE") => {
    save.mutate({ studentPhoneVisibility: visibility });
  };

  return (
    <Screen scroll={false} padded={false}>
      <AppStatusBar />
      <AppTopBar alertsPath="/student/alerts" />
      <ScrollBody refreshing={profile.isFetching && !profile.isLoading} onRefresh={() => profile.refetch()}>
        <PageHeader
          title="بياناتي واتصالي"
          kicker="ملفك كما تحمله المؤسّسة — عدّل ما يخصّك، وراجع الإدارة في البقيّة."
        />

        {profile.isLoading ? (
          <SkeletonList rows={6} rowHeight={56} />
        ) : profile.isError ? (
          <ErrorState
            message={humanizeError(profile.error)}
            onRetry={() => profile.refetch()}
            onReport={() => router.push("/report" as never)}
            compact
          />
        ) : !view || !draft ? (
          <EmptyState
            title="لا يوجد ملف طالب بعد"
            message="لم يُربَط ملف طالب بحسابك — تواصل مع شؤون الطلاب، وبمجرد اعتماده تظهر بياناتك الكاملة هنا."
          />
        ) : (
          <>
            {/* [01] البيانات الشخصية — the documentary identity (read). */}
            <SectionBar index={1} title="البيانات الشخصية" />
            <Card style={{ gap: sp[6] }}>
              <StatLine label="الاسم كما في الوثائق" value={view.nameAr ?? "—"} />
              <StatLine label="اسم الأب" value={view.fatherName ?? "—"} />
              <StatLine label="اسم الجد" value={view.grandfatherName ?? "—"} />
              <StatLine label="اسم الأم" value={view.motherName ?? "—"} />
              <StatLine
                label="الرقم الوطني"
                value={view.nationalId.value ?? (view.nationalIdPresent ? "—" : "غير مسجَّل")}
              />
              <StatLine label="تاريخ الميلاد" value={view.dateOfBirth?.slice(0, 10) ?? "—"} />
              <StatLine label="مكان الميلاد" value={view.birthPlace ?? "—"} />
              <StatLine label="الجنس" value={view.gender ? GENDER_LABELS[view.gender] ?? "—" : "—"} />
              <StatLine label="المدينة (السكن)" value={view.city ?? "—"} />
              <StatLine label="العنوان" value={view.address ?? "—"} />
              <T variant="xs" color="faint">
                الاسم الرباعي والرقم الوطني ومكان الميلاد يُدخلها المسجّل العام في مؤسستك — لتصحيحها
                راجعه.
              </T>
            </Card>

            {/* [02] الاتصال — the self-editable phone lane. */}
            <SectionBar index={2} title="الاتصال" />
            <Card style={{ gap: sp[10] }}>
              {revealed ? (
                <>
                  <Field
                    label="هاتفي"
                    value={draft.studentPhone}
                    onChangeText={(v) => setDraft({ ...draft, studentPhone: foldDigits(v) })}
                    inputMode="tel"
                    placeholder="09XX XXX XXXX"
                    error={
                      phoneChecks?.studentPhone && !phoneChecks.studentPhone.ok && revealed
                        ? phoneChecks.studentPhone.reasonAr
                        : undefined
                    }
                  />
                  <Field
                    label="هاتف إضافي"
                    value={draft.additionalPhone}
                    onChangeText={(v) => setDraft({ ...draft, additionalPhone: foldDigits(v) })}
                    inputMode="tel"
                    placeholder="اختياري"
                    error={
                      phoneChecks?.additionalPhone && !phoneChecks.additionalPhone.ok
                        ? phoneChecks.additionalPhone.reasonAr
                        : undefined
                    }
                  />
                  <Field
                    label="جهة الطوارئ"
                    value={draft.emergencyContactName}
                    onChangeText={(v) => setDraft({ ...draft, emergencyContactName: v })}
                    placeholder="اسم جهة الاتصال عند الطوارئ"
                  />
                  <Field
                    label="هاتف الطوارئ"
                    value={draft.emergencyContactPhone}
                    onChangeText={(v) => setDraft({ ...draft, emergencyContactPhone: foldDigits(v) })}
                    inputMode="tel"
                    placeholder="09XX XXX XXXX"
                    error={
                      phoneChecks?.emergencyContactPhone && !phoneChecks.emergencyContactPhone.ok
                        ? phoneChecks.emergencyContactPhone.reasonAr
                        : undefined
                    }
                  />
                  <View style={{ flexDirection: "row", gap: sp[8] }}>
                    <Button
                      label={save.isPending ? "جارٍ الحفظ…" : "حفظ"}
                      loading={save.isPending}
                      disabled={!dirty || invalid}
                      style={{ flex: 1 }}
                      onPress={() =>
                        save.mutate({
                          studentPhone: draft.studentPhone || null,
                          additionalPhone: draft.additionalPhone || null,
                          emergencyContactName: draft.emergencyContactName || null,
                          emergencyContactPhone: draft.emergencyContactPhone || null,
                        })
                      }
                    />
                    <Button
                      label="إلغاء"
                      kind="ghost"
                      style={{ flex: 1 }}
                      onPress={() => {
                        setDraft(draftFrom(view));
                        setRevealed(false);
                      }}
                    />
                  </View>
                </>
              ) : (
                <>
                  <StatLine label="هاتفي" value={view.phone.display ?? "—"} />
                  <StatLine label="هاتف إضافي" value={view.additionalPhone ?? "—"} />
                  <StatLine label="جهة الطوارئ" value={view.emergencyContact.name ?? "—"} />
                  <StatLine label="هاتف الطوارئ" value={view.emergencyContact.phone ?? "—"} />
                  <Button
                    label="تعديل بيانات الاتصال"
                    kind="ghost"
                    onPress={() => setRevealed(true)}
                  />
                </>
              )}
              <T variant="xs" color="faint">
                الصيغ المقبولة: 09XXXXXXXXX أو 9XXXXXXXX أو +218XXXXXXXXX — والأرقام العربية-الهندية
                (٩…) تُحوَّل تلقائيًا.
              </T>
            </Card>

            {/* [03] الأكاديمية — read-only for the student. */}
            <SectionBar index={3} title="الأكاديمية" />
            <Card style={{ gap: sp[6] }}>
              <StatLine label="الكلية / المؤسسة" value={profile.data?.student?.faculty?.name ?? "—"} />
              <StatLine label="القسم / التخصص" value={profile.data?.student?.department?.name ?? "—"} />
              <StatLine label="رقم القيد" value={view.universityId} />
              <StatLine
                label="وضع الدراسة"
                value={view.academic.studyType ? STUDY_TYPE_LABELS[view.academic.studyType] ?? "—" : "—"}
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <T variant="sm" color="secondary">
                  الحالة الدراسية
                </T>
                <Badge
                  label={ENROLLMENT_LABELS[view.academic.enrollmentStatus] ?? view.academic.enrollmentStatus}
                  tone={view.academic.enrollmentStatus === "ACTIVE" ? "mint" : "yellow"}
                />
              </View>
              <StatLine
                label="السنة / الصف"
                value={
                  [view.academic.stage, view.academic.grade, view.academic.section]
                    .filter(Boolean)
                    .join(" · ") || "—"
                }
              />
              {view.academic.secondarySchool ? (
                <StatLine
                  label="الثانوية"
                  value={
                    [
                      view.academic.secondarySchool,
                      view.academic.secondarySchoolBranch,
                      view.academic.secondarySchoolPercent !== null
                        ? `${view.academic.secondarySchoolPercent}%`
                        : null,
                      view.academic.admissionYear !== null ? String(view.academic.admissionYear) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"
                  }
                />
              ) : null}
            </Card>

            {/* [04] ولي الأمر — read-only (staff-entered). */}
            <SectionBar index={4} title="ولي الأمر" />
            <Card style={{ gap: sp[6] }}>
              {view.guardian ? (
                <>
                  <StatLine label="الاسم" value={view.guardian.name ?? "—"} />
                  <StatLine label="صلة القرابة" value={view.guardian.relationship ?? "—"} />
                  <StatLine label="الهاتف" value={view.guardian.phone.display ?? "—"} />
                </>
              ) : (
                <T variant="sm" color="muted">
                  لا توجد بيانات ولي أمر — تُدخلها إدارة التسجيل في مؤسستك.
                </T>
              )}
            </Card>

            {/* [05] الوثائق — the institution's custom fields. */}
            <SectionBar index={5} title="الوثائق وبيانات المؤسسة" />
            <Card style={{ gap: sp[6] }}>
              {customFields.length ? (
                customFields.map((f) => <StatLine key={f.key} label={f.labelAr} value={fmtCustomValue(f)} />)
              ) : (
                <T variant="sm" color="muted">
                  لم تُعرّف مؤسستك حقولًا مخصصة على ملفات الطلبة بعد.
                </T>
              )}
            </Card>

            {/* [06] الأمان — who sees my phone (plain Arabic). */}
            <SectionBar index={6} title="الأمان والخصوصية" />
            <Card style={{ gap: sp[10] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <Eye size={16} color={p.textMuted} />
                <T variant="sm" weight="bold">
                  من يرى هاتفي؟
                </T>
              </View>
              <VisOption
                active={view.phoneVisibility === "INSTITUTION_STAFF"}
                title="طاقم مؤسستي"
                description="أساتذتي وإدارة مؤسستي يرون رقمي — هوائية التواصل الطبيعية."
                disabled={save.isPending}
                onPress={() => setVisibility("INSTITUTION_STAFF")}
                icon={<Eye size={16} color={p.text} />}
              />
              <VisOption
                active={view.phoneVisibility === "PRIVATE"}
                title="خاص بي فقط"
                description="يظهر مقنّعًا للطاقم، ومن يحتاجه يرسل لي طلب تواصل أقرّه بنفسي."
                disabled={save.isPending}
                onPress={() => setVisibility("PRIVATE")}
                icon={<EyeOff size={16} color={p.text} />}
              />
              <Hairline />
              <T variant="xs" color="faint">
                كلمة المرور تُدار من «الإعدادات» — تغييرها يُنهي جلساتك على بقية الأجهزة.
              </T>
            </Card>
          </>
        )}
      </ScrollBody>
    </Screen>
  );
}

/* ── the visibility option row (the web VisOption parity) ── */

function VisOption({
  active,
  title,
  description,
  onPress,
  disabled,
  icon,
}: {
  active: boolean;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderRadius: 12,
        borderColor: active ? p.primary : p.rule,
        backgroundColor: active ? p.surfaceHover : "transparent",
        opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
        padding: sp[12],
        gap: sp[4],
        flexDirection: "row",
        alignItems: "flex-start",
      })}
    >
      <View style={{ paddingTop: 2 }}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <T variant="sm" weight="bold">
          {title}
          {active ? "  ✓" : ""}
        </T>
        <T variant="xs" color="muted">
          {description}
        </T>
      </View>
    </Pressable>
  );
}

/* ── the custom-field value formatter (web parity) ── */

function fmtCustomValue(f: CustomFieldValue): string {
  if (f.value === null || f.value === undefined) return "—";
  if (f.type === "BOOLEAN") return f.value ? "نعم" : "لا";
  if (f.type === "MULTI_SELECT" && Array.isArray(f.value)) return f.value.join(" · ");
  return String(f.value);
}
