import { RoleTabFrame } from "@/components/shell/TabFrame";

import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

/** /teacher/alerts — the teacher's personal notification inbox. */
function Alerts() {
  return <NotificationsScreen title="الإشعارات" kicker="بريدك" />;
}


export default function AlertsTabbed() {
  return (
    <RoleTabFrame role="TEACHER">
      <Alerts />
    </RoleTabFrame>
  );
}
