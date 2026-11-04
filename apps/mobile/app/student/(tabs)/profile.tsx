/**
 * (tabs)/profile — حساب الطالب, R334 R2 recomposed. The identity block
 * the shell workstream pulled out of the top bar lives HERE now (avatar,
 * name, «طالب» badge, email, institution + memberships), then the
 * academic facts (GET /me/profile merged session-first), then the
 * preferences seat — appearance, numerals («الأرقام: ١٢٣ / 123»),
 * haptics («ردود اللمس»), app lock (biometric), notifications — plus
 * «الإبلاغ عن مشكلة» (the /report sheet route) and logout behind a
 * destructive ConfirmSheet with haptics.notify('warning'). The menu hub
 * (RowList) keeps every student surface one tap away.
 */
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react-native";
import Bell from "lucide-react-native/icons/bell";
import BookOpen from "lucide-react-native/icons/book-open";
import Briefcase from "lucide-react-native/icons/briefcase";
import CalendarClock from "lucide-react-native/icons/calendar-clock";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import CircleHelp from "lucide-react-native/icons/circle-question-mark";
import Check from "lucide-react-native/icons/check";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import CreditCard from "lucide-react-native/icons/credit-card";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import FileText from "lucide-react-native/icons/file-text";
import FlaskConical from "lucide-react-native/icons/flask-conical";
import Flag from "lucide-react-native/icons/flag";
import Fingerprint from "lucide-react-native/icons/fingerprint-pattern";
import Gauge from "lucide-react-native/icons/gauge";
import Globe from "lucide-react-native/icons/globe";
import Grid3x3 from "lucide-react-native/icons/grid-3x3";
import Landmark from "lucide-react-native/icons/landmark";
import Library from "lucide-react-native/icons/library";
import Mail from "lucide-react-native/icons/mail";
import Map from "lucide-react-native/icons/map";
import Medal from "lucide-react-native/icons/medal";
import MessageSquare from "lucide-react-native/icons/message-square";
import Presentation from "lucide-react-native/icons/presentation";
import Radio from "lucide-react-native/icons/radio";
import ScanLine from "lucide-react-native/icons/scan-line";
import ScrollText from "lucide-react-native/icons/scroll-text";
import Settings from "lucide-react-native/icons/settings";
import Trophy from "lucide-react-native/icons/trophy";
import Users from "lucide-react-native/icons/users";
import Vibrate from "lucide-react-native/icons/vibrate";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { studentApi } from "@/api/student";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { setThemePreference, usePalette, useThemePreference, type ThemePreference } from "@/design/theme";
import { AppStatusBar } from "@/design/statusbar";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { PageHeader, Screen, SectionBar } from "@/components/ui/screen";
import { Badge, Card, Hairline } from "@/components/ui/surfaces";
import { Avatar, KpiCard, LedgerRow, RowList, StatLine } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Segmented } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { ConfirmSheet } from "@/components/ui/sheet";
import { PressableScale } from "@/motion";
import { haptics } from "@/haptics";
import { initials, NUMERALS_OPTIONS, useNumerals } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { unregisterPushDevices, currentPermission, requestAndRegisterPush, type PushPermissionState } from "@/lib/push";
import { authenticate, biometricAvailable, getBiometricLockEnabled, setBiometricLockEnabled } from "@/lib/biometric";
import { ScrollBody } from "@/features/student/components";
import { countAr } from "@/features/student/more";

