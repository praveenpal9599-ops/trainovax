import { useState } from 'react';
import { Button, IconButton, InputAdornment, MenuItem, TextField, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import RestaurantOutlinedIcon from '@mui/icons-material/RestaurantOutlined';
import FoodPickerDialog from './FoodPickerDialog';
import VegDot from './VegDot';
import EmptyState from '../../components/common/EmptyState';
import { MEAL_TYPES } from '../../utils/constants';
import { num } from '../../utils/format';
import { foodFromMaster, itemNutrition, key, sumItems } from './dietUtils';
import { move } from '../workout/workoutUtils';
import './DietBuilder.css';

const Macro = ({ label, value, unit = 'g', strong, className = '' }) => (
  <div className={`diet-builder__macro ${className}`.trim()}>
    <div className={`diet-builder__macro-value${strong ? ' diet-builder__macro-value--strong' : ''}`}>{num(value, strong ? 0 : 1)}{unit === 'kcal' ? '' : unit}</div>
    <div className="diet-builder__macro-label">{label}</div>
  </div>
);

/** Diet plan builder: Plan → Meals → Foods, with automatic nutrition totals. Styles: DietBuilder.css */
export default function DietBuilder({ meals, onChange }) {
  const [picker, setPicker] = useState(null);
  const updateMeal = (i, patch) => onChange(meals.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const setFoods = (i, foods) => updateMeal(i, { foods });
  const addMeal = () => {
    const used = new Set(meals.map((m) => m.meal_type));
    const t = MEAL_TYPES.find((x) => !used.has(x.value)) || MEAL_TYPES[3];
    onChange([...meals, { _key: key(), meal_type: t.value, name: t.label, meal_time: t.time, foods: [] }]);
  };
  const duplicateMeal = (i) => onChange([...meals.slice(0, i + 1), { ...meals[i], _key: key(), id: undefined, name: `${meals[i].name} (copy)`, foods: meals[i].foods.map((f) => ({ ...f, _key: key(), id: undefined })) }, ...meals.slice(i + 1)]);

  if (!meals.length) {
    return <div className="card"><EmptyState icon={RestaurantOutlinedIcon} title="No meals yet" description="Add meals like Breakfast, Lunch, Snack and Dinner, then add foods from the Food Master." action={<Button variant="contained" startIcon={<AddIcon />} onClick={addMeal}>Add first meal</Button>} /></div>;
  }

  return (
    <div className="diet-builder">
      <div className="stack">
        {meals.map((meal, mi) => {
          const totals = sumItems(meal.foods);
          return (
            <section key={meal._key} className="card diet-builder__meal">
              <div className="diet-builder__meal-head">
                <div className="diet-builder__meal-type">
                  <TextField select label="Meal" size="small" value={meal.meal_type} onChange={(e) => {
                    const t = MEAL_TYPES.find((x) => x.value === e.target.value);
                    updateMeal(mi, { meal_type: t.value, name: MEAL_TYPES.some((x) => x.label === meal.name) ? t.label : meal.name, meal_time: meal.meal_time || t.time });
                  }}>
                    {MEAL_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </TextField>
                </div>
                <div className="diet-builder__meal-name"><TextField label="Name" size="small" required value={meal.name} onChange={(e) => updateMeal(mi, { name: e.target.value })} error={!meal.name.trim()} /></div>
                <div className="diet-builder__meal-time"><TextField label="Time" type="time" size="small" value={meal.meal_time || ''} onChange={(e) => updateMeal(mi, { meal_time: e.target.value })} InputLabelProps={{ shrink: true }} /></div>
                <div className="diet-builder__meal-actions">
                  <span className="diet-builder__meal-kcal">{num(totals.calories, 0)} kcal</span>
                  <Tooltip title="Move up"><span><IconButton size="small" disabled={mi === 0} onClick={() => onChange(move(meals, mi, mi - 1))} aria-label="Move meal up"><ArrowUpwardIcon fontSize="small" /></IconButton></span></Tooltip>
                  <Tooltip title="Move down"><span><IconButton size="small" disabled={mi === meals.length - 1} onClick={() => onChange(move(meals, mi, mi + 1))} aria-label="Move meal down"><ArrowDownwardIcon fontSize="small" /></IconButton></span></Tooltip>
                  <Tooltip title="Duplicate meal"><IconButton size="small" onClick={() => duplicateMeal(mi)} aria-label="Duplicate meal"><ContentCopyOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Delete meal"><IconButton size="small" onClick={() => onChange(meals.filter((_, i) => i !== mi))} aria-label="Delete meal"><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                </div>
              </div>
              <div className="diet-builder__meal-body">
                {meal.foods.length === 0 && <p className="diet-builder__empty">No foods yet — add from the Food Master.</p>}
                {meal.foods.map((f, fi) => {
                  const n = itemNutrition(f);
                  return (
                    <div key={f._key} className="diet-builder__food">
                      <div className="diet-builder__food-info">
                        <VegDot veg={!!f.is_vegetarian} vegan={!!f.is_vegan} />
                        <div className="flex-1">
                          <div className="diet-builder__food-name truncate">{f.food_name}</div>
                          <div className="diet-builder__food-meta">{num((Number(f.quantity) || 0) * f.serving_size, 0)} {f.serving_unit} · {f.category}</div>
                        </div>
                      </div>
                      <div className="diet-builder__food-qty">
                        <TextField label="Qty" size="small" type="number" value={f.quantity ?? ''} onChange={(e) => setFoods(mi, meal.foods.map((x, i) => (i === fi ? { ...x, quantity: e.target.value } : x)))}
                          inputProps={{ min: 0.25, step: 0.25, 'aria-label': 'Servings' }} InputProps={{ endAdornment: <InputAdornment position="end">×</InputAdornment> }} error={!(Number(f.quantity) > 0)} />
                      </div>
                      <div className="diet-builder__food-macros">
                        <Macro label="kcal" value={n.calories} unit="kcal" strong /><Macro label="Protein" value={n.protein_g} /><Macro label="Carbs" value={n.carbs_g} /><Macro label="Fat" value={n.fat_g} />
                        <Macro label="Fiber" value={n.fiber_g} className="diet-builder__macro--fiber" />
                      </div>
                      <div className="diet-builder__food-actions">
                        <IconButton size="small" disabled={fi === 0} onClick={() => setFoods(mi, move(meal.foods, fi, fi - 1))} aria-label="Move food up"><ArrowUpwardIcon fontSize="small" /></IconButton>
                        <IconButton size="small" disabled={fi === meal.foods.length - 1} onClick={() => setFoods(mi, move(meal.foods, fi, fi + 1))} aria-label="Move food down"><ArrowDownwardIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => setFoods(mi, meal.foods.filter((_, i) => i !== fi))} aria-label="Remove food"><DeleteOutlineIcon fontSize="small" /></IconButton>
                      </div>
                      <div className="diet-builder__food-notes">
                        <TextField size="small" placeholder="Notes (optional) — e.g. cook in 1 tsp olive oil" value={f.notes ?? ''} onChange={(e) => setFoods(mi, meal.foods.map((x, i) => (i === fi ? { ...x, notes: e.target.value } : x)))}
                          inputProps={{ 'aria-label': 'Food notes', maxLength: 255 }} variant="standard" InputProps={{ disableUnderline: true, className: 'diet-builder__notes-input' }} />
                      </div>
                    </div>
                  );
                })}
                <div className="diet-builder__meal-foot">
                  <Button startIcon={<PlaylistAddIcon />} onClick={() => setPicker(mi)}>Add food</Button>
                  {meal.foods.length > 0 && (
                    <span className="diet-builder__meal-total">
                      Meal total · <b>{num(totals.calories, 0)} kcal</b> · P {num(totals.protein_g)}g · C {num(totals.carbs_g)}g · F {num(totals.fat_g)}g · Fiber {num(totals.fiber_g)}g
                    </span>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <hr className="divider" />
      <Button variant="outlined" startIcon={<AddIcon />} onClick={addMeal} disabled={meals.length >= 12}>Add meal</Button>
      <FoodPickerDialog open={picker !== null} mealName={meals[picker]?.name} onClose={() => setPicker(null)}
        onPick={(list) => { setFoods(picker, [...meals[picker].foods, ...list.map(foodFromMaster)]); setPicker(null); }} />
    </div>
  );
}
