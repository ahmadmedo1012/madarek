/**
 * Wave imm-5 — AuthPage public-language alignment.
 *
 * The login page stays a CALM, clear form (plan §3: تجربة تسويقية غامرة
 * ≠ تجربة تعلّم عملية) but must share the landing's atmosphere:
 *   - a quiet mono metric-role eyebrow over the title (journey-meta /
 *     bento-meta register) — a REAL Arabic phrase, so it is exposed to
 *     the accessibility tree, not aria-hidden;
 *   - r313 (Heron parity): the ground is FLAT PAPER — the decorative
 *     --journey-glow wash behind the card is retired; depth is the
 *     card's 1px #B3B3AF hairline alone (no ambient DOM, no gradient);
 *   - the form contract itself is untouched (focus order, labels,
 *     bidi, validation alerts, demo fill buttons) — these tests pin it
 *     so the alignment pass can never regress the form people must
 *     complete.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
  // r178: AuthPage also mounts the institution-selection mutation —
  // idle stub, never fired in the journey-alignment pins.
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import AuthPage from '../../src/pages/AuthPage';

/* Static CSS contract helpers (assets.test.ts convention: pure fs
 * assertions lock in what component tests cannot see). */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');

function renderPage() {
  /* r180: AuthPage now mounts a (disabled-by-default) institutions query
   * for the REG_NUMBER_AMBIGUOUS recovery — the page needs a QueryClient
   * like every other query-bearing page. */
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthPage />
      </QueryClientProvider>
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

    const meta = screen.getByText('(بوابة المنصّة)');
    expect(meta).toHaveClass('auth-meta');
    // A real Arabic phrase (journey-meta precedent) — NOT hidden from
    // assistive tech, unlike the bento's purely decorative code badges.
    expect(meta).not.toHaveAttribute('aria-hidden');
    // Eyebrow reads BEFORE the title.
    /* R315 override (K-I): the heading copy lost its tanween — the
     * owner sheet rule bans tashkeel on the heavy display heading
     * («مرحباً» → «مرحبا»); the re-pin keeps the same seat + level. */
    const title = screen.getByRole('heading', { level: 1, name: 'مرحبا بعودتك' });
    expect(follows(meta, title)).toBe(true);
  });

  it('r313: the ground is flat paper — no ambient DOM, no glow pseudo, the card carries the #B3B3AF drafting hairline', () => {
    const { container } = renderPage();

    // No glow/scene/ambient node in the page — and none is needed:
    // the r313 sweep retired the CSS wash too, so the cue can never
    // enter the a11y tree or steal a click.
    expect(
      container.querySelector('[class*="glow"], [class*="scene"], [class*="ambient"]'),
    ).toBeNull();

    const css = read('src/styles/auth.css');
    // The ambient pseudo is RETIRED (flat paper — the reference has no
    // wash anywhere; depth is hairlines only).
    expect(css).not.toContain('.auth-center::after');
    expect(css).not.toContain('.nf-scene::after');
    // No gradient ambients survive in the sheet (comments aside).
    const declarations = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(declarations).not.toMatch(/radial-gradient|linear-gradient/);
    // The card's whole elevation story is the strong hairline.
    const cardAt = declarations.indexOf('.auth-card');
    const cardRule = declarations.slice(cardAt, declarations.indexOf('}', cardAt));
    expect(cardRule).toContain('var(--border-strong)');

    // r212 re-pin (Agent S, merged r253): the eyebrow's mono voice is
    // RETIRED — Plex Mono is for IDs/code/tabular metrics only (r197),
    // and an Arabic phrase resolves to the Arabic face anyway. The
    // eyebrow is quiet sans metadata: same size, muted ink.
    const metaAt = css.indexOf('.auth-meta');
    expect(metaAt).toBeGreaterThanOrEqual(0);
    const metaRule = css.slice(metaAt, css.indexOf('}', metaAt));
    expect(metaRule).toContain('var(--font-sans)');
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
    // r157 F5: passwords are Latin runs too — the caret/masked glyphs
    // must not bidi-flip inside the RTL form.
    expect(password).toHaveAttribute('dir', 'ltr');
  });

  it('visual order is the keyboard order: home → email → password → toggle → forgot → submit → register', () => {
    renderPage();

    const home = screen.getByRole('link', { name: /الصفحة الرئيسية/ });
    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    const password = screen.getByLabelText('كلمة المرور');
    const toggle = screen.getByRole('button', { name: 'إظهار كلمة المرور' });
    /* R320 override (§D — forgot-password flow): the control is a real
     * <Link to="/auth/forgot-password"> now (the T-6 «راجع مرشدك»
     * notice retired with the flow landing) — same seat, same keyboard
     * sequence, real destination instead of an in-page notice. */
    const forgot = screen.getByRole('link', { name: 'نسيت كلمة المرور؟' });
    const submit = screen.getByRole('button', { name: 'تسجيل الدخول' });
    const register = screen.getByRole('link', { name: 'أنشئ حسابك الآن' });

    expect(follows(home, email)).toBe(true);
    expect(follows(email, password)).toBe(true);
    expect(follows(password, toggle)).toBe(true);
    expect(follows(toggle, forgot)).toBe(true);
    expect(follows(forgot, submit)).toBe(true);
    expect(follows(submit, register)).toBe(true);
    expect(register).toHaveAttribute('href', '/auth/register');
    expect(forgot).toHaveAttribute('href', '/auth/forgot-password');
  });

  it('an empty submit demotes field errors to describedby-only + ONE polite countAr summary (r157 F5 alert-storm fix)', async () => {
    renderPage();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد');
    const password = screen.getByLabelText('كلمة المرور');
    fireEvent.click(screen.getByRole('button', { name: 'تسجيل الدخول' }));

    // ZERO role="alert" — the per-field alert choir is gone (the
    // submit-level server banner is the only alert the form may use,
    // and no server error is present here).
    await waitFor(() => {
      expect(screen.queryAllByRole('alert')).toHaveLength(0);
    });

    // ONE polite summary line counts both problems with countAr.
    const summary = screen.getByRole('status');
    expect(summary).toHaveAttribute('aria-live', 'polite');
    expect(summary).toHaveTextContent('مشكلتان');

    // The field errors are still rendered and still wired — announced
    // on focus via aria-describedby instead of shouted via role=alert.
    expect(screen.getAllByText('مطلوب')).toHaveLength(2);
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

  it('dev demo rows FILL the form — they never submit it', async () => {
    renderPage();

    // R321 §A8: the panel starts OPEN in development (the owner's
    // one-tap-per-job rule) — no reopen step needed any more.

    /* R320 override (§C): the five per-role chips (.btn.sm.auth-demo-btn)
     * are retired — the panel is now the hairline test-account TABLE,
     * one row per job from the SHARED table (@shared/testAccounts):
     * grouped التعليم / الحوكمة / النظام (R321 §A7), email + password
     * visible, and a square «تعبئة» button per row. The full panel
     * contract lives in tests/unit/r320-test-accounts-panel.test.tsx;
     * this pin keeps the form-integrity half here (fill only, never
     * submit). */
    const fillButtons = screen.getAllByRole('button', { name: /^تعبئة حساب / });
    expect(fillButtons).toHaveLength(10);
    for (const b of fillButtons) {
      expect(b).toHaveClass('auth-demo-fill');
    }

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد') as HTMLInputElement;
    const password = screen.getByLabelText('كلمة المرور') as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'تعبئة حساب طالب' }));
    await waitFor(() => {
      expect(email.value).toBe('student@test.ly');
      expect(password.value).toBe('12345678');
    });
    // One-click FILL only — the visitor submits the form themselves.
    expect(loginState.current.mutateAsync).not.toHaveBeenCalled();

    // The panel is dismissible (and the quiet reopen chip returns).
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الحسابات التجريبية' }));
    await waitFor(() => {
      expect(screen.queryByText('حسابات تجريبية — بيئة التطوير')).toBeNull();
    });
    expect(screen.getByRole('button', { name: 'عرض الحسابات التجريبية' })).toBeInTheDocument();
  });

  it('R321 §A8 — the demo hint panel starts OPEN in development (dismiss → reopen chip)', () => {
    renderPage();

    // The owner's one-tap-per-job rule: all 10 jobs visible on load.
    expect(screen.getByText('حسابات تجريبية — بيئة التطوير')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^تعبئة حساب / })).toHaveLength(10);

    // Dismissible — the quiet reopen chip returns after a dismiss.
    fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الحسابات التجريبية' }));
    const reopen = screen.getByRole('button', { name: 'عرض الحسابات التجريبية' });
    expect(reopen).toHaveClass('auth-demo-hint-reopen');

    // One honest click brings it back.
    fireEvent.click(reopen);
    expect(screen.getByText('حسابات تجريبية — بيئة التطوير')).toBeInTheDocument();
  });

  it('a pending login disables the submit button and says so honestly', () => {
    loginState.current.isPending = true;
    renderPage();

    const submit = screen.getByRole('button', { name: /جارٍ الدخول/ });
    expect(submit).toBeDisabled();
  });

  it('a pending submit is aria-busy with an sr-only polite pending mirror (r157 F5)', () => {
    loginState.current.isPending = true;
    renderPage();

    const submit = screen.getByRole('button', { name: /جارٍ الدخول/ });
    expect(submit).toHaveAttribute('aria-busy', 'true');

    // aria-busy alone is silent: the mirror is the polite announcement.
    const mirror = screen.getByText('جارٍ التحقق…');
    expect(mirror).toHaveClass('sr-only');
    expect(mirror).toHaveAttribute('role', 'status');
    expect(mirror).toHaveAttribute('aria-live', 'polite');
    // No mirror while idle — the announcement fires on the flip only.
  });

  it('page chrome lives in landmarks — banner, main, contentinfo (axe: all content in landmarks)', () => {
    const { container } = renderPage();

    const banner = container.querySelector('header.auth-top');
    expect(banner).not.toBeNull();
    expect(banner).toContainElement(screen.getByRole('link', { name: /الصفحة الرئيسية/ }));
    expect(container.querySelector('main.auth-center')).not.toBeNull();
    const contentInfo = container.querySelector('footer.auth-bottom');
    expect(contentInfo).not.toBeNull();
    // r191: the rejected slogan is gone; the identity reads ذكية.
    expect(contentInfo).toHaveTextContent('منصّة تعليم ذكية مستقلّة');
  });
});
