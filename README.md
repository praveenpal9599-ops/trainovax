# TrainovaX — Fitness & Personal Training Management Platform

A full-stack SaaS platform for personal trainers, gyms and their clients.
The original app (Overview, Clients, Workout Plans, Diet Plans, Progress Tracking, Settings/JSON backup) was used as the
functional reference and expanded into a multi-tenant platform with three role-based experiences.

**Stack** — React 18 · Vite · Material UI 6 (Material Design 3 inspired) · React Router · React Hook Form + Zod · Recharts · Fetch
→ REST API → Node.js · Express · JWT · bcrypt · RBAC → MySQL.

> The exercise master (122 exercises), food master (258 foods) and templates in the seed data were **created for this
> project**.

---

## 1. Features

| Role | Experience |
|---|---|
| **Super Admin** `/super-admin/*` | Platform dashboard (growth, MRR, plans), Organizations/Gyms, Admins & Trainers (create, edit, activate/deactivate), all Clients, Exercise Master, Food Master, global Workout & Diet Templates, Subscriptions & pricing, Reports, broadcast Notifications, System Settings, Audit Logs |
| **Admin** (gym / studio owner, desktop) `/admin/*` | Business dashboard (stats, client weight progress, workout completion, diet adherence, needs-attention list, recent clients, tasks), Client management (multi-step add/edit wizard, bulk actions, CSV export, reminders), 11-tab client profile, Workout Builder (plan → days → exercises; add, remove, drag/arrow reorder, duplicate exercise/day, save as template, assign), Diet Builder (plan → meals → foods with automatic calorie/macro/fiber totals), Progress tracking (6 charts, date ranges incl. custom, measurement history, photos with before/after), Exercise & Food library, Templates, Messaging, Reports, JSON backup/restore |
| **Trainer** (mobile app / WebView) `/trainer/*` | Phone-first app: home with profile card, overview stats, weekly workout-completion chart, clients' weight trend, feature shortcuts, needs-attention list, recent clients and tasks · client cards (add / view / edit / delete, quick actions) · client profile with Measure / Workout / Diet / Message / Remind shortcuts and tabs · **workout plan editor** (tick weekdays → search exercises inline → sets/reps/kg/rest, reorder, copy a day to other days, add custom exercise, load template) · **diet plan editor** (meal sections → search foods inline → servings, live kcal/protein/carbs/fat per food, meal and day totals vs target, add custom food) · plan lists with completion/adherence bars · progress (client avatar strip + 6 charts) · exercise & food library · chat · notifications |
| **Client** (mobile app / WebView) `/client/*` | Phone-first app with bottom tabs (Home, Workout, Diet, Progress, Chat): today's workout with Completed/Skipped logging and completion %, today's diet with eaten/skipped meals, consumed vs planned macros and a water tracker, weight/body-fat/BMI stats, weekly adherence, upcoming workout, trainer card, progress charts + self-logged measurements, progress photos, messages, notifications, profile, settings |

**Desktop vs app UI** — Super Admin and Admin use the desktop sidebar dashboard. Trainer and Client use an app-style
layout (`client/src/layouts/MobileAppLayout.jsx` + `theme/mobileTheme.js`) that always renders the phone layout — on a
phone, inside a native-app WebView, or as a centred phone-width column in a desktop browser. Point your future
Android/iOS WebView at `/login`; trainers land on `/trainer/dashboard`, clients on `/client/dashboard`.

**Data scoping** — Super Admin: everything · Admin: every client and trainer in their organization · Trainer: only the
clients assigned to them · Client: only their own data.

**Sign in / sign up tabs** — `/login` and `/register` have a **Trainer | Client** switch (deep-link with `?as=trainer` or
`?as=client`; the choice is remembered on the device). Trainer sign-in also covers gym admins and the super admin; signing
in on the wrong tab shows a one-tap "Switch" hint. Trainer sign-up creates an independent trainer account (mobile app) with a
14-day trial — or, with "I own a gym / studio" ticked, a gym-admin account (desktop panel). Every trainer gets a **client
code** (shown on the trainer home screen and in admin Settings, with Copy / Invite). Clients sign up with that code, see
"You'll join <trainer>" before submitting, and land straight in their trainer's client list (the trainer is notified).
Invite links like `/register?as=client&code=ROHIT01` pre-fill the code.

