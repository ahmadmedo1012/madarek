/**
 * NotFoundPage — designed 404 surface for routes that don't match.
 *
 * Wires the bespoke `error-404` scene through the existing
 * <ErrorState> primitive (see T089). Reachable via:
 *   - the explicit /404 route (used by the audit harness)
 *   - the catch-all *  route at the end of App.tsx
 */
import { Link } from 'react-router-dom';
import { ErrorState } from '../components/primitives/States';

export default function NotFoundPage() {
  return (
    <div className="page" style={{ paddingBlockStart: 'var(--sp-9)' }}>
      <ErrorState
        illustration="error-404"
        message="هذه الصفحة غير موجودة"
      />
      <div style={{ display: 'flex', justifyContent: 'center', marginBlockStart: 'var(--sp-4)' }}>
        <Link to="/" className="btn primary">
          العودة للصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
