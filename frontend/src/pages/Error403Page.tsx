/**
 * Error403Page — the routed 403 surface (R320 cycle-3, PAGES-GAP
 * P2-5).
 *
 * The wrong-role guard stays the primary behavior (toast + redirect to
 * the role home — ProtectedRoute), and component-level 403 states
 * (ErrorState's HTTP-403 branch, PermissionDenied) keep their seats.
 * THIS route is the designed, linkable destination for the cases that
 * land outside those nets: deep links a role may never open, and
 * ErrorState's way-back. The way back is honest: your role's home —
 * the guard's own map (nav.ts ROLE_HOME) decides where that is, so
 * the page never guesses.
 */
import { LayoutDashboard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { ErrorSheetPage } from '../components/error/ErrorSheetPage';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuthStore } from '../stores/auth.store';
import { ROLE_HOME } from '../lib/nav';

export default function Error403Page() {
  usePageTitle('غير مصرّح');
  const role = useAuthStore((s) => s.user?.role);
  const home = role ? ROLE_HOME[role] : '/';
  return (
    <ErrorSheetPage
      code="ERR [403]"
      coords="ACCESS DENIED"
      title="هذه الصفحة خارج نطاق صلاحياتك"
      lead="وصلت إلى صفحة لا يفتحها دورك في مدارك. ربّما تغيّر الرابط أو أن الصفحة مخصّصة لدور آخر."
      illustration="forbidden"
      note="لوحة دورك هي نقطة البداية الصحيحة لكل ما يخصّك."
    >
      <Link to={home} className="btn lg">
        <Icon icon={LayoutDashboard} size={16} />
        لوحتي
      </Link>
    </ErrorSheetPage>
  );
}
