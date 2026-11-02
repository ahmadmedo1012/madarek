import { router } from "expo-router";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

/**
 * Pushed: /teacher/alerts — the teacher's personal notification inbox (the
 * bell target from every tab's AppTopBar). R331 A-App-Shell: pushes over
 * the persistent (tabs) shell with its own back affordance — the bar no
 * longer re-renders per screen.
 */
export default function Alerts() {
  return <NotificationsScreen title="الإشعارات" kicker="بريدك" stacked onBack={() => router.back()} />;
}
