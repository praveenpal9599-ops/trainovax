import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Autocomplete, Button, Checkbox, Chip, Collapse, IconButton, InputAdornment, ListItemIcon, Menu, MenuItem, TextField, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import MobilePageHeader from '../../features/mobile/MobilePageHeader';
import InlineSearch from '../../features/mobile/InlineSearch';
import TemplateSheet from '../../features/mobile/TemplateSheet';
import ExerciseThumb from '../../features/masters/ExerciseThumb';
import ExerciseFormDialog from '../../features/masters/ExerciseFormDialog';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingButton from '../../components/common/LoadingButton';
import { clientService, exerciseService, workoutService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { exerciseFromMaster, estimateMinutes, key, move } from '../../features/workout/workoutUtils';
import { DIFFICULTIES, GOALS, WEEKDAYS } from '../../utils/constants';
import { todayISO } from '../../utils/format';
import './MobileWorkoutEditor.css';

const emptyWeek = () => WEEKDAYS.map((w) => ({ dow: w.value, enabled: false, name: w.label, focus: '', exercises: [] }));

function toState(days = []) {
  const week = emptyWeek();
  const extras = [];
  days.forEach((d) => {
    const entry = { id: d.id, name: d.name, focus: d.focus || '', exercises: (d.exercises || []).map((e) => ({ ...e, _key: key() })) };
    const slot = week.find((w) => w.dow === d.day_of_week);
    if (slot && !slot.enabled) Object.assign(slot, entry, { enabled: true });
    else extras.push({ ...entry, dow: null, enabled: true, _key: key() });
  });
  return { week, extras };
}

const n = (v) => (v === '' || v === undefined ? null : v);
const small = (label, value, onChange, unit) => (
  <TextField label={label} size="small" value={value ?? ''} onChange={(e) => onChange(e.target.value)} inputProps={{ inputMode: 'decimal' }} className="mobile-workout-editor__num"
    InputProps={unit ? { endAdornment: <InputAdornment position="end" className="mobile-workout-editor__unit">{unit}</InputAdornment> } : undefined} />
);

function ExerciseItem({ e, index, count, onChange, onRemove, onMove }) {
  const timed = e.exercise_type === 'time' || (!e.reps && e.duration_sec);
  const set = (f) => (v) => onChange({ ...e, [f]: v });
  return (
    <div className="mobile-workout-editor__exercise">
      <div className="mobile-workout-editor__exercise-head">
        <ExerciseThumb category={e.category} image={e.image_url} size={36} />
        <div className="flex-1">
          <p className="mobile-workout-editor__exercise-name truncate">{e.exercise_name}</p>
          <span className="mobile-workout-editor__exercise-meta">{e.muscle_group || e.category}</span>
        </div>
        <IconButton size="small" disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Move up"><ArrowUpwardIcon fontSize="small" /></IconButton>
        <IconButton size="small" disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Move down"><ArrowDownwardIcon fontSize="small" /></IconButton>
        <IconButton size="small" color="error" onClick={onRemove} aria-label="Remove exercise"><DeleteOutlineIcon fontSize="small" /></IconButton>
      </div>
      <div className="mobile-workout-editor__fields">
        {small('Sets', e.sets, set('sets'))}
        {timed ? small('Secs', e.duration_sec, set('duration_sec')) : small('Reps', e.reps, set('reps'))}
        {small('Kg', e.weight_kg, set('weight_kg'))}
        {small('Rest', e.rest_sec, set('rest_sec'), 's')}
      </div>
      <TextField size="small" variant="standard" placeholder="Note for client (optional)" value={e.notes ?? ''} onChange={(ev) => set('notes')(ev.target.value)} className="mobile-workout-editor__note" InputProps={{ disableUnderline: true }} />
    </div>
  );
}

/** Trainer app: create / edit a workout plan — weekdays → exercises (with search & custom exercises). Styles: MobileWorkoutEditor.css */
export default function MobileWorkoutEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify, notifyError, confirm } = useFeedback();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ client_id: params.get('clientId') ? Number(params.get('clientId')) : null, name: '', goal: null, difficulty: 'beginner', status: 'active', start_date: todayISO(), description: '', template_id: null });
  const [week, setWeek] = useState(emptyWeek());
  const [extras, setExtras] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [custom, setCustom] = useState(null); // dow receiving a custom exercise
  const [copyMenu, setCopyMenu] = useState(null);
  const [more, setMore] = useState(null);

  useEffect(() => { clientService.list({ all: 'true', sortBy: 'name', sortDir: 'asc' }).then((r) => setClients(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    workoutService.get(id).then((p) => {
      setMeta({ client_id: p.client_id, name: p.name, goal: p.goal, difficulty: p.difficulty, status: p.status, start_date: p.start_date || '', description: p.description || '', template_id: p.template_id });
      const s = toState(p.days); setWeek(s.week); setExtras(s.extras);
    }).catch(setError).finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    if (id || !meta.client_id || meta.goal) return;
    const c = clients.find((x) => x.id === meta.client_id);
    if (c) setMeta((m) => ({ ...m, goal: c.fitness_goal }));
  }, [clients, meta.client_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDay = (dow, patch) => setWeek((w) => w.map((d) => (d.dow === dow ? { ...d, ...patch } : d)));
  const addExercise = (dow, ex) => setWeek((w) => w.map((d) => (d.dow === dow ? { ...d, enabled: true, exercises: [...d.exercises, exerciseFromMaster(ex)] } : d)));
  const loadTemplate = async (tplId) => {
    setSheet(false);
    const hasWork = week.some((d) => d.exercises.length);
    if (hasWork && !(await confirm({ title: 'Replace current days?', message: 'The template replaces the exercises you added.', confirmText: 'Use template' }))) return;
    try {
      const t = await workoutService.templates.get(tplId);
      const s = toState(t.days.map(({ id: _i, ...d }) => ({ ...d, exercises: d.exercises.map(({ id: _x, ...e }) => e) }))); // eslint-disable-line no-unused-vars
      setWeek(s.week); setExtras(s.extras);
      setMeta((m) => ({ ...m, name: m.name || t.name, goal: t.goal, difficulty: t.difficulty, description: m.description || t.description || '', template_id: t.id }));
      notify(`Loaded "${t.name}"`, 'info');
    } catch (e) { notifyError(e); }
  };
  const copyDay = (from, toDow) => {
    const src = week.find((d) => d.dow === from);
    updateDay(toDow, { enabled: true, focus: src.focus, exercises: src.exercises.map((e) => ({ ...e, id: undefined, _key: key() })) });
    notify(`Copied to ${WEEKDAYS.find((w) => w.value === toDow).label}`, 'info');
  };

  const enabledDays = week.filter((d) => d.enabled);
  const totalEx = [...enabledDays, ...extras].reduce((a, d) => a + d.exercises.length, 0);

  const save = async () => {
    setError(null);
    if (!meta.client_id) return setError({ message: 'Select a client' });
    if (!meta.name.trim()) return setError({ message: 'Plan name is required' });
    const days = [...enabledDays, ...extras];
    if (!days.length) return setError({ message: 'Select at least one workout day' });
    const empty = days.find((d) => !d.exercises.length);
    if (empty) return setError({ message: `${empty.name} has no exercises — add some or untick the day` });
    const payload = {
      ...meta, goal: meta.goal || null, start_date: meta.start_date || null, description: meta.description || null,
      days: days.map((d) => ({
        ...(d.id ? { id: d.id } : {}), name: d.name, day_of_week: d.dow, focus: n(d.focus),
        exercises: d.exercises.map((e) => ({ ...(e.id ? { id: e.id } : {}), exercise_id: e.exercise_id, sets: n(e.sets), reps: n(e.reps), duration_sec: n(e.duration_sec), weight_kg: n(e.weight_kg), rest_sec: n(e.rest_sec), tempo: n(e.tempo), notes: n(e.notes) })),
      })),
    };
    setSaving(true);
    try {
      const saved = id ? await workoutService.update(id, payload) : await workoutService.create(payload);
      notify(id ? 'Workout plan saved' : 'Workout plan assigned — client notified');
      if (!id) navigate(`/trainer/workouts/${saved.id}`, { replace: true });
      else { const s = toState(saved.days); setWeek(s.week); setExtras(s.extras); }
    } catch (e) { setError(e); } finally { setSaving(false); }
  };

  const clientOptions = useMemo(() => clients.map((c) => ({ id: c.id, label: c.full_name })), [clients]);
  if (loading) return <LoadingScreen />;

  return (
    <div className="mobile-workout-editor">
      <MobilePageHeader title={id ? 'Edit workout plan' : 'Create workout plan'} back="/trainer/workouts"
        action={id && <IconButton onClick={(e) => setMore(e.currentTarget)} aria-label="More"><MoreVertIcon /></IconButton>} />
      <Menu anchorEl={more} open={!!more} onClose={() => setMore(null)}>
        <MenuItem onClick={async () => { setMore(null); try { await workoutService.saveAsTemplate(id, `${meta.name} (template)`); notify('Saved as template'); } catch (e) { notifyError(e); } }}><ListItemIcon><BookmarkAddOutlinedIcon fontSize="small" /></ListItemIcon>Save as template</MenuItem>
        <MenuItem onClick={async () => { setMore(null); try { const d = await workoutService.duplicate(id); notify('Duplicated as draft'); navigate(`/trainer/workouts/${d.id}`); } catch (e) { notifyError(e); } }}><ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon>Duplicate</MenuItem>
        <MenuItem className="menu-item--error" onClick={async () => { setMore(null); if (await confirm({ title: 'Delete this plan?', confirmText: 'Delete', danger: true })) { await workoutService.remove(id); notify('Deleted'); navigate('/trainer/workouts'); } }}><ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>Delete</MenuItem>
      </Menu>

      {error && <Alert severity="error" className="mobile-workout-editor__alert" onClose={() => setError(null)}>{error.message}</Alert>}

      <section className="card card--padded-sm">
        <div className="stack">
          <Autocomplete options={clientOptions} value={clientOptions.find((o) => o.id === meta.client_id) || null} onChange={(_, v) => setMeta((m) => ({ ...m, client_id: v?.id ?? null }))}
            isOptionEqualToValue={(a, b) => a.id === b.id} renderInput={(p) => <TextField {...p} label="Client" required />} />
          <TextField label="Plan name" required value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} placeholder="e.g. Fat Loss – Phase 1" />
          <div className="mobile-workout-editor__pair mobile-workout-editor__pair--top">
            <TextField select label="Goal" value={meta.goal ?? ''} onChange={(e) => setMeta((m) => ({ ...m, goal: e.target.value || null }))}>
              <MenuItem value="">—</MenuItem>{GOALS.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
            </TextField>
            <TextField select label="Level" value={meta.difficulty} onChange={(e) => setMeta((m) => ({ ...m, difficulty: e.target.value }))}>
              {DIFFICULTIES.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}
            </TextField>
          </div>
          <div className="mobile-workout-editor__pair">
            <TextField type="date" label="Start date" value={meta.start_date} onChange={(e) => setMeta((m) => ({ ...m, start_date: e.target.value }))} InputLabelProps={{ shrink: true }} />
            <ToggleButtonGroup exclusive size="small" value={meta.status} onChange={(_, v) => v && setMeta((m) => ({ ...m, status: v }))} className="mobile-workout-editor__status">
              <ToggleButton value="active">Active</ToggleButton><ToggleButton value="draft">Draft</ToggleButton>
            </ToggleButtonGroup>
          </div>
          <Button variant="outlined" startIcon={<ViewQuiltOutlinedIcon />} onClick={() => setSheet(true)}>Start from a template</Button>
        </div>
      </section>

      <h2 className="text-overline mobile-workout-editor__heading">Weekly schedule</h2>
      <div className="mobile-workout-editor__days">
        {week.map((d) => (
          <div key={d.dow} className={`card mobile-workout-editor__day${d.enabled ? ' mobile-workout-editor__day--on' : ''}`}>
            <div className="mobile-workout-editor__day-head">
              <Checkbox checked={d.enabled} onChange={(e) => updateDay(d.dow, { enabled: e.target.checked })} inputProps={{ 'aria-label': d.name }} />
              <div className="flex-1" onClick={() => updateDay(d.dow, { enabled: !d.enabled })}>
                <p className="mobile-workout-editor__day-name">{WEEKDAYS.find((w) => w.value === d.dow).label}</p>
                {d.enabled && d.exercises.length > 0 && <span className="mobile-workout-editor__day-meta">{d.exercises.length} exercises · ~{estimateMinutes(d.exercises)} min</span>}
                {!d.enabled && <span className="mobile-workout-editor__day-meta mobile-workout-editor__day-meta--rest">Rest day</span>}
              </div>
              {d.enabled && d.exercises.length > 0 && <IconButton onClick={(e) => setCopyMenu({ anchor: e.currentTarget, from: d.dow })} aria-label="Copy day"><ContentCopyOutlinedIcon fontSize="small" /></IconButton>}
            </div>
            <Collapse in={d.enabled} unmountOnExit>
              <div className="mobile-workout-editor__day-body">
                <TextField size="small" placeholder="Focus (e.g. Upper body, Cardio)" value={d.focus} onChange={(e) => updateDay(d.dow, { focus: e.target.value })} className="mobile-workout-editor__focus" />
                {d.exercises.map((e, i) => (
                  <ExerciseItem key={e._key} e={e} index={i} count={d.exercises.length}
                    onChange={(v) => updateDay(d.dow, { exercises: d.exercises.map((x, j) => (j === i ? v : x)) })}
                    onRemove={() => updateDay(d.dow, { exercises: d.exercises.filter((_, j) => j !== i) })}
                    onMove={(to) => updateDay(d.dow, { exercises: move(d.exercises, i, to) })} />
                ))}
                <InlineSearch placeholder="Search exercises…" onSelect={(ex) => addExercise(d.dow, ex)}
                  fetcher={(q) => exerciseService.list({ search: q, status: 'active', pageSize: 25, sortBy: 'name', sortDir: 'asc' }).then((r) => r.data)}
                  getSubtitle={(o) => [o.primary_muscle, o.equipment].filter(Boolean).join(' · ')} renderAdornment={(o) => <ExerciseThumb category={o.category} image={o.image_url} size={32} />} />
                <Button fullWidth size="small" startIcon={<AddRoundedIcon />} onClick={() => setCustom(d.dow)} className="mobile-workout-editor__custom">Add custom exercise</Button>
              </div>
            </Collapse>
          </div>
        ))}
        {extras.map((d, di) => (
          <div key={d._key} className="card mobile-workout-editor__extra">
            <div className="row row--between">
              <div><p className="mobile-workout-editor__extra-name">{d.name}</p><span className="mobile-workout-editor__day-meta">Flexible day · {d.exercises.length} exercises</span></div>
              <IconButton color="error" onClick={() => setExtras((x) => x.filter((_, j) => j !== di))} aria-label="Remove day"><DeleteOutlineIcon /></IconButton>
            </div>
          </div>
        ))}
      </div>

      <TextField label="Notes for the client" multiline minRows={2} value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} className="mobile-workout-editor__notes" />

      <div className="app-actionbar mobile-workout-editor__bar">
        <div className="flex-1">
          <p className="mobile-workout-editor__summary-text">{enabledDays.length + extras.length} days · {totalEx} exercises</p>
          <div className="mobile-workout-editor__week">
            {WEEKDAYS.map((w) => <Chip key={w.value} size="small" label={w.short[0]} className="mobile-workout-editor__week-chip" color={week.find((d) => d.dow === w.value).enabled ? 'primary' : 'default'} />)}
          </div>
        </div>
        <LoadingButton variant="contained" size="large" loading={saving} onClick={save}>{id ? 'Save' : 'Save & assign'}</LoadingButton>
      </div>

      <Menu anchorEl={copyMenu?.anchor} open={!!copyMenu} onClose={() => setCopyMenu(null)}>
        <MenuItem disabled><span className="text-caption">Copy exercises to…</span></MenuItem>
        {copyMenu && WEEKDAYS.filter((w) => w.value !== copyMenu.from).map((w) => (
          <MenuItem key={w.value} onClick={() => { copyDay(copyMenu.from, w.value); setCopyMenu(null); }}>{w.label}{week.find((d) => d.dow === w.value).enabled ? ' (replace)' : ''}</MenuItem>
        ))}
      </Menu>
      <TemplateSheet open={sheet} kind="workout" onClose={() => setSheet(false)} onPick={loadTemplate} />
      <ExerciseFormDialog open={custom !== null} exercise={null} onClose={() => setCustom(null)} onSaved={(ex) => { addExercise(custom, ex); setCustom(null); }} />
    </div>
  );
}
