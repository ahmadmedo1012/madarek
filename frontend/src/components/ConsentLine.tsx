import { Link } from 'react-router-dom';

/**
 * ConsentLine — R320 §D (c2-LEGAL): the auth pages' policy-consent
 * micro-module.
 *
 * ONE quiet line carrying exactly the TWO links every account surface
 * needs (شروط الاستخدام + سياسة الخصوصية — PAGES-GAP §4's register
 * consent seat) and NOTHING else: no kit import (the legal sheet's
 * lg-* grammar never rides into the auth chunk), no storage reads, no
 * state — the pages own their prefix sentence so the register flow can
 * say «بإنشاء الحساب» and the login footer «بتسجيل الدخول» from the
 * same component.
 *
 * The visual register is the auth sheet's own (.auth-consent in
 * auth.css — the .auth-register-prompt voice: centered, muted ink,
 * 44px hit-area links, hover-guarded pairs).
 */
export function ConsentLine({ prefix }: { prefix: string }) {
  return (
    <p className="auth-consent">
      {prefix}{' '}
      <Link to="/legal/terms" className="auth-consent-link">شروط الاستخدام</Link>
      {' '}و{' '}
      <Link to="/legal/privacy" className="auth-consent-link">سياسة الخصوصية</Link>
      .
    </p>
  );
}
