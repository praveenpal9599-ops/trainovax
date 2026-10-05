import { createTheme } from '@mui/material/styles';
import { themeOptions } from './theme';

/**
 * Theme for the app-style (WebView) Trainer and Client experience.
 * Breakpoints are pushed out of reach so MUI widgets (dialogs, steppers…) always behave like on a phone,
 * even when the app column is shown inside a desktop browser. Styling is in CSS (`.is-app` rules).
 */
export const MOBILE_MAX_WIDTH = 480;

const mobileTheme = createTheme({
  ...themeOptions,
  breakpoints: { values: { xs: 0, sm: 100000, md: 100001, lg: 100002, xl: 100003 } },
  shape: { borderRadius: 14 },
  components: { ...themeOptions.components, MuiTextField: { defaultProps: { size: 'medium', fullWidth: true } } },
});

export default mobileTheme;
