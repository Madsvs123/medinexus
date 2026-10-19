import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { PaletteMode } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { buildTheme } from './theme';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface ThemeContextValue {
  mode: PaletteMode;
  toggleMode: () => void;
  setMode: (mode: PaletteMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'medinexus-theme-mode';

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useLocalStorage<PaletteMode>(THEME_STORAGE_KEY, 'light');
  const [mode, setModeState] = useState<PaletteMode>(stored);

  const setMode = useCallback(
    (next: PaletteMode) => {
      setModeState(next);
      setStored(next);
    },
    [setStored],
  );

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggleMode, setMode }),
    [mode, toggleMode, setMode],
  );

  const muiTheme = useMemo(() => buildTheme(mode), [mode]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useThemeContext must be used within ThemeContextProvider');
  }
  return ctx;
}
