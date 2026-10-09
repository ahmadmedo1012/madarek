/**
 * Wave imm-5 — AuthPage public-language alignment.
 *
 * The login page stays a CALM, clear form (plan §3: تجربة تسويقية غامرة
 * ≠ تجربة تعلّم عملية) but must share the landing's atmosphere:
 *   - a quiet mono metric-role eyebrow over the title (journey-meta /
 *     bento-meta register) — a REAL Arabic phrase, so it is exposed to
 *     the accessibility tree, not aria-hidden;
 *   - a decorative --journey-glow wash behind the card that is PURE
 *     CSS (.auth-center::after pseudo) — no TSX chrome, no motion;
 *   - the form contract itself is untouched (focus order, labels,
 *     bidi, validation alerts, demo fill buttons) — these tests pin it
 *     so the alignment pass can never regress the form people must
 *     complete.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

type LoginState = {
  mutateAsync: () => Promise<never>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
};

const loginState = vi.hoisted(() => ({ current: {} as LoginState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => loginState.current,
}));

import AuthPage from '../../src/pages/AuthPage';

/* Static CSS contract helpers (assets.test.ts convention: pure fs
 * assertions lock in what component tests cannot see). */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
}

/** True when b follows a in document order (focus order follows DOM). */
function follows(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

describe('AuthPage — journey alignment (imm-5)', () => {
  beforeEach(() => {
    loginState.current = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    };
  });

  it('opens the card with the quiet mono gateway eyebrow over the title', () => {
    renderPage();

    const meta = screen.getByText('(بوابة الجامعة)');
    expect(meta).toHaveClass('auth-meta');
    // A real Arabic phrase (journey-meta precedent) — NOT hidden from
    // assistive tech, unlike the bento's purely decorative code badges.
    expect(meta).not.toHaveAttribute('aria-hidden');
    // Eyebrow reads BEFORE the title.
    const title = screen.getByRole('heading', { level: 1, name: 'مرحباً بعودتك' });
    expect(follows(meta, title)).toBe(true);
  });

  it('the ambient wash is CSS-only — no decorative DOM, and auth.css paints it from the journey token', () => {
    const { container } = renderPage();

    // No glow/scene/ambient node in the page — the cue lives entirely
    // in the stylesheet, so it can never enter the a11y tree or steal
    // a click (pointer-events: none in CSS).
    expect(
      container.querySelector('[class*="glow"], [class*="scene"], [class*="ambient"]'),
    ).toBeNull();

    const css = read('src/styles/auth.css');
    const washAt = css.indexOf('.auth-center::after');
    expect(washAt).toBeGreaterThanOrEqual(0);
    const wash = css.slice(washAt, css.indexOf('}', washAt));
    expect(wash).toContain('var(--journey-glow)');
    expect(wash).toContain('pointer-events: none');
    // Decorative = static paint: no motion authored for the wash.
    expect(wash).not.toMatch(/transition|animation/);

    // The eyebrow carries the coded-metadata voice: mixed-script mono
    // stack (Plex Mono is latin-only), 12px label-sm floor, muted ink.
    const metaAt = css.indexOf('.auth-meta');
    expect(metaAt).toBeGreaterThanOrEqual(0);
    const metaRule = css.slice(metaAt, css.indexOf('}', metaAt));
    expect(metaRule).toContain("'IBM Plex Mono', 'IBM Plex Sans Arabic', ui-monospace, monospace");
    expect(metaRule).toContain('var(--type-label-size-sm)');
    expect(metaRule).toContain('var(--text-muted)');
    // Joined Arabic prose is never tracked (ruling #2).
    expect(metaRule).toContain('letter-spacing: var(--ls-normal)');
  });

  it('labels are wired to their controls with honest bidi handling', () => {
    renderPage();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    // University IDs (2024-CS-1234) must not be bidi-scrambled by the
    // RTL page — the field itself is LTR.
    expect(email).toHaveAttribute('dir', 'ltr');
    expect(email).toHaveAttribute('autocomplete', 'username');

    const password = screen.getByLabelText('كلمة المرور');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
  });

  it('visual order is the keyboard order: home → email → password → toggle → forgot → submit → register', () => {
    renderPage();

    const home = screen.getByRole('link', { name: /الصفحة الرئيسية/ });
    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    const password = screen.getByLabelText('كلمة المرور');
    const toggle = screen.getByRole('button', { name: 'إظهار كلمة المرور' });
    const forgot = screen.getByRole('button', { name: 'نسيت كلمة المرور؟' });
    const submit = screen.getByRole('button', { name: 'تسجيل الدخول' });
    const register = screen.getByRole('link', { name: 'أنشئ حسابك الآن' });

    expect(follows(home, email)).toBe(true);
    expect(follows(email, password)).toBe(true);
    expect(follows(password, toggle)).toBe(true);
    expect(follows(toggle, forgot)).toBe(true);
    expect(follows(forgot, submit)).toBe(true);
    expect(follows(submit, register)).toBe(true);
    expect(register).toHaveAttribute('href', '/auth/register');
  });

  it('an empty submit surfaces both field errors as alerts with wired descriptions', async () => {
    renderPage();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    const password = screen.getByLabelText('كلمة المرور');
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent('الحقل قصير جداً');
    expect(alerts[1]).toHaveTextContent('مطلوب');

    await waitFor(() => {
      expect(email).toHaveAttribute('aria-invalid', 'true');
      expect(email).toHaveAttribute('aria-describedby', 'auth-email-error');
      expect(password).toHaveAttribute('aria-invalid', 'true');
      expect(password).toHaveAttribute('aria-describedby', 'auth-password-error');
    });
  });

  it('the password visibility toggle flips type, pressed state and label', () => {
    renderPage();

    const password = screen.getByLabelText('كلمة المرور');
    const toggle = screen.getByRole('button', { name: 'إظهار كلمة المرور' });
    fireEvent.click(toggle);

    expect(password).toHaveAttribute('type', 'text');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAccessibleName('إخفاء كلمة المرور');
  });

  it('dev demo buttons FILL the form — they never submit it', async () => {
    renderPage();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد') as HTMLInputElement;
    const password = screen.getByLabelText('كلمة المرور') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'طالب' }));
    await waitFor(() => {
      expect(email.value).toBe('student@zu.edu.ly');
      expect(password.value).toBe('Madarek2026!');
    });
    // One-click FILL only — the visitor submits the form themselves.
    expect(loginState.current.mutateAsync).not.toHaveBeenCalled();

    // The panel is dismissible.
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الحسابات التجريبية' }));
    await waitFor(() => {
      expect(screen.queryByText('حسابات تجريبية — بيئة التطوير')).toBeNull();
    });
  });

  it('a pending login disables the submit button and says so honestly', () => {
    loginState.current.isPending = true;
    renderPage();

    const submit = screen.getByRole('button', { name: /جارٍ الدخول/ });
    expect(submit).toBeDisabled();
  });

  it('page chrome lives in landmarks — banner, main, contentinfo (axe: all content in landmarks)', () => {
    const { container } = renderPage();

    const banner = container.querySelector('header.auth-top');
    expect(banner).not.toBeNull();
    expect(banner).toContainElement(screen.getByRole('link', { name: /الصفحة الرئيسية/ }));
    expect(container.querySelector('main.auth-center')).not.toBeNull();
    const contentInfo = container.querySelector('footer.auth-bottom');
    expect(contentInfo).not.toBeNull();
    expect(contentInfo).toHaveTextContent('وزارة التعليم العالي والبحث العلمي');
  });
});
