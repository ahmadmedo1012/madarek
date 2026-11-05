/* r338 T-99b entry-chunk diet: the auth flow's four sheets (login,
 * register, forgot, reset) ride ONE lazy chunk — the MorePages pattern.
 * One family, one dynamic import, three fewer chunk boundaries; the
 * sheets keep their exact routes and behavior. */
export { default as AuthPage } from './AuthPage';
export { default as RegisterPage } from './RegisterPage';
export { default as ForgotPasswordPage } from './auth/ForgotPasswordPage';
export { default as ResetPasswordPage } from './auth/ResetPasswordPage';
