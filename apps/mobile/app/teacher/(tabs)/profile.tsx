/**
 * (tabs)/profile — الملف الأكاديمي. Web parity: TeacherProfilePage
 * (identity + verified badge + rank + workload + bio/office/website +
 * the four-field self edit) + the mobile menu hub (RowList) into every
 * teacher surface.
 */
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useSession, POSITION_LABELS, RANK_LABELS, ROLE_LABELS } from "@/auth/session";
import { latn } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Badge, Card, Sheet } from "@/components/ui/surfaces";
import { Avatar, LedgerRow, RowList, StatLine } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { arCount } from "@/features/teacher/components";

/** Wire shape of GET /me/teacher-profile (teacher-profile.routes.ts). */
type TeacherProfileWire = {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  specialty?: string | null;
  rank?: string | null;
  bio?: string | null;
  degreeLevel?: string | null;
  yearsExperience?: number | null;
  certifications?: unknown[];
  publications?: { title?: string; venue?: string; year?: number; url?: string }[];
  awards?: { title?: string; issuer?: string; year?: number }[];
  officeLocation?: string | null;
  officeHours?: string | null;
  websiteUrl?: string | null;
  subjectKeywords?: string[];
  verifiedAt?: string | null;
  department?: string;
  faculty?: string;
  courses?: { offeringId: string; code: string; name: string; term: string; enrolled: number; credits?: number | null }[];
  workload?: { courseCount: number; totalCredits: number; totalEnrolled: number };
  position?: string | null;
  [k: string]: unknown;
};

const MENU: { label: string; to: string }[] = [
  { label: "جدولي", to: "/teacher/schedule" },
  { label: "طلابي", to: "/teacher/students" },
  { label: "الحضور", to: "/teacher/attendance" },
  { label: "الدرجات", to: "/teacher/grades" },
  { label: "المواد", to: "/teacher/materials" },
  { label: "التكاليف", to: "/teacher/assignments" },
  { label: "بنك الأسئلة والاختبارات", to: "/teacher/exams" },
  { label: "بناء المنهج", to: "/teacher/curriculum" },
  { label: "مراجعة البحوث", to: "/teacher/research-review" },
  { label: "حصص مباشرة", to: "/teacher/live" },
  { label: "المعامل", to: "/teacher/labs" },
  { label: "التحليلات", to: "/teacher/intelligence" },
  { label: "الرسائل", to: "/teacher/messages" },
  { label: "المساعد", to: "/teacher/ai" },
  { label: "الإشعارات", to: "/teacher/alerts" },
  { label: "الإعدادات", to: "/settings" },
];

