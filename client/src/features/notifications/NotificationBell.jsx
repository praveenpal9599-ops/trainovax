import { useState } from 'react';
import { Badge, Button, Divider, IconButton, List, ListItemButton, Popover, Skeleton, Tooltip } from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../../services';
import { timeAgo } from '../../utils/format';
import { notificationMeta } from './notificationMeta';
import { useAuth } from '../auth/AuthContext';
import EmptyState from '../../components/common/EmptyState';
import './NotificationBell.css';

export default function NotificationBell({ count = 0, onChange }) {
  const [anchor, setAnchor] = useState(null);
  const [items, setItems] = useState(null);
  const navigate = useNavigate();
  const { basePath } = useAuth();

  const open = async (e) => {
    setAnchor(e.currentTarget);
    setItems(null);
    const res = await notificationService.list({ pageSize: 6 }).catch(() => ({ data: [] }));
    setItems(res.data);
  };
  const go = async (n) => {
    if (!n.read_at) { await notificationService.markRead(n.id).catch(() => {}); onChange?.(); }
    setAnchor(null);
    if (n.link) navigate(n.link);
  };
  const markAll = async () => { await notificationService.markAllRead(); setItems((x) => x?.map((n) => ({ ...n, read_at: n.read_at || 'now' }))); onChange?.(); };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={open} aria-label={`Notifications, ${count} unread`}>
          <Badge badgeContent={count} color="error" max={99}><NotificationsNoneOutlinedIcon /></Badge>
        </IconButton>
      </Tooltip>
      <Popover open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { className: 'notif-bell__paper' } }}>
        <div className="notif-bell__head">
          <h2 className="notif-bell__heading">Notifications</h2>
          {count > 0 && <Button size="small" onClick={markAll}>Mark all read</Button>}
        </div>
        <Divider />
        {!items && <div className="notif-bell__loading">{[1, 2, 3].map((i) => <Skeleton key={i} height={52} />)}</div>}
        {items?.length === 0 && <EmptyState compact title="You're all caught up" description="New notifications will appear here." icon={NotificationsNoneOutlinedIcon} />}
        {items?.length > 0 && (
          <List disablePadding className="notif-bell__list">
            {items.map((n) => {
              const meta = notificationMeta(n.type);
              return (
                <ListItemButton key={n.id} onClick={() => go(n)} className={`notif-bell__item ${n.read_at ? '' : 'notif-bell__item--unread'}`.trim()}>
                  <span className={`notif-bell__icon tone--${meta.color}`}>
                    <meta.icon />
                  </span>
                  <div className="flex-1">
                    <p className="notif-bell__title">{n.title}</p>
                    {n.body && <span className="notif-bell__body clamp-2">{n.body}</span>}
                    <span className="notif-bell__time">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.read_at && <span className="notif-bell__dot" />}
                </ListItemButton>
              );
            })}
          </List>
        )}
        <Divider />
        <div className="notif-bell__foot"><Button fullWidth onClick={() => { setAnchor(null); navigate(`${basePath}/notifications`); }}>View all notifications</Button></div>
      </Popover>
    </>
  );
}
