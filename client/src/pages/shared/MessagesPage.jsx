import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Badge, InputAdornment, List, ListItemButton, Skeleton, TextField, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import PageHeader from '../../components/common/PageHeader';
import UserAvatar from '../../components/common/UserAvatar';
import EmptyState from '../../components/common/EmptyState';
import ChatThread from '../../features/messaging/ChatThread';
import useFetch from '../../hooks/useFetch';
import { messageService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { timeAgo } from '../../utils/format';
import './MessagesPage.css';

export default function MessagesPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const active = Number(params.get('with')) || null;
  const [q, setQ] = useState('');
  const { data, loading, reload } = useFetch(() => messageService.conversations(), []);
  const convos = useMemo(() => (data || []).filter((c) => c.name.toLowerCase().includes(q.toLowerCase())), [data, q]);

  useEffect(() => {
    if (!active && !mobile && data?.length) setParams({ with: data[0].id }, { replace: true });
  }, [data, active, mobile, setParams]);
  useEffect(() => { if (active) setTimeout(reload, 400); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = (
    <div className="messages__list">
      <div className="messages__search">
        <TextField value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" inputProps={{ 'aria-label': 'Search conversations' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment> }} />
      </div>
      <List className="messages__convos">
        {loading && [1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} className="messages__skeleton" />)}
        {!loading && convos.length === 0 && <EmptyState compact icon={ForumOutlinedIcon} title="No conversations" description={user.role === 'admin' ? 'Clients with an app login will appear here.' : 'Your contacts will appear here.'} />}
        {convos.map((c) => (
          <ListItemButton key={c.id} selected={c.id === active} onClick={() => setParams({ with: c.id })} className={`messages__convo ${c.unread ? 'messages__convo--unread' : ''}`.trim()}>
            <Badge color="error" badgeContent={c.unread} overlap="circular"><UserAvatar name={c.name} src={c.avatar_url} size={42} /></Badge>
            <div className="flex-1">
              <div className="messages__convo-top">
                <span className="messages__convo-name truncate">{c.name}</span>
                <span className="messages__convo-time">{c.last_message ? timeAgo(c.last_message.created_at) : ''}</span>
              </div>
              <span className="messages__convo-preview truncate">
                {c.last_message ? `${c.last_message.mine ? 'You: ' : ''}${c.last_message.body}` : c.subtitle}
              </span>
            </div>
          </ListItemButton>
        ))}
      </List>
    </div>
  );

  const cardClass = ['card', 'messages', mobile ? 'messages--narrow' : 'messages--split', mobile && active ? 'messages--thread' : ''].filter(Boolean).join(' ');
  return (
    <>
      {!(mobile && active) && <PageHeader title="Messages" subtitle={user.role === 'client' ? 'Chat with your trainer.' : 'Conversations with your clients and team.'} />}
      <div className={cardClass}>
        {(!mobile || !active) && <div className="messages__side">{list}</div>}
        {(!mobile || active) && (
          <div className="messages__main">
            {active ? <ChatThread contactId={active} onBack={mobile ? () => setParams({}) : undefined} onSent={reload} />
              : <div className="messages__placeholder"><EmptyState icon={ForumOutlinedIcon} title="Select a conversation" description="Choose a contact on the left to start chatting." /></div>}
          </div>
        )}
      </div>
    </>
  );
}
