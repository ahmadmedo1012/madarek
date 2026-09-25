/**
 * 23-b — the AuthoringModal FormField delegation to the shared
 * primitive (21-b hand-off, A9 P2-4).
 *
 * The curriculum builders' local FormField used to hand-roll the
 * label + hint + error row: the error was a role=alert span, but the
 * CONTROL never learned it was invalid (no aria-invalid, no
 * aria-describedby) — and TimeInput's explicit-props copy silently
 * swallowed any cloned-in attributes anyway. 23-b delegates the row to
 * primitives/Form.tsx FormField. These tests pin the wiring the
 * builders now inherit:
 *   1. error state: control aria-invalid + aria-describedby → the
 *      role=alert message; the label stays htmlFor-wired;
 *   2. the hint stays visible alongside an error (the old local copy
 *      hid it — the format hint is exactly what fixes the error);
 *   3. TimeInput forwards the injected attributes onto the real input
 *      (the swallow bug is gone).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField, TimeInput, useFieldId } from '../../src/components/curriculum/AuthoringModal';

function HintedField() {
  const id = useFieldId('test-dur');
  return (
    <FormField label="المدة (اختياري)" htmlFor={id} hint="بصيغة دقائق:ثوانٍ مثل 45:00" error="أدخل المدة بصيغة صحيحة.">
      <TimeInput id={id} ariaLabel="مدة المحاضرة" value="abc" onChange={() => undefined} />
    </FormField>
  );
}

describe('AuthoringModal FormField — shared-primitive delegation (23-b)', () => {
  it('marks the control aria-invalid and describes it by the alert when an error is set', () => {
    render(
      <FormField label="عنوان المحاضرة" htmlFor="lec-title" error="العنوان مطلوب.">
        <input id="lec-title" type="text" className="auth-input" value="" onChange={() => undefined} />
      </FormField>,
    );

    const input = screen.getByLabelText('عنوان المحاضرة');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('العنوان مطلوب.');
    expect(describedBy).toContain(alert.id);
  });

  it('keeps the format hint visible beside the error — it is what fixes the value', () => {
    render(<HintedField />);

    expect(screen.getByRole('alert')).toHaveTextContent('أدخل المدة بصيغة صحيحة.');
    expect(screen.getByText('بصيغة دقائق:ثوانٍ مثل 45:00')).toBeInTheDocument();
  });

  it('TimeInput forwards the injected aria state onto the real input (swallow bug gone)', () => {
    render(<HintedField />);

    const input = screen.getByLabelText('مدة المحاضرة') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain(
      screen.getByRole('alert').id,
    );
    // The hint participates in the description too.
    expect(input.getAttribute('aria-describedby')).toContain(
      screen.getByText('بصيغة دقائق:ثوانٍ مثل 45:00').id,
    );
  });

  it('a clean field carries no invalid state and only the hint description', () => {
    render(
      <FormField label="عنوان الفصل" htmlFor="ch-title" hint="مطلوب">
        <input id="ch-title" type="text" className="auth-input" value="الفصل الأول" onChange={() => undefined} />
      </FormField>,
    );

    const input = screen.getByLabelText('عنوان الفصل');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBe(
      screen.getByText('مطلوب').id,
    );
  });
});
