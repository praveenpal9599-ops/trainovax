import { useEffect, useRef, useState } from 'react';
import { Chip, CircularProgress, IconButton, Link, TextField, Tooltip } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { messageService } from '../../services';
import { assetUrl } from '../../api/http';
import { useAuth } from '../auth/AuthContext';
import { useFeedback } from '../feedback/FeedbackProvider';
import UserAvatar from '../../components/common/UserAvatar';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/format';
import { refreshCounts } from '../notifications/useUnreadCounts';
import './ChatThread.css';

const isImage = (name = '') => /\.(png|jpe?g|webp|gif)$/i.test(name);
const dayKey = (ts) => ts.slice(0, 10);

/** One conversation: history, polling, text + attachment composer. Styles: ChatThread.css */
export default function ChatThread({ contactId, onBack, onSent, height = '100%' }) {
  const { user } = useAuth();
  const { notifyError } = useFeedback();
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const bottom = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    const load = () => messageService.thread(contactId).then((r) => { if (alive) { setData(r); refreshCounts(); } }).catch((e) => alive && setData({ error: e }));
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [contactId]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [data?.data?.length]);

  const send = async (e) => {
    e?.preventDefault();
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    try {
      const msg = await messageService.send(contactId, text.trim(), file);
      setData((d) => ({ ...d, data: [...(d?.data || []), msg] }));
      setText(''); setFile(null); onSent?.();
    } catch (err) { notifyError(err); } finally { setSending(false); }
  };

  if (data?.error) return <EmptyState title="Conversation unavailable" description={data.error.message} />;
  const contact = data?.contact;
  const messages = data?.data || [];

  return (
    <div className="chat" style={{ '--chat-height': height }}>
      <div className="chat__header">
        {onBack && <IconButton onClick={onBack} aria-label="Back to conversations" edge="start"><ArrowBackIcon /></IconButton>}
        {contact ? <UserAvatar name={contact.name} src={contact.avatar_url} /> : <CircularProgress size={24} />}
        <div><p className="chat__name">{contact?.name}</p><span className="chat__subtitle">{contact?.subtitle}</span></div>
      </div>
      <div className="chat__body" aria-live="polite">
        {!data && <div className="chat__loading"><CircularProgress size={28} /></div>}
        {data && messages.length === 0 && <EmptyState icon={ChatBubbleOutlineIcon} title="No messages yet" description={`Say hello to ${contact?.name?.split(' ')[0] || 'them'} 👋`} />}
        {messages.map((m, i) => {
          const mine = m.sender_id === user.id;
          const showDay = i === 0 || dayKey(messages[i - 1].created_at) !== dayKey(m.created_at);
          return (
            <div key={m.id}>
              {showDay && <div className="chat__day"><Chip size="small" className="chat__day-chip" label={formatDate(m.created_at, { weekday: 'short', day: 'numeric', month: 'short' })} /></div>}
              <div className={`chat__row ${mine ? 'chat__row--mine' : ''}`.trim()}>
                <div className={`chat__bubble ${mine ? 'chat__bubble--mine' : 'chat__bubble--theirs'}`}>
                  {m.attachment_url && (isImage(m.attachment_name)
                    ? <a href={assetUrl(m.attachment_url)} target="_blank" rel="noopener"><img src={assetUrl(m.attachment_url)} alt={m.attachment_name} className={`chat__image ${m.body ? 'chat__image--captioned' : ''}`.trim()} /></a>
                    : <Link href={assetUrl(m.attachment_url)} target="_blank" rel="noopener" color="inherit" className={`chat__file ${m.body ? 'chat__file--captioned' : ''}`.trim()}><InsertDriveFileOutlinedIcon fontSize="small" />{m.attachment_name}</Link>)}
                  {m.body && <p className="chat__text">{m.body}</p>}
                  <span className="chat__time">
                    {new Date(m.created_at.replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}{mine && m.read_at ? ' · Seen' : ''}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form onSubmit={send} className="chat__composer">
        {file && <Chip label={file.name} onDelete={() => setFile(null)} size="small" className="chat__file-chip" icon={<AttachFileIcon />} />}
        <div className="chat__composer-row">
          <Tooltip title="Attach image or PDF"><IconButton onClick={() => fileInput.current?.click()} aria-label="Attach file"><AttachFileIcon /></IconButton></Tooltip>
          <input ref={fileInput} type="file" hidden accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={(e) => { setFile(e.target.files?.[0] || null); e.target.value = ''; }} />
          <TextField value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" multiline maxRows={4} inputProps={{ 'aria-label': 'Message', maxLength: 5000 }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <IconButton type="submit" color="primary" disabled={sending || (!text.trim() && !file)} aria-label="Send message" className="chat__send">
            {sending ? <CircularProgress size={20} color="inherit" /> : <SendRoundedIcon fontSize="small" />}
          </IconButton>
        </div>
      </form>
    </div>
  );
}
