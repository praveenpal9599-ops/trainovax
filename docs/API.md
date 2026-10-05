# TrainovaX — REST API

Base URL: `http://localhost:5000/api` · JSON everywhere · Auth: `Authorization: Bearer <JWT>`

**Responses**: `{ "success": true, "data": … }`. Lists also return `meta: { page, pageSize, total, totalPages }`.
**Errors**: `{ "success": false, "message": "…", "details": [{ field, message }] }` with status 400 (validation), 401 (not signed in / expired), 403 (role or data scope), 404, 409 (duplicate / in use), 413 (file too large), 429 (rate limited), 500.

**Common list query params**: `page`, `pageSize` (≤100), `search`, `sortBy`, `sortDir=asc|desc`, `all=true` (no paging, used for exports) plus per-resource filters.

**Roles**: `SA` = super_admin · `AD` = admin (organization-wide) · `TR` = trainer (own clients) · `CL` = client (own data). Wherever this document says `AD`, trainers (`TR`) have the same access limited to their assigned clients, except `/users` (admins manage trainers in their own organization).

## Auth
| Method | Path | Roles | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{ email, password, remember, portal?: trainer|client }` → `{ token, expiresIn, user }` (remember = 30 d token). `portal` must match the account (403 otherwise) |
| POST | `/auth/register` | public | Trainer: `{ accountType: 'trainer', name, email, phone?, password, organizationName?, specialization?, isGymOwner? }` → trainer (or admin when `isGymOwner`) + studio + 14-day trial. Client: `{ accountType: 'client', name, email, phone?, password, trainerCode, gender?, age?, height_cm?, weight_kg?, fitness_goal? }` → joins that trainer |
| GET | `/auth/trainer-code/:code` | public | Confirms a trainer code → `{ name, organization_name, specialization }` (404 if unknown) |
| POST | `/auth/forgot-password` | public | `{ email }` — always 200; returns `devResetUrl` outside production |
| POST | `/auth/reset-password` | public | `{ token, password }` |
| GET | `/auth/me` | any | current user + permission codes |
| PUT | `/auth/me` | any | `{ name, phone }` |
| POST | `/auth/me/avatar` | any | multipart `file` |
| PUT | `/auth/change-password` | any | `{ currentPassword, newPassword }` |
| POST | `/auth/logout` | any | audit only (JWT is discarded client-side) |

## Dashboards, lookups, uploads
| GET | `/dashboard/super-admin` | SA |
|---|---|---|
| GET | `/dashboard/admin` | AD, SA |
| GET | `/lookups` | any — exercise categories, muscle groups, food categories, equipment, (SA) trainers & organizations |
| POST | `/uploads/image` | SA, AD — multipart `file` → `{ url }` |
| GET | `/health` | public |
| GET | `/settings/public` | public |

## Platform (Super Admin)
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/organizations` | filters `status` |
| GET/PUT/DELETE | `/organizations/:id` | soft delete |
| PATCH | `/organizations/:id/status` | `{ status: active|inactive }` |
| GET/POST | `/users` | admins/trainers & super admins; filters `role, status, organizationId` |
| GET/PUT/DELETE | `/users/:id` | |
| PATCH | `/users/:id/status` | activate / deactivate account |
| GET/POST | `/subscription-plans`, GET/PUT/DELETE `/subscription-plans/:id` | |
| GET/POST | `/subscriptions`, GET/PUT/DELETE `/subscriptions/:id` | filters `status, planId` |
| GET/PUT | `/settings` | PUT body `{ key: value, … }` |
| GET | `/audit-logs` | filters `action, entity, userId, from, to` + `facets` |
| POST | `/notifications/broadcast` | `{ audience: all|admins|clients|organization, organization_id?, title, body? }` |
| GET | `/notifications/broadcasts` | sent history |

## Master data
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET/POST | `/exercises` | view: SA, AD · create: SA, AD | filters `categoryId, muscleId, difficulty, equipment, status` |
| GET/PUT/DELETE | `/exercises/:id` | edit: SA or creator | |
| PATCH | `/exercises/:id/status` | | |
| GET/POST, GET/PUT/DELETE, PATCH status | `/foods`… | same as exercises | filters `categoryId, isVegetarian, isVegan, status` |

## Clients (SA, AD)
| Method | Path | Notes |
|---|---|---|
| GET | `/clients` | filters `status, goal, gender, trainerId, organizationId`; sort `name, age, weight, goal, status, trainer, lastProgress, created` |
| POST | `/clients` | core fields + `weight_kg`, `profile: {…}`, `create_login`, `password` |
| GET | `/clients/:id` | detail with `profile`, `trainer`, `stats` (start/current/Δ weight, BMI, body fat, target), `latest_measurement`, `counts` |
| PUT | `/clients/:id` | |
| PATCH | `/clients/:id/status` | also (de)activates the client login |
| DELETE | `/clients/:id` | soft delete |
| POST | `/clients/bulk/status`, `/clients/bulk/delete` | `{ ids: [], status? }` |
| POST | `/clients/:id/photo` | multipart `file` |
| GET | `/clients/:id/history` | activity timeline |
| GET | `/clients/:id/logs` | last 30 days workout & diet logs |
| GET/POST | `/clients/:id/notes`, PUT/DELETE `/clients/:id/notes/:noteId` | |
| GET/POST | `/clients/:id/attendance`, DELETE `/clients/:id/attendance/:attendanceId` | upsert by date |
| POST | `/notifications/send` | `{ client_ids, title, body?, type }` reminders |
| GET/POST | `/tasks`, PATCH/DELETE `/tasks/:id` | trainer to-dos |

