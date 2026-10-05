import { LinearProgress } from '@mui/material';
import { macroSplit } from './dietUtils';
import { num } from '../../utils/format';
import './NutritionSummary.css';

const MACROS = [
  { key: 'protein_g', label: 'Protein', tone: 'protein', split: 'protein' },
  { key: 'carbs_g', label: 'Carbs', tone: 'carbs', split: 'carbs' },
  { key: 'fat_g', label: 'Fat', tone: 'fat', split: 'fat' },
  { key: 'fiber_g', label: 'Fiber', tone: 'fiber' },
];

/** Daily totals with calorie target progress and macro split. Styles: NutritionSummary.css */
export default function NutritionSummary({ totals, target, consumed, title = 'Daily nutrition' }) {
  const split = macroSplit(totals);
  const base = consumed || totals;
  const pct = target ? Math.min(100, Math.round((100 * base.calories) / target)) : null;
  return (
    <section className="card nutrition-summary">
      <div className="nutrition-summary__calories">
        <span className="nutrition-summary__title">{title}</span>
        <div className="nutrition-summary__kcal-row">
          <span className="nutrition-summary__kcal">{num(consumed ? consumed.calories : totals.calories, 0)}</span>
          <span className="nutrition-summary__kcal-unit">{consumed ? `/ ${num(totals.calories, 0)} kcal` : target ? `/ ${target} kcal target` : 'kcal'}</span>
        </div>
        {(pct !== null || consumed) && (
          <LinearProgress variant="determinate" value={consumed ? Math.min(100, (100 * consumed.calories) / (totals.calories || 1)) : pct} className="nutrition-summary__progress"
            color={!consumed && target && totals.calories > target * 1.1 ? 'warning' : 'primary'} />
        )}
        {!consumed && target ? <span className="nutrition-summary__caption">{totals.calories > target ? `${num(totals.calories - target, 0)} kcal over target` : `${num(target - totals.calories, 0)} kcal under target`}</span> : null}
      </div>
      <div className="nutrition-summary__macros-wrap">
        <div className="nutrition-summary__macros">
          {MACROS.map((m) => (
            <div className="nutrition-summary__macro" key={m.key}>
              <div className="nutrition-summary__macro-head">
                <span className={`nutrition-summary__dot nutrition-summary__dot--${m.tone}`} />
                <span className="nutrition-summary__macro-label">{m.label}</span>
              </div>
              <div className="nutrition-summary__macro-value">
                {num(consumed ? consumed[m.key] : totals[m.key], 0)}
                <span className="nutrition-summary__macro-unit"> {consumed ? `/ ${num(totals[m.key], 0)}` : ''} g</span>
              </div>
              {m.split && <span className="nutrition-summary__caption">{split[m.split]}% of kcal</span>}
            </div>
          ))}
        </div>
        <div className="nutrition-summary__split" role="img" aria-label={`Macro split: protein ${split.protein}%, carbs ${split.carbs}%, fat ${split.fat}%`}>
          <span className="nutrition-summary__seg nutrition-summary__seg--protein" style={{ '--seg-pct': `${split.protein}%` }} />
          <span className="nutrition-summary__seg nutrition-summary__seg--carbs" style={{ '--seg-pct': `${split.carbs}%` }} />
          <span className="nutrition-summary__seg nutrition-summary__seg--fat" style={{ '--seg-pct': `${split.fat}%` }} />
        </div>
      </div>
    </section>
  );
}