export default function TeacherProfile() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const user = useSession((s) => s.user);
  const [editing, setEditing] = useState(false);

  const profile = useQuery({
    queryKey: ["teacher", "profile", scope],
    queryFn: () => teacherApi.teacherProfile(),
  });

  const me = (profile.data ?? null) as TeacherProfileWire | null;

  const [bio, setBio] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [officeHours, setOfficeHours] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      teacherApi.updateTeacherProfile({
        bio: bio.trim() || null,
        officeLocation: officeLocation.trim() || null,
        officeHours: officeHours.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teacher", "profile"] });
      setEditing(false);
      setSaveError(null);
      toast.success("تمّ حفظ تعديلات ملفك الأكاديمي.", "تمّ الحفظ");
    },
    onError: (e) => {
      setSaveError((e as Error).message || "تعذَّر حفظ التعديلات — حاول مرة أخرى.");
    },
  });

  const positionLabel = (() => {
    const pos = me?.position ?? user?.teacherProfile?.position ?? null;
    return pos ? POSITION_LABELS[pos] ?? null : null;
  })();
  const rank = me?.rank ?? user?.teacherProfile?.rank ?? null;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/teacher/alerts" />
      <PageHeader
        title="الملف الأكاديمي"
        kicker="ملفك الأكاديمي كما يظهر للمسجل العام، مكتب الجودة، والطلاب."
      />

      {profile.isLoading ? (
        <SkeletonList rows={5} />
      ) : profile.isError ? (
        <ErrorState message={(profile.error as Error).message} onRetry={() => profile.refetch()} />
      ) : !me ? (
        <EmptyState
          title="لا يوجد ملف أستاذ مرتبط بهذا الحساب"
          message="تواصل مع المسجل العام لربط ملفك الأكاديمي بهذا الحساب."
        />
      ) : (
        <>
          {/* Identity — avatar + name + role/rank + verified. */}
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
              <Avatar
                initials={me.avatarInitials ?? `${(me.firstName ?? "؟")[0]}${(me.lastName ?? "")[0]}`}
                color={me.avatarColor}
                size={64}
              />
              <View style={{ flex: 1, gap: sp[4] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                  <T variant="h3" weight="bold">
                    {me.name ?? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()}
                  </T>
                  {me.verifiedAt ? (
                    <Badge label="موثَّق" tone="mint" />
                  ) : null}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6] }}>
                  <Badge label={user ? ROLE_LABELS[user.role] ?? "أستاذ" : "أستاذ"} tone="grey" />
                  {rank ? <Badge label={RANK_LABELS[rank] ?? rank} tone="lavender" /> : null}
                  {positionLabel ? <Badge label={positionLabel} tone="copper" /> : null}
                </View>
                <T variant="xs" color="muted">
                  {me.email ?? user?.email ?? ""}
                </T>
                <T variant="xs" color="muted">
                  {[me.specialty, me.department, me.faculty].filter(Boolean).join(" · ")}
                </T>
              </View>
            </View>
            {me.verifiedAt ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4], paddingTop: sp[8] }}>
                <ShieldCheck size={14} color={p.accentInk} />
                <T variant="xs" color="muted">
                  موثَّق لدى الجهة الأكاديمية
                </T>
              </View>
            ) : null}
          </Card>

          {/* Workload — the wire's own numbers. */}
          {me.workload ? (
            <Card>
              <StatLine label="المقرّرات هذا الفصل" value={latn(me.workload.courseCount)} />
              <StatLine label="إجمالي الطلاب" value={latn(me.workload.totalEnrolled)} hint="مسجَّلون في مقرّراتك" />
              {me.yearsExperience !== null && me.yearsExperience !== undefined ? (
                <StatLine
                  label="سنوات الخبرة"
                  value={latn(me.yearsExperience)}
                />
              ) : null}
            </Card>
          ) : null}

          {/* نبذة شخصية + المكتب + الموقع — the four editable fields. */}
          <SectionBar
            index={1}
            title="نبذة شخصية"
            action={
              <Button
                label="تحرير السيرة"
                kind="ghost"
                small
                onPress={() => {
                  setBio(me.bio ?? "");
                  setOfficeLocation(me.officeLocation ?? "");
                  setOfficeHours(me.officeHours ?? "");
                  setWebsiteUrl(me.websiteUrl ?? "");
                  setSaveError(null);
                  setEditing(true);
                }}
              />
            }
          />
          <Card>
            {me.bio ? (
              <T variant="body" color="secondary">
                {me.bio}
              </T>
            ) : (
              <T variant="sm" color="muted">
                لم تُضف نبذة بعد. اضغط «تحرير السيرة» لإضافة وصف عن خلفيتك الأكاديمية.
              </T>
            )}
            <StatLine label="موقع المكتب" value={me.officeLocation ?? "—"} />
            <StatLine label="ساعات العمل" value={me.officeHours ?? "—"} />
            <StatLine label="الموقع الإلكتروني" value={me.websiteUrl ?? "—"} />
            {Array.isArray(me.subjectKeywords) && me.subjectKeywords.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6] }}>
                {me.subjectKeywords.map((kw) => (
                  <Badge key={kw} label={kw} tone="grey" />
                ))}
              </View>
            ) : null}
          </Card>

          {/* المقرّرات الحالية. */}
          <SectionBar index={2} title="المقرّرات الحالية" />
          {Array.isArray(me.courses) && me.courses.length > 0 ? (
            <RowList>
              {me.courses.map((c, i) => (
                <LedgerRow
                  key={c.offeringId}
                  last={i === me.courses!.length - 1}
                  onPress={() => router.push(`/teacher/students/${c.offeringId}` as never)}
                  accessibilityLabel={`طلاب ${c.name}`}
                >
                  <T variant="body" weight="medium" numberOfLines={1}>
                    {c.name}
                  </T>
                  <T variant="xs" color="muted">
                    {c.code} · {c.term} ·{" "}
                    {c.enrolled === 0 ? "لا طلاب" : arCount(c.enrolled, ["طالب واحد", "طالبان", "طلاب", "طالباً"])}
                  </T>
                </LedgerRow>
              ))}
            </RowList>
          ) : (
            <Card>
              <T variant="sm" color="muted">لم يُسند إليك أي مقرّر بعد</T>
            </Card>
          )}

          {/* Menu hub — every teacher surface one tap away. */}
          <SectionBar index={3} title="الأقسام" />
          <RowList>
            {MENU.map((m, i) => (
              <LedgerRow
                key={m.to}
                last={i === MENU.length - 1}
                onPress={() => router.push(m.to as never)}
                accessibilityLabel={m.label}
              >
                <T variant="body" weight="medium">
                  {m.label}
                </T>
              </LedgerRow>
            ))}
          </RowList>
        </>
      )}

      {/* تحرير السيرة — the four backend-accepted fields (updateProfileSchema). */}
      <Sheet open={editing} onClose={() => setEditing(false)} title="تحرير السيرة">
        <Field
          label="نبذة"
          value={bio}
          onChangeText={setBio}
          multiline
          placeholder="اكتب نبذة عن خبرتك الأكاديمية والبحثية وأهم اهتماماتك العلمية…"
          accessibilityLabel="نبذة"
        />
        <Field
          label="موقع المكتب"
          value={officeLocation}
          onChangeText={setOfficeLocation}
          placeholder="مثال: مبنى الكلّيّة - مكتب 305"
          accessibilityLabel="موقع المكتب"
        />
        <Field
          label="ساعات العمل"
          value={officeHours}
          onChangeText={setOfficeHours}
          placeholder="مثال: الأحد والثلاثاء 10-12"
          accessibilityLabel="ساعات العمل"
        />
        <Field
          label="الموقع الإلكتروني"
          value={websiteUrl}
          onChangeText={setWebsiteUrl}
          placeholder="https://example.com/profile"
          accessibilityLabel="الموقع الإلكتروني"
        />
        {saveError ? (
          <T variant="sm" color="danger">
            {saveError}
          </T>
        ) : null}
        <Button label="حفظ" loading={save.isPending} onPress={() => save.mutate()} />
      </Sheet>
    </Screen>
  );
}
