import { FeedbackInbox } from "@/features/governance/FeedbackInbox";
import { REGISTRAR_DASHBOARD } from "@/lib/copy";

/** Pushed: /admin/feedback — the registrar's feedback inbox. */
export default function AdminFeedback() {
  return <FeedbackInbox kicker={REGISTRAR_DASHBOARD} />;
}
