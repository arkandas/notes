'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { applyTheme, readTheme, THEME_STORAGE_KEY, type Theme } from '@/lib/theme';

const THEME_EVENT = 'notes-theme-change';

function subscribe(callback: () => void) {
  const handleStorage = () => {
    applyTheme(readTheme());
    callback();
  };

  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', handleStorage);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore<Theme | null>(subscribe, readTheme, () => null);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => applyTheme('system');
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  return { theme, setTheme };
}
