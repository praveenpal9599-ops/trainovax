import { useState } from 'react';
import { ButtonBase, Divider, ListItemIcon, Menu, MenuItem } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import ManageAccountsOutlinedIcon from '@mui/icons-material/ManageAccountsOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import UserAvatar from '../components/common/UserAvatar';
import './UserMenu.css';

/** Avatar button + account menu in the top bar. Styles: UserMenu.css */
export default function UserMenu({ settingsPath, items = [] }) {
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <>
      <ButtonBase onClick={(e) => setAnchor(e.currentTarget)} className="user-menu__trigger" aria-label="Account menu">
        <UserAvatar name={user.name} src={user.avatar_url} size={34} />
        <span className="user-menu__who">
          <span className="user-menu__name">{user.name}</span>
          <span className="user-menu__role">{user.role_label}</span>
        </span>
        <KeyboardArrowDownIcon fontSize="small" className="user-menu__caret" />
      </ButtonBase>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }} slotProps={{ paper: { className: 'user-menu__paper' } }}>
        <div className="user-menu__header">
          <div className="user-menu__header-name">{user.name}</div>
          <div className="text-caption text-muted">{user.email}</div>
          {user.organization_name && <div className="text-caption text-muted">{user.organization_name}</div>}
        </div>
        <Divider />
        {items.map((it) => (
          <MenuItem key={it.to} onClick={() => { setAnchor(null); navigate(it.to); }}><ListItemIcon><it.icon fontSize="small" /></ListItemIcon>{it.label}</MenuItem>
        ))}
        {items.length > 0 && <Divider />}
        <MenuItem onClick={() => { setAnchor(null); navigate(settingsPath); }}><ListItemIcon><ManageAccountsOutlinedIcon fontSize="small" /></ListItemIcon>Account settings</MenuItem>
        <MenuItem onClick={async () => { setAnchor(null); await logout(); navigate('/login'); }}><ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>Sign out</MenuItem>
      </Menu>
    </>
  );
}
