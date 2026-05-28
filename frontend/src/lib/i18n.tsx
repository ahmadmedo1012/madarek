import { Globe } from 'lucide-react';
import { Icon } from '../components/Icon';
import { useI18nStore } from '../stores/i18n.store';
import type { Locale, Dir } from '../stores/i18n.store';

/**
 * useTranslation - returns translation helper and locale state.
 */
export function useTranslation(): {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: Dir;
} {
  const t = useI18nStore((s) => s.t);
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);
  const dir = useI18nStore((s) => s.dir);
  return { t, locale, setLocale, dir };
}

/**
 * LangToggle - a compact pill button with Globe icon that toggles between ar and en.
 * Shows short label (EN/ع) with tooltip explaining that interface labels will switch.
 */
export function LangToggle() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const handleToggle = () => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  };

  return (
    <button
      type="button"
      className="lang-toggle-pill"
      onClick={handleToggle}
      aria-label={locale === 'ar' ? 'Switch to English' : '\u0627\u0644\u062A\u0628\u062F\u064A\u0644 \u0644\u0644\u0639\u0631\u0628\u064A\u0629'}
      title={locale === 'ar' ? 'Switch interface to English' : '\u062A\u0628\u062F\u064A\u0644 \u0627\u0644\u0648\u0627\u062C\u0647\u0629 \u0644\u0644\u0639\u0631\u0628\u064A\u0629'}
    >
      <Icon icon={Globe} size={14} />
      <span>{locale === 'ar' ? 'EN' : '\u0639'}</span>
    </button>
  );
}
