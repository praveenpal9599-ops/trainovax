/**
 * API service layer — components never call fetch directly.
 */
import { http, request } from '../api/http';

/** Standard REST resource helpers. */
const resource = (base) => ({
  list: (params) => http.get(base, params),
  get: (id) => http.get(`${base}/${id}`).then((r) => r.data),
  create: (data) => http.post(base, data).then((r) => r.data),
  update: (id, data) => http.put(`${base}/${id}`, data).then((r) => r.data),
  setStatus: (id, status) => http.patch(`${base}/${id}/status`, { status }).then((r) => r.data),
  remove: (id) => http.del(`${base}/${id}`),
});

export const authService = {
  login: (payload) => http.post('/auth/login', payload),
  register: (payload) => http.post('/auth/register', payload),
  trainerByCode: (code) => http.get(`/auth/trainer-code/${encodeURIComponent(code)}`).then((r) => r.data),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => http.post('/auth/reset-password', { token, password }),
  me: () => http.get('/auth/me'),
  updateMe: (data) => http.put('/auth/me', data).then((r) => r.user),
  uploadAvatar: (file) => http.upload('/auth/me/avatar', { file }).then((r) => r.user),
  changePassword: (data) => http.put('/auth/change-password', data),
  logout: () => http.post('/auth/logout').catch(() => {}),
};

export const lookupService = { get: () => http.get('/lookups').then((r) => r.data) };
export const uploadService = { image: (file) => http.upload('/uploads/image', { file }).then((r) => r.data.url) };
export const settingsPublic = () => http.get('/settings/public').then((r) => r.data);

export const dashboardService = {
  superAdmin: () => http.get('/dashboard/super-admin').then((r) => r.data),
  admin: () => http.get('/dashboard/admin').then((r) => r.data),
};

export const organizationService = resource('/organizations');
export const userService = resource('/users');
export const subscriptionPlanService = resource('/subscription-plans');
export const subscriptionService = resource('/subscriptions');
export const exerciseService = resource('/exercises');
export const foodService = resource('/foods');

export const clientService = {
  ...resource('/clients'),
  bulkStatus: (ids, status) => http.post('/clients/bulk/status', { ids, status }),
  bulkDelete: (ids) => http.post('/clients/bulk/delete', { ids }),
  uploadPhoto: (id, file) => http.upload(`/clients/${id}/photo`, { file }).then((r) => r.data),
  history: (id) => http.get(`/clients/${id}/history`).then((r) => r.data),
  logs: (id) => http.get(`/clients/${id}/logs`).then((r) => r.data),
  notes: (id) => http.get(`/clients/${id}/notes`).then((r) => r.data),
  addNote: (id, data) => http.post(`/clients/${id}/notes`, data),
  updateNote: (id, noteId, data) => http.put(`/clients/${id}/notes/${noteId}`, data),
  deleteNote: (id, noteId) => http.del(`/clients/${id}/notes/${noteId}`),
  attendance: (id) => http.get(`/clients/${id}/attendance`),
  markAttendance: (id, data) => http.post(`/clients/${id}/attendance`, data),
  deleteAttendance: (id, attendanceId) => http.del(`/clients/${id}/attendance/${attendanceId}`),
};

const planResource = (base, templateBase) => ({
  ...resource(base),
  duplicate: (id, data = {}) => http.post(`${base}/${id}/duplicate`, data).then((r) => r.data),
  saveAsTemplate: (id, name) => http.post(`${base}/${id}/save-as-template`, { name }).then((r) => r.data),
  fromTemplate: (data) => http.post(`${base}/from-template`, data).then((r) => r.data),
  templates: {
    ...resource(templateBase),
    duplicate: (id) => http.post(`${templateBase}/${id}/duplicate`, {}).then((r) => r.data),
  },
});
export const workoutService = planResource('/workouts', '/workout-templates');
export const dietService = planResource('/diets', '/diet-templates');

export const progressService = {
  list: (clientId, params) => http.get(`/progress/${clientId}`, params),
  create: (data) => http.post('/progress', data).then((r) => r.data),
  update: (id, data) => http.put(`/progress/${id}`, data).then((r) => r.data),
  remove: (id) => http.del(`/progress/${id}`),
  photos: (clientId) => http.get(`/progress/${clientId}/photos`).then((r) => r.data),
  uploadPhoto: (fields) => http.upload('/progress/photos', fields).then((r) => r.data),
  deletePhoto: (id) => http.del(`/progress/photos/${id}`),
};

export const portalService = {
  dashboard: () => http.get('/portal/dashboard').then((r) => r.data),
  workout: (date) => http.get('/portal/workout', { date }).then((r) => r.data),
  diet: (date) => http.get('/portal/diet', { date }).then((r) => r.data),
  logWorkout: (data) => http.post('/portal/workout-logs', data).then((r) => r.data),
  logDiet: (data) => http.post('/portal/diet-logs', data).then((r) => r.data),
  logWater: (data) => http.put('/portal/water', data),
  profile: () => http.get('/portal/profile').then((r) => r.data),
  updateProfile: (data) => http.put('/portal/profile', data).then((r) => r.data),
};

export const messageService = {
  conversations: () => http.get('/messages/conversations').then((r) => r.data),
  thread: (withId) => http.get('/messages', { with: withId }),
  send: (recipientId, body, attachment) => (attachment
    ? http.upload('/messages', { recipient_id: recipientId, body, attachment })
    : http.post('/messages', { recipient_id: recipientId, body })).then((r) => r.data),
  unreadCount: () => http.get('/messages/unread-count').then((r) => r.data.unread),
};

export const notificationService = {
  list: (params) => http.get('/notifications', params),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch('/notifications/read-all'),
  remove: (id) => http.del(`/notifications/${id}`),
  broadcast: (data) => http.post('/notifications/broadcast', data).then((r) => r.data),
  broadcasts: () => http.get('/notifications/broadcasts').then((r) => r.data),
  sendToClients: (data) => http.post('/notifications/send', data).then((r) => r.data),
};

export const taskService = {
  list: (status) => http.get('/tasks', { status }).then((r) => r.data),
  create: (data) => http.post('/tasks', data).then((r) => r.data),
  update: (id, data) => http.patch(`/tasks/${id}`, data).then((r) => r.data),
  remove: (id) => http.del(`/tasks/${id}`),
};

export const reportService = { overview: (days) => http.get('/reports/overview', { days }).then((r) => r.data) };
export const settingsService = {
  list: () => http.get('/settings').then((r) => r.data),
  update: (values) => http.put('/settings', values).then((r) => r.data),
};
export const auditService = { list: (params) => http.get('/audit-logs', params) };
export const backupService = {
  exportJson: async () => {
    const res = await request('GET', '/backup/export', { raw: true });
    if (!res.ok) throw new Error('Export failed');
    return res.json();
  },
  importJson: (data) => http.post('/backup/import', data).then((r) => r.data),
};
