import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Badge, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import mobileTheme from '../theme/mobileTheme';
import Brand from './Brand';
import UserMenu from './UserMenu';
import NotificationBell from '../features/notifications/NotificationBell';
import useUnreadCounts from '../features/notifications/useUnreadCounts';
import './MobileAppLayout.css';

/**
 * App-style shell for the Trainer and Client experiences (designed for a native-app WebView).
 * Always renders a phone-width column with a sticky header and a bottom tab bar.
 * Adds `is-app` to <body> so dialogs/menus (rendered in portals) pick up app styling.
 * All styling: MobileAppLayout.css
 *
 * Note: <main> is intentionally NOT a size container, so `@container content` rules never
 * match here and every shared component falls back to its narrow (phone) layout.
 */
export default function MobileAppLayout({ tabs, menu = [], subtitle, settingsPath }) {
  const location = useLocation();
  const navigate = useNavigate();
  const counts = useUnreadCounts();
  useEffect(() => {
    document.body.classList.add('is-app');
    return () => document.body.classList.remove('is-app');
  }, []);
  useEffect(() => { counts.refresh(); window.scrollTo(0, 0); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = tabs.findIndex((t) => location.pathname.startsWith(t.match || t.to));

  return (
    <ThemeProvider theme={mobileTheme}>
      <div className="app-frame">
        <div className="app">
          <header className="app__header">
            <div className="app__brand"><Brand subtitle={subtitle} /></div>
            <NotificationBell count={counts.notifications} onChange={counts.refresh} />
            <UserMenu settingsPath={settingsPath} items={menu} />
          </header>
          <main id="main" className="app__main">
            <Outlet context={{ refreshCounts: counts.refresh }} />
          </main>
          <nav className="app__tabbar" aria-label="Main navigation">
            <BottomNavigation showLabels value={current} className="app__tabs">
              {tabs.map((t) => (
                <BottomNavigationAction key={t.to} label={t.label} onClick={() => navigate(t.to)} className="app__tab"
                  icon={t.badge ? <Badge badgeContent={counts[t.badge]} color="error"><t.icon /></Badge> : <t.icon />} />
              ))}
            </BottomNavigation>
          </nav>
        </div>
      </div>
    </ThemeProvider>
  );
}
