'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'oled' | 'light';

const STORAGE_KEY = 'midas-theme';

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'oled' || stored === 'light') return stored;
  } catch {
    // storage unavailable
  }
  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    // Batch setState via queueMicrotask
    queueMicrotask(() => setMounted(true));
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // storage unavailable
    }
  }, []);

  return { theme, setTheme, mounted };
}
