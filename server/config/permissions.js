/**
 * RBAC definition — single source of truth for roles and permission codes.
 * Seeded into roles / permissions / role_permissions tables.
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TRAINER: 'trainer',
  CLIENT: 'client',
};

export const ROLE_DEFS = [
  { name: ROLES.SUPER_ADMIN, label: 'Super Admin', description: 'Manages the entire platform' },
  { name: ROLES.ADMIN, label: 'Admin', description: 'Gym / studio admin — manages trainers, clients and plans (desktop panel)' },
  { name: ROLES.TRAINER, label: 'Trainer', description: 'Coaches assigned clients (mobile app)' },
  { name: ROLES.CLIENT, label: 'Client', description: 'Follows plans and tracks progress' },
];

export const PERMISSIONS = {
  'dashboard.view': 'View dashboards',
  'organizations.manage': 'Create, edit and delete organizations',
  'users.manage': 'Create, edit and deactivate admins and trainers',
  'trainers.manage': 'Manage trainers in own organization',
  'clients.view': 'View clients',
  'clients.manage': 'Create, edit and delete clients',
  'exercises.view': 'View the exercise master',
  'exercises.manage': 'Create and edit exercises',
  'foods.view': 'View the food master',
  'foods.manage': 'Create and edit foods',
  'templates.view': 'View workout and diet templates',
  'templates.manage': 'Create and edit workout and diet templates',
  'workouts.view': 'View workout plans',
  'workouts.manage': 'Create and assign workout plans',
  'diets.view': 'View diet plans',
  'diets.manage': 'Create and assign diet plans',
  'progress.view': 'View progress records',
  'progress.manage': 'Record measurements and photos',
  'messages.use': 'Send and receive messages',
  'notifications.view': 'View notifications',
  'notifications.broadcast': 'Send platform notifications',
  'subscriptions.manage': 'Manage subscriptions and plans',
  'reports.view': 'View reports',
  'settings.manage': 'Manage platform settings',
  'audit.view': 'View audit logs',
  'self.workout': 'View and log own workouts',
  'self.diet': 'View and log own diet',
  'self.progress': 'View and record own progress',
};

const ALL = Object.keys(PERMISSIONS);
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ALL.filter((p) => !p.startsWith('self.')),
  [ROLES.ADMIN]: [
    'trainers.manage', 'dashboard.view', 'clients.view', 'clients.manage', 'exercises.view', 'exercises.manage',
    'foods.view', 'foods.manage', 'templates.view', 'templates.manage', 'workouts.view', 'workouts.manage',
    'diets.view', 'diets.manage', 'progress.view', 'progress.manage', 'messages.use', 'notifications.view', 'reports.view',
  ],
  [ROLES.TRAINER]: [
    'dashboard.view', 'clients.view', 'clients.manage', 'exercises.view', 'exercises.manage',
    'foods.view', 'foods.manage', 'templates.view', 'templates.manage', 'workouts.view', 'workouts.manage',
    'diets.view', 'diets.manage', 'progress.view', 'progress.manage', 'messages.use', 'notifications.view', 'reports.view',
  ],
  [ROLES.CLIENT]: ['self.workout', 'self.diet', 'self.progress', 'messages.use', 'notifications.view'],
};
