import { useState } from 'react';
import { Button, Checkbox, IconButton, MenuItem, TextField, Tooltip, Autocomplete } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import SectionCard from '../../components/common/SectionCard';
import EmptyState from '../../components/common/EmptyState';
import StatusChip from '../../components/common/StatusChip';
import FormDialog from '../../components/common/FormDialog';
import { taskService, clientService } from '../../services';
import { useFeedback } from '../feedback/FeedbackProvider';
import { formatDate, todayISO, addDaysISO } from '../../utils/format';
import './TasksWidget.css';

function dueLabel(d) {
  if (!d) return { text: 'No due date', tone: 'muted' };
  if (d < todayISO()) return { text: `Overdue · ${formatDate(d, { day: 'numeric', month: 'short' })}`, tone: 'overdue' };
  if (d === todayISO()) return { text: 'Due today', tone: 'today' };
  if (d === addDaysISO(todayISO(), 1)) return { text: 'Tomorrow', tone: 'muted' };
  return { text: formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' }), tone: 'muted' };
}

/** "Upcoming Tasks" dashboard widget with add / complete / delete. */
export default function TasksWidget({ tasks = [], onChange }) {
  const { notifyError, notify } = useFeedback();
  const [open, setOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ title: '', due_date: todayISO(), priority: 'medium', client: null });
  const [busy, setBusy] = useState(false);
  const openDialog = () => { setOpen(true); clientService.list({ all: 'true', status: 'active', sortBy: 'name', sortDir: 'asc' }).then((r) => setClients(r.data)).catch(() => {}); };
  const add = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    try { await taskService.create({ title: form.title, due_date: form.due_date, priority: form.priority, client_id: form.client?.id ?? null }); notify('Task added'); setOpen(false); setForm({ title: '', due_date: todayISO(), priority: 'medium', client: null }); onChange(); } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const complete = async (t) => { try { await taskService.update(t.id, { status: 'done' }); notify('Task completed'); onChange(); } catch (e) { notifyError(e); } };
  const remove = async (t) => { try { await taskService.remove(t.id); onChange(); } catch (e) { notifyError(e); } };

  return (
    <SectionCard title="Upcoming tasks" subtitle={`${tasks.length} open`} action={<Button size="small" startIcon={<AddIcon />} onClick={openDialog}>Add task</Button>}>
      {tasks.length === 0 ? <EmptyState compact icon={TaskAltOutlinedIcon} title="All done!" description="No open tasks. Add reminders for check-ins, plan updates and calls." /> : (
        <ul className="tasks-widget__list">
          {tasks.map((t) => {
            const due = dueLabel(t.due_date);
            return (
              <li key={t.id} className="tasks-widget__task">
                <Checkbox size="small" onChange={() => complete(t)} inputProps={{ 'aria-label': `Complete ${t.title}` }} />
                <div className="flex-1">
                  <p className="tasks-widget__title truncate">{t.title}</p>
                  <span className={`tasks-widget__due tasks-widget__due--${due.tone}`}>{due.text}{t.client_name ? ` · ${t.client_name}` : ''}</span>
                </div>
                <StatusChip status={t.priority} />
                <Tooltip title="Delete"><IconButton className="tasks-widget__delete" size="small" onClick={() => remove(t)} aria-label="Delete task"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
              </li>
            );
          })}
        </ul>
      )}
      <FormDialog open={open} onClose={() => setOpen(false)} title="New task" onSubmit={add} loading={busy} submitText="Add task" submitDisabled={!form.title.trim()}>
        <div className="stack">
          <TextField label="Task" required autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Review Rahul's food log" />
          <div className="tasks-widget__form-row">
            <TextField type="date" label="Due date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField select label="Priority" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
              <MenuItem value="high">High</MenuItem><MenuItem value="medium">Medium</MenuItem><MenuItem value="low">Low</MenuItem>
            </TextField>
          </div>
          <Autocomplete options={clients} value={form.client} onChange={(_, v) => setForm((f) => ({ ...f, client: v }))} getOptionLabel={(o) => o.full_name} renderInput={(p) => <TextField {...p} label="Related client (optional)" />} />
        </div>
      </FormDialog>
    </SectionCard>
  );
}
