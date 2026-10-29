import { RoleTabFrame } from "@/components/shell/TabFrame";

import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

function Alerts() {
  return <NotificationsScreen title="الإشعارات" kicker="[Inbox]" />;
}


export default function AlertsTabbed() {
  return (
    <RoleTabFrame role="STUDENT">
      <Alerts />
    </RoleTabFrame>
  );
}
