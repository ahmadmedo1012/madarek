import type { ComponentType } from "react";
import Activity from "lucide-react-native/icons/activity";
import BarChart3 from "lucide-react-native/icons/chart-column";
import Bell from "lucide-react-native/icons/bell";
import BookOpen from "lucide-react-native/icons/book-open";
import CalendarDays from "lucide-react-native/icons/calendar-days";
import ClipboardList from "lucide-react-native/icons/clipboard-list";
import FileSearch from "lucide-react-native/icons/file-search";
import Home from "lucide-react-native/icons/house";
import Landmark from "lucide-react-native/icons/landmark";
import LineChart from "lucide-react-native/icons/chart-line";
import Network from "lucide-react-native/icons/network";
import Scale from "lucide-react-native/icons/scale";
import ScrollText from "lucide-react-native/icons/scroll-text";
import Sparkles from "lucide-react-native/icons/sparkles";
import User from "lucide-react-native/icons/user";
import Users from "lucide-react-native/icons/users";
import type { AppRole } from "@/api/types";

export interface RoleTab {
  /**
   * Route name inside the role's `(tabs)` group — the file basename
   * (`app/<role>/(tabs)/dashboard.tsx` → name "dashboard").
   */
  name: string;
  /**
   * Stabilized URL — the `(tabs)` group never contributes a path segment,
   * so `/student/dashboard` and the `madarek://student/dashboard` deep link
   * keep working unchanged.
   */
  path: string;
  label: string;
  icon: ComponentType<{ size?: number; color?: string }>;
  /** Tab hosting the notifications inbox — receives the unread badge. */
  inbox?: boolean;
}

/**
 * Per-role tab destinations (web BottomNav parity). R331 A-App-Shell: the
 * single source of truth for BOTH the persistent `Tabs` navigator in
 * `app/<role>/(tabs)/_layout.tsx` (which registers one Tabs.Screen per
 * entry) and the shared bar chrome `RoleTabBar` (labels, icons, badge).
 * Previously this config lived inside TabFrame.tsx and was re-rendered
 * per screen — the "the bottom bar moves when navigating" defect.
 */
export const ROLE_TABS: Record<AppRole, RoleTab[]> = {
  STUDENT: [
    { name: "dashboard", path: "/student/dashboard", label: "الرئيسية", icon: Home },
    { name: "courses", path: "/student/courses", label: "مقرراتي", icon: BookOpen },
    { name: "ai", path: "/student/ai", label: "المساعد", icon: Sparkles },
    { name: "alerts", path: "/student/alerts", label: "الإشعارات", icon: Bell, inbox: true },
    { name: "profile", path: "/student/profile", label: "حسابي", icon: User },
  ],
  TEACHER: [
    { name: "dashboard", path: "/teacher/dashboard", label: "اللوحة", icon: Home },
    { name: "schedule", path: "/teacher/schedule", label: "الجدول", icon: CalendarDays },
    { name: "students", path: "/teacher/students", label: "الطلاب", icon: Users },
    { name: "intelligence", path: "/teacher/intelligence", label: "التحليلات", icon: LineChart },
    { name: "profile", path: "/teacher/profile", label: "حسابي", icon: User },
  ],
  ADMIN: [
    { name: "dashboard", path: "/admin/dashboard", label: "اللوحة", icon: Home },
    { name: "faculties", path: "/admin/faculties", label: "الكلّيات", icon: Landmark },
    { name: "students", path: "/admin/students", label: "الطلاب", icon: Users },
    { name: "teachers", path: "/admin/teachers", label: "الأساتذة", icon: ScrollText },
    { name: "reports", path: "/admin/reports", label: "التقارير", icon: BarChart3 },
  ],
  QUALITY: [
    { name: "dashboard", path: "/quality/dashboard", label: "اللوحة", icon: Home },
    { name: "courses", path: "/quality/courses", label: "المقررات", icon: BookOpen },
    { name: "curriculum", path: "/quality/curriculum", label: "المناهج", icon: ClipboardList },
    { name: "engagement", path: "/quality/engagement", label: "التفاعل", icon: Network },
    { name: "reports", path: "/quality/reports", label: "التقارير", icon: FileSearch },
  ],
  OWNER: [
    // R331 copy fix: «الحواكمة» (typo) → «الحوكمة» — web BottomNav parity.
    { name: "dashboard", path: "/owner/dashboard", label: "اللوحة", icon: Home },
    { name: "users", path: "/owner/users", label: "المستخدمون", icon: Users },
    { name: "realtime", path: "/owner/realtime", label: "الحيّ", icon: Activity },
    { name: "notifications", path: "/owner/notifications", label: "الإشعارات", icon: Bell, inbox: true },
    { name: "governance", path: "/owner/governance", label: "الحوكمة", icon: Scale },
  ],
};
