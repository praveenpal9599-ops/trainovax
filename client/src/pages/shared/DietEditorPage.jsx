import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, Button, ListItemIcon, Menu, MenuItem, Step, StepButton, Stepper, TextField } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingButton from '../../components/common/LoadingButton';
import { FormAutocomplete, FormSelect, FormTextField } from '../../components/form/FormFields';
import { optionalNumber } from '../../components/form/zod';
import DietBuilder from '../../features/diet/DietBuilder';
import NutritionSummary from '../../features/diet/NutritionSummary';
import VegDot from '../../features/diet/VegDot';
import { sumItems, sumMeals, toBuilderMeals, toPayloadMeals, itemNutrition } from '../../features/diet/dietUtils';
import { clientService, dietService } from '../../services';
import { useAuth } from '../../features/auth/AuthContext';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { DIET_TYPES, GOALS, PLAN_STATUSES, labelOf } from '../../utils/constants';
import { formatTime, num, todayISO } from '../../utils/format';
import './PlanEditor.css';

const STEPS = ['Plan details', 'Build meals', 'Review & assign'];

/** Create / edit a diet plan (for a client) or a reusable diet template. Styles: PlanEditor.css */
export default function DietEditorPage({ mode }) {
  const isTemplate = mode === 'template';
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { basePath, user } = useAuth();
  const { notify, notifyError, confirm } = useFeedback();
  const svc = isTemplate ? dietService.templates : dietService;
  const listPath = isTemplate ? `${basePath}/diet-templates` : user.role === 'admin' ? `${basePath}/diets` : `${basePath}/clients`;

  const [step, setStep] = useState(id ? 1 : 0);
  const [meals, setMeals] = useState([]);
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
    diet_type: z.string(),
    target_calories: optionalNumber(0, 10000, 'Target calories'),
    water_target_ml: optionalNumber(0, 10000, 'Water target'),
    description: z.string().max(5000).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    status: z.string(),
  }), [isTemplate]);

  const { control, handleSubmit, reset, trigger, getValues, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', client_id: params.get('clientId') ? Number(params.get('clientId')) : null, goal: null, diet_type: 'mixed', target_calories: null, water_target_ml: 3000, description: '', start_date: todayISO(), end_date: '', status: 'active' },
  });
  const [target, clientId] = useWatch({ control, name: ['target_calories', 'client_id'] });
  const totals = useMemo(() => sumMeals(meals), [meals]);

  useEffect(() => {
    if (!isTemplate) clientService.list({ all: 'true', status: 'active', sortBy: 'name', sortDir: 'asc' }).then((r) => setClients(r.data)).catch(() => {});
    if (!id) dietService.templates.list({ all: 'true' }).then((r) => setTemplates(r.data)).catch(() => {});
  }, [isTemplate, id]);

  useEffect(() => {
    if (!id) return;
    svc.get(id).then((p) => {
      setRecord(p);
      reset({ name: p.name, client_id: p.client_id ?? null, goal: p.goal, diet_type: p.diet_type, target_calories: p.target_calories, water_target_ml: p.water_target_ml ?? 3000, description: p.description || '', start_date: p.start_date || '', end_date: p.end_date || '', status: p.status });
      setMeals(toBuilderMeals(p.meals));
    }).catch(setError).finally(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (id || isTemplate || !clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (c && !getValues('goal')) setValue('goal', c.fitness_goal);
  }, [clientId, clients]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTemplate = async (tplId) => {
    if (!tplId) return;
    if (meals.length && !(await confirm({ title: 'Replace current meals?', message: 'Loading a template replaces the meals you have built so far.', confirmText: 'Load template' }))) return;
    try {
      const t = await dietService.templates.get(tplId);
      setMeals(toBuilderMeals(t.meals));
      if (!getValues('name')) setValue('name', t.name);
      setValue('goal', t.goal); setValue('diet_type', t.diet_type); setValue('target_calories', t.target_calories);
      if (!getValues('description')) setValue('description', t.description || '');
      notify(`Loaded "${t.name}" — adjust portions below`, 'info');
      setStep(1);
    } catch (e) { notifyError(e); }
  };

  const validateMeals = () => {
    if (!meals.length) return 'Add at least one meal.';
    if (meals.some((m) => !m.name.trim())) return 'Every meal needs a name.';
    if (meals.some((m) => m.foods.length === 0)) return 'Every meal needs at least one food (or delete the empty meal).';
    if (meals.some((m) => m.foods.some((f) => !(Number(f.quantity) > 0)))) return 'Food quantities must be greater than 0.';
    return null;
  };

  const save = handleSubmit(async (v) => {
    const mErr = validateMeals();
    if (mErr) { setError({ message: mErr }); setStep(1); return; }
    setSaving(true); setError(null);
    const payload = {
      name: v.name, goal: v.goal || null, diet_type: v.diet_type, target_calories: v.target_calories ? Math.round(v.target_calories) : null, description: v.description || null, meals: toPayloadMeals(meals),
      ...(isTemplate ? { status: v.status === 'inactive' ? 'inactive' : 'active' } : { status: v.status, client_id: v.client_id, water_target_ml: v.water_target_ml, start_date: v.start_date || null, end_date: v.end_date || null, template_id: record?.template_id ?? null }),
    };
    try {
      const saved = id ? await svc.update(id, payload) : await svc.create(payload);
      notify(id ? 'Diet plan saved' : isTemplate ? 'Template created' : 'Diet plan assigned — the client has been notified');
      if (!id) navigate(`${basePath}/${isTemplate ? 'diet-templates' : 'diets'}/${saved.id}`, { replace: true });
      else { setRecord(saved); setMeals(toBuilderMeals(saved.meals)); }
    } catch (e) { setError(e); } finally { setSaving(false); }
  }, () => setStep(0));

  const next = async () => {
    if (step === 0 && !(await trigger())) return;
    if (step === 1) { const e = validateMeals(); if (e) { setError({ message: e }); return; } setError(null); }
    setStep((s) => s + 1);
  };
  const saveAsTemplate = async () => { setMenu(null); try { const t = await dietService.saveAsTemplate(id, `${getValues('name')} (template)`); notify('Saved as template'); navigate(`${basePath}/diet-templates/${t.id}`); } catch (e) { notifyError(e); } };
  const duplicate = async () => { setMenu(null); try { const d = await svc.duplicate(id); notify('Duplicated'); navigate(`${basePath}/${isTemplate ? 'diet-templates' : 'diets'}/${d.id}`); } catch (e) { notifyError(e); } };
  const remove = async () => {
    setMenu(null);
    if (!(await confirm({ title: 'Delete this diet plan?', message: 'This cannot be undone.', confirmText: 'Delete', danger: true }))) return;
    try { await svc.remove(id); notify('Deleted'); navigate(listPath); } catch (e) { notifyError(e); }
  };

  if (loading) return <LoadingScreen />;
  if (error?.status === 404 || error?.status === 403) return <Alert severity="error">{error.message}</Alert>;
  const readOnly = isTemplate && record && record.can_edit === false;
  const values = getValues();
  const client = clients.find((c) => c.id === values.client_id) || (record?.client ? { full_name: record.client.full_name } : null);

  return (
    <>
      <PageHeader title={id ? values.name || 'Diet plan' : isTemplate ? 'New diet template' : 'Create diet plan'}
        subtitle={isTemplate ? 'Reusable meal plan that can be assigned to any client.' : client ? `For ${client.full_name}` : 'Build a meal schedule — nutrition totals are calculated automatically.'}
        breadcrumbs={[{ label: isTemplate ? 'Diet Templates' : 'Diet Plans', to: listPath }, { label: id ? 'Edit' : 'New' }]}
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
              {!isTemplate && <div className="plan-editor__col"><FormAutocomplete control={control} name="client_id" label="Client" required options={clients.map((c) => ({ value: c.id, label: c.full_name }))} helperText="The client is notified when the plan is assigned" /></div>}
              <div className="plan-editor__col plan-editor__col--sm-8"><FormTextField control={control} name="name" label="Plan name" required placeholder="e.g. Weight Loss Plan – 1600 kcal" /></div>
              <div className="plan-editor__col plan-editor__col--sm-4"><FormSelect control={control} name="diet_type" label="Diet type" options={DIET_TYPES} required /></div>
              <div className="plan-editor__col plan-editor__col--sm-4"><FormSelect control={control} name="goal" label="Goal" options={GOALS} emptyLabel="Not specified" /></div>
              <div className="plan-editor__col plan-editor__col--xs-6 plan-editor__col--sm-4"><FormTextField control={control} name="target_calories" label="Target calories" type="number" unit="kcal" placeholder="1800" /></div>
              {isTemplate ? <div className="plan-editor__col plan-editor__col--xs-6 plan-editor__col--sm-4"><FormSelect control={control} name="status" label="Status" options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} /></div>
                : <div className="plan-editor__col plan-editor__col--xs-6 plan-editor__col--sm-4"><FormTextField control={control} name="water_target_ml" label="Water target" type="number" unit="ml" /></div>}
              {!isTemplate && (
                <>
                  <div className="plan-editor__col plan-editor__col--sm-4"><FormSelect control={control} name="status" label="Status" options={PLAN_STATUSES} /></div>
                  <div className="plan-editor__col plan-editor__col--xs-6 plan-editor__col--sm-4"><FormTextField control={control} name="start_date" label="Start date" type="date" InputLabelProps={{ shrink: true }} /></div>
                  <div className="plan-editor__col plan-editor__col--xs-6 plan-editor__col--sm-4"><FormTextField control={control} name="end_date" label="End date" type="date" InputLabelProps={{ shrink: true }} /></div>
                </>
              )}
              <div className="plan-editor__col"><FormTextField control={control} name="description" label="Guidelines for the client" multiline minRows={3} placeholder="e.g. Drink 3 L water, avoid sugary drinks, cook with minimal oil." /></div>
            </div>
          </SectionCard>
          {!id && (
            <SectionCard title="Start from a template" subtitle="Load a ready-made meal plan and adjust portions.">
              <TextField select label="Template" defaultValue="" onChange={(e) => applyTemplate(e.target.value)} className="plan-editor__template-select">
                <MenuItem value="">Start from scratch</MenuItem>
                {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name} · {t.total_calories} kcal</MenuItem>)}
              </TextField>
              <div className="plan-editor__templates">
                {templates.slice(0, 5).map((t) => (
                  <button key={t.id} type="button" className="plan-editor__template" onClick={() => applyTemplate(t.id)}>
                    <span className="plan-editor__template-name">{t.name}</span>
                    <span className="plan-editor__template-meta">{labelOf(DIET_TYPES, t.diet_type)} · {t.meals_count} meals · {t.total_calories} kcal · {t.total_protein} g protein</span>
                  </button>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <div hidden={step !== 1}>
        <div className="plan-editor__sticky-summary"><NutritionSummary totals={totals} target={target ? Number(target) : null} /></div>
        <DietBuilder meals={meals} onChange={readOnly ? () => {} : setMeals} />
      </div>

      <div hidden={step !== 2}>
        <NutritionSummary totals={totals} target={target ? Number(target) : null} />
        <div className="split split--side-main plan-editor__review">
          <SectionCard title="Summary">
            <dl className="plan-editor__summary">
              {[['Plan', values.name], !isTemplate && ['Client', client?.full_name], ['Diet type', labelOf(DIET_TYPES, values.diet_type)], ['Goal', labelOf(GOALS, values.goal)], ['Meals', meals.length], ['Total calories', `${num(totals.calories, 0)} kcal`], ['Protein', `${num(totals.protein_g, 0)} g`], !isTemplate && ['Water', `${values.water_target_ml || 0} ml`]].filter(Boolean).map(([k, v]) => (
                <div key={k} className="plan-editor__summary-row"><dt>{k}</dt><dd>{v || '—'}</dd></div>
              ))}
            </dl>
            {!readOnly && <LoadingButton fullWidth variant="contained" className="plan-editor__summary-save" loading={saving} onClick={save} startIcon={<SaveOutlinedIcon />}>{id ? 'Save changes' : isTemplate ? 'Save template' : 'Assign to client'}</LoadingButton>}
          </SectionCard>
          <div className="stack">
            {meals.map((m) => {
              const t = sumItems(m.foods);
              return (
                <SectionCard key={m._key} title={m.name} subtitle={`${m.meal_time ? formatTime(m.meal_time) : 'Anytime'} · ${num(t.calories, 0)} kcal · P ${num(t.protein_g)}g · C ${num(t.carbs_g)}g · F ${num(t.fat_g)}g`}>
                  <ul className="plan-editor__review-list">
                    {m.foods.map((f) => (
                      <li key={f._key} className="plan-editor__review-row plan-editor__review-row--compact">
                        <VegDot veg={!!f.is_vegetarian} vegan={!!f.is_vegan} />
                        <span className="plan-editor__review-food">{f.food_name} <span className="plan-editor__review-qty">· {num(f.quantity * f.serving_size, 0)} {f.serving_unit}</span></span>
                        <span className="plan-editor__review-kcal">{num(itemNutrition(f).calories, 0)} kcal</span>
                      </li>
                    ))}
                  </ul>
                </SectionCard>
              );
            })}
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
