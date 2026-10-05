import { makePlanControllers } from './planControllerFactory.js';
import { DIET_PLAN, DIET_TEMPLATE } from '../services/planStructures.js';

export default makePlanControllers({
  P: DIET_PLAN, T: DIET_TEMPLATE, label: 'Diet plan', entity: 'diet_plan', link: '/client/diet',
  listExtraSelect: `(SELECT COUNT(*) FROM diet_meals m WHERE m.plan_id = p.id) AS meals_count,
    (SELECT ROUND(SUM(f.calories * df.quantity)) FROM diet_foods df JOIN diet_meals m ON m.id = df.meal_id JOIN foods f ON f.id = df.food_id WHERE m.plan_id = p.id) AS total_calories,
    (SELECT ROUND(SUM(f.protein_g * df.quantity)) FROM diet_foods df JOIN diet_meals m ON m.id = df.meal_id JOIN foods f ON f.id = df.food_id WHERE m.plan_id = p.id) AS total_protein,
    (SELECT ROUND(100 * SUM(dl.status = 'completed') / NULLIF(COUNT(*), 0)) FROM diet_logs dl JOIN diet_meals m ON m.id = dl.diet_meal_id
      WHERE m.plan_id = p.id AND dl.log_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS adherence_pct`,
  templateExtraSelect: `(SELECT COUNT(*) FROM diet_template_meals m WHERE m.template_id = t.id) AS meals_count,
    (SELECT ROUND(SUM(f.calories * df.quantity)) FROM diet_template_foods df JOIN diet_template_meals m ON m.id = df.meal_id JOIN foods f ON f.id = df.food_id WHERE m.template_id = t.id) AS total_calories,
    (SELECT ROUND(SUM(f.protein_g * df.quantity)) FROM diet_template_foods df JOIN diet_template_meals m ON m.id = df.meal_id JOIN foods f ON f.id = df.food_id WHERE m.template_id = t.id) AS total_protein`,
});
