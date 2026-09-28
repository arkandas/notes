'use client';

import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { THEME_ORDER, type Theme } from '@/lib/theme';
import { useTheme } from '@/lib/use-theme';

const THEME_OPTIONS: Array<{ value: Theme; icon: typeof Sun }> = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { theme, setTheme } = useTheme();
  const current = THEME_OPTIONS.find(option => option.value === theme) ?? THEME_OPTIONS[0];
  const Icon = current.icon;
  const label = t(current.value);

  const cycle = () => {
    const index = THEME_ORDER.indexOf(current.value);
    setTheme(THEME_ORDER[(index + 1) % THEME_ORDER.length]);
  };

  return (
    <button
      type="button"
      onClick={cycle}
      title={t('current', { theme: label })}
      aria-label={t('toggle', { theme: label })}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink active:bg-muted"
    >
      <Icon size={18} />
    </button>
  );
}

export function ThemePicker() {
  const t = useTranslations('theme');
  const { theme, setTheme } = useTheme();

  return (
    <div role="group" aria-label={t('label')} className="grid grid-cols-3 gap-0.5 rounded-lg border border-line bg-muted p-0.5 dark:bg-canvas">
      {THEME_OPTIONS.map(({ value, icon: Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            className={`flex flex-col items-center gap-1 rounded-md py-1.5 text-[11px] transition-colors ${
              active
                ? 'bg-accent font-semibold text-accent-ink shadow-sm'
                : 'font-medium text-ink-muted hover:bg-surface hover:text-ink'
            }`}
          >
            <Icon size={15} />
            {t(value)}
          </button>
        );
      })}
    </div>
  );
}
