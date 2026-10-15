/**
 * r170-e — benchmark fixes pins (WCAG 2.4.6 dialog practice / ASVS 2.1.8
 * password-strength hint / WCAG 2.5.8 coarse-pointer 44px floors).
 *
 * Three contracts, one file (the r170d-a11y-pins pattern):
 *
 * 1. ConfirmDialog announcement — the dialog's accessible name comes
 *    from the rendered h3 (aria-labelledby) and the warning <p> is
 *    wired as aria-describedby, so screen readers finally hear
 *    «تسليم نهائي»-style bodies. Verified against the r170-f benchmark
 *    gap: the message rendered but nothing referenced it.
 *    Modal keeps its ariaLabel-only contract for existing callers
 *    (optional props, no breaking change).
 *
 * 2. RegisterPage password strength hint — tier boundaries
 *    (<8 ضعيفة / 8–11 متوسطة / ≥12 قوية), blocklist always ضعيفة,
 *    polite live region (role="status"), updates per keystroke, and
 *    NEVER blocks submit (advisory only — zod still owns the rules).
 *
 * 3. Coarse-pointer 44px floors — the two scoped
 *    @media (pointer: coarse) blocks exist on disk with the exact
 *    selector/size contracts (components.css recipes; student.css
 *    calendar controls).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

import { ConfirmDialog } from '../../src/components/owner/ConfirmDialog';
import { Modal } from '../../src/components/overlays/Modal';

// ── 1. ConfirmDialog announcement ────────────────────────────────────
describe('r170-e — ConfirmDialog announces its title and message (WCAG 2.4.6)', () => {
  const TITLE = 'تسليم نهائي';
  const MESSAGE = 'لا يمكنك تعديل إجاباتك بعد التسليم. هل تريد المتابعة؟';

  function renderConfirm() {
    render(
      <ConfirmDialog
        open
        title={TITLE}
        message={MESSAGE}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    return screen.getByRole('dialog');
  }

  it('the dialog is named by the rendered h3 (aria-labelledby → title id)', () => {
    const dialog = renderConfirm();
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = screen.getByText(TITLE);
    expect(heading.tagName).toBe('H3');
    expect(heading.getAttribute('id')).toBe(labelledBy);
    // The accessible name resolves through the relationship, not a
    // duplicated aria-label (one source of truth — the rendered node).
    expect(dialog.getAttribute('aria-label')).toBeNull();
    expect(screen.getByRole('dialog', { name: TITLE })).toBe(dialog);
  });

  it('the message <p> is the dialog description (aria-describedby → message id)', () => {
    const dialog = renderConfirm();
    const describedBy = dialog.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const message = screen.getByText(MESSAGE);
    expect(message.tagName).toBe('P');
    expect(message.getAttribute('id')).toBe(describedBy);
    // The ids are stable useId values unique per node (never clashing).
    expect(describedBy).not.toBe(dialog.getAttribute('aria-labelledby'));
  });

  it('Modal keeps the ariaLabel-only contract for existing callers (backward compat)', () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="legacy">
        <p>legacy body</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog', { name: 'legacy' });
    expect(dialog.getAttribute('aria-label')).toBe('legacy');
    expect(dialog.getAttribute('aria-labelledby')).toBeNull();
    expect(dialog.getAttribute('aria-describedby')).toBeNull();
  });
});

// ── 2. RegisterPage password strength hint ───────────────────────────
type RegisterState = {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  error: unknown;
  reset: () => void;
};

const registerState = vi.hoisted(() => ({ current: {} as RegisterState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useRegister: () => registerState.current,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useFaculties: () => ({
    data: [
      {
        id: 'fac-1',
        name: 'كلية تقنية المعلومات',
        iconEmoji: '💻',
        city: 'الزاوية',
        departments: [{ id: 'dep-1', name: 'علوم الحاسوب' }],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import RegisterPage, { passwordStrengthTier, registerPasswordSchema } from '../../src/pages/RegisterPage';
import { isCommonPassword } from '../../src/lib/commonPasswords';

const PW_LABEL = 'كلمة المرور (12 حرفًا على الأقل)';

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

const chooseStudent = () => fireEvent.click(screen.getByRole('button', { name: /طالب/ }));

describe('r170-e — passwordStrengthTier heuristic (ASVS 2.1.8)', () => {
  it.each([
    ['a', 'weak'],        // < 8
    ['Ab1!xyz', 'weak'],  // 7 chars — one under the boundary
    ['Madarek2', 'medium'], // exactly 8
    ['Madarek26', 'medium'], // 9
    ['123456789a', 'medium'], // 11 — one under the strong boundary
    ['Salam-Zawiya-26', 'strong'], // 15
    ['a'.repeat(12), 'strong'], // exactly 12
    ['x'.repeat(72), 'strong'], // schema's max
  ])('tier boundary: «%s» → %s', (password, tier) => {
    expect(passwordStrengthTier(password)).toBe(tier);
  });

  it('empty password → null (no announcement before typing)', () => {
    expect(passwordStrengthTier('')).toBeNull();
  });

  it.each(['password123', '12345678', 'letmein123', 'aaaaaaaa'])(
    'a blocklist password («%s») is ALWAYS ضعيفة — the override beats length',
    (password) => {
      // Sanity: these would otherwise score medium/strong by length…
      expect(password.length).toBeGreaterThanOrEqual(8);
      expect(isCommonPassword(password)).toBe(true);
      // …and the real block stays owned by the zod schema, not the hint.
      expect(registerPasswordSchema.safeParse(password).success).toBe(false);
      expect(passwordStrengthTier(password)).toBe('weak');
    },
  );
});

describe('r170-e — RegisterPage live strength hint (polite, advisory only)', () => {
  beforeEach(() => {
    registerState.current = {
      mutateAsync: vi.fn(async () => ({ user: { role: 'STUDENT' } })),
      isPending: false,
      error: null,
      reset: vi.fn(),
    };
  });

  it('updates per keystroke in a role="status" polite live region; silent when empty', () => {
    renderPage();
    chooseStudent();
    const input = screen.getByLabelText(PW_LABEL);

    // Empty → no hint (nothing to announce yet).
    expect(screen.queryByText(/قوة كلمة المرور/)).toBeNull();

    // 7 chars → ضعيفة
    fireEvent.change(input, { target: { value: 'Ab1!xyz' } });
    const weak = screen.getByText('قوة كلمة المرور: ضعيفة');
    expect(weak).toHaveAttribute('role', 'status');
    expect(weak).toHaveAttribute('aria-live', 'polite');

    // 9 chars → متوسطة (same node role — the live region swaps content)
    fireEvent.change(input, { target: { value: 'Madarek26' } });
    expect(screen.getByText('قوة كلمة المرور: متوسطة')).toHaveAttribute('role', 'status');

    // 15 chars → قوية
    fireEvent.change(input, { target: { value: 'Salam-Zawiya-26' } });
    expect(screen.getByText('قوة كلمة المرور: قوية')).toHaveAttribute('role', 'status');

    // A blocklist hit sinks the tier back to ضعيفة even at 11 chars.
    fireEvent.change(input, { target: { value: 'password123' } });
    expect(screen.getByText('قوة كلمة المرور: ضعيفة')).toBeInTheDocument();
  });

  /* r170g interaction: the zod floor moved to 12, so the متوسطة tier
   * (8–11 chars) is now entirely below the schema floor — "a
   * medium-tier password submits" is impossible BY DESIGN (the meter
   * guides the user to keep typing; zod owns the gate). The
   * advisory-only property is therefore pinned at the قوية tier: a
   * 12-char password with the hint visible still submits, and the hint
   * copy never becomes a field error / alert. */
  it('the hint NEVER blocks submit — a strong-tier password with the hint showing submits', async () => {
    renderPage();
    chooseStudent();
    fireEvent.change(screen.getByLabelText('الاسم الأول'), { target: { value: 'سالم' } });
    fireEvent.change(screen.getByLabelText('اللقب'), { target: { value: 'الفيتوري' } });
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), { target: { value: 'salem@zu.edu.ly' } });
    fireEvent.change(screen.getByLabelText(PW_LABEL), { target: { value: 'Madarek2026!' } });
    fireEvent.change(screen.getByLabelText('رقم القيد الجامعي'), { target: { value: '2024-CS-1234' } });
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-1' } });
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'dep-1' } });

    expect(screen.getByText('قوة كلمة المرور: قوية')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    await waitFor(() => {
      expect(registerState.current.mutateAsync).toHaveBeenCalledTimes(1);
    });
    // The hint stays advisory copy — never a field error / alert.
    expect(screen.getByText('قوة كلمة المرور: قوية')).not.toHaveClass('auth-field-error');
    expect(screen.getByText('قوة كلمة المرور: قوية')).not.toHaveAttribute('role', 'alert');
  });

  it('the teacher form carries the same hint contract (both role paths)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /أستاذ/ }));
    const input = screen.getByLabelText(PW_LABEL);
    fireEvent.change(input, { target: { value: 'Ab1!xyz' } });
    expect(screen.getByText('قوة كلمة المرور: ضعيفة')).toHaveAttribute('role', 'status');
  });
});