/** The hub — every student surface one tap away (route list = web paths). */
const MENU: { icon: LucideIcon; label: string; to: string }[] = [
  { icon: Grid3x3, label: "مصفوفة الإتقان", to: "/student/matrix" },
  { icon: CalendarClock, label: "الجدول الأسبوعي", to: "/student/schedule" },
  { icon: CalendarDays, label: "التقويم", to: "/student/calendar" },
  { icon: ClipboardCheck, label: "النتائج", to: "/student/results" },
  { icon: FileText, label: "موادي التعليمية", to: "/student/materials" },
  { icon: ClipboardList, label: "التكاليف", to: "/student/assignments" },
  { icon: ScrollText, label: "بحوثي", to: "/student/research" },
  { icon: Library, label: "المكتبة", to: "/student/library" },
  { icon: Dumbbell, label: "التدريب الذاتي", to: "/training" },
  { icon: Trophy, label: "الإنجازات", to: "/achievements" },
  { icon: Medal, label: "نقاطي وأوسمتي", to: "/student/gamification" },
  { icon: Gauge, label: "مهاراتي", to: "/student/skills" },
  { icon: Users, label: "المجتمع", to: "/community" },
  { icon: MessageSquare, label: "المنشورات", to: "/student/social" },
  { icon: Globe, label: "دورات MOOC", to: "/student/mooc" },
  { icon: Briefcase, label: "الوظائف", to: "/student/jobs" },
  { icon: Radio, label: "الحصص المباشرة", to: "/student/live" },
  { icon: Presentation, label: "الندوات", to: "/student/webinars" },
  { icon: FlaskConical, label: "المعامل الافتراضية", to: "/student/labs" },
  { icon: ScanLine, label: "واقع افتراضي", to: "/student/ar" },
  { icon: BookOpen, label: "دليل المقررات", to: "/student/catalog" },
  { icon: Landmark, label: "عن الجامعة", to: "/student/university" },
  { icon: Map, label: "خريطة الكليات", to: "/student/map" },
  { icon: CreditCard, label: "الشؤون المالية", to: "/student/payment" },
  { icon: Mail, label: "الرسائل", to: "/student/messages" },
  { icon: CircleHelp, label: "دليل الاستخدام", to: "/help" },
  { icon: Settings, label: "الإعدادات", to: "/settings" },
];

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: "light", label: "فاتح" },
  { id: "dark", label: "داكن" },
  { id: "system", label: "النظام" },
];

