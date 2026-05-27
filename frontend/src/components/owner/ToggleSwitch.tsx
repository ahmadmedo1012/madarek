interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ToggleSwitch({ label, description, checked, onChange, disabled = false }: ToggleSwitchProps) {
  return (
    <div className="owner-toggle-row">
      <div
        className={`owner-toggle-track${checked ? ' on' : ''}${disabled ? ' disabled' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        role="switch"
        aria-checked={checked}
        aria-label={label}
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
        {description && <span className="owner-toggle-label-desc">{description}</span>}
      </div>
    </div>
  );
}
