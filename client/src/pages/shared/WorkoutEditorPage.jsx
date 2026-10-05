import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Alert, Button, Chip, ListItemIcon, Menu, MenuItem, Step, StepButton, Stepper, TextField,
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import FitnessCenterOutlinedIcon from '@mui/icons-material/FitnessCenterOutlined';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingButton from '../../components/common/LoadingButton';
import { FormAutocomplete, FormSelect, FormTextField } from '../../components/form/FormFields';
import WorkoutBuilder from '../../features/workout/WorkoutBuilder';
import { estimateMinutes, toBuilderDays, toPayloadDays } from '../../features/workout/workoutUtils';
import ExerciseThumb from '../../features/masters/ExerciseThumb';
import { clientService, workoutService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { DIFFICULTIES, GOALS, PLAN_STATUSES, WEEKDAYS, labelOf } from '../../utils/constants';
import { duration, todayISO } from '../../utils/format';
import './PlanEditor.css';

const STEPS = ['Plan details', 'Build workout', 'Review & assign'];

/** Create / edit a workout plan (assigned to a client) or a reusable workout template. Styles: PlanEditor.css */
export default function WorkoutEditorPage({ mode }) {
  const isTemplate = mode === 'template';
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { basePath, user } = useAuth();
  const { notify, notifyError, confirm } = useFeedback();
  const svc = isTemplate ? workoutService.templates : workoutService;
  const listPath = isTemplate ? `${basePath}/workout-templates` : user.role === 'admin' ? `${basePath}/workouts` : `${basePath}/clients`;

  const [step, setStep] = useState(id ? 1 : 0);
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [record, setRecord] = useState(null);
  const [menu, setMenu] = useState(null);

  const schema = useMemo(() => z.object({
    name: z.string().trim().min(1, 'Plan name is required').max(150),
    client_id: isTemplate ? z.any().optional() : z.number({ required_error: 'Select a client', invalid_type_error: 'Select a client' }),
    goal: z.string().nullable().optional(),
    difficulty: z.string(),
    description: z.string().max(5000).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    status: z.string(),
    duration_weeks: z.any().optional(),
  }).refine((d) => !d.start_date || !d.end_date || d.end_date >= d.start_date, { message: 'End date must be after start date', path: ['end_date'] }), [isTemplate]);

  const { control, handleSubmit, reset, trigger, getValues, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', client_id: params.get('clientId') ? Number(params.get('clientId')) : null, goal: null, difficulty: 'beginner', description: '', start_date: todayISO(), end_date: '', status: 'active', duration_weeks: 8 },
  });
  const clientId = useWatch({ control, name: 'client_id' });

  useEffect(() => {
    if (!isTemplate) clientService.list({ all: 'true', status: 'active', sortBy: 'name', sortDir: 'asc' }).then((r) => setClients(r.data)).catch(() => {});
    if (!id) workoutService.templates.list({ all: 'true' }).then((r) => setTemplates(r.data)).catch(() => {});
  }, [isTemplate, id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    svc.get(id).then((p) => {
      setRecord(p);
      reset({ name: p.name, client_id: p.client_id ?? null, goal: p.goal, difficulty: p.difficulty, description: p.description || '', start_date: p.start_date || '', end_date: p.end_date || '', status: p.status, duration_weeks: p.duration_weeks ?? '' });
      setDays(toBuilderDays(p.days));
    }).catch((e) => setError(e)).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill goal from the selected client
  useEffect(() => {
    if (id || isTemplate || !clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (c && !getValues('goal')) setValue('goal', c.fitness_goal);
  }, [clientId, clients]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTemplate = async (tplId) => {
    if (!tplId) return;
    if (days.length && !(await confirm({ title: 'Replace current days?', message: 'Loading a template replaces the days you have built so far.', confirmText: 'Load template' }))) return;
    try {
      const t = await workoutService.templates.get(tplId);
      setDays(toBuilderDays(t.days));
      if (!getValues('name')) setValue('name', t.name);
      setValue('goal', t.goal); setValue('difficulty', t.difficulty);
      if (!getValues('description')) setValue('description', t.description || '');
      notify(`Loaded "${t.name}" — customise it below`, 'info');
      setStep(1);
    } catch (e) { notifyError(e); }
  };

  const validateDays = () => {
    if (!days.length) return 'Add at least one workout day.';
    if (days.some((d) => !d.name.trim())) return 'Every day needs a name.';
    if (days.some((d) => d.exercises.length === 0)) return 'Every day needs at least one exercise (or delete the empty day).';
    return null;
  };

  const save = handleSubmit(async (v) => {
    const dayErr = validateDays();
    if (dayErr) { setError({ message: dayErr }); setStep(1); return; }
    setSaving(true); setError(null);
    const payload = {
      name: v.name, goal: v.goal || null, difficulty: v.difficulty, description: v.description || null, status: v.status, days: toPayloadDays(days),
      ...(isTemplate ? { duration_weeks: v.duration_weeks ? Number(v.duration_weeks) : null, status: v.status === 'inactive' ? 'inactive' : 'active' }
        : { client_id: v.client_id, start_date: v.start_date || null, end_date: v.end_date || null, template_id: record?.template_id ?? null }),
    };
    try {
      const saved = id ? await svc.update(id, payload) : await svc.create(payload);
      notify(id ? 'Workout saved' : isTemplate ? 'Template created' : 'Workout plan assigned — the client has been notified');
      if (!id) navigate(`${basePath}/${isTemplate ? 'workout-templates' : 'workouts'}/${saved.id}`, { replace: true });
      else { setRecord(saved); setDays(toBuilderDays(saved.days)); }
    } catch (e) { setError(e); } finally { setSaving(false); }
  }, () => setStep(0));

  const next = async () => {
    if (step === 0 && !(await trigger())) return;
    if (step === 1) { const e = validateDays(); if (e) { setError({ message: e }); return; } setError(null); }
    setStep((s) => s + 1);
  };

  const saveAsTemplate = async () => {
    setMenu(null);
    try { const t = await workoutService.saveAsTemplate(id, `${getValues('name')} (template)`); notify('Saved as template'); navigate(`${basePath}/workout-templates/${t.id}`); } catch (e) { notifyError(e); }
  };
  const duplicate = async () => {
    setMenu(null);
    try { const d = await svc.duplicate(id); notify('Duplicated'); navigate(`${basePath}/${isTemplate ? 'workout-templates' : 'workouts'}/${d.id}`); } catch (e) { notifyError(e); }
  };
  const remove = async () => {
    setMenu(null);
    if (!(await confirm({ title: 'Delete this workout?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    try { await svc.remove(id); notify('Deleted'); navigate(listPath); } catch (e) { notifyError(e); }
  };

  if (loading) return <LoadingScreen />;
  if (error?.status === 404 || error?.status === 403) return <Alert severity="error">{error.message}</Alert>;
  const readOnly = isTemplate && record && record.can_edit === false;
  const totalExercises = days.reduce((a, d) => a + d.exercises.length, 0);
  const values = getValues();
  const client = clients.find((c) => c.id === values.client_id) || (record?.client ? { full_name: record.client.full_name } : null);

  return (
    <>
      <PageHeader
        title={id ? values.name || 'Workout' : isTemplate ? 'New workout template' : 'Create workout plan'}
        subtitle={isTemplate ? 'Reusable programme that can be assigned to any client.' : client ? `For ${client.full_name}` : 'Build a structured plan: days → exercises.'}
        breadcrumbs={[{ label: isTemplate ? 'Workout Templates' : 'Workout Plans', to: listPath }, { label: id ? 'Edit' : 'New' }]}
        actions={(
          <>
            {id && <Button variant="outlined" color="inherit" startIcon={<MoreHorizIcon />} onClick={(e) => setMenu(e.currentTarget)} className="plan-editor__more">More</Button>}
            {!readOnly && <LoadingButton variant="contained" startIcon={<SaveOutlinedIcon />} loading={saving} onClick={save}>{id ? 'Save changes' : isTemplate ? 'Save template' : 'Save & assign'}</LoadingButton>}
          </>
        )} />
      <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
        {!isTemplate && <MenuItem onClick={saveAsTemplate}><ListItemIcon><BookmarkAddOutlinedIcon fontSize="small" /></ListItemIcon>Save as template</MenuItem>}
        <MenuItem onClick={duplicate}><ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon>Duplicate</MenuItem>
        {!readOnly && <MenuItem onClick={remove} className="menu-item--error"><ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>Delete</MenuItem>}
      </Menu>

      {readOnly && <Alert severity="info" className="plan-editor__alert">This is a global template managed by the platform. Duplicate it to customise your own copy.</Alert>}
      {error && error.status !== 404 && <Alert severity="error" className="plan-editor__alert" onClose={() => setError(null)}>{error.message}</Alert>}

      <div className="card plan-editor__stepper">
        <Stepper nonLinear={!!id} activeStep={step} alternativeLabel>
          {STEPS.map((s, i) => <Step key={s} completed={step > i}><StepButton onClick={() => (id || i < step ? setStep(i) : null)}>{s}</StepButton></Step>)}
        </Stepper>
      </div>

      <div hidden={step !== 0}>
        <div className="split split--main-side">
          <SectionCard title="Plan details">
            <div className="plan-editor__form">
              {!isTemplate && (
                <div className="plan-editor__col">
                  <FormAutocomplete control={control} name="client_id" label="Client" required options={clients.map((c) => ({ value: c.id, label: c.full_name, goal: c.fitness_goal }))}
                    helperText="The client is notified when the plan is assigned" disabled={!!id && user.role !== 'super_admin' && false} />
                </div>
              )}
              <div className="plan-editor__col plan-editor__col--sm-8"><FormTextField control={control} name="name" label="Plan name" required placeholder="e.g. Weight Loss Program – Phase 1" /></div>
              <div className="plan-editor__col plan-editor__col--sm-4"><FormSelect control={control} name="difficulty" label="Difficulty" options={DIFFICULTIES} required /></div>
              <div className={`plan-editor__col ${isTemplate ? 'plan-editor__col--sm-4' : 'plan-editor__col--sm-6'}`}><FormSelect control={control} name="goal" label="Goal" options={GOALS} emptyLabel="Not specified" /></div>
              {isTemplate ? (
                <>
                  <div className="plan-editor__col plan-editor__col--xs-6 plan-editor__col--sm-4"><FormTextField control={control} name="duration_weeks" label="Duration" type="number" unit="weeks" /></div>
                  <div className="plan-editor__col plan-editor__col--xs-6 plan-editor__col--sm-4"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
                </>
              ) : (
                <>
                  <div className="plan-editor__col plan-editor__col--sm-6"><FormSelect control={control} name="status" label="Status" options={PLAN_STATUSES} helperText="Activating replaces the client's current active plan" /></div>
                  <div className="plan-editor__col plan-editor__col--xs-6"><FormTextField control={control} name="start_date" label="Start date" type="date" InputLabelProps={{ shrink: true }} /></div>
                  <div className="plan-editor__col plan-editor__col--xs-6"><FormTextField control={control} name="end_date" label="End date" type="date" InputLabelProps={{ shrink: true }} /></div>
                </>
              )}
              <div className="plan-editor__col"><FormTextField control={control} name="description" label="Description / coaching notes" multiline minRows={3} placeholder="What should the client know about this programme?" /></div>
            </div>
          </SectionCard>
          {!id && (
            <SectionCard title="Start from a template" subtitle="Save time — load a proven programme and customise it.">
              <TextField select label="Template" defaultValue="" onChange={(e) => applyTemplate(e.target.value)} className="plan-editor__template-select">
                <MenuItem value="">Start from scratch</MenuItem>
                {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} · {t.days_count} days</MenuItem>)}
              </TextField>
              <div className="plan-editor__templates">
                {templates.slice(0, 4).map((t) => (
                  <button key={t.id} type="button" className="plan-editor__template" onClick={() => applyTemplate(t.id)}>
                    <span className="plan-editor__template-name">{t.name}</span>
                    <span className="plan-editor__template-meta">{labelOf(GOALS, t.goal)} · {t.days_count} days · {t.exercises_count} exercises</span>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <div hidden={step !== 1}>
        <div className="row row--wrap plan-editor__chips">
          <Chip label={`${days.length} day${days.length === 1 ? '' : 's'}`} />
          <Chip label={`${totalExercises} exercises`} />
          <Chip icon={<TimerOutlinedIcon />} label={`~${Math.round(days.reduce((a, d) => a + estimateMinutes(d.exercises), 0) / Math.max(days.length, 1))} min / session`} />
        </div>
        <WorkoutBuilder days={days} onChange={readOnly ? () => {} : setDays} />
      </div>

      <div hidden={step !== 2}>
        <div className="split split--side-main">
          <SectionCard title="Summary">
            <dl className="plan-editor__summary">
              {[['Plan', values.name], !isTemplate && ['Client', client?.full_name], ['Goal', labelOf(GOALS, values.goal)], ['Difficulty', labelOf(DIFFICULTIES, values.difficulty)],
                !isTemplate && ['Starts', values.start_date || '—'], ['Status', values.status], ['Days / week', days.length], ['Exercises', totalExercises]].filter(Boolean).map(([k, v]) => (
                <div key={k} className="plan-editor__summary-row"><dt>{k}</dt><dd className={k === 'Status' ? 'text-capitalize' : undefined}>{v || '—'}</dd></div>
              ))}
            </dl>
            {!readOnly && <LoadingButton fullWidth variant="contained" className="plan-editor__summary-save" loading={saving} onClick={save} startIcon={<SaveOutlinedIcon />}>{id ? 'Save changes' : isTemplate ? 'Save template' : 'Assign to client'}</LoadingButton>}
          </SectionCard>
          <div className="stack">
            {days.map((d) => (
              <SectionCard key={d._key} title={`${d.name}${d.focus ? ` · ${d.focus}` : ''}`} subtitle={`${WEEKDAYS.find((w) => w.value === d.day_of_week)?.label || 'Flexible day'} · ${d.exercises.length} exercises · ~${estimateMinutes(d.exercises)} min`}>
                <ul className="plan-editor__review-list">
                  {d.exercises.map((e) => (
                    <li key={e._key} className="plan-editor__review-row">
                      <ExerciseThumb category={e.category} image={e.image_url} size={32} />
                      <span className="plan-editor__review-name">{e.exercise_name}</span>
                      <span className="plan-editor__review-detail">
                        {[e.sets && `${e.sets} sets`, e.reps && `${e.reps} reps`, e.duration_sec && duration(Number(e.duration_sec)), e.weight_kg && `${e.weight_kg} kg`, e.rest_sec && `rest ${e.rest_sec}s`].filter(Boolean).join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ))}
            {!days.length && <div className="card plan-editor__empty"><FitnessCenterOutlinedIcon color="disabled" /><p className="text-muted">No days added yet.</p></div>}
          </div>
        </div>
      </div>

      <div className="row row--between plan-editor__nav">
        <Button color="inherit" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
        {step < 2 && <Button variant="contained" onClick={next}>Continue</Button>}
      </div>
    </>
  );
}