export default function StudentProfile() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const qc = useQueryClient();
  const preference = useThemePreference();
  const { numerals, setNumerals } = useNumerals();

  const profile = useQuery({
    queryKey: ["me", "profile", scope],
    queryFn: () => studentApi.profile(),
  });

  /* Session-first identity merged with the profile query — the card
     renders from the persisted user before /me/profile answers. */
  const me = profile.data ?? null;
  const firstName = me?.firstName || user?.firstName || "";
  const lastName = me?.lastName || user?.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();
  const email = me?.email || user?.email || "";
  const avatarInitials = user?.avatarInitials || initials(firstName, lastName);
  const student = me?.student ?? null;
  const activeMemberships = (user?.memberships ?? []).filter((m) => m.isActive);

  /* Haptics seat — the persisted kill-switch (module no-ops on web).
     isEnabled() is a synchronous cached read (hydrated at module import),
     so the lazy initialiser needs no effect-driven state. */
  const [hapticsOn, setHapticsOn] = useState(() => haptics.isEnabled());
  const toggleHaptics = (next: boolean) => {
    haptics.setEnabled(next);
    setHapticsOn(next);
    if (next) haptics.impact("light"); // a felt sample of what was enabled
  };

  /* App lock — proves the sensor first (one authenticate) before saving. */
  const [bioAvail, setBioAvail] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  useEffect(() => {
    void biometricAvailable().then(setBioAvail);
    void getBiometricLockEnabled().then(setBioOn);
  }, []);
  const toggleBio = async (next: boolean) => {
    setBioBusy(true);
    try {
      if (next) {
        const ok = await authenticate("أكّد تفعيل قفل التطبيق");
        if (!ok) return; // refused → the toggle stays off
      }
      await setBiometricLockEnabled(next);
      setBioOn(next);
    } finally {
      setBioBusy(false);
    }
  };

  /* Notifications — permission is requested ONLY from this value-shown seat. */
  const [pushState, setPushState] = useState<PushPermissionState | null>(null);
  useEffect(() => {
    void currentPermission().then(setPushState);
  }, []);
  const enablePush = async () => {
    setPushState(await requestAndRegisterPush());
  };

  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <Screen scroll={false} padded={false}>
      <AppStatusBar />
      <AppTopBar alertsPath="/student/alerts" />
      <ScrollBody
        refreshing={profile.isFetching && !profile.isLoading}
        onRefresh={() => profile.refetch()}
      >
        <PageHeader title="حسابي" kicker="هويّتك الأكاديمية وبوابة جميع خدمات الطالب." />

        {/* الهويّة — the block the shell pulled out of the top bar */}
        <Card style={{ gap: sp[10] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
            <Avatar initials={avatarInitials} color={user?.avatarColor} size={64} />
            <View style={{ flex: 1, gap: sp[4] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">
                  {fullName || "—"}
                </T>
                <Badge label="طالب" tone="sky" />
              </View>
              {email ? (
                <T variant="sm" color="muted" numberOfLines={1}>
                  {email}
                </T>
              ) : null}
            </View>
          </View>
          <Hairline />
          <StatLine label="المؤسّسة الحالية" value={user?.currentInstitution?.name ?? "—"} />
          {activeMemberships.length > 0 ? (
            <T variant="xs" color="faint">
              {countAr(activeMemberships.length, [
                "عضوية واحدة نشطة",
                "عضويتان نشطتان",
                "عضويات نشطة",
                "عضوية نشطة",
              ])}
              {" — "}
              {activeMemberships.map((m) => m.name).join(" · ")}
            </T>
          ) : null}
        </Card>

        {/* السجل الأكاديمي */}
        <SectionBar index={1} title="المعلومات الأكاديمية" />
        {profile.isLoading ? (
          <SkeletonList rows={4} rowHeight={56} />
        ) : profile.isError ? (
          <ErrorState
            message={humanizeError(profile.error)}
            onRetry={() => profile.refetch()}
            onReport={() => router.push("/report" as never)}
            compact
          />
        ) : !student ? (
          <EmptyState
            icon={<ScrollText size={22} color={p.textMuted} />}
            title="لا يوجد ملف طالب بعد"
            message="لم يُربَط ملف طالب بحسابك — تواصل مع شؤون الطلاب لإكمال بياناتك الأكاديمية، وبمجرد اعتماده ستظهر سنتك ومعدّلك وجدولك هنا."
          />
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <KpiCard label="السنة" value={student.year} />
              <KpiCard label="المعدل التراكمي" value={student.gpa} />
            </View>
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <KpiCard label="نقاط الإنجاز" value={student.totalXp} suffix="نقاط" />
              <KpiCard label="المستوى" value={student.level} />
            </View>
            <Card>
              <StatLine label="الكلية" value={student.faculty?.name ?? "—"} />
              <StatLine label="القسم" value={student.department?.name ?? "—"} />
              <StatLine label="الرقم الجامعي" value={student.universityId ?? "—"} />
            </Card>
          </>
        )}

        {/* التفضيلات */}
        <SectionBar index={2} title="التفضيلات" />
        <Card style={{ gap: sp[8] }}>
          <T variant="body" weight="bold">المظهر</T>
          <Segmented
            options={THEME_OPTIONS}
            selectedId={preference}
            onSelect={(id) => {
              haptics.selection();
              setThemePreference(id as ThemePreference);
              void studentApi.theme(id === "light" ? "LIGHT" : id === "dark" ? "DARK" : "SYSTEM").catch(
                () => undefined, // local preference still applies; server sync is best-effort
              );
            }}
          />
          <T variant="xs" color="faint">
            يتبع التطبيق تفضيلك هنا وعلى الموقع — يتزامن مع حسابك.
          </T>
        </Card>
        <Card style={{ gap: sp[8] }}>
          <T variant="body" weight="bold">الأرقام</T>
          <Segmented
            options={NUMERALS_OPTIONS}
            selectedId={numerals}
            onSelect={(id) => {
              haptics.selection();
              setNumerals(id as typeof numerals);
            }}
          />
          <T variant="xs" color="faint">
            طريقة عرض الأرقام في لوحتك ونتائجك — {`١٢٣`} بالخط العربي أو {`123`} باللاتيني.
          </T>
        </Card>
        <Card style={{ gap: sp[8] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
            <Vibrate size={20} color={p.textMuted} />
            <View style={{ flex: 1 }}>
              <T variant="body" weight="bold">ردود اللمس</T>
              <T variant="xs" color="muted">
                اهتزاز خفيف عند التفاعلات الرئيسة — يعمل على الجوال فقط.
              </T>
            </View>
            <Button
              label={hapticsOn ? "إلغاء" : "تفعيل"}
              kind={hapticsOn ? "ghost" : "primary"}
              small
              onPress={() => toggleHaptics(!hapticsOn)}
            />
          </View>
        </Card>
        {bioAvail ? (
          <Card style={{ gap: sp[8] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
              <Fingerprint size={20} color={p.textMuted} />
              <View style={{ flex: 1 }}>
                <T variant="body" weight="bold">قفل التطبيق بالبصمة</T>
                <T variant="xs" color="muted">
                  عند التفعيل، يُطلب فتح القفل عند كل فتح بارد للتطبيق قبل عرض أي بيانات — مع رمز الجهاز كبديل دائمًا.
                </T>
              </View>
              <Button
                label={bioBusy ? "…" : bioOn ? "إلغاء" : "تفعيل"}
                kind={bioOn ? "ghost" : "primary"}
                small
                disabled={bioBusy}
                onPress={() => void toggleBio(!bioOn)}
              />
            </View>
          </Card>
        ) : null}
        {pushState === "granted" ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
            <Check size={20} color={p.textMuted} />
            <T variant="body" weight="medium" style={{ flex: 1 }}>
              الإشعارات مفعّلة — تصلك التنبيهات على هذا الجهاز.
            </T>
          </Card>
        ) : pushState === "denied" ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
            <Bell size={20} color={p.textMuted} />
            <T variant="sm" color="muted" style={{ flex: 1 }}>
              الإشعارات معطّلة من إعدادات النظام — فعّلها لتصلك التنبيهات، ويبقى صندوق الوارد داخل التطبيق يعمل دائمًا.
            </T>
          </Card>
        ) : pushState === "undetermined" ? (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
            <Bell size={20} color={p.textMuted} />
            <T variant="body" weight="medium" style={{ flex: 1 }}>
              الإشعارات
            </T>
            <Button label="تفعيل الإشعارات" kind="primary" small onPress={() => void enablePush()} />
          </Card>
        ) : null}

        {/* الإبلاغ عن مشكلة — يفتح ورقة الإبلاغ (مسار /report) */}
        <Card>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="الإبلاغ عن مشكلة"
            onPress={() => {
              haptics.selection();
              router.push("/report" as never);
            }}
            style={{ flexDirection: "row", alignItems: "center", gap: sp[10], minHeight: 44 }}
          >
            <Flag size={20} color={p.textMuted} />
            <T variant="body" weight="medium" style={{ flex: 1 }}>
              الإبلاغ عن مشكلة
            </T>
          </PressableScale>
        </Card>

        {/* الجلسة */}
        <Button
          label="تسجيل الخروج"
          kind="danger"
          onPress={() => {
            haptics.notify("warning");
            setConfirmLogout(true);
          }}
        />

        {/* الأقسام — the menu hub */}
        <SectionBar index={3} title="الأقسام" />
        <RowList>
          {MENU.map((m, i) => (
            <LedgerRow
              key={m.to}
              last={i === MENU.length - 1}
              onPress={() => router.push(m.to as never)}
              accessibilityLabel={m.label}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <m.icon size={20} color={p.textMuted} />
                <T variant="body" weight="medium" style={{ flex: 1 }}>
                  {m.label}
                </T>
              </View>
            </LedgerRow>
          ))}
        </RowList>
        <T variant="xs" color="faint">
          جميع خدمات الطالب متاحة من هنا — تعمل بعضها في وضع الطيار وتُوسَم بذلك داخل صفحاتها.
        </T>

        <ConfirmSheet
          open={confirmLogout}
          onClose={() => setConfirmLogout(false)}
          title="تسجيل الخروج؟"
          message="ستنتهي جلستك على هذا الجهاز فقط — تُحفظ جلسات أجهزتك الأخرى."
          confirmLabel="خروج"
          destructive
          onConfirm={async () => {
            setConfirmLogout(false);
            // R327 C3 — a handed-over phone must not keep pushing.
            await unregisterPushDevices().catch(() => undefined);
            await logout();
            qc.clear();
            router.replace("/");
          }}
        />
      </ScrollBody>
    </Screen>
  );
}
