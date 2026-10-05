import { useState } from 'react';
import { IconButton, TextField, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import useFetch from '../../../hooks/useFetch';
import { clientService } from '../../../services';
import LoadingButton from '../../../components/common/LoadingButton';
import EmptyState from '../../../components/common/EmptyState';
import UserAvatar from '../../../components/common/UserAvatar';
import { useFeedback } from '../../feedback/FeedbackProvider';
import { timeAgo } from '../../../utils/format';
import './NotesTab.css';

export default function NotesTab({ client }) {
  const { confirm, notifyError } = useFeedback();
  const { data, reload } = useFetch(() => clientService.notes(client.id), [client.id]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await clientService.addNote(client.id, { content: text.trim() }); setText(''); reload({ silent: true }); } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const pin = async (n) => { await clientService.updateNote(client.id, n.id, { content: n.content, is_pinned: !n.is_pinned }).catch(notifyError); reload({ silent: true }); };
  const remove = async (n) => { if (await confirm({ title: 'Delete note?', confirmText: 'Delete', danger: true })) { await clientService.deleteNote(client.id, n.id).catch(notifyError); reload({ silent: true }); } };

  return (
    <div className="client-notes">
      <div className="card card--padded-sm client-notes__composer">
        <TextField value={text} onChange={(e) => setText(e.target.value)} multiline minRows={3} placeholder="Add a private note about this client (visible to trainers only)…" inputProps={{ 'aria-label': 'New note', maxLength: 5000 }} />
        <div className="client-notes__composer-actions"><LoadingButton variant="contained" loading={busy} disabled={!text.trim()} onClick={add}>Add note</LoadingButton></div>
      </div>
      {(data || []).length === 0 && <div className="card"><EmptyState icon={StickyNote2OutlinedIcon} title="No notes yet" description="Keep track of observations, preferences and conversations." /></div>}
      <div className="client-notes__list">
        {(data || []).map((n) => (
          <article key={n.id} className={`card card--padded-sm client-notes__note${n.is_pinned ? ' client-notes__note--pinned' : ''}`}>
            <UserAvatar name={n.author_name} size={32} />
            <div className="client-notes__body">
              <span className="client-notes__meta">{n.author_name} · {timeAgo(n.created_at)}</span>
              <p className="client-notes__content">{n.content}</p>
            </div>
            <div className="client-notes__tools">
              <Tooltip title={n.is_pinned ? 'Unpin' : 'Pin'}><IconButton size="small" onClick={() => pin(n)} aria-label="Toggle pin">{n.is_pinned ? <PushPinIcon fontSize="small" color="primary" /> : <PushPinOutlinedIcon fontSize="small" />}</IconButton></Tooltip>
              <Tooltip title="Delete"><IconButton size="small" onClick={() => remove(n)} aria-label="Delete note"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
