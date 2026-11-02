/**
 * (tabs)/profile — حساب الطالب. Web parity: ProfilePage identity facts
 * (avatar / name / email / «طالب» badge + year, gpa, totalXp, level,
 * faculty / department / universityId from GET /me/profile), merged with
 * the session user (names / email / avatarColor render immediately —
 * the identity card never waits on the wire), then the mobile menu hub
 * (RowList) into every student surface.
 */
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react-native";
import BookOpen from "lucide-react-native/icons/book-open";
import Briefcase from "lucide-react-native/icons/briefcase";
import CalendarClock from "lucide-react-native/icons/calendar-clock";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import CircleHelp from "lucide-react-native/icons/circle-question-mark";
import Flag from "lucide-react-native/icons/flag";
import ClipboardCheck from "lucide-react-native/icons/clipboard-check";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import CreditCard from "lucide-react-native/icons/credit-card";
import Dumbbell from "lucide-react-native/icons/dumbbell";
import FileText from "lucide-react-native/icons/file-text";
import FlaskConical from "lucide-react-native/icons/flask-conical";
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
import { AppTopBar } from "@/components/shell/AppTopBar";
import { studentApi } from "@/api/student";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { PageHeader, Screen, SectionBar } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { Avatar, KpiCard, LedgerRow, RowList, StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { initials } from "@/lib/format";
import { ScrollBody } from "@/features/student/components";

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
  // R331 A-App-Shell — the report loop entry (replaces the removed floating FAB).
  { icon: Flag, label: "الإبلاغ عن مشكلة", to: "/report" },
  { icon: CircleHelp, label: "دليل الاستخدام", to: "/help" },
  { icon: Settings, label: "الإعدادات", to: "/settings" },
];

export default function StudentProfile() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);

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

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/student/alerts" />
      <ScrollBody
        refreshing={profile.isFetching && !profile.isLoading}
        onRefresh={() => profile.refetch()}
      >
        <PageHeader title="حسابي" kicker="هويّتك الأكاديمية وبوابة جميع خدمات الطالب." />

        {/* الهويّة — session data merged with /me/profile */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
            <Avatar initials={avatarInitials} color={user?.avatarColor} size={64} />
            <View style={{ flex: 1, gap: sp[4] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
                <T variant="h3" weight="bold">
                  {fullName || "—"}
                </T>
                <Badge label="طالب" tone="grey" />
              </View>
              {email ? (
                <T variant="sm" color="muted" numberOfLines={1}>
                  {email}
                </T>
              ) : null}
            </View>
          </View>
        </Card>

        {/* السجل الأكاديمي */}
        <SectionBar index={1} title="المعلومات الأكاديمية" />
        {profile.isLoading ? (
          <SkeletonList rows={4} rowHeight={56} />
        ) : profile.isError ? (
          <ErrorState
            message={(profile.error as Error | null)?.message}
            onRetry={() => profile.refetch()}
            compact
          />
        ) : !student ? (
          /* R2 (B4 review): the bare muted Card became a real EmptyState —
             icon + title + honest guidance, the kit's grammar everywhere
             else. */
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

        {/* الأقسام — the menu hub */}
        <SectionBar index={2} title="الأقسام" />
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
      </ScrollBody>
    </Screen>
  );
}
