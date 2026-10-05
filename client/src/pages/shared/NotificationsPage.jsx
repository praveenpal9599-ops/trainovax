import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, IconButton, List, ListItemButton, MenuItem, Pagination, Skeleton, Tab, Tabs, TextField, Tooltip } from '@mui/material';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import EmptyState from '../../components/common/EmptyState';
import LoadingButton from '../../components/common/LoadingButton';
import useFetch from '../../hooks/useFetch';
import { notificationService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useLookups } from '../../features/lookups/LookupsContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { notificationMeta } from '../../features/notifications/notificationMeta';
import { refreshCounts } from '../../features/notifications/useUnreadCounts';
import { formatDateTime, timeAgo } from '../../utils/format';
import './NotificationsPage.css';

function BroadcastPanel() {
  const { organizations } = useLookups();
  const { notify } = useFeedback();
  const [form, setForm] = useState({ audience: 'all', organization_id: '', title: '', body: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { data: history, reload } = useFetch(() => notificationService.broadcasts(), []);
  const send = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setBusy(true); setError(null);
    try {
      const r = await notificationService.broadcast({ ...form, organization_id: form.organization_id || undefined });
      notify(`Announcement sent to ${r.recipients} user(s)`); setForm((f) => ({ ...f, title: '', body: '' })); reload();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="notifications__broadcast">
      <div>
        <SectionCard title="Send announcement" subtitle="Platform-wide notification to trainers and/or clients">
          {error && <Alert severity="error" className="notifications__alert">{error}</Alert>}
          <div className="stack notifications__form">
            <div className="notifications__audience">
              <TextField select label="Audience" value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
                <MenuItem value="all">Everyone</MenuItem><MenuItem value="admins">All trainers</MenuItem><MenuItem value="clients">All clients</MenuItem><MenuItem value="organization">One organization</MenuItem>
              </TextField>
              {form.audience === 'organization' && (
                <TextField select label="Organization" value={form.organization_id} onChange={(e) => setForm((f) => ({ ...f, organization_id: e.target.value }))} required>
                  {organizations.map((o) => <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>)}
                </TextField>
              )}
            </div>
            <TextField label="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. New feature: progress photo comparison" inputProps={{ maxLength: 200 }} />
            <TextField label="Message" multiline minRows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} inputProps={{ maxLength: 500 }} />
            <div><LoadingButton variant="contained" loading={busy} startIcon={<CampaignOutlinedIcon />} onClick={send}>Send announcement</LoadingButton></div>
          </div>
        </SectionCard>
      </div>
      <div>
        <SectionCard title="Recent announcements">
          {(history || []).length === 0 && <EmptyState compact title="No announcements sent" />}
          {(history || []).map((h) => (
            <div key={`${h.title}${h.created_at}`} className="notifications__history-item">
              <p className="notifications__history-title">{h.title}</p>
              <span className="notifications__history-meta">{formatDateTime(h.created_at)} · {h.recipients} recipients</span>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { can, user } = useAuth();
  const navigate = useNavigate();
  const { notifyError } = useFeedback();
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useFetch(() => notificationService.list({ page, pageSize: 15, unread: filter === 'unread' ? 'true' : undefined }), [page, filter]);
  const items = data?.data || [];
  const act = async (fn) => { try { await fn(); await reload({ silent: true }); refreshCounts(); } catch (e) { notifyError(e); } };
  const open = async (n) => { if (!n.read_at) await act(() => notificationService.markRead(n.id)); if (n.link) navigate(n.link); };

  return (
    <>
      <PageHeader title="Notifications" subtitle={user.role === 'client' ? 'Updates from your trainer and reminders.' : 'Activity, reminders and announcements.'}
        actions={data?.meta?.unread > 0 && <Button startIcon={<DoneAllIcon />} onClick={() => act(() => notificationService.markAllRead())}>Mark all as read</Button>} />
      {can('notifications.broadcast') && <BroadcastPanel />}
      <div className="card notifications__card">
        <Tabs value={filter} onChange={(_, v) => { setFilter(v); setPage(1); }} className="notifications__tabs">
          <Tab value="all" label="All" /><Tab value="unread" label={`Unread${data?.meta?.unread ? ` (${data.meta.unread})` : ''}`} />
        </Tabs>
        {loading && <div className="notifications__loading">{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} />)}</div>}
        {!loading && items.length === 0 && <EmptyState icon={NotificationsNoneOutlinedIcon} title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="You're all caught up." />}
        <List disablePadding>
          {items.map((n) => {
            const meta = notificationMeta(n.type);
            return (
              <ListItemButton key={n.id} onClick={() => open(n)} className={`notifications__item ${n.read_at ? '' : 'notifications__item--unread'}`.trim()}>
                <span className={`notifications__icon tone--${meta.color}`}><meta.icon fontSize="small" /></span>
                <div className="flex-1">
                  <p className="notifications__title">{n.title}</p>
                  {n.body && <p className="notifications__body">{n.body}</p>}
                  <span className="notifications__time">{timeAgo(n.created_at)}</span>
                </div>
                <div className="notifications__actions" onClick={(e) => e.stopPropagation()}>
                  {!n.read_at && <Tooltip title="Mark as read"><IconButton size="small" onClick={() => act(() => notificationService.markRead(n.id))} aria-label="Mark as read"><DoneAllIcon fontSize="small" /></IconButton></Tooltip>}
                  <Tooltip title="Delete"><IconButton size="small" onClick={() => act(() => notificationService.remove(n.id))} aria-label="Delete notification"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                </div>
              </ListItemButton>
            );
          })}
        </List>
        {data?.meta?.totalPages > 1 && <div className="notifications__pager"><Pagination count={data.meta.totalPages} page={page} onChange={(_, p) => setPage(p)} color="primary" /></div>}
      </div>
    </>
  );
}
