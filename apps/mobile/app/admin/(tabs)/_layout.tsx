import { RoleTabs } from "@/components/shell/HeronTabBar";
import { BarChart3, Home, Landmark, ScrollText, Users } from "lucide-react-native";

/** Admin (registrar) tabs — web BottomNav parity: home/faculties/students/teachers/reports. */
export default function AdminTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", label: "اللوحة", icon: Home },
        { name: "faculties", label: "الكلّيات", icon: Landmark },
        { name: "students", label: "الطلاب", icon: Users },
        { name: "teachers", label: "الأساتذة", icon: ScrollText },
        { name: "reports", label: "التقارير", icon: BarChart3 },
      ]}
    />
  );
}
