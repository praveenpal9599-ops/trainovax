import { useState } from 'react';
import { Button, Chip, IconButton, Skeleton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import NutritionSummary from '../../features/diet/NutritionSummary';
import WaterTracker from '../../features/diet/WaterTracker';
import VegDot from '../../features/diet/VegDot';
import { itemNutrition } from '../../features/diet/dietUtils';
import useFetch from '../../hooks/useFetch';
import { portalService } from '../../services';
import { useFeedback } from '../../features/feedback/FeedbackProvider';
import { addDaysISO, formatDate, formatTime, num, todayISO } from '../../utils/format';
import './client-pages.css';
import './MyDietPage.css';

export default function MyDietPage() {
  const [date, setDate] = useState(todayISO());
  const { notifyError } = useFeedback();
  const { data, loading, error, reload, setData } = useFetch(() => portalService.diet(date), [date]);
  const [busy, setBusy] = useState(null);
  const future = date > todayISO();

  const logMeal = async (m, status) => {
    setBusy(m.id);
    try { setData(await portalService.logDiet({ diet_meal_id: m.id, log_date: date, status })); } catch (e) { notifyError(e); } finally { setBusy(null); }
  };
  const water = async (ml) => {
    setData((d) => ({ ...d, water: { ...d.water, amount_ml: ml } }));
    try { await portalService.logWater({ log_date: date, amount_ml: ml }); } catch (e) { notifyError(e); }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  return (
    <div className="my-diet">
      <div className="my-diet__header">
        <div><h1 className="client-page__title">My diet</h1><p className="my-diet__subtitle">{data?.plan?.name || 'Your meal plan'}</p></div>
        <div className="my-diet__date-nav">
          <IconButton onClick={() => setDate((d) => addDaysISO(d, -1))} aria-label="Previous day"><ChevronLeftIcon /></IconButton>
          <span className="my-diet__date">{date === todayISO() ? 'Today' : formatDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          <IconButton onClick={() => setDate((d) => addDaysISO(d, 1))} aria-label="Next day" disabled={date >= addDaysISO(todayISO(), 6)}><ChevronRightIcon /></IconButton>
        </div>
      </div>

      {loading && !data ? <Skeleton variant="rounded" height={320} /> : !data?.plan ? (
        <div className="card"><EmptyState icon={RestaurantRoundedIcon} title="No diet plan yet" description="Your trainer hasn't assigned a meal plan yet." /></div>
      ) : (
        <>
          <NutritionSummary totals={data.totals} consumed={data.consumed} title="Eaten today vs plan" />
          <div className="my-diet__layout">
            <div className="stack">
              <div className="card my-diet__panel"><WaterTracker amount={data.water.amount_ml} target={data.water.target_ml} onChange={water} disabled={future} /></div>
              {data.plan.description && <div className="card my-diet__panel"><h2 className="my-diet__panel-title">Guidelines from your trainer</h2><p className="text-small text-muted">{data.plan.description}</p></div>}
            </div>
            <div className="stack">
              {data.meals.map((m) => {
                const done = m.log?.status === 'completed';
                return (
                  <section key={m.id} className={`card my-diet__meal${done ? ' my-diet__meal--done' : ''}`}>
                    <div className="my-diet__meal-head">
                      <div className="flex-1">
                        <div className="row"><h2 className="my-diet__meal-name">{m.name}</h2>{m.log && <Chip size="small" color={done ? 'success' : 'warning'} label={done ? 'Eaten' : 'Skipped'} />}</div>
                        <span className="text-caption text-muted">{m.meal_time ? formatTime(m.meal_time) : 'Anytime'} · {num(m.totals.calories, 0)} kcal · P {num(m.totals.protein_g, 0)}g · C {num(m.totals.carbs_g, 0)}g · F {num(m.totals.fat_g, 0)}g</span>
                      </div>
                      {!m.log ? (
                        <div className="row">
                          <Button size="small" color="inherit" disabled={future || busy === m.id} onClick={() => logMeal(m, 'skipped')}>Skip</Button>
                          <Button size="small" variant="contained" color="success" startIcon={<CheckRoundedIcon />} disabled={future || busy === m.id} onClick={() => logMeal(m, 'completed')}>Eaten</Button>
                        </div>
                      ) : <IconButton onClick={() => logMeal(m, null)} disabled={busy === m.id} aria-label="Undo"><UndoRoundedIcon /></IconButton>}
                    </div>
                    <ul className="my-diet__foods">
                      {m.foods.map((f) => (
                        <li key={f.id} className="my-diet__food">
                          <VegDot veg={!!f.is_vegetarian} vegan={!!f.is_vegan} />
                          <div className="flex-1"><p className="my-diet__food-name">{f.food_name}</p><span className="text-caption text-muted">{num(f.quantity * f.serving_size, 0)} {f.serving_unit}{f.notes ? ` · ${f.notes}` : ''}</span></div>
                          <span className="text-small text-muted">{num(itemNutrition(f).calories, 0)} kcal</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
