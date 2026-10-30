/**
 * Error500Page — the routed 500 surface (R320 cycle-3, PAGES-GAP
 * P2-3).
 *
 * The RouteErrorBoundary stays the real crash net (it catches render
 * failures with offline-aware copy); THIS route exists so the state is
 * reachable, linkable and gate-capturable exactly like /404 — QA, the
 * evidence harness and the error boundary's own fallback can point at
 * a designed sheet instead of an ad-hoc blank. Honest copy: an error
 * on OUR side, nothing the visitor did; retry is the browser's own
 * reload (no fake "try again" button that cannot know the failed
 * route's intent).
 */
import { ErrorSheetPage } from '../components/error/ErrorSheetPage';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Error500Page() {
  usePageTitle('خطأ في الخادم');
  /* §A5: NBSP glues the dash to the preceding word — the dash can
   * never start its own line (text-wrap:balance on .nf-title re-flows
   * the pair as one unit). */
  const title = 'خللٌ من جانبنا\u00A0— لا من جانبك';
  return (
    <ErrorSheetPage
      title={title}
      lead="حدث خطأ داخلي أثناء تجهيز هذه الصفحة. فريق مدارك يرصد الأخطاء تلقائيًا؛ جرّب تحديث الصفحة بعد لحظات."
      illustration="error-generic"
      note="إذا استمرّ الخلل، يمكنك العودة إلى الرئيسية أو تسجيل الدخول من جديد."
    />
  );
}
