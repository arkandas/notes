'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';
import { useLocaleSwitch } from '@/lib/use-locale';

export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
};

export function LanguageToggle() {
  const t = useTranslations('language');
  const { locale, setLocale, pending } = useLocaleSwitch();
  const language = LANGUAGE_NAMES[locale];

  const cycle = () => {
    const index = locales.indexOf(locale);
    setLocale(locales[(index + 1) % locales.length]);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={pending}
      title={t('current', { language })}
      aria-label={t('toggle', { language })}
      className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg px-2 text-[13px] font-semibold uppercase tracking-wide text-ink-muted transition-colors hover:bg-canvas hover:text-ink active:bg-muted disabled:opacity-60"
    >
      {locale}
    </button>
  );
}

export function LanguagePicker() {
  const t = useTranslations('language');
  const { locale, setLocale, pending } = useLocaleSwitch();

  return (
    <div role="group" aria-label={t('label')} className="grid grid-cols-2 gap-0.5 rounded-lg border border-line bg-muted p-0.5 dark:bg-canvas">
      {locales.map(value => {
        const active = locale === value;
        return (
          <button
            key={value}
            type="button"
            lang={value}
            onClick={() => setLocale(value)}
            disabled={pending}
            aria-pressed={active}
            className={`rounded-md py-1.5 text-xs transition-colors disabled:cursor-wait ${
              active
                ? 'bg-accent font-semibold text-accent-ink shadow-sm'
                : 'font-medium text-ink-muted hover:bg-surface hover:text-ink'
            }`}
          >
            {LANGUAGE_NAMES[value]}
          </button>
        );
      })}
    </div>
  );
}
