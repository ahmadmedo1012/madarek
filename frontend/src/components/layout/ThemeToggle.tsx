import { useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Icon } from '../Icon';
import { useThemeStore, resolveTheme, type ThemeMode } from '../../stores/theme.store';

/**
 * Mounts side-effects to keep `<html data-theme>` in sync with the store.
 * Listens to the OS preference change for `'system'` mode.
 */
export function useThemeSync() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolveTheme(mode));
    };
    apply();

    if (mode === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [mode]);
}

/** A 3-state segmented toggle: Light · Dark · System. */
export function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const opts: Array<{ value: ThemeMode; icon: typeof Sun; label: string }> = [
    { value: 'light',  icon: Sun,     label: 'فاتح' },
    { value: 'dark',   icon: Moon,    label: 'داكن' },
    { value: 'system', icon: Monitor, label: 'تلقائي' },
  ];

  return (
    <div className="theme-toggle" role="group" aria-label="السمة">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`theme-toggle-option${mode === o.value ? ' is-active' : ''}`}
          onClick={() => setMode(o.value)}
          title={o.label}
          aria-label={o.label}
          aria-pressed={mode === o.value}
        >
          <Icon icon={o.icon} size={14} />
        </button>
      ))}
    </div>
  );
}