## Workout plans & templates
Nested payload (same for plans and templates):
```json
{
  "name": "Weight Loss Program", "goal": "weight_loss", "difficulty": "beginner",
  "days": [
    { "id": 12, "name": "Monday", "day_of_week": 1, "focus": "Lower body",
      "exercises": [ { "id": 40, "exercise_id": 13, "sets": 3, "reps": "15", "duration_sec": null,
                       "weight_kg": null, "rest_sec": 60, "tempo": "3-1-1", "notes": "" } ] }
  ]
}
```
Rows sent with an `id` are updated in place, rows without are inserted and missing rows are deleted — so ids (and the client's workout logs) survive edits and reordering. Plans also take `client_id, start_date, end_date, status (draft|active|completed|archived), template_id`; activating a plan completes the client's previous active plan and notifies the client.

| Method | Path | Notes |
|---|---|---|
| GET/POST | `/workouts` | filters `clientId, status`; list includes `days_count, exercises_count, completion_pct` |
| GET/PUT/DELETE | `/workouts/:id` | |
| PATCH | `/workouts/:id/status` | |
| POST | `/workouts/:id/duplicate` | `{ client_id?, name? }` |
| POST | `/workouts/:id/save-as-template` | `{ name }` |
| POST | `/workouts/from-template` | `{ template_id, client_id, start_date?, name? }` |
| GET/POST | `/workout-templates` | global (SA) + own organization's |
| GET/PUT/DELETE | `/workout-templates/:id` | global ones editable by SA only |
| POST | `/workout-templates/:id/duplicate` | |

## Diet plans & templates
Identical endpoints under `/diets` and `/diet-templates`. Payload uses `meals: [{ id?, meal_type, name, meal_time, foods: [{ id?, food_id, quantity, notes }] }]` plus `diet_type, target_calories, water_target_ml`. `quantity` = number of servings from the Food Master. Responses include computed `totals` (calories, protein, carbs, fat, fiber, sugar) for the plan and each meal.

## Progress
| Method | Path | Roles | Notes |
|---|---|---|---|
| GET | `/progress/:clientId` | SA, AD, CL (own) | `range=7d|30d|3m|6m|1y|custom&from&to`; returns records, per-metric `summary {start,current,change}` |
| POST | `/progress` | SA, AD, CL (own) | `{ client_id, record_date, weight_kg, chest_cm, waist_cm, arms_cm, thighs_cm, hips_cm, neck_cm, calves_cm, body_fat_pct, notes }` — BMI calculated from height |
| PUT/DELETE | `/progress/:id` | | |
| GET | `/progress/:clientId/photos` | | |
| POST | `/progress/photos` | | multipart `file, client_id, pose, taken_on, notes` |
| DELETE | `/progress/photos/:id` | | |

## Client portal (CL only — always scoped to the signed-in client)
| GET | `/portal/dashboard` | today's workout & diet, stats, week adherence, upcoming workout, trainer, notifications |
|---|---|---|
| GET | `/portal/workout?date=` | day's exercises + logs, week strip |
| GET | `/portal/diet?date=` | meals + logs, planned vs consumed totals, water |
| POST | `/portal/workout-logs` | `{ workout_exercise_id, log_date, status: completed|skipped|null, actual_* }` |
| POST | `/portal/diet-logs` | `{ diet_meal_id, log_date, status }` |
| PUT | `/portal/water` | `{ log_date, amount_ml }` |
| GET/PUT | `/portal/profile` | limited self-service fields |

## Messaging & notifications (all roles)
| GET | `/messages/conversations` | allowed contacts with last message + unread count |
|---|---|---|
| GET | `/messages?with=:userId` | thread (marks as read) |
| POST | `/messages` | `{ recipient_id, body }` or multipart with `attachment` (image/PDF) |
| GET | `/messages/unread-count` | |
| GET | `/notifications` | `page, pageSize, unread=true` → `meta.unread` |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | |
| DELETE | `/notifications/:id` | |

Allowed message pairs: client ↔ own trainer · trainer ↔ own clients & super admins · super admin ↔ trainers.

## Reports & backup
| GET | `/reports/overview?days=7|30|90|180|365` | SA (platform), AD (own clients) |
|---|---|---|
| GET | `/backup/export` | JSON backup of clients, profiles, progress, plan summaries |
| POST | `/backup/import` | AD — imports this format or legacy v1-style flat client objects |
