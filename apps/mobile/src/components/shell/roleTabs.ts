import type { ComponentType } from "react";
import Activity from "lucide-react-native/icons/activity";
import Bell from "lucide-react-native/icons/bell";
import BookOpen from "lucide-react-native/icons/book-open";
import Bot from "lucide-react-native/icons/bot";
import Brain from "lucide-react-native/icons/brain";
import Calendar from "lucide-react-native/icons/calendar";
import CircleUser from "lucide-react-native/icons/circle-user";
import FileText from "lucide-react-native/icons/file-text";
import GraduationCap from "lucide-react-native/icons/graduation-cap";
import Home from "lucide-react-native/icons/house";
import ListChecks from "lucide-react-native/icons/list-checks";
import Network from "lucide-react-native/icons/network";
import Radio from "lucide-react-native/icons/radio";
import School from "lucide-react-native/icons/school";
import ShieldCheck from "lucide-react-native/icons/shield-check";
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
  /**
   * Lucide icon component. R334 3-a: `fill` is part of the contract — the
   * active tab MORPHS outline→filled by filling the glyph body with the
   * accent (lucide's svg `fill` prop); inactive tabs pass "transparent".
   */
  icon: ComponentType<{ size?: number; color?: string; fill?: string }>;
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
    /* r357-ui A2 — one glyph per destination across every menu: the tab
       bar now wears the SAME lucide glyph `lib/nav.ts` gives that route
       (bot / circle-user were Sparkles / User). The bar's short labels
       stay (5-B5: shortening is fine, renaming is not) — only the glyph
       drifted, and a route must never show two icons on one screen. */
    { name: "ai", path: "/student/ai", label: "المساعد", icon: Bot },
    { name: "alerts", path: "/student/alerts", label: "الإشعارات", icon: Bell, inbox: true },
    { name: "profile", path: "/student/profile", label: "حسابي", icon: CircleUser },
  ],
  TEACHER: [
    { name: "dashboard", path: "/teacher/dashboard", label: "اللوحة", icon: Home },
    { name: "schedule", path: "/teacher/schedule", label: "الجدول", icon: Calendar },
    { name: "students", path: "/teacher/students", label: "الطلاب", icon: Users },
    { name: "intelligence", path: "/teacher/intelligence", label: "التحليلات", icon: Brain },
    { name: "profile", path: "/teacher/profile", label: "حسابي", icon: CircleUser },
  ],
  ADMIN: [
    { name: "dashboard", path: "/admin/dashboard", label: "اللوحة", icon: Home },
    { name: "faculties", path: "/admin/faculties", label: "الكلّيات", icon: Network },
    { name: "students", path: "/admin/students", label: "الطلاب", icon: GraduationCap },
    { name: "teachers", path: "/admin/teachers", label: "الأساتذة", icon: School },
    { name: "reports", path: "/admin/reports", label: "التقارير", icon: FileText },
  ],
  QUALITY: [
    { name: "dashboard", path: "/quality/dashboard", label: "اللوحة", icon: Home },
    { name: "courses", path: "/quality/courses", label: "المقررات", icon: BookOpen },
    { name: "curriculum", path: "/quality/curriculum", label: "المناهج", icon: ListChecks },
    { name: "engagement", path: "/quality/engagement", label: "التفاعل", icon: Activity },
    { name: "reports", path: "/quality/reports", label: "التقارير", icon: FileText },
  ],
  OWNER: [
    // R331 copy fix: «الحواكمة» (typo) → «الحوكمة» — web BottomNav parity.
    { name: "dashboard", path: "/owner/dashboard", label: "اللوحة", icon: Home },
    { name: "users", path: "/owner/users", label: "المستخدمون", icon: Users },
    { name: "realtime", path: "/owner/realtime", label: "الحيّ", icon: Radio },
    { name: "notifications", path: "/owner/notifications", label: "الإشعارات", icon: Bell, inbox: true },
    { name: "governance", path: "/owner/governance", label: "الحوكمة", icon: ShieldCheck },
  ],
};