Cross-cutting: JWT auth with "remember me", forgot/reset password, protected
role-based routes (a user can never open another role's area), notifications (plan assigned/updated, new message, reminders,
announcements), trainer ↔ client messaging with image/PDF attachments and unread counts.

---

## 2. Folder structure

```
trainovax/
├── package.json                 # root helper scripts (install:all, dev, build, test)
├── docs/
│   ├── API.md                   # REST API reference
│   └── DATABASE.md              # schema overview
├── server/                      # Node.js + Express REST API
│   ├── server.js                # boot (DB check, listen, graceful shutdown)
│   ├── app.js                   # helmet, CORS, compression, rate limit, routes, errors
│   ├── config/                  # env.js (validated env), db.js (mysql2 pool + transactions), permissions.js (RBAC matrix)
│   ├── controllers/             # auth, client, planControllerFactory (+ workout/diet), progress, portal, message,
│   │                            # notification, task, dashboard, report, user, master (generic CRUD), lookup, adminTools
│   ├── routes/                  # index.js (mounts everything), authRoutes, clientRoutes, planRoutes, progressRoutes, portalRoutes
│   ├── models/                  # createModel.js (safe CRUD factory) + index.js (Organization, Exercise, Food, plans, subscriptions)
│   ├── middleware/              # auth (JWT, authorize, requirePermission), validate (Zod), errorHandler, rateLimiter, upload (multer)
│   ├── services/                # authService, clientService, planService (nested plan sync), planStructures, portalService,
│   │                            # adherenceService, accessService (data scoping), notificationService, auditService
│   ├── validators/              # Zod schemas per module
│   ├── utils/                   # ApiError, asyncHandler, pagination/Where builder, dates, fitness (BMI, macro sums), serialize
│   ├── database/                # migrate.js, reset.js, migrations/001_initial_schema.sql
│   ├── seeders/                 # seed.js, addMasters.js + data/{exercises,exercisesIndia,foods,foodsIndia,templates}.js
│   ├── tests/api.test.js        # integration tests (node:test + supertest)
│   └── uploads/                 # uploaded images/attachments (git-ignored)
└── client/                      # React + Vite SPA
    ├── index.html, vite.config.js (dev proxy /api → :5000)
    └── src/
        ├── api/http.js          # fetch wrapper (token, JSON/multipart, errors, 401 handling)
        ├── services/index.js    # one service object per API resource
        ├── theme/theme.js       # Material Design tokens (#1565C0 / #42A5F5 / #F5F7FA / #172B4D)
        ├── routes/              # AppRoutes (lazy), ProtectedRoute, navConfig
        ├── layouts/             # DashboardLayout (SA/Admin desktop), MobileAppLayout (Trainer/Client app), AuthLayout, Brand, UserMenu
        ├── components/          # common (PageHeader, StatCard, SectionCard, EmptyState, FormDialog, StatusChip, ProgressRing…),
        │                        # table (DataTable, TableToolbar, FilterSelect), form (RHF fields, zod helpers), charts (Trend, Bar, Donut, ChartCard)
        ├── features/            # auth, feedback (snackbar + confirm), lookups, notifications, messaging, clients (+ profile tabs),
        │                        # workout (builder, picker, view), diet (builder, picker, nutrition, water), progress, masters, settings
        ├── hooks/               # useFetch, usePagedList, useDebounce
        ├── pages/               # auth/, superadmin/, admin/, trainer/ (mobile app), client/, shared/ (pages reused by SA + Admin)
        └── utils/               # constants, format, exportCsv
```

---

## 3. Requirements

- **Node.js 18+** (20 LTS or 22 recommended)
- **MySQL 8.0+** (or MariaDB 10.6+) running locally or remotely

---

## 4. Environment variables

`server/.env` (copy from `server/.env.example`):

