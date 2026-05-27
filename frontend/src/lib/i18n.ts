import { createElement } from 'react';
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
 * LangToggle - a small pill button that toggles between ar and en.
 */
export function LangToggle() {
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  const handleToggle = () => {
    setLocale(locale === 'ar' ? 'en' : 'ar');
  };

  return createElement(
    'button',
    {
      type: 'button',
      className: 'lang-toggle-pill',
      onClick: handleToggle,
      'aria-label': locale === 'ar' ? 'Switch to English' : 'التبديل للعربية',
      title: locale === 'ar' ? 'English' : 'العربية',
    },
    locale === 'ar' ? 'EN' : 'ع',
  );
}
