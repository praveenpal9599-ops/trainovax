import { useState } from 'react';
import { Alert, Button, ButtonBase, Chip, Collapse, IconButton, LinearProgress, Link, Skeleton, TextField, Tooltip } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import OndemandVideoOutlinedIcon from '@mui/icons-material/OndemandVideoOutlined';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import ProgressRing from '../../components/common/ProgressRing';
import ExerciseThumb from '../../features/masters/ExerciseThumb';
import useFetch from '../../hooks/useFetch';
import { portalService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { duration, formatDate, todayISO } from '../../utils/format';
import './client-pages.css';
import './MyWorkoutPage.css';

function ExerciseCard({ e, index, date, disabled, onLog }) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState(e.log?.actual_weight_kg ?? e.weight_kg ?? '');
  const status = e.log?.status;
  const done = status === 'completed';
  const stat = (label, value) => value ? <div className="my-workout__stat"><p className="my-workout__stat-value">{value}</p><span className="text-caption text-muted">{label}</span></div> : null;
  return (
    <article className={`card my-workout__exercise${done ? ' my-workout__exercise--done' : status === 'skipped' ? ' my-workout__exercise--skipped' : ''}`}>
      <div className="my-workout__exercise-body">
        <div className="my-workout__exercise-head">
          <div className="my-workout__thumb">
            <ExerciseThumb category={e.category} image={e.image_url} size={48} />
            <span className={`my-workout__badge${done ? ' my-workout__badge--done' : ''}`}>{done ? '✓' : index + 1}</span>
          </div>
          <div className="flex-1">
            <h3 className={`my-workout__exercise-name${done ? ' my-workout__exercise-name--done' : ''}`}>{e.exercise_name}</h3>
            <span className="text-caption text-muted">{[e.muscle_group, e.equipment].filter(Boolean).join(' · ')}</span>
          </div>
          {status && <Chip size="small" label={done ? 'Completed' : 'Skipped'} color={done ? 'success' : 'warning'} />}
        </div>
        <div className="my-workout__stats">
          {stat('Sets', e.sets)}{stat('Reps', e.reps)}{stat('Time', e.duration_sec ? duration(e.duration_sec) : null)}{stat('Weight', e.weight_kg ? `${e.weight_kg}kg` : null)}{stat('Rest', e.rest_sec ? `${e.rest_sec}s` : null)}
        </div>
        {e.notes && <Alert severity="info" icon={false} className="my-workout__coach-note">Coach: {e.notes}</Alert>}
        <div className="row">
          {!status ? (
            <>
              <Button variant="contained" color="success" startIcon={<CheckRoundedIcon />} disabled={disabled} onClick={() => onLog(e, 'completed', weight)} className="flex-1">Completed</Button>
              <Button variant="outlined" color="warning" startIcon={<SkipNextRoundedIcon />} disabled={disabled} onClick={() => onLog(e, 'skipped')}>Skip</Button>
            </>
          ) : <Button color="inherit" startIcon={<UndoRoundedIcon />} disabled={disabled} onClick={() => onLog(e, null)} className="flex-1">Undo</Button>}
          <Tooltip title="How to do it"><IconButton onClick={() => setOpen((o) => !o)} aria-label="Show instructions" className={`my-workout__expand${open ? ' my-workout__expand--open' : ''}`}><ExpandMoreIcon /></IconButton></Tooltip>
        </div>
        <Collapse in={open} unmountOnExit>
          <div className="my-workout__details">
            {!status && e.weight_kg != null && (
              <TextField label="Weight used" type="number" size="small" value={weight} onChange={(ev) => setWeight(ev.target.value)} className="my-workout__weight-input" InputProps={{ endAdornment: 'kg' }} />
            )}
            {e.instructions ? (
              <ol className="my-workout__steps">{e.instructions.split('\n').filter(Boolean).map((l) => <li key={l}>{l}</li>)}</ol>
            ) : <p className="text-small text-muted">No instructions available.</p>}
            {e.tempo && <span className="text-caption text-muted my-workout__tempo">Tempo: {e.tempo} (lower – pause – lift)</span>}
            {e.video_url && <Link href={e.video_url} target="_blank" rel="noopener" className="my-workout__video"><OndemandVideoOutlinedIcon fontSize="small" />Watch demo</Link>}
          </div>
        </Collapse>
      </div>
    </article>
  );
}

