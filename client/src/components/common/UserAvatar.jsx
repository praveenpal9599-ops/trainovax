import { Avatar } from '@mui/material';
import { assetUrl } from '../../api/http';
import { initials } from '../../utils/format';
import './UserAvatar.css';

const COLOR_COUNT = 8;
const colorIndex = (name = '') => [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % COLOR_COUNT;

/**
 * Circular avatar: photo, or initials on a colour picked from the name.
 * Size is passed as a CSS variable (--avatar-size); colours are .user-avatar--c0 … c7 in UserAvatar.css.
 */
export default function UserAvatar({ name, src, size = 36, className = '' }) {
  return (
    <Avatar alt={name} src={assetUrl(src)} className={`user-avatar user-avatar--c${colorIndex(name)} ${className}`} style={{ '--avatar-size': `${size}px` }}>
      {initials(name)}
    </Avatar>
  );
}
