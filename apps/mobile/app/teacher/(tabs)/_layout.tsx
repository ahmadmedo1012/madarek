import { RoleTabs } from "@/components/shell/HeronTabBar";
import { CalendarDays, Home, LineChart, User, Users } from "lucide-react-native";

/** Teacher tabs — web BottomNav parity: home/schedule/students/intelligence/profile. */
export default function TeacherTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", label: "اللوحة", icon: Home },
        { name: "schedule", label: "الجدول", icon: CalendarDays },
        { name: "students", label: "الطلاب", icon: Users },
        { name: "intelligence", label: "التحليلات", icon: LineChart },
        { name: "profile", label: "حسابي", icon: User },
      ]}
    />
  );
}
