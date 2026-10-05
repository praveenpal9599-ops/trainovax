import { BrowserRouter } from 'react-router-dom';
import { StyledEngineProvider, ThemeProvider } from '@mui/material/styles';
import theme from './theme/theme';
import { AuthProvider } from './features/auth/AuthContext';
import { FeedbackProvider } from './features/feedback/FeedbackProvider';
import { LookupsProvider } from './features/lookups/LookupsContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    // injectFirst: MUI's built-in styles are inserted before our CSS files, so our external CSS always wins.
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <FeedbackProvider>
            <AuthProvider>
              <LookupsProvider>
                <AppRoutes />
              </LookupsProvider>
            </AuthProvider>
          </FeedbackProvider>
        </BrowserRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
