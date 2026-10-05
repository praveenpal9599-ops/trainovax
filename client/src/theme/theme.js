import { createTheme } from '@mui/material/styles';

/**
 * MUI theme = colours + fonts that MUI components use internally (Button colours, focus rings, etc.).
 * ALL visual styling of our own UI lives in external CSS files:
 *   src/styles/tokens.css          – design tokens (colours, spacing, radius…) as CSS variables
 *   src/styles/mui-overrides.css   – how MUI components look (buttons, inputs, dialogs…)
 *   <Component>.css                – styles for each component / page, next to its .jsx file
 * Keep the colour values below in sync with tokens.css.
 */
export const brand = {
  primary: '#1565C0',
  secondary: '#42A5F5',
  background: '#F5F7FA',
  surface: '#FFFFFF',
  text: '#172B4D',
  textSecondary: '#5E6C84',
  border: '#E3E8EF',
  success: '#2E7D32',
  warning: '#ED6C02',
  error: '#D32F2F',
  info: '#0288D1',
};

/** Chart series colours (SVG charts need them as values; mirrors --chart-* in tokens.css). */
export const chartColors = ['#1565C0', '#42A5F5', '#26A69A', '#FFA726', '#7E57C2', '#EF5350', '#8D6E63'];

export const themeOptions = {
  palette: {
    mode: 'light',
    primary: { main: brand.primary, light: '#5E92F3', dark: '#003C8F', contrastText: '#fff' },
    secondary: { main: brand.secondary, contrastText: '#fff' },
    background: { default: brand.background, paper: brand.surface },
    text: { primary: brand.text, secondary: brand.textSecondary },
    divider: brand.border,
    success: { main: brand.success },
    warning: { main: brand.warning },
    error: { main: brand.error },
    info: { main: brand.info },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: { textTransform: 'none', fontWeight: 600 },
  },
  // Only behaviour defaults here — no styling (see mui-overrides.css).
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiTooltip: { defaultProps: { arrow: true } },
    MuiSkeleton: { defaultProps: { animation: 'wave' } },
  },
};

const theme = createTheme(themeOptions);
export default theme;
