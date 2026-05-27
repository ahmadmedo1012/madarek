interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
}

export function ToggleSwitch({ label, description, checked, onChange, disabled = false, id }: ToggleSwitchProps) {
  const descId = description && id ? `${id}-desc` : description ? `toggle-desc-${label.replace(/\s+/g, '-')}` : undefined;

  return (
    <div className="owner-toggle-row">
      <div
        className={`owner-toggle-track${checked ? ' on' : ''}${disabled ? ' disabled' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={descId}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onChange(!checked);
          }
        }}
      >
        <div className="owner-toggle-thumb" />
      </div>
      <div className="owner-toggle-label">
        <span className="owner-toggle-label-text">{label}</span>
        {description && <span id={descId} className="owner-toggle-label-desc">{description}</span>}
      </div>
    </div>
  );
}
