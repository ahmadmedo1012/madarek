import { router } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { T } from "@/components/ui/text";
import { ReportProblemForm } from "@/features/feedback/ReportProblem";

/**
 * /report — «الإبلاغ عن مشكلة» (R331 A-App-Shell). The pilot's floating
 * feedback FAB (FeedbackSheetHost — a 52dp square over content on every
 * screen, clipping list edges and the assistant composer) is gone; the
 * report loop is now a real route reached from the Profile menu (and
 * /settings), posting to the existing POST /feedback endpoint.
 */
export default function ReportProblem() {
  return (
    <Screen scroll>
      <StackHeader title="الإبلاغ عن مشكلة" kicker="مدارك" onBack={() => router.back()} />
      <Card>
        <T variant="body" color="muted">
          رأيك يصل فريق الطيار مباشرة — صف المشكلة أو الاقتراح وسيُرفَق مسار الشاشة تلقائيًا.
        </T>
      </Card>
      <Card>
        <ReportProblemForm />
      </Card>
    </Screen>
  );
}
