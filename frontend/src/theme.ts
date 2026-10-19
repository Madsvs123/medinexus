import type { PaletteMode } from '@mui/material';
import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    customShadows: {
      card: string;
      popover: string;
    };
  }
  interface ThemeOptions {
    customShadows?: {
      card?: string;
      popover?: string;
    };
  }
}

export const BRAND_PRIMARY = '#0B6E4F';
export const BRAND_SECONDARY = '#2563EB';
export const DARK_SURFACE = '#0F172A';
export const DARK_SURFACE_LIGHT = '#1E293B';

export function buildTheme(mode: PaletteMode) {
  return createTheme({
    palette: {
      mode,
      primary: { main: BRAND_PRIMARY },
      secondary: { main: BRAND_SECONDARY },
      ...(mode === 'dark'
        ? {
            background: {
              default: DARK_SURFACE,
              paper: DARK_SURFACE_LIGHT,
            },
          }
        : {
            background: {
              default: '#F6F8F7',
              paper: '#FFFFFF',
            },
          }),
    },
    customShadows: {
      card: mode === 'dark' ? '0 1px 4px rgba(0,0,0,0.45)' : '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',
      popover:
        mode === 'dark'
          ? '0 8px 24px rgba(0,0,0,0.5)'
          : '0 8px 24px rgba(15,23,42,0.12)',
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily:
        '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 700 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'dark' ? '#334155 #0F172A' : '#CBD5E1 #F6F8F7',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: 'var(--mnx-card-shadow, 0 1px 3px rgba(15,23,42,0.08))',
            border: mode === 'dark' ? '1px solid rgba(148,163,184,0.14)' : '1px solid rgba(15,23,42,0.06)',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
      },
      MuiIconButton: {
        defaultProps: { size: 'small' },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
    },
  });
}

export const theme = buildTheme('light');
