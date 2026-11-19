import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../Icon';
import { TechnicalSheet } from '../illustrations/technical/TechnicalSheet';
import { Logo } from '../../brand';

/**
 * The guest-door frame the auth RECOVERY pages render inside: the four
 * corner marks, the paper grain, the technical sheet and the top bar
 * (back-to-login link + brand context). Children render after the
 * header, still inside the shell — each page owns its centered card
 * and its bottom line.
 *
 * R369 A-debt: extracted from the three pages that had grown the same
 * frame inline (ForgotPassword / ResetPassword / VerifyEmail — the
 * r368 T5 verify-email rebuild added the third copy and jscpd started
 * counting it as a duplicate block). The login/register pages keep
 * their own grammar and are untouched.
 */
export function AuthDoor({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-frame" aria-hidden="true">
        <span className="auth-mark auth-mark-tl" />
        <span className="auth-mark auth-mark-tr" />
        <span className="auth-mark auth-mark-bl" />
        <span className="auth-mark auth-mark-br" />
      </div>
      <div className="auth-grain" aria-hidden="true" />
      <TechnicalSheet className="tech-sheet-auth" />

      <header className="auth-top">
        <Link to="/auth" className="auth-back-home">
          <Icon icon={ArrowLeft} size={14} />
          العودة إلى تسجيل الدخول
        </Link>
        <span className="auth-context">
          <Logo variant="mark" size={14} /> مدارك
        </span>
      </header>

      {children}
    </div>
  );
}
