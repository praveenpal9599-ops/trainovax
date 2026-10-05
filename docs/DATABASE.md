# Database schema

MySQL 8.0+ (or MariaDB 10.6+), InnoDB, `utf8mb4`. Full DDL: [`server/database/migrations/`](../server/database/migrations/) — `001_initial_schema.sql`, `002_trainer_invite_codes.sql`.

Every table has `created_at` / `updated_at`; business tables use `deleted_at` for soft deletes. All relations are real foreign keys; complex data (plans, meals, logs) is relational — no JSON columns.

## Entity overview

```
roles ─< role_permissions >─ permissions
roles ─< users >─ organizations ─< subscriptions >─ subscription_plans
users ─ trainers (1:1)          users ─ clients (1:1, optional login)
trainers ─< clients ─ client_profiles (1:1)
clients ─< client_notes, attendance, tasks, progress_records ─< progress_photos
clients ─< workout_plans ─< workout_days ─< workout_exercises >─ exercises ─> exercise_categories, muscle_groups
                                              workout_exercises ─< workout_logs
workout_templates ─< workout_template_days ─< workout_template_exercises >─ exercises
clients ─< diet_plans ─< diet_meals ─< diet_foods >─ foods ─> food_categories
                         diet_meals ─< diet_logs          clients ─< water_logs
diet_templates ─< diet_template_meals ─< diet_template_foods >─ foods
users ─< messages (sender / recipient), notifications, audit_logs
settings (platform key/value)
```

## Tables

| Table | Purpose / key columns |
|---|---|
| `roles` | `super_admin`, `admin` (trainer), `client` |
| `permissions`, `role_permissions` | RBAC codes (e.g. `clients.manage`, `self.workout`) mapped to roles |
| `organizations` | gyms/studios: name, slug (unique), contact, city, status |
| `subscription_plans` | Starter / Professional / Enterprise pricing and limits |
| `subscriptions` | organization → plan, billing cycle, amount, status (trial/active/past_due/cancelled/expired), dates |
| `users` | login accounts: role, organization, email (unique), bcrypt `password_hash`, status, reset-token hash |
| `trainers` | coaching profile for trainer and admin users: unique `invite_code` (client sign-up code), specialization, experience, certifications, bio |
| `clients` | Core client fields — full name, age, gender, phone, height, starting/current weight, fitness goal, notes — plus trainer, status, photo |
| `client_profiles` | extended info: DOB, address, emergency contact, target weight, activity/experience level, diet preference, medical, injuries, allergies, sleep, water goal |
| `client_notes` | trainer notes (pinnable) |
| `attendance` | one row per client per session date (present/late/absent/excused) |
| `tasks` | trainer to-dos, optionally linked to a client |
| `exercise_categories`, `muscle_groups` | lookup tables |
| `exercises` | Exercise Master: name, description, category, primary/secondary muscle, equipment, difficulty, type, instructions, default sets/reps/duration/rest, video, image, status |
| `food_categories`, `foods` | Food Master: serving size/unit, calories, protein, carbs, fat, fiber, sugar, sodium, veg/vegan, allergens, status |
| `workout_templates` → `workout_template_days` → `workout_template_exercises` | reusable programmes (`organization_id` NULL = global) |
| `workout_plans` → `workout_days` → `workout_exercises` | assigned plans; day has `day_of_week` (1 = Mon); exercise has sets, reps, duration, weight, rest, tempo, notes, `sort_order` |
| `workout_logs` | client marks an exercise completed/skipped for a date (unique per exercise + date) |
| `diet_templates` → `diet_template_meals` → `diet_template_foods` | reusable meal plans |
| `diet_plans` → `diet_meals` → `diet_foods` | assigned plans; food rows store `quantity` (servings) — nutrition totals are calculated from the Food Master |
| `diet_logs`, `water_logs` | meal eaten/skipped per date; daily water intake |
| `progress_records` | Core measurements (date, weight, chest, waist, arms, thighs, hips, body fat %) + neck, calves, BMI, notes |
| `progress_photos` | photo URL, pose, date, optional link to a measurement |
| `messages` | trainer ↔ client messages with optional attachment, `read_at` |
| `notifications` | per-user notifications with type, link, `read_at` |
| `audit_logs` | who did what, entity, IP, user agent |
| `settings` | platform key/value settings (typed, public flag) |
| `schema_migrations` | applied migration files (created by the migration runner) |

## Indexes
Unique: emails, org slugs, role/permission names, one profile per client, one log per exercise/meal per day, one attendance row per client per day.
Lookup indexes on every foreign key plus `status`, `deleted_at`, names used in search, `(client_id, record_date)`, `(plan_id, sort_order)`, `(recipient_id, read_at)` and `(user_id, read_at, created_at)`.
