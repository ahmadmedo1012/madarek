import { useId } from 'react';

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Owner-console switch row. A11y contract:
 *   - the track IS a <button role="switch"> (r152a A6 P3-6): a real
 *     button is natively focusable, Enter/Space fires click, AND it is
 *     a labelable element — so the visible text is a genuine
 *     <label htmlFor> that extends the click target to the full row.
 *     The AA-safe :focus-visible ring + the 44×44 hit area live in
 *     owner.css (wave 3-c, audit 0-e P1-23).
 */
export function ToggleSwitch({ label, description, checked, onChange, disabled = false, id }: ToggleSwitchProps) {
  // Fallback id must be unique per instance — deriving it from the Arabic
  // label collides when two rows share a label (duplicate DOM ids and
  // aria-describedby pointing at the first match). (audit 11-f P2-7)
  const autoId = useId();
  const trackId = `${id ?? autoId}-track`;
  const descId = description ? `${id ?? autoId}-desc` : undefined;

  return (
    <div className="owner-toggle-row">
      <button
        type="button"
        id={trackId}
        className={`owner-toggle-track${checked ? ' on' : ''}${disabled ? ' disabled' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={descId}
        disabled={disabled}
      >
        <div className="owner-toggle-thumb" aria-hidden="true" />
      </button>
      {/* A true label (r152a A6 P3-6): clicking it forwards a click to
          the labeled button natively — no JS duplication, and the touch
          target spans the full row as the docblock always claimed. */}
      <label className="owner-toggle-label" htmlFor={trackId}>
        <span className="owner-toggle-label-text">{label}</span>
        {description && <span id={descId} className="owner-toggle-label-desc">{description}</span>}
      </label>
    </div>
  );
}
