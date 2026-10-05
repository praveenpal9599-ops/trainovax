import { useState } from 'react';
import { IconButton, MenuItem, TextField, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import useFetch from '../../../hooks/useFetch';
import { clientService } from '../../../services';
import SectionCard from '../../../components/common/SectionCard';
import StatusChip from '../../../components/common/StatusChip';
import StatCard from '../../../components/common/StatCard';
import EmptyState from '../../../components/common/EmptyState';
import LoadingButton from '../../../components/common/LoadingButton';
import { useFeedback } from '../../feedback/FeedbackProvider';
import { addDaysISO, formatDate, formatTime, todayISO } from '../../../utils/format';
import './AttendanceTab.css';

/** Attendance statuses; each has a colour modifier `.client-attendance__day--<status>` in AttendanceTab.css */
const STATUSES = ['present', 'late', 'absent', 'excused'];

export default function AttendanceTab({ client }) {
  const { notify, notifyError } = useFeedback();
  const { data, reload } = useFetch(() => clientService.attendance(client.id), [client.id]);
  const [form, setForm] = useState({ session_date: todayISO(), status: 'present', check_in_time: new Date().toTimeString().slice(0, 5), notes: '' });
  const [busy, setBusy] = useState(false);
  const rows = data?.data || [];
  const s = data?.summary || {};
  const byDate = Object.fromEntries(rows.map((r) => [r.session_date, r]));
  const last28 = Array.from({ length: 28 }, (_, i) => addDaysISO(todayISO(), i - 27));

  const save = async () => {
    setBusy(true);
    try { await clientService.markAttendance(client.id, form); notify('Attendance saved'); reload({ silent: true }); } catch (e) { notifyError(e); } finally { setBusy(false); }
  };
  const remove = async (id) => { try { await clientService.deleteAttendance(client.id, id); reload({ silent: true }); } catch (e) { notifyError(e); } };
  const rate = s.total ? Math.round((100 * ((s.present || 0) + (s.late || 0))) / s.total) : 0;

  return (
    <div className="client-attendance">
      <div className="client-attendance__stat"><StatCard label="Attendance rate (30d)" value={`${rate}%`} color="primary" /></div>
      <div className="client-attendance__stat"><StatCard label="Present" value={s.present || 0} color="success" /></div>
      <div className="client-attendance__stat"><StatCard label="Late" value={s.late || 0} color="warning" /></div>
      <div className="client-attendance__stat"><StatCard label="Absent" value={s.absent || 0} color="error" /></div>
      <div className="client-attendance__calendar">
        <SectionCard title="Last 4 weeks">
          <div className="client-attendance__days">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="client-attendance__weekday">{d}</span>)}
            {Array.from({ length: ((new Date(`${last28[0]}T00:00:00`).getDay() + 6) % 7) }).map((_, i) => <div key={`pad${i}`} />)}
            {last28.map((d) => {
              const r = byDate[d];
              return (
                <Tooltip key={d} title={`${formatDate(d)} — ${r ? r.status : 'no session'}`}>
                  <div className={`client-attendance__day${r ? ` client-attendance__day--${r.status}` : ''}`}>{Number(d.slice(8))}</div>
                </Tooltip>
              );
            })}
          </div>
          <div className="client-attendance__legend">
            {STATUSES.map((k) => <div key={k} className="client-attendance__legend-item"><span className={`client-attendance__swatch client-attendance__day--${k}`} /><span className="text-caption text-capitalize">{k}</span></div>)}
          </div>
        </SectionCard>
      </div>
      <div className="client-attendance__mark">
        <SectionCard title="Mark attendance">
          <div className="client-attendance__form">
            <div className="client-attendance__form-row">
              <TextField type="date" label="Date" value={form.session_date} onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField type="time" label="Check-in" value={form.check_in_time} onChange={(e) => setForm((f) => ({ ...f, check_in_time: e.target.value }))} InputLabelProps={{ shrink: true }} />
            </div>
            <TextField select label="Status" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s2) => <MenuItem key={s2} value={s2} className="text-capitalize">{s2}</MenuItem>)}
            </TextField>
            <TextField label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            <LoadingButton variant="contained" loading={busy} onClick={save} startIcon={<EventAvailableOutlinedIcon />}>Save attendance</LoadingButton>
          </div>
        </SectionCard>
      </div>
      <div className="client-attendance__log">
        <SectionCard title="Session log" noPadding>
          {rows.length === 0 ? <EmptyState compact title="No sessions recorded" /> : rows.slice(0, 30).map((r) => (
            <div key={r.id} className="client-attendance__row">
              <span className="client-attendance__date">{formatDate(r.session_date)}</span>
              <span className="client-attendance__time">{r.check_in_time ? formatTime(r.check_in_time) : '—'}</span>
              <StatusChip status={r.status} />
              <span className="client-attendance__notes truncate">{r.notes}</span>
              <IconButton size="small" onClick={() => remove(r.id)} aria-label="Delete attendance"><DeleteOutlineIcon fontSize="small" /></IconButton>
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}
