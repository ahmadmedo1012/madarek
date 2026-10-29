import { RoleTabs } from "@/components/shell/HeronTabBar";
import { Activity, Home, Landmark, Scale, Users } from "lucide-react-native";

/** Owner tabs — web BottomNav parity: home/users/realtime/notifications/governance. */
export default function OwnerTabs() {
  return (
    <RoleTabs
      tabs={[
        { name: "dashboard", label: "اللوحة", icon: Home },
        { name: "users", label: "المستخدمون", icon: Users },
        { name: "realtime", label: "الحيّ", icon: Activity },
        { name: "notifications", label: "الإشعارات", icon: Landmark, inbox: true },
        { name: "governance", label: "الحواكمة", icon: Scale },
      ]}
    />
  );
}