```ini
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:5173          # comma-separated list of allowed origins
API_PUBLIC_URL=http://localhost:5000
APP_URL=http://localhost:5173              # used in password-reset links

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=trainovax
DB_CONNECTION_LIMIT=10

JWT_SECRET=<long random string>            # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_EXPIRES_IN=1d
JWT_REMEMBER_EXPIRES_IN=30d
BCRYPT_ROUNDS=10

RATE_LIMIT_WINDOW_MIN=15
RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=30
UPLOAD_MAX_MB=5
```

`client/.env` (copy from `client/.env.example`):

```ini
VITE_API_URL=/api                          # or a full URL, e.g. https://api.example.com/api
VITE_DEV_PROXY_TARGET=http://localhost:5000
VITE_APP_NAME=TrainovaX
```

---

## 5. Installation

```bash
cd trainovax
npm run install:all          # installs root, server and client dependencies
# Windows PowerShell: copy server\.env.example server\.env ; copy client\.env.example client\.env
cp server/.env.example server/.env
cp client/.env.example client/.env
# edit server/.env → set DB_USER / DB_PASSWORD / JWT_SECRET
```

## 6. Database migration

The migration runner creates the database (if missing) and applies every file in `server/database/migrations` in order,
tracking them in `schema_migrations`.

```bash
npm --prefix server run migrate      # create / update schema
npm --prefix server run db:reset     # DEV ONLY: drop + recreate database, then migrate
```

Prefer raw SQL? Run `server/database/migrations/001_initial_schema.sql` against an empty `trainovax` database.

## 7. Seed data

```bash
npm --prefix server run seed         # WIPES data, then loads the demo dataset
# or both steps at once:
npm run setup                        # migrate + seed
```

Seed contents: 1 Super Admin, 3 organizations (+ subscriptions & 3 pricing plans), 2 admins (who also coach) and 2 trainers, 10 clients with extended
profiles, 122 exercises (incl. Indian training, yoga & pranayama), 258 foods (Indian breakfasts, breads, rice dishes, dals & curries, street food, sweets, fruits…), 5 workout templates, 5 diet templates, assigned workout & diet plans, ~6 months of
fortnightly measurements, 4 weeks of workout/diet/water logs and attendance, trainer notes, tasks, message threads,
notifications and audit-log entries. Dates are relative to the day you run the seed, so charts always look current.

### Adding the exercise & food library to an existing database

`npm run seed` wipes the database. If you already have real data and just want the new exercises and foods, run this instead (in `server/`):

```bash
npm run seed:masters
```

It only **adds** exercises, foods, categories and muscle groups that don't exist yet (matched by name) and never changes or deletes anything. It's safe to run again whenever the seed data grows.

### Moving an existing `ajclan_pro` database to `trainovax`

If you installed before the TrainovaX rename, set `DB_NAME=trainovax` in `server/.env` and run (in `server/`):

```bash
npm run db:rename      # moves every table + data from ajclan_pro into trainovax, then drops the empty ajclan_pro
npm run migrate
```

## 8. Demo login credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@trainovax.fit` | `Admin@123` |
| Admin — Elevate Fitness Studio (desktop) | `ajay@trainovax.fit` | `Trainer@123` |
| Admin — Iron Pulse Gym (desktop) | `priya@ironpulse.fit` | `Trainer@123` |
| Trainer — Elevate Fitness (mobile app) | `rohit@trainovax.fit` | `Trainer@123` |
| Trainer — Iron Pulse (mobile app) | `vivek@ironpulse.fit` | `Trainer@123` |
| Client (mobile app) | `rahul@example.com` | `Client@123` |

Trainer client codes for testing sign-up: `ROHIT01`, `VIVEK01`, `AJAY01`, `PRIYA01`. All 10 clients use `Client@123` (e.g. `sneha@`, `vikram@`, `ananya@`, `arjun@`, `pooja@`, `rohan@`, `isha@example.com`).
In development the login page shows one-click demo chips.

## 9. Build / run

```bash
npm run dev                  # API on http://localhost:5000 + web on http://localhost:5173 (hot reload)

# or separately
npm --prefix server run dev
npm --prefix client run dev

npm test                     # API integration tests (run against a seeded database)

# production
npm run build                # → client/dist (static files — host on Nginx, Netlify, S3…)
NODE_ENV=production npm start
```

