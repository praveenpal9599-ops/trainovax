import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Autocomplete, Button, IconButton, InputAdornment, LinearProgress, ListItemIcon, Menu, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewQuiltOutlinedIcon from '@mui/icons-material/ViewQuiltOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import MobilePageHeader from '../../features/mobile/MobilePageHeader';
import InlineSearch from '../../features/mobile/InlineSearch';
import TemplateSheet from '../../features/mobile/TemplateSheet';
import VegDot from '../../features/diet/VegDot';
import FoodFormDialog from '../../features/masters/FoodFormDialog';
import LoadingScreen from '../../components/common/LoadingScreen';
import LoadingButton from '../../components/common/LoadingButton';
import { clientService, dietService, foodService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { foodFromMaster, itemNutrition, key, sumItems, sumMeals, toBuilderMeals } from '../../features/diet/dietUtils';
import { DIET_TYPES, GOALS, MEAL_TYPES } from '../../utils/constants';
import { num, todayISO } from '../../utils/format';
import './MobileDietEditor.css';

const DEFAULT_MEALS = ['breakfast', 'lunch', 'snack', 'dinner'];
const newMeal = (type) => { const t = MEAL_TYPES.find((m) => m.value === type); return { _key: key(), meal_type: t.value, name: t.label, meal_time: t.time, foods: [] }; };

function FoodItem({ f, onChange, onRemove }) {
  const nutr = itemNutrition(f);
  return (
    <div className="mobile-diet-editor__food">
      <div className="mobile-diet-editor__food-head">
        <div className="mobile-diet-editor__food-veg"><VegDot veg={!!f.is_vegetarian} vegan={!!f.is_vegan} /></div>
        <div className="flex-1">
          <p className="mobile-diet-editor__food-name">{f.food_name}</p>
          <div className="mobile-diet-editor__qty-row">
            <TextField size="small" type="number" value={f.quantity ?? ''} onChange={(e) => onChange({ ...f, quantity: e.target.value })} className="mobile-diet-editor__qty"
              inputProps={{ min: 0.25, step: 0.25, 'aria-label': 'Servings', inputMode: 'decimal' }} error={!(Number(f.quantity) > 0)} />
            <span className="mobile-diet-editor__meta">× {num(f.serving_size, 0)} {f.serving_unit} = {num((Number(f.quantity) || 0) * f.serving_size, 0)} {f.serving_unit}</span>
          </div>
        </div>
        <Button size="small" color="error" variant="outlined" onClick={onRemove} className="mobile-diet-editor__remove">Remove</Button>
      </div>
      <div className="mobile-diet-editor__nutrition">
        {[['kcal', nutr.calories, ''], ['protein', nutr.protein_g, 'g'], ['carbs', nutr.carbs_g, 'g'], ['fat', nutr.fat_g, 'g']].map(([l, v, u]) => (
          <div key={l}><p className="mobile-diet-editor__nutrition-value">{num(v, l === 'kcal' ? 0 : 1)}{u}</p><span className="mobile-diet-editor__meta">{l}</span></div>
        ))}
      </div>
    </div>
  );
}

/** Trainer app: create / edit a diet plan — meal sections → foods with live nutrition totals. Styles: MobileDietEditor.css */
export default function MobileDietEditor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify, notifyError, confirm } = useFeedback();
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [clients, setClients] = useState([]);
  const [meta, setMeta] = useState({ client_id: params.get('clientId') ? Number(params.get('clientId')) : null, name: '', goal: null, diet_type: 'mixed', target_calories: '', water_target_ml: 3000, status: 'active', start_date: todayISO(), description: '', template_id: null });
  const [meals, setMeals] = useState(DEFAULT_MEALS.map(newMeal));
  const [sheet, setSheet] = useState(false);
  const [custom, setCustom] = useState(null);
  const [addMenu, setAddMenu] = useState(null);
  const [more, setMore] = useState(null);
  const totals = useMemo(() => sumMeals(meals), [meals]);

  useEffect(() => { clientService.list({ all: 'true', sortBy: 'name', sortDir: 'asc' }).then((r) => setClients(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (!id) return;
    dietService.get(id).then((p) => {
      setMeta({ client_id: p.client_id, name: p.name, goal: p.goal, diet_type: p.diet_type, target_calories: p.target_calories ?? '', water_target_ml: p.water_target_ml ?? 3000, status: p.status, start_date: p.start_date || '', description: p.description || '', template_id: p.template_id });
      setMeals(toBuilderMeals(p.meals));
    }).catch(setError).finally(() => setLoading(false));
  }, [id]);

  const updateMeal = (k, patch) => setMeals((ms) => ms.map((m) => (m._key === k ? { ...m, ...patch } : m)));
  const addFood = (k, f) => setMeals((ms) => ms.map((m) => (m._key === k ? { ...m, foods: [...m.foods, foodFromMaster(f)] } : m)));
  const loadTemplate = async (tplId) => {
    setSheet(false);
    if (meals.some((m) => m.foods.length) && !(await confirm({ title: 'Replace current meals?', confirmText: 'Use template' }))) return;
    try {
      const t = await dietService.templates.get(tplId);
      setMeals(toBuilderMeals(t.meals).map((m) => ({ ...m, id: undefined, foods: m.foods.map((f) => ({ ...f, id: undefined })) })));
      setMeta((m) => ({ ...m, name: m.name || t.name, goal: t.goal, diet_type: t.diet_type, target_calories: t.target_calories ?? '', description: m.description || t.description || '', template_id: t.id }));
      notify(`Loaded "${t.name}"`, 'info');
    } catch (e) { notifyError(e); }
  };

  const save = async () => {
    setError(null);
    if (!meta.client_id) return setError({ message: 'Select a client' });
    if (!meta.name.trim()) return setError({ message: 'Plan name is required' });
    const filled = meals.filter((m) => m.foods.length);
    if (!filled.length) return setError({ message: 'Add at least one food' });
    if (filled.some((m) => m.foods.some((f) => !(Number(f.quantity) > 0)))) return setError({ message: 'Quantities must be greater than 0' });
    const payload = {
      ...meta, goal: meta.goal || null, target_calories: meta.target_calories ? Number(meta.target_calories) : null, water_target_ml: Number(meta.water_target_ml) || null,
      start_date: meta.start_date || null, description: meta.description || null,
      meals: filled.map((m) => ({ ...(m.id ? { id: m.id } : {}), meal_type: m.meal_type, name: m.name, meal_time: m.meal_time || null, foods: m.foods.map((f) => ({ ...(f.id ? { id: f.id } : {}), food_id: f.food_id, quantity: Number(f.quantity), notes: f.notes || null })) })),
    };
    setSaving(true);
    try {
      const saved = id ? await dietService.update(id, payload) : await dietService.create(payload);
      notify(id ? 'Diet plan saved' : 'Diet plan assigned — client notified');
      if (!id) navigate(`/trainer/diets/${saved.id}`, { replace: true }); else setMeals(toBuilderMeals(saved.meals));
    } catch (e) { setError(e); } finally { setSaving(false); }
  };

  const clientOptions = clients.map((c) => ({ id: c.id, label: c.full_name }));
  const target = Number(meta.target_calories) || null;
  if (loading) return <LoadingScreen />;

  return (
    <div className="mobile-diet-editor">
      <MobilePageHeader title={id ? 'Edit diet plan' : 'Create diet plan'} back="/trainer/diets" action={id && <IconButton onClick={(e) => setMore(e.currentTarget)} aria-label="More"><MoreVertIcon /></IconButton>} />
      <Menu anchorEl={more} open={!!more} onClose={() => setMore(null)}>
        <MenuItem onClick={async () => { setMore(null); try { await dietService.saveAsTemplate(id, `${meta.name} (template)`); notify('Saved as template'); } catch (e) { notifyError(e); } }}><ListItemIcon><BookmarkAddOutlinedIcon fontSize="small" /></ListItemIcon>Save as template</MenuItem>
        <MenuItem onClick={async () => { setMore(null); try { const d = await dietService.duplicate(id); notify('Duplicated as draft'); navigate(`/trainer/diets/${d.id}`); } catch (e) { notifyError(e); } }}><ListItemIcon><ContentCopyOutlinedIcon fontSize="small" /></ListItemIcon>Duplicate</MenuItem>
        <MenuItem className="menu-item--error" onClick={async () => { setMore(null); if (await confirm({ title: 'Delete this plan?', confirmText: 'Delete', danger: true })) { await dietService.remove(id); notify('Deleted'); navigate('/trainer/diets'); } }}><ListItemIcon><DeleteOutlineIcon fontSize="small" /></ListItemIcon>Delete</MenuItem>
      </Menu>
      {error && <Alert severity="error" className="mobile-diet-editor__alert" onClose={() => setError(null)}>{error.message}</Alert>}

      <section className="card card--padded-sm">
        <div className="stack">
          <Autocomplete options={clientOptions} value={clientOptions.find((o) => o.id === meta.client_id) || null} onChange={(_, v) => setMeta((m) => ({ ...m, client_id: v?.id ?? null }))}
            isOptionEqualToValue={(a, b) => a.id === b.id} renderInput={(p) => <TextField {...p} label="Client" required />} />
          <TextField label="Plan name" required value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))} placeholder="e.g. Bulk – 2600 kcal" />
          <div className="mobile-diet-editor__pair">
            <TextField select label="Diet type" value={meta.diet_type} onChange={(e) => setMeta((m) => ({ ...m, diet_type: e.target.value }))}>{DIET_TYPES.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}</TextField>
            <TextField select label="Goal" value={meta.goal ?? ''} onChange={(e) => setMeta((m) => ({ ...m, goal: e.target.value || null }))}><MenuItem value="">—</MenuItem>{GOALS.map((g) => <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>)}</TextField>
          </div>
          <div className="mobile-diet-editor__pair">
            <TextField label="Target" type="number" value={meta.target_calories} onChange={(e) => setMeta((m) => ({ ...m, target_calories: e.target.value }))} InputProps={{ endAdornment: <InputAdornment position="end">kcal</InputAdornment> }} />
            <TextField label="Water" type="number" value={meta.water_target_ml} onChange={(e) => setMeta((m) => ({ ...m, water_target_ml: e.target.value }))} InputProps={{ endAdornment: <InputAdornment position="end">ml</InputAdornment> }} />
          </div>
          <ToggleButtonGroup exclusive fullWidth size="small" value={meta.status} onChange={(_, v) => v && setMeta((m) => ({ ...m, status: v }))}>
            <ToggleButton value="active">Active</ToggleButton><ToggleButton value="draft">Draft</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" startIcon={<ViewQuiltOutlinedIcon />} onClick={() => setSheet(true)}>Start from a template</Button>
        </div>
      </section>

      <div className="mobile-diet-editor__meals">
        {meals.map((m) => {
          const t = sumItems(m.foods);
          return (
            <section key={m._key} className="card mobile-diet-editor__meal">
              <div className="mobile-diet-editor__meal-head">
                <div className="flex-1">
                  <h3 className="mobile-diet-editor__meal-name">{m.name}</h3>
                  <span className="mobile-diet-editor__meta">{m.foods.length ? `${num(t.calories, 0)} kcal · P ${num(t.protein_g, 0)}g · C ${num(t.carbs_g, 0)}g · F ${num(t.fat_g, 0)}g` : 'No foods yet'}</span>
                </div>
                <TextField type="time" size="small" value={m.meal_time || ''} onChange={(e) => updateMeal(m._key, { meal_time: e.target.value })} className="mobile-diet-editor__time" inputProps={{ "aria-label": "Meal time" }} />
                <IconButton size="small" onClick={() => setMeals((ms) => ms.filter((x) => x._key !== m._key))} aria-label="Remove meal"><DeleteOutlineIcon fontSize="small" /></IconButton>
              </div>
              <InlineSearch placeholder="Search foods…" onSelect={(f) => addFood(m._key, f)}
                fetcher={(q) => foodService.list({ search: q, status: 'active', pageSize: 25, sortBy: 'name', sortDir: 'asc' }).then((r) => r.data)}
                getSubtitle={(o) => `${num(o.calories, 0)} kcal · ${num(o.protein_g)}g protein · per ${num(o.serving_size, 0)} ${o.serving_unit}`}
                renderAdornment={(o) => <div className="mobile-diet-editor__veg-adorn"><VegDot veg={!!o.is_vegetarian} vegan={!!o.is_vegan} /></div>} />
              <Button fullWidth size="small" startIcon={<AddRoundedIcon />} onClick={() => setCustom(m._key)} className="mobile-diet-editor__custom">Add custom food</Button>
              {m.foods.map((f, i) => (
                <FoodItem key={f._key} f={f} onChange={(v) => updateMeal(m._key, { foods: m.foods.map((x, j) => (j === i ? v : x)) })} onRemove={() => updateMeal(m._key, { foods: m.foods.filter((_, j) => j !== i) })} />
              ))}
            </section>
          );
        })}
        <Button variant="outlined" startIcon={<AddRoundedIcon />} onClick={(e) => setAddMenu(e.currentTarget)}>Add meal</Button>
      </div>
      <Menu anchorEl={addMenu} open={!!addMenu} onClose={() => setAddMenu(null)}>
        {MEAL_TYPES.map((t) => <MenuItem key={t.value} onClick={() => { setMeals((ms) => [...ms, newMeal(t.value)]); setAddMenu(null); }}>{t.label}</MenuItem>)}
      </Menu>
      <TextField label="Guidelines for the client" multiline minRows={2} value={meta.description} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} className="mobile-diet-editor__notes" />

      <div className="app-actionbar mobile-diet-editor__bar">
        <div className="flex-1">
          <p className="mobile-diet-editor__summary-text">{num(totals.calories, 0)}{target ? ` / ${target}` : ''} kcal</p>
          {target ? <LinearProgress variant="determinate" value={Math.min(100, (100 * totals.calories) / target)} className="mobile-diet-editor__progress" color={totals.calories > target * 1.1 ? 'warning' : 'primary'} /> : null}
          <span className="mobile-diet-editor__meta">P {num(totals.protein_g, 0)}g · C {num(totals.carbs_g, 0)}g · F {num(totals.fat_g, 0)}g · Fiber {num(totals.fiber_g, 0)}g</span>
        </div>
        <LoadingButton variant="contained" size="large" loading={saving} onClick={save}>{id ? 'Save' : 'Save & assign'}</LoadingButton>
      </div>
      <TemplateSheet open={sheet} kind="diet" onClose={() => setSheet(false)} onPick={loadTemplate} />
      <FoodFormDialog open={custom !== null} food={null} onClose={() => setCustom(null)} onSaved={(f) => { addFood(custom, f); setCustom(null); }} />
    </div>
  );
}