export default function MyWorkoutPage() {
  const [date, setDate] = useState(todayISO());
  const { notifyError, notify } = useFeedback();
  const { data, loading, error, reload, setData } = useFetch(() => portalService.workout(date), [date]);
  const [busy, setBusy] = useState(false);
  const future = date > todayISO();

  const log = async (e, status, weight) => {
    setBusy(true);
    try {
      const updated = await portalService.logWorkout({ workout_exercise_id: e.id, log_date: date, status, actual_sets: status === 'completed' ? e.sets : null, actual_reps: status === 'completed' ? e.reps : null, actual_weight_kg: status === 'completed' && weight !== '' ? Number(weight) : null });
      setData((d) => ({ ...d, ...updated, week: d.week.map((w) => (w.date === date ? { ...w, done: updated.completion?.done ?? 0 } : w)) }));
      if (updated.completion?.pct === 100 && status === 'completed') notify('Workout complete — great job! 💪');
    } catch (err) { notifyError(err); } finally { setBusy(false); }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div className="my-workout">
      <h1 className="client-page__title my-workout__title">My workout</h1>
      <p className="client-page__subtitle my-workout__subtitle">{data?.plan?.name || 'Your training plan'}</p>

      {/* Week strip */}
      <div className="my-workout__week" role="tablist" aria-label="Week days">
        {(data?.week || Array.from({ length: 7 }, (_, i) => ({ date: String(i) }))).map((d) => {
          const sel = d.date === date; const isToday = d.date === todayISO();
          const pct = d.total ? d.done / d.total : 0;
          const dot = !d.total ? 'none' : pct === 1 ? 'done' : pct > 0 ? 'partial' : 'todo';
          return (
            <ButtonBase key={d.date} role="tab" aria-selected={sel} onClick={() => d.day_name !== undefined && setDate(d.date)}
              className={`my-workout__day${sel ? ' my-workout__day--selected' : ''}`}>
              {loading && !data ? <Skeleton width={30} /> : (
                <>
                  <span className="my-workout__day-name">{new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span className="my-workout__day-num">{Number(d.date.slice(8))}</span>
                  <span className={`my-workout__day-dot my-workout__day-dot--${dot}`} />
                  {isToday && !sel && <span className="my-workout__day-today">TODAY</span>}
                </>
              )}
            </ButtonBase>
          );
        })}
      </div>

      {loading && !data ? <Skeleton variant="rounded" height={300} /> : !data?.plan ? (
        <div className="card"><EmptyState icon={FitnessCenterRoundedIcon} title="No workout plan yet" description="Your trainer hasn't assigned a workout plan. You'll get a notification when it's ready." /></div>
      ) : !data.day ? (
        <div className="card"><EmptyState icon={SelfImprovementIcon} title={`Rest day · ${formatDate(date, { weekday: 'long' })}`} description="No training scheduled. Focus on sleep, hydration and light mobility." /></div>
      ) : (
        <>
          <section className="card my-workout__summary">
            <div className="my-workout__summary-row">
              <ProgressRing value={data.completion?.pct} size={76} />
              <div className="flex-1">
                <h2 className="my-workout__day-title">{data.day.name}{data.day.focus ? ` · ${data.day.focus}` : ''}</h2>
                <p className="text-small text-muted">{formatDate(date, { weekday: 'long', day: 'numeric', month: 'short' })} · {data.exercises.length} exercises</p>
                <div className="row my-workout__chips">
                  <Chip size="small" color="success" variant="outlined" label={`${data.completion?.done || 0} completed`} />
                  {data.completion?.skipped > 0 && <Chip size="small" color="warning" variant="outlined" label={`${data.completion.skipped} skipped`} />}
                  <Chip size="small" icon={<TimerOutlinedIcon />} variant="outlined" label={`~${Math.round(data.exercises.reduce((a, e) => a + (e.sets || 1) * ((e.duration_sec || 40) + (e.rest_sec || 0)), 0) / 60)} min`} />
                </div>
              </div>
            </div>
            <LinearProgress variant="determinate" value={data.completion?.pct || 0} className="progress--success my-workout__progress" color="success" />
          </section>
          {future && <Alert severity="info" className="my-workout__preview-note">This is a preview — you can log this workout on the day.</Alert>}
          <div className="my-workout__list">
            {data.exercises.map((e, i) => <ExerciseCard key={e.id} e={e} index={i} date={date} disabled={busy || future} onLog={log} />)}
          </div>
        </>
      )}
    </div>
  );
}
