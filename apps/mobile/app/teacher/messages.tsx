import { router } from "expo-router";
import { MessagesUI } from "@/features/messages/MessagesUI";

/** /teacher/messages — the shared DM inbox (MessagesUI), pushed over the
 *  tab shell. R362: carries a back affordance (was edge-swipe-only). */
export default function Messages() {
  return <MessagesUI onBack={() => router.back()} />;
}
