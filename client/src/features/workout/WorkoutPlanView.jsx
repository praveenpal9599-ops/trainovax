import { Chip } from '@mui/material';
import ExerciseThumb from '../masters/ExerciseThumb';
import { WEEKDAYS } from '../../utils/constants';
import { duration } from '../../utils/format';
import { estimateMinutes } from './workoutUtils';
import './WorkoutPlanView.css';

/** Read-only weekly view of a workout plan. Styles: WorkoutPlanView.css */
export default function WorkoutPlanView({ plan }) {
  const today = ((new Date().getDay() + 6) % 7) + 1;
  return (
    <div className="workout-plan-view">
      {plan.days.map((d) => {
        const isToday = d.day_of_week === today;
        return (
          <section key={d.id} className={`card workout-plan-view__day${isToday ? ' workout-plan-view__day--today' : ''}`}>
            <header className="workout-plan-view__head">
              <div className="flex-1">
                <h3 className="workout-plan-view__title">{d.name}{d.focus ? ` · ${d.focus}` : ''}</h3>
                <span className="workout-plan-view__meta">{WEEKDAYS.find((w) => w.value === d.day_of_week)?.label || 'Flexible'} · {d.exercises.length} exercises · ~{estimateMinutes(d.exercises)} min</span>
              </div>
              {isToday && <Chip size="small" color="primary" label="Today" />}
            </header>
            <ul className="workout-plan-view__exercises">
              {d.exercises.map((e) => (
                <li key={e.id} className="workout-plan-view__exercise">
                  <ExerciseThumb category={e.category} image={e.image_url} size={30} />
                  <div className="flex-1">
                    <div className="workout-plan-view__name truncate">{e.exercise_name}</div>
                    <span className="workout-plan-view__meta">{[e.sets && `${e.sets} × ${e.reps || duration(e.duration_sec)}`, e.weight_kg && `${e.weight_kg} kg`, e.rest_sec && `rest ${e.rest_sec}s`, e.tempo && `tempo ${e.tempo}`].filter(Boolean).join(' · ')}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
