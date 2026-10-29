import { RoleTabFrame } from "@/components/shell/TabFrame";

import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

/** (tabs) Owner inbox — the personal notifications feed (bell target). */
function Notifications() {
  return <NotificationsScreen title="بريدي" kicker="[Inbox]" />;
}


export default function NotificationsTabbed() {
  return (
    <RoleTabFrame role="OWNER">
      <Notifications />
    </RoleTabFrame>
  );
}
