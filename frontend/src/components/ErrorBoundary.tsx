/**
 * ErrorBoundary — the platform's route-level React error boundary
 * (audit 4-A14 P1-3: a single render crash — e.g. the old
 * /competitions/:id `_count` TypeError — used to blank the ENTIRE
 * app: sidebar, notifications, everything, with no recovery but a
 * manual reload; the repo had zero `componentDidCatch` before this).
 *
 * Design: the fallback reuses the designed 404 scene's grammar
 * (auth.css `.nf-*` family — full-viewport copper ambient, display
 * title, responsive action row) with the ErrorState danger-tinted
 * icon block instead of the telescope illustration, so a crash reads
 * as "something broke" — never confused with "page not found".
 * Recovery is two-way: reload the page (chunk-load failures after a
 * deploy need this) or link home (route-scoped crashes recover
 * without a reload via `RouteErrorBoundary`).
 *
 * Copy policy (15-j P0-1): the raw Error.message is Latin/technical
 * and never renders in the UI — it is logged to the console for
 * developers; the user sees Arabic only.
 */
import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Icon } from './Icon';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/** The class-component boundary itself (React only allows
 *  getDerivedStateFromError/componentDidCatch on classes). */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Developer-side paper trail — the user-facing copy stays Arabic.
    console.error('[ErrorBoundary] uncaught render error', error, info.componentStack);
  }

  /** Clears the captured error so the children render again. Called
   *  by RouteErrorBoundary when the route changes — a crash on one
   *  route must not hold the whole app hostage. */
  resetError(): void {
    this.setState({ error: null });
  }

  override render(): ReactNode {
    if (this.state.error === null) return this.props.children;
    return (
      <main className="nf-shell" role="alert">
        <div className="nf-scene">
          {/* ErrorState's danger icon grammar, sized for the
              full-viewport scene (no bespoke crash illustration in
              the V1 scene registry — the 404 telescope reads as
              "page missing", a different meaning). */}
          <div
            className="state-icon"
            aria-hidden
            style={{
              inlineSize: 72,
              blockSize: 72,
              background: 'var(--danger-soft)',
              color: 'var(--danger)',
            }}
          >
            <Icon icon={AlertTriangle} size={30} />
          </div>
          <h1 className="nf-title">حدث خطأ غير متوقّع</h1>
          <p className="nf-sub">
            تعطّل عرض هذه الصفحة بسبب خلل غير متوقّع. جرِّب إعادة تحميلها، أو العودة
            إلى صفحتك الرئيسية والانتقال من جديد — بياناتك محفوظة ولا ضياع لأيّ شيء
            أدخلته.
          </p>
          <div className="nf-actions">
            <button type="button" className="btn primary lg" onClick={() => window.location.reload()}>
              <Icon icon={RefreshCw} size={16} />
              إعادة تحميل الصفحة
            </button>
            <Link to="/" className="btn lg">
              <Icon icon={Home} size={16} />
              العودة إلى الرئيسية
            </Link>
          </div>
        </div>
      </main>
    );
  }
}

/**
 * Router-aware wiring for App.tsx: one boundary around <Routes> that
 * clears itself whenever the route changes. While the fallback is
 * showing, <Routes> is unmounted — but the router (and this wrapper)
 * stay alive, so the fallback's home link changes the location, this
 * effect fires, the boundary resets, and the destination route
 * renders fresh WITHOUT a page reload. On ordinary navigation the
 * reset is a same-value setState — a no-op.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const boundaryRef = useRef<ErrorBoundary | null>(null);

  useEffect(() => {
    boundaryRef.current?.resetError();
  }, [location.pathname]);

  return <ErrorBoundary ref={boundaryRef}>{children}</ErrorBoundary>;
}