// ── 3. Coarse-pointer 44px floors (source pins) ───────────────────────
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('r170-e — 44px floors scoped to @media (pointer: coarse)', () => {
  it('components.css: the .icon-btn/.btn recipes get 44px min floors inside the coarse block', () => {
    const css = stripComments(read('src/styles/components.css'));
    const m = css.match(/@media \(pointer: coarse\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/);
    expect(m).not.toBeNull();
    const block = m![0];
    expect(block).toContain('.icon-btn { min-inline-size: 44px; min-block-size: 44px; }');
    expect(block).toContain('.btn { min-block-size: 44px; }');
  });

  it('student.css: the calendar nav buttons get their 44×44 floor inside the coarse block', () => {
    const css = stripComments(read('src/styles/student.css'));
    const m = css.match(/@media \(pointer: coarse\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/);
    expect(m).not.toBeNull();
    const block = m![0];
    expect(block).toContain('.cal-nav-btn { min-inline-size: 44px; min-block-size: 44px; }');
    // The day cells stay OUT of the coarse floor on purpose: their
    // block floors are already ≥44 everywhere (64 base / 48 ≤640) and
    // a later 44 rule was measured LOWERING both at coarse pointers —
    // floors must never shrink an existing floor.
    expect(block).not.toContain('.cal-cell');
  });

  it('the floors are min-* only — no coarse block overrides the physical recipes', () => {
    for (const file of ['src/styles/components.css', 'src/styles/student.css']) {
      const css = stripComments(read(file));
      const blocks = css.match(/@media \(pointer: coarse\)\s*\{(?:[^{}]|\{[^{}]*\})*\}/g) ?? [];
      for (const block of blocks) {
        expect(block).not.toMatch(/(?<!min-)(inline|block)-size:\s*44px/);
      }
    }
  });
});
