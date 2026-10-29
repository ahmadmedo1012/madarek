import { RoleTabs } from "@/components/shell/HeronTabBar";
import { Bell, BookOpen, Home, Sparkles, User } from "lucide-react-native";

/** Student tabs — web BottomNav parity: home/courses/AI/alerts/profile. */
export default function StudentTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", label: "الرئيسية", icon: Home },
        { name: "courses", label: "مقرراتي", icon: BookOpen },
        { name: "ai", label: "المساعد", icon: Sparkles },
        { name: "alerts", label: "الإشعارات", icon: Bell, inbox: true },
        { name: "profile", label: "حسابي", icon: User },
      ]}
    />
  );
}
