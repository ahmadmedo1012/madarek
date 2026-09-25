/**
 * Primitive a11y contracts (audit 11-e P2-4/P2-5, wave 13-16).
 *
 * Pill:
 *   - interactive pills are buttons that expose their toggle state
 *     via aria-pressed (not just the visual `on` class)
 *   - a pill without onClick renders as a span — never a fake control
 * UserAvatar:
 *   - no aria-label: initials are not a name, and an aria-label on a
 *     generic span is ignored by the accessibility tree anyway; the
 *     adjacent user name does the naming
 * Button[loading]:
 *   - the real label stays the accessible name while busy (it moves
 *     into a visually-hidden span; aria-busy flags the request) —
 *     NOT a generic "جارٍ التحميل…" replacement
 *   - loading disables the button (native disabled + aria-disabled)
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import { Pill, UserAvatar, Button, FormField, Input } from '../../src/components/primitives';

describe('Pill', () => {
  it('exposes the toggle state via aria-pressed when interactive', () => {
    const { rerender } = render(<Pill on onClick={() => {}}>فلتر</Pill>);
    expect(screen.getByRole('button', { name: 'فلتر' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    rerender(<Pill on={false} onClick={() => {}}>فلتر</Pill>);
    expect(screen.getByRole('button', { name: 'فلتر' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('keeps the icon and label in both interactive and passive forms', () => {
    const { container } = render(<Pill icon={BookOpen} on>مكتبة</Pill>);
    const pill = container.querySelector('.pill');
    expect(pill?.tagName).toBe('SPAN');
    expect(pill).toHaveClass('on');
    expect(pill?.querySelector('svg')).not.toBeNull();
    expect(pill?.textContent).toBe('مكتبة');
  });

  it('renders a span (not a fake button) when onClick is undefined', () => {
    const { container } = render(<Pill>تصنيف</Pill>);
    expect(container.querySelector('button')).toBeNull();
    expect(container.querySelector('.pill')?.tagName).toBe('SPAN');
  });

  it('still fires onClick when interactive', () => {
    const onClick = vi.fn();
    render(<Pill onClick={onClick}>اضغط</Pill>);
    fireEvent.click(screen.getByRole('button', { name: 'اضغط' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('UserAvatar', () => {
  it('renders initials as visible text without an aria-label', () => {
    const { container } = render(<UserAvatar initials="أ.م" />);
    const avatar = container.querySelector('.avatar');
    expect(avatar).not.toBeNull();
    expect(avatar?.textContent).toBe('أ.م');
    expect(avatar?.getAttribute('aria-label')).toBeNull();
  });
});

describe('Button[loading]', () => {
  it('keeps the real label as the accessible name while busy', () => {
    render(
      <Button variant="primary" loading>
        حفظ التغييرات
      </Button>,
    );
    // The accessible name is the REAL label — screen readers hear which
    // button is busy, not a generic loading string (audit 11-e P2-5).
    const btn = screen.getByRole('button', { name: 'حفظ التغييرات' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    // Visible content swaps to the spinner; the label survives only in
    // the visually-hidden span that keeps the accessible name alive.
    expect(btn.querySelector('.motion-spinner')).not.toBeNull();
    expect(btn.querySelector('.visually-hidden')?.textContent).toBe('حفظ التغييرات');
  });

  it('restores the visible label when the request settles', () => {
    const { rerender } = render(
      <Button loading>
        حفظ
      </Button>,
    );
    rerender(
      <Button loading={false}>
        حفظ
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'حفظ' });
    expect(btn.querySelector('.motion-spinner')).toBeNull();
    expect(btn.textContent).toBe('حفظ');
    expect(btn).not.toBeDisabled();
  });

  it('blocks clicks while loading', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        إرسال
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('FormField (A9 P2-4 — aria association contract)', () => {
  it('wires label → control and marks the control aria-invalid + aria-describedby → the error id', () => {
    render(
      <FormField label="الدرجة" error="أدخل درجة صحيحة.">
        <Input type="number" />
      </FormField>,
    );
    const control = screen.getByLabelText('الدرجة');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    const describedBy = control.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    // The described-by list includes the (single) error message id, and
    // that message is the role=alert announcement.
    const error = screen.getByRole('alert');
    expect(describedBy).toContain(error.id);
    expect(error).toHaveTextContent('أدخل درجة صحيحة.');
    expect(error.id).toBe(`${control.id}-error`);
  });

  it('associates a static hint too, and drops the invalid state once the error clears', () => {
    const { rerender } = render(
      <FormField label="الدرجة" hint="من 0 إلى 20" error="أدخل درجة صحيحة.">
        <input type="number" />
      </FormField>,
    );
    const control = screen.getByLabelText('الدرجة');
    const hint = screen.getByText('من 0 إلى 20');
    expect(control.getAttribute('aria-describedby')).toContain(hint.id);
    expect(control.getAttribute('aria-describedby')).toContain(
      screen.getByRole('alert').id,
    );

    rerender(
      <FormField label="الدرجة" hint="من 0 إلى 20">
        <input type="number" />
      </FormField>,
    );
    expect(screen.getByLabelText('الدرجة')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('الدرجة').getAttribute('aria-describedby')).toBe(
      hint.id,
    );
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('respects an explicit control id and merges a consumer-passed aria-describedby', () => {
    render(
      <FormField label="العنوان" id="title-field" hint="مطلوب">
        <input aria-describedby="consumer-extra" />
      </FormField>,
    );
    const control = screen.getByLabelText('العنوان');
    expect(control.id).toBe('title-field');
    const ids = control.getAttribute('aria-describedby')?.split(' ') ?? [];
    expect(ids).toContain('consumer-extra');
    expect(ids).toContain('title-field-hint');
  });
});
