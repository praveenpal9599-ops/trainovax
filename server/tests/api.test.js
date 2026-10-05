/**
 * Integration tests — run against a seeded database:
 *   npm run seed && npm test
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../app.js';
import pool from '../config/db.js';

const api = request(app);
const tokens = {};
const auth = (role) => ({ Authorization: `Bearer ${tokens[role]}` });

before(async () => {
  for (const [role, email, password] of [['sa', 'admin@trainovax.fit', 'Admin@123'], ['tr', 'ajay@trainovax.fit', 'Trainer@123'], ['tr2', 'priya@ironpulse.fit', 'Trainer@123'], ['trainer', 'rohit@trainovax.fit', 'Trainer@123'], ['cl', 'rahul@example.com', 'Client@123']]) {
    const res = await api.post('/api/auth/login').send({ email, password });
    assert.equal(res.status, 200, `login ${email}`);
    assert.ok(!('password_hash' in res.body.user), 'password hash must never be returned');
    tokens[role] = res.body.token;
  }
});
after(() => pool.end());

test('rejects bad credentials and unauthenticated calls', async () => {
  assert.equal((await api.post('/api/auth/login').send({ email: 'ajay@trainovax.fit', password: 'nope' })).status, 401);
  assert.equal((await api.get('/api/clients')).status, 401);
  assert.equal((await api.get('/api/clients').set('Authorization', 'Bearer garbage')).status, 401);
});

test('RBAC: roles cannot reach other role endpoints', async () => {
  assert.equal((await api.get('/api/dashboard/super-admin').set(auth('tr'))).status, 403);
  assert.equal((await api.get('/api/clients').set(auth('cl'))).status, 403);
  assert.equal((await api.get('/api/users').set(auth('trainer'))).status, 403);
  assert.equal((await api.get('/api/organizations').set(auth('tr'))).status, 403);
  assert.equal((await api.get('/api/portal/dashboard').set(auth('tr'))).status, 403);
  assert.equal((await api.get('/api/audit-logs').set(auth('tr'))).status, 403);
});

test('trainer data is scoped to own clients', async () => {
  const mine = await api.get('/api/clients?all=true').set(auth('tr'));
  const theirs = await api.get('/api/clients?all=true').set(auth('tr2'));
  const overlap = mine.body.data.filter((c) => theirs.body.data.some((t) => t.id === c.id));
  assert.equal(overlap.length, 0);
  const foreign = theirs.body.data[0].id;
  assert.equal((await api.get(`/api/clients/${foreign}`).set(auth('tr'))).status, 403);
  assert.equal((await api.get(`/api/progress/${foreign}`).set(auth('tr'))).status, 403);
});

test('trainer role sees only assigned clients; admin sees the whole organization', async () => {
  const trainer = await api.get('/api/clients?all=true').set(auth('trainer'));
  const admin = await api.get('/api/clients?all=true').set(auth('tr'));
  assert.equal(trainer.status, 200);
  assert.ok(trainer.body.data.length > 0 && trainer.body.data.length < admin.body.data.length);
  assert.ok(trainer.body.data.every((c) => admin.body.data.some((a) => a.id === c.id)));
  const notMine = admin.body.data.find((c) => !trainer.body.data.some((t) => t.id === c.id));
  assert.equal((await api.get(`/api/clients/${notMine.id}`).set(auth('trainer'))).status, 403);
  assert.equal((await api.get('/api/users').set(auth('trainer'))).status, 403);
  const staff = await api.get('/api/users').set(auth('tr'));
  assert.equal(staff.status, 200);
  assert.ok(staff.body.data.every((u) => u.organization_name === 'Elevate Fitness Studio'));
});

test('validation errors are returned as 400 with details', async () => {
  const res = await api.post('/api/clients').set(auth('tr')).send({ full_name: '', age: 5 });
  assert.equal(res.status, 400);
  assert.ok(Array.isArray(res.body.details));
});

test('client → workout plan → logging → progress end-to-end', async () => {
  const email = `test.${Date.now()}@example.com`;
  const created = await api.post('/api/clients').set(auth('tr')).send({
    full_name: 'Test Client', age: 30, gender: 'male', phone: '+91 99999 00000', height_cm: 175, weight_kg: 80,
    fitness_goal: 'weight_loss', create_login: true, email, password: 'Secret123', profile: { target_weight_kg: 72 },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const clientId = created.body.data.id;
  assert.equal(created.body.data.stats.bmi, 26.1);

  const ex = await api.get('/api/exercises?pageSize=3').set(auth('tr'));
  const [e1, e2, e3] = ex.body.data.map((e) => e.id);
  const dow = ((new Date().getDay() + 6) % 7) + 1;
  const plan = await api.post('/api/workouts').set(auth('tr')).send({
    client_id: clientId, name: 'Test Plan', status: 'active',
    days: [{ name: 'Today', day_of_week: dow, exercises: [{ exercise_id: e1, sets: 3, reps: '10' }, { exercise_id: e2, sets: 3, reps: '12' }] }],
  });
  assert.equal(plan.status, 201, JSON.stringify(plan.body));
  const day = plan.body.data.days[0];
  assert.equal(day.exercises.length, 2);

  // Reorder + add an exercise: existing ids must be preserved
  const updated = await api.put(`/api/workouts/${plan.body.data.id}`).set(auth('tr')).send({
    client_id: clientId, name: 'Test Plan v2', status: 'active',
    days: [{ id: day.id, name: 'Today', day_of_week: dow, exercises: [
      { id: day.exercises[1].id, exercise_id: e2, sets: 4, reps: '12' }, { id: day.exercises[0].id, exercise_id: e1, sets: 3, reps: '10' }, { exercise_id: e3, sets: 2, reps: '15' }] }],
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.data.days[0].exercises[0].id, day.exercises[1].id);
  assert.equal(updated.body.data.days[0].exercises.length, 3);

  // Client logs in and completes today's exercise
  const login = await api.post('/api/auth/login').send({ email, password: 'Secret123' });
  const ch = { Authorization: `Bearer ${login.body.token}` };
  const today = await api.get('/api/portal/workout').set(ch);
  assert.equal(today.body.data.exercises.length, 3);
  const logged = await api.post('/api/portal/workout-logs').set(ch).send({ workout_exercise_id: today.body.data.exercises[0].id, log_date: today.body.data.date, status: 'completed' });
  assert.equal(logged.status, 200);
  assert.equal(logged.body.data.completion.done, 1);

  // Client cannot log someone else's exercise
  const other = await api.get('/api/portal/workout').set(auth('cl'));
  if (other.body.data.exercises[0]) {
    const bad = await api.post('/api/portal/workout-logs').set(ch).send({ workout_exercise_id: other.body.data.exercises[0].id, log_date: today.body.data.date, status: 'completed' });
    assert.equal(bad.status, 403);
  }

  // Progress
  const pr = await api.post('/api/progress').set(auth('tr')).send({ client_id: clientId, record_date: today.body.data.date, weight_kg: 79.2, waist_cm: 88 });
  assert.equal(pr.status, 201);
  assert.equal(pr.body.data.bmi, 25.9);
  const detail = await api.get(`/api/clients/${clientId}`).set(auth('tr'));
  assert.equal(detail.body.data.current_weight_kg, 79.2);

  // Notifications were created for the client
  const notes = await api.get('/api/notifications').set(ch);
  assert.ok(notes.body.data.some((n) => /workout plan/i.test(n.title)));

  // Clean up
  assert.equal((await api.delete(`/api/clients/${clientId}`).set(auth('tr'))).status, 200);
  assert.equal((await api.post('/api/auth/login').send({ email, password: 'Secret123' })).status, 401);
});

test('diet plan totals are calculated automatically', async () => {
  const foods = await api.get('/api/foods?search=Boiled Egg').set(auth('tr'));
  const egg = foods.body.data.find((f) => f.name === 'Boiled Egg');
  const clients = await api.get('/api/clients?status=active&pageSize=1').set(auth('tr'));
  const res = await api.post('/api/diets').set(auth('tr')).send({
    client_id: clients.body.data[0].id, name: 'Totals Test', status: 'draft',
    meals: [{ meal_type: 'breakfast', name: 'Breakfast', foods: [{ food_id: egg.id, quantity: 2 }] }],
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.totals.calories, 156);
  assert.equal(res.body.data.totals.protein_g, 12.6);
  await api.delete(`/api/diets/${res.body.data.id}`).set(auth('tr'));
});

test('messaging only between allowed pairs', async () => {
  const conv = await api.get('/api/messages/conversations').set(auth('cl'));
  const trainerUserId = conv.body.data[0].id;
  const sent = await api.post('/api/messages').set(auth('cl')).send({ recipient_id: trainerUserId, body: 'Test message' });
  assert.equal(sent.status, 201);
  const priya = (await api.get('/api/auth/me').set(auth('tr2'))).body.user.id;
  assert.equal((await api.post('/api/messages').set(auth('cl')).send({ recipient_id: priya, body: 'hi' })).status, 403);
});

test('login tabs: portal must match the account type', async () => {
  assert.equal((await api.post('/api/auth/login').send({ email: 'rahul@example.com', password: 'Client@123', portal: 'trainer' })).status, 403);
  assert.equal((await api.post('/api/auth/login').send({ email: 'rohit@trainovax.fit', password: 'Trainer@123', portal: 'client' })).status, 403);
  assert.equal((await api.post('/api/auth/login').send({ email: 'rohit@trainovax.fit', password: 'Trainer@123', portal: 'trainer' })).status, 200);
  assert.equal((await api.post('/api/auth/login').send({ email: 'ajay@trainovax.fit', password: 'Trainer@123', portal: 'trainer' })).status, 200);
});

test('sign up as trainer, then a client joins with the trainer code', async () => {
  const stamp = Date.now();
  const tr = await api.post('/api/auth/register').send({ accountType: 'trainer', name: 'Test Coach', email: `coach${stamp}@example.com`, password: 'Coach1234' });
  assert.equal(tr.status, 201, JSON.stringify(tr.body));
  assert.equal(tr.body.user.role, 'trainer');
  const code = tr.body.user.invite_code;
  assert.ok(code);
  const lookup = await api.get(`/api/auth/trainer-code/${code.toLowerCase()}`);
  assert.equal(lookup.status, 200);
  assert.equal(lookup.body.data.name, 'Test Coach');
  assert.equal((await api.get('/api/auth/trainer-code/NOPE999')).status, 404);
  const bad = await api.post('/api/auth/register').send({ accountType: 'client', name: 'X', email: `x${stamp}@example.com`, password: 'Client1234', trainerCode: 'NOPE999' });
  assert.equal(bad.status, 400);
  const cl = await api.post('/api/auth/register').send({ accountType: 'client', name: 'Test Member', email: `member${stamp}@example.com`, password: 'Client1234', trainerCode: code, weight_kg: 70, height_cm: 170, fitness_goal: 'weight_loss' });
  assert.equal(cl.status, 201, JSON.stringify(cl.body));
  assert.equal(cl.body.user.role, 'client');
  const clients = await api.get('/api/clients').set({ Authorization: `Bearer ${tr.body.token}` });
  assert.equal(clients.body.data.length, 1);
  assert.equal(clients.body.data[0].full_name, 'Test Member');
  const gym = await api.post('/api/auth/register').send({ accountType: 'trainer', isGymOwner: true, organizationName: 'Test Gym', name: 'Gym Owner', email: `owner${stamp}@example.com`, password: 'Owner1234' });
  assert.equal(gym.body.user.role, 'admin');
});