For production set `NODE_ENV=production`, a strong `JWT_SECRET`, `CORS_ORIGIN` to your web origin, and `VITE_API_URL`
to the public API URL before building. Serve `client/dist` with an SPA fallback to `index.html`.

---

## 10a. Styling / CSS architecture

All styling lives in plain external `.css` files — there is no `sx`, `styled()` or inline style in the app code.
In the browser DevTools every rule shows its real file and line (e.g. `StatCard.css:4`), so you can inspect and edit it like a normal HTML site.

| File | What it holds |
|---|---|
| `client/src/styles/tokens.css` | Design tokens (`--color-primary`, spacing, radii, shadows, layout sizes). Change a value here to restyle everything. |
| `client/src/styles/base.css` | Resets, body font and small helpers (`.text-muted`, `.row`, `.stack`, `.truncate` …). |
| `client/src/styles/layout.css` | Reusable patterns: `.card`, `.grid--*`, `.form-grid`, `.split--*`, `.icon-tile`, `.tone--*`. |
| `client/src/styles/mui-overrides.css` | The look of MUI widgets (buttons, inputs, chips, dialogs, tabs …). |
| `Component.css` next to each `Component.jsx` | That component's own styles, BEM-named (`.stat-card__value`, `.sidebar__link`). |

Notes:
- MUI still supplies the base behaviour/styles of its widgets (like any UI library); `StyledEngineProvider injectFirst` makes our CSS load after and override them.
- Desktop pages respond to the content width with `@container content (...)` rules; the Trainer/Client app is a fixed phone-width column and `body.is-app` switches dialogs/sheets to app styling.
- Data-driven values (chart height, progress %, per-item colours) are passed as CSS variables, e.g. `style={{ '--chart-height': '280px' }}`.
- `vite.config.js` enables CSS source maps in dev (`npm run dev`) so DevTools links straight to the source file.

## 10. Security

- Passwords hashed with bcrypt (`bcryptjs`, no native build needed); hashes and reset tokens are never returned by the API.
- JWT bearer auth; users are re-loaded on each request so deactivation takes effect immediately.
- RBAC: permission matrix in `server/config/permissions.js` (seeded into `roles/permissions/role_permissions`),
  enforced with `authorize()` / `requirePermission()` plus **row-level scoping** (`services/accessService.js`):
  trainers only reach their own clients, clients only their own data.
- Zod validation on every write endpoint; sort columns are whitelisted; every query uses placeholders (SQL-injection safe).
- Helmet security headers, CORS allow-list, global + stricter auth rate limiting, 5 MB upload limit with MIME allow-list.
- Password reset tokens are random 256-bit values stored as SHA-256 hashes with 1-hour expiry.
- Centralised error handler hides internals in production; audit log for sign-ins, CRUD, status changes, imports/exports.
- Wire an email provider into `controllers/authController.js#forgotPassword` for production reset emails
  (in development the reset link is logged and shown on screen).

## 11. Testing done

- `npm test` — 10 integration tests (incl. trainer vs admin data scoping, login tabs, trainer & client sign-up): auth failures, RBAC between roles, trainer data isolation, validation errors,
  end-to-end client → workout plan (reorder keeps ids) → client logging → measurement → notifications, diet macro totals,
  messaging permissions.
- Every page of all three roles was loaded in headless Chromium (desktop 1440 px and mobile 390 px) with zero console or
  API errors; the diet-builder-from-template and add-client wizard flows were clicked through end-to-end.

See `docs/API.md` for the full endpoint list and `docs/DATABASE.md` for the schema.

## 12. Troubleshooting

| Message | Fix |
|---|---|
| `ECONNREFUSED … :3306` (older versions printed an empty "Migration failed:") | MySQL isn't running or is on another port. Windows: `Win+R → services.msc → MySQL80 → Start` (or `net start MySQL80` in an admin terminal). Check `DB_PORT`. |
| `ER_ACCESS_DENIED_ERROR` | Wrong `DB_USER` / `DB_PASSWORD` in `server/.env`. |
| `ER_NOT_SUPPORTED_AUTH_MODE` | `ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'yourpassword';` |

`DB_HOST=localhost` is automatically treated as `127.0.0.1` to avoid IPv6 (`::1`) connection issues on Windows.
