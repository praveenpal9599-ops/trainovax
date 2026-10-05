import VegDot from './VegDot';
import NutritionSummary from './NutritionSummary';
import { itemNutrition } from './dietUtils';
import { formatTime, num } from '../../utils/format';
import './DietPlanView.css';

/** Read-only view of a diet plan with automatic totals. Styles: DietPlanView.css */
export default function DietPlanView({ plan }) {
  return (
    <div className="diet-plan-view">
      <NutritionSummary totals={plan.totals} target={plan.target_calories} />
      <div className="diet-plan-view__meals">
        {plan.meals.map((m) => (
          <section className="card diet-plan-view__meal" key={m.id}>
            <header className="diet-plan-view__head">
              <div>
                <h3 className="diet-plan-view__title">{m.name}</h3>
                <span className="diet-plan-view__meta">{m.meal_time ? formatTime(m.meal_time) : 'Anytime'}</span>
              </div>
              <div className="text-right">
                <div className="diet-plan-view__title">{num(m.totals.calories, 0)} kcal</div>
                <span className="diet-plan-view__meta">P {num(m.totals.protein_g, 0)} · C {num(m.totals.carbs_g, 0)} · F {num(m.totals.fat_g, 0)}</span>
              </div>
            </header>
            <ul className="diet-plan-view__foods">
              {m.foods.map((f) => (
                <li key={f.id} className="diet-plan-view__food">
                  <VegDot veg={!!f.is_vegetarian} vegan={!!f.is_vegan} />
                  <div className="flex-1">
                    <div className="diet-plan-view__food-name">{f.food_name}</div>
                    <span className="diet-plan-view__meta">{num(f.quantity * f.serving_size, 0)} {f.serving_unit}{f.notes ? ` · ${f.notes}` : ''}</span>
                  </div>
                  <span className="diet-plan-view__food-kcal">{num(itemNutrition(f).calories, 0)} kcal</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
