import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Badge, Drawer, IconButton, Tooltip, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import Brand from './Brand';
import UserMenu from './UserMenu';
import NotificationBell from '../features/notifications/NotificationBell';
import useUnreadCounts from '../features/notifications/useUnreadCounts';
import './DashboardLayout.css';

/**
 * Sidebar + top-bar shell for Super Admin and Admin (desktop UI).
 * Desktop: permanent sidebar · Tablet: collapsible (mini) sidebar · Mobile: temporary drawer.
 * All styling: DashboardLayout.css
 */
export default function DashboardLayout({ nav, subtitle, basePath }) {
  const isDesktop = useMediaQuery('(min-width: 1200px)');
  const isTablet = useMediaQuery('(min-width: 900px) and (max-width: 1199.98px)');
  const isMobile = !isDesktop && !isTablet;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const counts = useUnreadCounts();

  useEffect(() => { setCollapsed(isTablet); }, [isTablet]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { counts.refresh(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const mini = !isMobile && collapsed;

  const sidebar = (
    <div className={`sidebar ${mini ? 'sidebar--mini' : ''}`}>
      <div className="sidebar__brand"><Brand compact={mini} subtitle={subtitle} /></div>
      <nav className="sidebar__nav" aria-label="Main navigation">
        {nav.map((group) => (
          <div key={group.section} className="sidebar__group">
            {mini ? <hr className="sidebar__divider" /> : <div className="sidebar__section">{group.section}</div>}
            <ul className="sidebar__list">
              {group.items.map((item) => {
                const badge = item.badge ? counts[item.badge] : 0;
                const link = (
                  <NavLink to={item.to} className="sidebar__link">
                    <span className="sidebar__icon">
                      <Badge badgeContent={mini ? badge : 0} color="error" variant="dot"><item.icon fontSize="small" /></Badge>
                    </span>
                    {!mini && <span className="sidebar__label">{item.label}</span>}
                    {!mini && badge > 0 && <span className="sidebar__count">{badge}</span>}
                  </NavLink>
                );
                return <li key={item.to}>{mini ? <Tooltip title={item.label} placement="right">{link}</Tooltip> : link}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className={`dash ${mini ? 'dash--mini' : ''} ${isMobile ? 'dash--mobile' : ''}`}>
      <a href="#main" className="skip-link">Skip to content</a>

      <header className="topbar">
        <IconButton edge="start" aria-label="Toggle navigation" onClick={() => (isMobile ? setMobileOpen(true) : setCollapsed((c) => !c))}>
          {isMobile || collapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </IconButton>
        <div className="topbar__brand"><Brand compact /></div>
        <span className="topbar__date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <span className="flex-1" />
        <Tooltip title="Messages">
          <IconButton aria-label={`Messages, ${counts.messages} unread`} onClick={() => navigate(`${basePath}/messages`)}>
            <Badge badgeContent={counts.messages} color="error"><ChatBubbleOutlineIcon /></Badge>
          </IconButton>
        </Tooltip>
        <NotificationBell count={counts.notifications} onChange={counts.refresh} />
        <UserMenu settingsPath={`${basePath}/account`} />
      </header>

      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }} PaperProps={{ className: 'dash__drawer' }}>
          {sidebar}
        </Drawer>
      ) : (
        <aside className="dash__aside">{sidebar}</aside>
      )}

      <main id="main" tabIndex={-1} className="dash__main cq">
        <div className="dash__content">
          <Outlet context={{ refreshCounts: counts.refresh }} />
        </div>
      </main>
    </div>
  );
}
