import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Screen } from "@/components/ui/screen";
import { ReportProblemSheet } from "@/features/feedback/ReportProblem";

/**
 * /report — «الإبلاغ عن مشكلة» (R331 A-App-Shell → R334 R2 sheet route).
 * The route IS the sheet: mounting presents the AppSheet (FilterSheet-
 * style scrollable + pinned send footer); every dismiss path (pan,
 * backdrop, «إغلاق», send) funnels back through router.back(). Reached
 * from the Profile menu, /settings, and every ErrorState «إبلاغ عن
 * مشكلة» affordance. Posts to POST /feedback.
 */
export default function ReportProblem() {
  const [open, setOpen] = useState(false);

  /* Present after mount — the push transition finishes first, then the
     sheet rises over the previous screen (never a cold hard cut). */
  useEffect(() => {
    setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    router.back();
  };

  return (
    <Screen scroll={false} padded={false}>
      <ReportProblemSheet open={open} onClose={close} />
    </Screen>
  );
}
