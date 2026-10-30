/**
 * MaintenancePage — the routed maintenance surface (R320 cycle-3,
 * PAGES-GAP P2-4).
 *
 * Ships DISABLED-BY-DEFAULT: no maintenance flag exists in the
 * backend yet (PAGES-GAP's honest finding), so nothing links here and
 * nothing redirects to it — the route exists so (a) the gate can
 * capture the designed state, (b) the future flag has a ready,
 * designed destination, and (c) ops can link it manually during a
 * planned window. The copy is honest about what maintenance means on
 * an experimental platform: a pause, not data loss.
 */
import { ErrorSheetPage } from '../components/error/ErrorSheetPage';
import { usePageTitle } from '../hooks/usePageTitle';

export default function MaintenancePage() {
  usePageTitle('صيانة دورية');
  return (
    <ErrorSheetPage
      title="مدارك في صيانة قصيرة"
      lead="أوقفنا الخدمة مؤقتًا لتحديثٍ دوري. بياناتك محفوظة ولن يُفقد شيء — عود بعد قليل وستجد كل شيء في مكانه."
      illustration="server-waking"
      note="هذه الصفحة لا تُفتح تلقائيًا في الوضع الحالي؛ تُستخدم أثناء نوافذ الصيانة المخطّطة فقط."
    />
  );
}
