import { router } from "expo-router";
import { NotificationsScreen } from "@/features/notifications/NotificationsScreen";

/**
 * Pushed: /admin/alerts — the registrar's personal notifications inbox.
 * R362: renders STACKED with a back affordance, matching the teacher and
 * quality seats — the registrar pushed here from a tab's bell and had no
 * way back except the edge swipe / hardware back.
 */
export default function Alerts() {
  return <NotificationsScreen title="الإشعارات" kicker="بريدك" stacked onBack={() => router.back()} />;
}
