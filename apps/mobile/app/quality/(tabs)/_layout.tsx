import { RoleTabs } from "@/components/shell/HeronTabBar";
import { BookOpen, ClipboardList, FileSearch, Home, Network } from "lucide-react-native";

/** Quality tabs — web BottomNav parity: home/courses/curriculum/engagement/reports. */
export default function QualityTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", label: "اللوحة", icon: Home },
        { name: "courses", label: "المقررات", icon: BookOpen },
        { name: "curriculum", label: "المناهج", icon: ClipboardList },
        { name: "engagement", label: "التفاعل", icon: Network },
        { name: "reports", label: "التقارير", icon: FileSearch },
      ]}
    />
  );
}
