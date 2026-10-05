import { useEffect, useState } from 'react';
import { Alert, MenuItem, TextField } from '@mui/material';
import FormDialog from '../../components/common/FormDialog';
import { notificationService } from '../../services';
import { useFeedback } from '../feedback/FeedbackProvider';
import './SendReminderDialog.css';

const PRESETS = [
  { title: 'Time to update your progress.', body: 'Please log your weight and measurements today.', type: 'progress' },
  { title: "Don't forget today's workout!", body: 'Your session is waiting in the app. Let’s keep the streak going.', type: 'reminder' },
  { title: 'Stay on track with your diet', body: 'Remember to log your meals and drink enough water today.', type: 'reminder' },
];

export default function SendReminderDialog({ open, onClose, clientIds = [], names }) {
  const { notify } = useFeedback();
  const [form, setForm] = useState(PRESETS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { if (open) { setForm(PRESETS[0]); setError(null); } }, [open]);
  const submit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setBusy(true);
    try {
      const r = await notificationService.sendToClients({ client_ids: clientIds, ...form });
      notify(r.recipients ? `Reminder sent to ${r.recipients} client${r.recipients > 1 ? 's' : ''}` : 'Selected clients have no app login', r.recipients ? 'success' : 'warning');
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <FormDialog open={open} onClose={onClose} title="Send reminder" onSubmit={submit} loading={busy} submitText="Send">
      {error && <Alert severity="error" className="send-reminder__alert">{error}</Alert>}
      <p className="send-reminder__to">To: {names || `${clientIds.length} client(s)`}</p>
      <div className="stack">
        <TextField select label="Template" value={PRESETS.findIndex((p) => p.title === form.title)} onChange={(e) => setForm(PRESETS[e.target.value])}>
          {PRESETS.map((p, i) => <MenuItem key={p.title} value={i}>{p.title}</MenuItem>)}
          <MenuItem value={-1} disabled>Custom</MenuItem>
        </TextField>
        <TextField label="Title" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} inputProps={{ maxLength: 200 }} />
        <TextField label="Message" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} multiline minRows={3} inputProps={{ maxLength: 500 }} />
      </div>
    </FormDialog>
  );
}
