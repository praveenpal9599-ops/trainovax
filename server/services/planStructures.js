/**
 * Table maps for the two nested structures.
 * Workout: root -> days -> exercises     Diet: root -> meals -> foods
 */
export const WORKOUT_PLAN = {
  kind: 'workout', root: 'workout_plans', group: 'workout_days', groupFk: 'plan_id', item: 'workout_exercises', itemFk: 'day_id',
  groupsKey: 'days', itemsKey: 'exercises',
  rootFields: ['client_id', 'trainer_id', 'template_id', 'name', 'description', 'goal', 'difficulty', 'start_date', 'end_date', 'status'],
  groupFields: ['name', 'day_of_week', 'focus'],
  itemFields: ['exercise_id', 'sets', 'reps', 'duration_sec', 'weight_kg', 'rest_sec', 'tempo', 'notes'],
  softDelete: true,
};
export const WORKOUT_TEMPLATE = {
  ...WORKOUT_PLAN, root: 'workout_templates', group: 'workout_template_days', groupFk: 'template_id', item: 'workout_template_exercises',
  rootFields: ['organization_id', 'created_by', 'name', 'description', 'goal', 'difficulty', 'duration_weeks', 'status'],
};
export const DIET_PLAN = {
  kind: 'diet', root: 'diet_plans', group: 'diet_meals', groupFk: 'plan_id', item: 'diet_foods', itemFk: 'meal_id',
  groupsKey: 'meals', itemsKey: 'foods',
  rootFields: ['client_id', 'trainer_id', 'template_id', 'name', 'description', 'goal', 'diet_type', 'target_calories', 'water_target_ml', 'start_date', 'end_date', 'status'],
  groupFields: ['meal_type', 'name', 'meal_time'],
  itemFields: ['food_id', 'quantity', 'notes'],
  softDelete: true,
};
export const DIET_TEMPLATE = {
  ...DIET_PLAN, root: 'diet_templates', group: 'diet_template_meals', groupFk: 'template_id', item: 'diet_template_foods',
  rootFields: ['organization_id', 'created_by', 'name', 'description', 'goal', 'diet_type', 'target_calories', 'status'],
};
