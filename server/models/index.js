import createModel from './createModel.js';

export const Organization = createModel({
  table: 'organizations', alias: 'o',
  select: `SELECT o.*,
      (SELECT COUNT(*) FROM trainers t WHERE t.organization_id = o.id AND t.deleted_at IS NULL) AS trainer_count,
      (SELECT COUNT(*) FROM clients c WHERE c.organization_id = o.id AND c.deleted_at IS NULL) AS client_count,
      (SELECT sp.name FROM subscriptions s JOIN subscription_plans sp ON sp.id = s.plan_id
         WHERE s.organization_id = o.id AND s.deleted_at IS NULL ORDER BY s.start_date DESC LIMIT 1) AS plan_name,
      (SELECT s.status FROM subscriptions s WHERE s.organization_id = o.id AND s.deleted_at IS NULL ORDER BY s.start_date DESC LIMIT 1) AS subscription_status
    FROM organizations o`,
  fields: ['name', 'slug', 'email', 'phone', 'address', 'city', 'country', 'logo_url', 'status'],
  searchColumns: ['o.name', 'o.email', 'o.city'],
  sortable: { name: 'o.name', city: 'o.city', status: 'o.status', clients: 'client_count' },
  filters: { status: 'o.status' },
});

export const Exercise = createModel({
  table: 'exercises', alias: 'e',
  select: `SELECT e.*, ec.name AS category, pm.name AS primary_muscle, sm.name AS secondary_muscle, u.name AS created_by_name
    FROM exercises e
    LEFT JOIN exercise_categories ec ON ec.id = e.category_id
    LEFT JOIN muscle_groups pm ON pm.id = e.primary_muscle_id
    LEFT JOIN muscle_groups sm ON sm.id = e.secondary_muscle_id
    LEFT JOIN users u ON u.id = e.created_by`,
  fields: ['name', 'description', 'category_id', 'primary_muscle_id', 'secondary_muscle_id', 'equipment', 'difficulty',
    'exercise_type', 'instructions', 'default_sets', 'default_reps', 'default_duration_sec', 'default_rest_sec',
    'video_url', 'image_url', 'status', 'created_by'],
  searchColumns: ['e.name', 'e.equipment', 'e.description'],
  sortable: { name: 'e.name', category: 'ec.name', muscle: 'pm.name', difficulty: 'e.difficulty', status: 'e.status' },
  filters: { categoryId: 'e.category_id', muscleId: 'e.primary_muscle_id', difficulty: 'e.difficulty', status: 'e.status', equipment: 'e.equipment' },
  defaultSort: 'name',
});

export const Food = createModel({
  table: 'foods', alias: 'f',
  select: `SELECT f.*, fc.name AS category, u.name AS created_by_name
    FROM foods f LEFT JOIN food_categories fc ON fc.id = f.category_id LEFT JOIN users u ON u.id = f.created_by`,
  fields: ['name', 'category_id', 'serving_size', 'serving_unit', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g',
    'sugar_g', 'sodium_mg', 'is_vegetarian', 'is_vegan', 'allergens', 'status', 'created_by'],
  searchColumns: ['f.name', 'fc.name'],
  sortable: { name: 'f.name', category: 'fc.name', calories: 'f.calories', protein: 'f.protein_g', status: 'f.status' },
  filters: { categoryId: 'f.category_id', status: 'f.status', isVegetarian: 'f.is_vegetarian', isVegan: 'f.is_vegan' },
  defaultSort: 'name',
});

export const SubscriptionPlan = createModel({
  table: 'subscription_plans', alias: 'sp', softDelete: false,
  select: `SELECT sp.*, (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = sp.id AND s.status IN ('active','trial') AND s.deleted_at IS NULL) AS active_subscriptions FROM subscription_plans sp`,
  fields: ['name', 'description', 'price_monthly', 'price_yearly', 'max_trainers', 'max_clients', 'status'],
  searchColumns: ['sp.name'], sortable: { name: 'sp.name', price: 'sp.price_monthly' }, defaultSort: 'price',
});

export const Subscription = createModel({
  table: 'subscriptions', alias: 's',
  select: `SELECT s.*, o.name AS organization_name, sp.name AS plan_name
    FROM subscriptions s JOIN organizations o ON o.id = s.organization_id JOIN subscription_plans sp ON sp.id = s.plan_id`,
  fields: ['organization_id', 'plan_id', 'billing_cycle', 'amount', 'status', 'start_date', 'end_date', 'auto_renew'],
  searchColumns: ['o.name', 'sp.name'],
  sortable: { organization: 'o.name', plan: 'sp.name', amount: 's.amount', status: 's.status', start: 's.start_date', end: 's.end_date' },
  filters: { status: 's.status', planId: 's.plan_id' },
});
