import { makePlanControllers } from './planControllerFactory.js';
import { WORKOUT_PLAN, WORKOUT_TEMPLATE } from '../services/planStructures.js';

export default makePlanControllers({
  P: WORKOUT_PLAN, T: WORKOUT_TEMPLATE, label: 'Workout plan', entity: 'workout_plan', link: '/client/workout',
  listExtraSelect: `(SELECT COUNT(*) FROM workout_days d WHERE d.plan_id = p.id) AS days_count,
    (SELECT COUNT(*) FROM workout_exercises we JOIN workout_days d ON d.id = we.day_id WHERE d.plan_id = p.id) AS exercises_count,
    (SELECT ROUND(100 * SUM(wl.status = 'completed') / NULLIF(COUNT(*), 0)) FROM workout_logs wl
       JOIN workout_exercises we ON we.id = wl.workout_exercise_id JOIN workout_days d ON d.id = we.day_id
      WHERE d.plan_id = p.id AND wl.log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS completion_pct`,
  templateExtraSelect: `(SELECT COUNT(*) FROM workout_template_days d WHERE d.template_id = t.id) AS days_count,
    (SELECT COUNT(*) FROM workout_template_exercises e JOIN workout_template_days d ON d.id = e.day_id WHERE d.template_id = t.id) AS exercises_count`,
});
