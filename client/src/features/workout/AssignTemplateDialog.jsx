import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Autocomplete, TextField } from '@mui/material';
import FormDialog from '../../components/common/FormDialog';
import { clientService, dietService, workoutService } from '../../services';
import { useFeedback } from '../feedback/FeedbackProvider';
import { useAuth } from '../auth/AuthContext';
import { todayISO } from '../../utils/format';
import './AssignTemplateDialog.css';

/** Assign a workout or diet template to a client in one step. */
export default function AssignTemplateDialog({ open, onClose, kind, template, clientId, onAssigned }) {
  const svc = kind === 'diet' ? dietService : workoutService;
  const { basePath } = useAuth();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState({ client: null, template: null, start_date: todayISO() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    Promise.all([clientService.list({ all: 'true', status: 'active', sortBy: 'name', sortDir: 'asc' }), svc.templates.list({ all: 'true' })]).then(([c, t]) => {
      setClients(c.data); setTemplates(t.data);
      setForm({ client: c.data.find((x) => x.id === clientId) || null, template: template ? t.data.find((x) => x.id === template.id) || template : null, start_date: todayISO() });
    }).catch((e) => setError(e.message));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (!form.client || !form.template) { setError('Select a client and a template'); return; }
    setBusy(true); setError(null);
    try {
      const plan = await svc.fromTemplate({ template_id: form.template.id, client_id: form.client.id, start_date: form.start_date });
      notify(`${kind === 'diet' ? 'Diet' : 'Workout'} plan assigned to ${form.client.full_name}`);
      onAssigned?.(plan);
      onClose();
      navigate(`${basePath}/${kind === 'diet' ? 'diets' : 'workouts'}/${plan.id}`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  return (
    <FormDialog open={open} onClose={onClose} title={`Assign ${kind} template`} onSubmit={submit} loading={busy} submitText="Assign">
      {error && <Alert severity="error" className="assign-template__error">{error}</Alert>}
      <div className="stack">
        <Autocomplete options={templates} value={form.template} onChange={(_, v) => setForm((f) => ({ ...f, template: v }))} getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(p) => <TextField {...p} label="Template" required />} />
        <Autocomplete options={clients} value={form.client} onChange={(_, v) => setForm((f) => ({ ...f, client: v }))} getOptionLabel={(o) => o.full_name} isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(p) => <TextField {...p} label="Client" required />} />
        <TextField type="date" label="Start date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
        <Alert severity="info" variant="outlined">The client's current active {kind} plan will be marked completed, and they'll be notified. You can customise the new plan afterwards.</Alert>
      </div>
    </FormDialog>
  );
}
