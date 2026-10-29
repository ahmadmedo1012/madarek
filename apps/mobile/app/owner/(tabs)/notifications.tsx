import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

/** (tabs) Owner inbox — the personal notifications feed (bell target). */
export default function Notifications() {
  return <NotificationsScreen title="بريدي" kicker="[Inbox]" />;
}
