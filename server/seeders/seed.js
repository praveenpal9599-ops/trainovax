/**
 * Development seed — demonstrates the complete application.
 * WARNING: wipes all data in the configured database.
 *
 *   npm run seed
 */
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pool, { query, transaction } from '../config/db.js';
import env, { describeDbError } from '../config/env.js';
import { migrate } from '../database/migrate.js';
import { ROLE_DEFS, PERMISSIONS, ROLE_PERMISSIONS } from '../config/permissions.js';
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS, EXERCISES } from './data/exercises.js';
import { FOOD_CATEGORIES, FOODS } from './data/foods.js';
import { WORKOUT_TEMPLATES, DIET_TEMPLATES } from './data/templates.js';
import { createNested, loadNested, toPayload } from '../services/planService.js';
import { WORKOUT_PLAN, WORKOUT_TEMPLATE, DIET_PLAN, DIET_TEMPLATE } from '../services/planStructures.js';
import { today, addDays, isoWeekday } from '../utils/dates.js';
import { calcBmi, round1 } from '../utils/fitness.js';

// Deterministic PRNG so every developer gets the same dataset
let seed = 20240917;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const between = (a, b) => a + rand() * (b - a);
const chance = (p) => rand() < p;
const pickOne = (arr) => arr[Math.floor(rand() * arr.length)];

const TABLES = [
  'audit_logs', 'notifications', 'messages', 'tasks', 'water_logs', 'diet_logs', 'workout_logs', 'progress_photos', 'progress_records',
  'diet_foods', 'diet_meals', 'diet_plans', 'diet_template_foods', 'diet_template_meals', 'diet_templates',
  'workout_exercises', 'workout_days', 'workout_plans', 'workout_template_exercises', 'workout_template_days', 'workout_templates',
  'attendance', 'client_notes', 'client_profiles', 'clients', 'trainers', 'subscriptions', 'subscription_plans', 'users', 'organizations',
  'foods', 'food_categories', 'exercises', 'exercise_categories', 'muscle_groups', 'role_permissions', 'permissions', 'roles', 'settings',
];

const DEMO_PASSWORDS = { super_admin: 'Admin@123', admin: 'Trainer@123', client: 'Client@123' };

async function wipe() {
  await query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of TABLES) await query(`TRUNCATE TABLE ${t}`);
  await query('SET FOREIGN_KEY_CHECKS = 1');
}

async function insert(table, row) {
  const r = await query(`INSERT INTO ${table} SET ?`, [row]);
  return r.insertId;
}

async function seedRbac() {
  const roleIds = {};
  for (const r of ROLE_DEFS) roleIds[r.name] = await insert('roles', r);
  const permIds = {};
  for (const [code, description] of Object.entries(PERMISSIONS)) permIds[code] = await insert('permissions', { code, module: code.split('.')[0], description });
  for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
    await query('INSERT INTO role_permissions (role_id, permission_id) VALUES ?', [codes.map((c) => [roleIds[role], permIds[c]])]);
  }
  return roleIds;
}

async function seedSettings() {
  const rows = [
    ['platform_name', 'TrainovaX', 'string', 'general', 'Platform name', 1],
    ['support_email', 'support@trainovax.fit', 'string', 'general', 'Support email', 1],
    ['default_currency', 'INR', 'string', 'general', 'Default currency', 1],
    ['default_timezone', 'Asia/Kolkata', 'string', 'general', 'Default timezone', 1],
    ['allow_registration', 'true', 'boolean', 'access', 'Allow new trainers to self-register', 1],
    ['trial_days', '14', 'number', 'billing', 'Free trial length (days)', 0],
    ['default_water_goal_ml', '3000', 'number', 'client', 'Default daily water goal (ml)', 0],
    ['progress_reminder_days', '14', 'number', 'client', 'Remind clients to update progress after (days)', 0],
    ['max_upload_mb', String(Math.round(env.uploadMaxBytes / 1048576)), 'number', 'system', 'Maximum upload size (MB)', 0],
    ['maintenance_mode', 'false', 'boolean', 'system', 'Maintenance mode', 1],
  ];
  await query('INSERT INTO settings (setting_key, setting_value, value_type, setting_group, label, is_public) VALUES ?', [rows]);
}

async function seedMasters(superAdminId) {
  const cat = {}; const mus = {}; const fcat = {};
  for (const n of EXERCISE_CATEGORIES) cat[n] = await insert('exercise_categories', { name: n });
  for (const n of MUSCLE_GROUPS) mus[n] = await insert('muscle_groups', { name: n });
  for (const n of FOOD_CATEGORIES) fcat[n] = await insert('food_categories', { name: n });

  const exercises = {};
  for (const [name, c, pm, sm, equipment, difficulty, type, sets, reps, dur, rest, description, instructions] of EXERCISES) {
    exercises[name] = await insert('exercises', {
      name, description, instructions, category_id: cat[c], primary_muscle_id: mus[pm], secondary_muscle_id: sm ? mus[sm] : null,
      equipment, difficulty, exercise_type: type, default_sets: sets, default_reps: reps, default_duration_sec: dur,
      default_rest_sec: rest, status: 'active', created_by: superAdminId,
    });
  }
  const foods = {};
  for (const [name, c, size, unit, kcal, p, carb, fat, fib, sug, na, veg, vegan, allergens] of FOODS) {
    foods[name] = await insert('foods', {
      name, category_id: fcat[c], serving_size: size, serving_unit: unit, calories: kcal, protein_g: p, carbs_g: carb, fat_g: fat,
      fiber_g: fib, sugar_g: sug, sodium_mg: na, is_vegetarian: veg, is_vegan: vegan, allergens, status: 'active', created_by: superAdminId,
    });
  }
  return { exercises, foods };
}

async function seedTemplates(superAdminId, { exercises, foods }) {
  const workout = {}; const diet = {};
  for (const t of WORKOUT_TEMPLATES) {
    workout[t.goal] = await createNested(WORKOUT_TEMPLATE, {
      name: t.name, description: t.description, goal: t.goal, difficulty: t.difficulty, duration_weeks: t.duration_weeks,
      status: 'active', organization_id: null, created_by: superAdminId,
      days: t.days.map((d) => ({
        name: d.name, day_of_week: d.dow, focus: d.focus,
        exercises: d.ex.map(([n, sets, reps, dur, rest, weight, tempo, notes]) => {
          if (!exercises[n]) throw new Error(`Unknown exercise in template: ${n}`);
          return { exercise_id: exercises[n], sets, reps, duration_sec: dur, rest_sec: rest, weight_kg: weight ?? null, tempo: tempo ?? null, notes: notes ?? null };
        }),
      })),
    });
  }
  for (const t of DIET_TEMPLATES) {
    diet[t.name] = await createNested(DIET_TEMPLATE, {
      name: t.name, description: t.description, goal: t.goal, diet_type: t.diet_type, target_calories: t.target_calories,
      status: 'active', organization_id: null, created_by: superAdminId,
      meals: t.meals.map((m) => ({
        meal_type: m.type, name: m.name, meal_time: m.time,
        foods: m.foods.map(([n, q, notes]) => {
          if (!foods[n]) throw new Error(`Unknown food in template: ${n}`);
          return { food_id: foods[n], quantity: q, notes: notes ?? null };
        }),
      })),
    });
  }
  return { workout, diet };
}

/* ------------------------------------------------------------------------------------------ */

const ORGS = [
  { name: 'Elevate Fitness Studio', slug: 'elevate-fitness', email: 'hello@elevatefitness.in', phone: '+91 98110 45521', address: 'Sector 18, Dwarka', city: 'New Delhi', created: 330, plan: 'Professional', subStatus: 'active' },
  { name: 'Iron Pulse Gym', slug: 'iron-pulse-gym', email: 'contact@ironpulse.fit', phone: '+91 99200 31877', address: 'Linking Road, Bandra West', city: 'Mumbai', created: 240, plan: 'Starter', subStatus: 'active' },
  { name: 'FitNation Studio', slug: 'fitnation-studio', email: 'team@fitnation.in', phone: '+91 90080 11223', address: 'Indiranagar 100 Ft Road', city: 'Bengaluru', created: 9, plan: 'Starter', subStatus: 'trial' },
];

const TRAINERS = [
  { org: 0, role: 'admin', name: 'Ajay Singh', email: 'ajay@trainovax.fit', code: 'AJAY01', phone: '+91 98110 45521', specialization: 'Fat loss, strength & conditioning', experience_years: 9, certifications: 'ACE-CPT, K11 Sports Nutrition', bio: 'Founder of TrainovaX. Helps busy professionals lose fat and build lasting strength.' },
  { org: 1, role: 'admin', name: 'Priya Sharma', email: 'priya@ironpulse.fit', code: 'PRIYA01', phone: '+91 99200 31877', specialization: 'Hypertrophy & women\'s strength', experience_years: 6, certifications: 'NASM-CPT, Precision Nutrition L1', bio: 'Strength coach focused on sustainable muscle gain and body recomposition.' },
  { org: 0, role: 'trainer', name: 'Rohit Kumar', email: 'rohit@trainovax.fit', code: 'ROHIT01', phone: '+91 98730 22114', specialization: 'Weight loss & functional training', experience_years: 5, certifications: 'ACSM-CPT, CrossFit L1', bio: 'Keeps sessions fun and sustainable — specialises in fat loss for beginners.' },
  { org: 1, role: 'trainer', name: 'Vivek Rana', email: 'vivek@ironpulse.fit', code: 'VIVEK01', phone: '+91 99300 76521', specialization: 'Endurance & strength', experience_years: 4, certifications: 'ISSA-CPT', bio: 'Runner and lifter helping clients build engines that last.' },
];

// trainer index, tenure (days since joining), adherence 0..1
const CLIENTS = [
  { t: 2, name: 'Rahul Verma', email: 'rahul@example.com', gender: 'male', age: 32, h: 176, w: 92.4, goal: 'weight_loss', tenure: 182, adh: 0.88, bf: 28.5, diet: 'Weight Loss Plan', occupation: 'Software engineer', target: 78, pref: 'non_vegetarian', level: 'beginner', notes: 'Desk job, mild lower-back stiffness. Prefers early-morning sessions.' },
  { t: 2, name: 'Sneha Kapoor', email: 'sneha@example.com', gender: 'female', age: 28, h: 162, w: 68.2, goal: 'weight_loss', tenure: 150, adh: 0.82, bf: 31.2, diet: 'Vegetarian Fat Loss (Indian)', occupation: 'Marketing manager', target: 58, pref: 'vegetarian', level: 'beginner', notes: 'Vegetarian. Wants to prepare for her wedding in March.' },
  { t: 0, name: 'Vikram Malhotra', email: 'vikram@example.com', gender: 'male', age: 35, h: 181, w: 74.5, goal: 'muscle_gain', tenure: 168, adh: 0.9, bf: 18.4, diet: 'Lean Muscle Gain', occupation: 'Chartered accountant', target: 82, pref: 'non_vegetarian', level: 'intermediate', notes: 'Hard gainer. Track calorie intake closely.' },
  { t: 0, name: 'Ananya Iyer', email: 'ananya@example.com', gender: 'female', age: 26, h: 158, w: 54.8, goal: 'strength_training', tenure: 120, adh: 0.93, bf: 24.0, diet: 'Vegan Balanced', occupation: 'Physiotherapy student', target: 56, pref: 'vegan', level: 'intermediate', notes: 'Vegan. Aiming for a 100 kg deadlift.' },
  { t: 2, name: 'Karan Mehta', email: 'karan@example.com', gender: 'male', age: 41, h: 172, w: 88.0, goal: 'general_fitness', tenure: 70, adh: 0.64, bf: 27.0, diet: 'Weight Loss Plan', occupation: 'Business owner', target: 80, pref: 'non_vegetarian', level: 'beginner', notes: 'Pre-diabetic (HbA1c 6.1). Travels often — keep sessions flexible.', medical: 'Pre-diabetes' },
  { t: 0, name: 'Meera Joshi', email: 'meera@example.com', gender: 'female', age: 47, h: 160, w: 71.5, goal: 'flexibility', tenure: 210, adh: 0.55, bf: 33.5, diet: 'Vegetarian Fat Loss (Indian)', occupation: 'School principal', target: 65, pref: 'vegetarian', level: 'beginner', notes: 'Knee discomfort on deep squats. Paused membership for travel.', status: 'inactive', injuries: 'Mild right-knee pain' },
  { t: 1, name: 'Arjun Nair', email: 'arjun@example.com', gender: 'male', age: 29, h: 178, w: 70.2, goal: 'muscle_gain', tenure: 140, adh: 0.86, bf: 15.8, diet: 'Lean Muscle Gain', occupation: 'Product designer', target: 77, pref: 'non_vegetarian', level: 'intermediate', notes: 'Wants to add size to shoulders and back.' },
  { t: 1, name: 'Pooja Reddy', email: 'pooja@example.com', gender: 'female', age: 33, h: 165, w: 72.0, goal: 'weight_loss', tenure: 112, adh: 0.78, bf: 32.4, diet: 'Weight Loss Plan', occupation: 'HR business partner', target: 62, pref: 'eggetarian', level: 'beginner', notes: 'Postpartum (18 months). Focus on core rehab first.' },
  { t: 3, name: 'Rohan Das', email: 'rohan@example.com', gender: 'male', age: 24, h: 174, w: 66.0, goal: 'endurance', tenure: 84, adh: 0.91, bf: 14.2, diet: 'Performance & Endurance Fuel', occupation: 'Graduate student', target: 66, pref: 'eggetarian', level: 'intermediate', notes: 'Training for the Mumbai Half Marathon in January.' },
  { t: 3, name: 'Isha Gupta', email: 'isha@example.com', gender: 'female', age: 30, h: 168, w: 61.5, goal: 'strength_training', tenure: 28, adh: 0.72, bf: 26.1, diet: 'Vegan Balanced', occupation: 'Lawyer', target: 60, pref: 'vegetarian', level: 'beginner', notes: 'New client — completed assessment. First time lifting.' },
];

const WEEKLY_TREND = { weight_loss: -0.42, muscle_gain: 0.17, strength_training: 0.05, endurance: -0.05, general_fitness: -0.2, flexibility: -0.1 };
const BF_TREND = { weight_loss: -0.35, muscle_gain: -0.08, strength_training: -0.15, endurance: -0.12, general_fitness: -0.18, flexibility: -0.1 };

async function main() {
  await migrate({ silent: true });
  console.log('→ wiping existing data');
  await wipe();

  const roleIds = await seedRbac();
  await seedSettings();

  const hash = {
    super_admin: await bcrypt.hash(DEMO_PASSWORDS.super_admin, 10),
    admin: await bcrypt.hash(DEMO_PASSWORDS.admin, 10),
    client: await bcrypt.hash(DEMO_PASSWORDS.client, 10),
  };
  const daysAgo = (n, h = 10) => `${addDays(today(), -n)} ${String(h).padStart(2, '0')}:${String(Math.floor(rand() * 59)).padStart(2, '0')}:00`;

  // --- Super admin
  const superAdminId = await insert('users', { role_id: roleIds.super_admin, name: 'Platform Admin', email: 'admin@trainovax.fit', password_hash: hash.super_admin, phone: '+91 11 4000 1000', created_at: daysAgo(365) });

  // --- Masters & templates
  console.log('→ exercise & food masters');
  const masters = await seedMasters(superAdminId);
  console.log('→ workout & diet templates');
  const templates = await seedTemplates(superAdminId, masters);

  // --- Subscription plans
  const planIds = {};
  for (const p of [
    { name: 'Starter', description: 'For independent personal trainers', price_monthly: 999, price_yearly: 9990, max_trainers: 1, max_clients: 25 },
    { name: 'Professional', description: 'For boutique studios and small teams', price_monthly: 2499, price_yearly: 24990, max_trainers: 5, max_clients: 150 },
    { name: 'Enterprise', description: 'For multi-location gyms', price_monthly: 6999, price_yearly: 69990, max_trainers: 50, max_clients: 2000 },
  ]) planIds[p.name] = await insert('subscription_plans', p);

  // --- Organizations, subscriptions, trainers
  console.log('→ organizations, trainers & clients');
  const orgIds = [];
  for (const o of ORGS) {
    const id = await insert('organizations', { name: o.name, slug: o.slug, email: o.email, phone: o.phone, address: o.address, city: o.city, country: 'India', status: 'active', created_at: daysAgo(o.created) });
    orgIds.push(id);
    const price = (await query('SELECT price_monthly FROM subscription_plans WHERE id = ?', [planIds[o.plan]]))[0].price_monthly;
    await insert('subscriptions', {
      organization_id: id, plan_id: planIds[o.plan], billing_cycle: 'monthly', amount: o.subStatus === 'trial' ? 0 : price, status: o.subStatus,
      start_date: addDays(today(), -o.created), end_date: o.subStatus === 'trial' ? addDays(today(), 14 - o.created) : addDays(today(), 30 - (o.created % 30)),
    });
  }
  const trainers = [];
  for (const t of TRAINERS) {
    const userId = await insert('users', { role_id: roleIds[t.role], organization_id: orgIds[t.org], name: t.name, email: t.email, password_hash: hash.admin, phone: t.phone, last_login_at: daysAgo(0, 9), created_at: daysAgo(ORGS[t.org].created) });
    const trainerId = await insert('trainers', { user_id: userId, organization_id: orgIds[t.org], invite_code: t.code, specialization: t.specialization, experience_years: t.experience_years, certifications: t.certifications, bio: t.bio });
    trainers.push({ ...t, userId, trainerId, orgId: orgIds[t.org] });
  }

  // --- Clients
  const clients = [];
  for (const c of CLIENTS) {
    const tr = trainers[c.t];
    const status = c.status || 'active';
    const joined = addDays(today(), -c.tenure);
    const userId = await insert('users', { role_id: roleIds.client, organization_id: tr.orgId, name: c.name, email: c.email, password_hash: hash.client, phone: `+91 9${Math.floor(100000000 + rand() * 899999999)}`, status, last_login_at: status === 'active' ? daysAgo(Math.floor(rand() * 3), 7) : null, created_at: `${joined} 10:00:00` });
    const phone = (await query('SELECT phone FROM users WHERE id = ?', [userId]))[0].phone;
    const clientId = await insert('clients', {
      user_id: userId, organization_id: tr.orgId, trainer_id: tr.trainerId, full_name: c.name, email: c.email, phone, age: c.age, gender: c.gender,
      height_cm: c.h, starting_weight_kg: c.w, current_weight_kg: c.w, fitness_goal: c.goal, notes: c.notes, status, joined_on: joined, created_at: `${joined} 10:00:00`,
    });
    await insert('client_profiles', {
      client_id: clientId, date_of_birth: `${new Date().getFullYear() - c.age}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`,
      address: tr.org === 0 ? 'New Delhi' : 'Mumbai', occupation: c.occupation, emergency_contact_name: 'Family contact', emergency_contact_phone: '+91 98000 00000',
      target_weight_kg: c.target, activity_level: pickOne(['sedentary', 'light', 'moderate']), experience_level: c.level, dietary_preference: c.pref,
      medical_conditions: c.medical || null, injuries: c.injuries || null, allergies: c.pref === 'vegan' ? 'Dairy (intolerance)' : null,
      workout_days_per_week: c.goal === 'strength_training' ? 3 : c.goal === 'endurance' ? 4 : 6,
      preferred_workout_time: pickOne(['early_morning', 'morning', 'evening']), sleep_hours: round1(between(6, 8)), water_goal_ml: 3000,
    });
    clients.push({ ...c, id: clientId, userId, trainer: tr, status, joined });
  }

  // --- Progress records (every 14 days across tenure)
  console.log('→ progress history');
  for (const c of clients) {
    const recordCount = Math.floor(c.tenure / 14) + 1;
    const stopEarly = c.status === 'inactive' ? 4 : 0; // inactive client stopped updating
    let weight = c.w; let bf = c.bf;
    let chest = c.gender === 'male' ? between(98, 108) : between(86, 94);
    let waist = c.gender === 'male' ? 70 + (c.w - 60) * 0.55 : 62 + (c.w - 50) * 0.6;
    let arms = c.gender === 'male' ? between(31, 36) : between(26, 30);
    let thighs = c.gender === 'male' ? between(54, 60) : between(52, 58);
    let hips = c.gender === 'male' ? between(96, 104) : between(96, 106);
    let neck = c.gender === 'male' ? between(37, 41) : between(31, 34);
    let calves = c.gender === 'male' ? between(36, 39) : between(33, 36);
    let lastWeight = weight;
    for (let i = 0; i < recordCount - stopEarly; i += 1) {
      const date = addDays(c.joined, i * 14);
      if (date > today()) break;
      if (i > 0) {
        const trend = WEEKLY_TREND[c.goal] * 2 * (0.6 + c.adh * 0.6);
        weight = round1(weight + trend + between(-0.35, 0.35));
        bf = round1(Math.max(8, bf + BF_TREND[c.goal] * 2 * c.adh + between(-0.25, 0.2)));
        const gain = c.goal === 'muscle_gain' || c.goal === 'strength_training';
        chest = chest + (gain ? 0.25 : -0.3) + between(-0.2, 0.2);
        waist = waist + (gain ? 0.05 : -0.45) + between(-0.2, 0.2);
        arms = arms + (gain ? 0.15 : -0.05) + between(-0.1, 0.1);
        thighs = thighs + (gain ? 0.15 : -0.25) + between(-0.15, 0.15);
        hips = hips + (gain ? 0.05 : -0.35) + between(-0.15, 0.15);
        neck += between(-0.1, 0.05); calves += (gain ? 0.08 : -0.05);
      }
      lastWeight = weight;
      await insert('progress_records', {
        client_id: c.id, recorded_by: c.trainer.userId, record_date: date, weight_kg: weight, chest_cm: round1(chest), waist_cm: round1(waist),
        arms_cm: round1(arms), thighs_cm: round1(thighs), hips_cm: round1(hips), neck_cm: round1(neck), calves_cm: round1(calves),
        body_fat_pct: bf, bmi: calcBmi(weight, c.h), notes: i === 0 ? 'Initial assessment' : chance(0.25) ? pickOne(['Great consistency this fortnight', 'Energy levels improved', 'Sleep was poor this week', 'Travelled — some missed sessions', 'New PR in the gym!']) : null,
        created_at: `${date} 09:30:00`,
      });
    }
    await query('UPDATE clients SET current_weight_kg = ? WHERE id = ?', [lastWeight, c.id]);
  }

  // --- Plans assigned from templates
  console.log('→ workout & diet plans');
  const goalToWorkout = { weight_loss: 'weight_loss', muscle_gain: 'muscle_gain', strength_training: 'strength_training', general_fitness: 'general_fitness', endurance: 'endurance', flexibility: 'general_fitness' };
  for (const c of clients) {
    const wTpl = await loadNested(WORKOUT_TEMPLATE, templates.workout[goalToWorkout[c.goal]]);
    const planStatus = c.status === 'active' ? 'active' : 'completed';
    const startDate = addDays(today(), -Math.min(c.tenure, 56));
    // An older completed plan for long-tenure clients (history)
    if (c.tenure > 100) {
      const beginner = await loadNested(WORKOUT_TEMPLATE, templates.workout.general_fitness);
      await createNested(WORKOUT_PLAN, toPayload(WORKOUT_PLAN, beginner, { client_id: c.id, trainer_id: c.trainer.trainerId, template_id: beginner.id, name: 'Onboarding – Beginner Full Body', status: 'completed', start_date: c.joined, end_date: addDays(startDate, -1), created_at: undefined }));
    }
    c.workoutPlanId = await createNested(WORKOUT_PLAN, toPayload(WORKOUT_PLAN, wTpl, {
      client_id: c.id, trainer_id: c.trainer.trainerId, template_id: wTpl.id, name: `${wTpl.name} – ${c.name.split(' ')[0]}`, status: planStatus, start_date: startDate,
    }));
    const dTpl = await loadNested(DIET_TEMPLATE, templates.diet[c.diet]);
    c.dietPlanId = await createNested(DIET_PLAN, toPayload(DIET_PLAN, dTpl, {
      client_id: c.id, trainer_id: c.trainer.trainerId, template_id: dTpl.id, name: `${dTpl.name} – ${c.name.split(' ')[0]}`, status: planStatus, start_date: startDate, water_target_ml: 3000,
    }));
  }

  // --- Workout / diet / water logs & attendance for the last 28 days
  console.log('→ workout, diet, water logs & attendance');
  for (const c of clients.filter((x) => x.status === 'active')) {
    const plan = await loadNested(WORKOUT_PLAN, c.workoutPlanId);
    const diet = await loadNested(DIET_PLAN, c.dietPlanId);
    const wRows = []; const dRows = []; const waterRows = []; const attRows = [];
    for (let back = 28; back >= 0; back -= 1) {
      const date = addDays(today(), -back);
      if (date < c.joined) continue;
      const isToday = back === 0;
      const day = plan.days.find((d) => d.day_of_week === isoWeekday(date));
      if (day) {
        const showedUp = chance(c.adh);
        if (showedUp) attRows.push([c.id, c.trainer.trainerId, date, `0${6 + Math.floor(rand() * 3)}:${pickOne(['00', '15', '30', '45'])}:00`, chance(0.12) ? 'late' : 'present', null]);
        else if (!isToday) attRows.push([c.id, c.trainer.trainerId, date, null, chance(0.3) ? 'excused' : 'absent', null]);
        day.exercises.forEach((e, i) => {
          if (isToday && i >= Math.ceil(day.exercises.length / 2)) return; // leave today partially done
          if (!showedUp && !isToday) { if (chance(0.3)) wRows.push([c.id, e.id, date, 'skipped', null, null, null]); return; }
          if (!showedUp) return;
          const done = chance(0.93);
          wRows.push([c.id, e.id, date, done ? 'completed' : 'skipped', done ? e.sets : null, done ? e.reps : null, done ? e.weight_kg : null]);
        });
      }
      diet.meals.forEach((m, i) => {
        if (isToday && i >= 2) return;
        if (chance(c.adh * 0.95)) dRows.push([c.id, m.id, date, 'completed']);
        else if (chance(0.5)) dRows.push([c.id, m.id, date, 'skipped']);
      });
      waterRows.push([c.id, date, isToday ? 1250 : Math.round(between(1800, 3400) / 250) * 250]);
    }
    if (wRows.length) await query('INSERT INTO workout_logs (client_id, workout_exercise_id, log_date, status, actual_sets, actual_reps, actual_weight_kg) VALUES ?', [wRows]);
    if (dRows.length) await query('INSERT INTO diet_logs (client_id, diet_meal_id, log_date, status) VALUES ?', [dRows]);
    if (waterRows.length) await query('INSERT INTO water_logs (client_id, log_date, amount_ml) VALUES ?', [waterRows]);
    if (attRows.length) await query('INSERT IGNORE INTO attendance (client_id, trainer_id, session_date, check_in_time, status, notes) VALUES ?', [attRows]);
  }

  // --- Trainer notes
  const NOTE_POOL = [
    'Form on squats improving — cue "chest up" at the bottom.',
    'Discussed sleep hygiene; aim for 7+ hours before training days.',
    'Increase protein at breakfast — currently under target.',
    'Great session today, energy was high.',
    'Reported mild DOMS after leg day, adjusted volume.',
  ];
  for (const c of clients) {
    for (let i = 0; i < 2 + Math.floor(rand() * 2); i += 1) {
      await insert('client_notes', { client_id: c.id, author_id: c.trainer.userId, content: pickOne(NOTE_POOL), is_pinned: i === 0 ? 1 : 0, created_at: daysAgo(Math.floor(rand() * 40)) });
    }
  }

  // --- Tasks for trainers
  const TASKS = [
    ['Review {c}\'s progress photos', 1, 'high'], ['Update {c}\'s diet plan for next phase', 2, 'medium'], ['Call {c} about missed sessions', 0, 'high'],
    ['Plan deload week for {c}', 4, 'low'], ['Monthly body-composition check-in with {c}', 6, 'medium'],
  ];
  for (const tr of trainers) {
    const mine = clients.filter((c) => c.trainer.trainerId === tr.trainerId);
    for (const [i, [title, due, priority]] of TASKS.entries()) {
      const c = mine[i % mine.length];
      await insert('tasks', { user_id: tr.userId, client_id: c.id, title: title.replace('{c}', c.name.split(' ')[0]), due_date: addDays(today(), due), priority, status: 'open' });
    }
    await insert('tasks', { user_id: tr.userId, client_id: null, title: 'Restock resistance bands for the studio', due_date: addDays(today(), -2), priority: 'low', status: 'done' });
  }

  // --- Messages
  console.log('→ messages & notifications');
  const CONVOS = [
    ['client', 'Hi coach! Finished today\'s session. The lunges were tough 😅'],
    ['trainer', 'Great work! Keep your torso upright on the lunges and take the full 60s rest.'],
    ['client', 'Will do. Should I swap brown rice for roti at lunch?'],
    ['trainer', 'Yes — 2 whole wheat rotis is a good swap. Keep the chicken portion the same.'],
    ['client', 'Perfect, thanks!'],
  ];
  for (const c of clients.filter((x) => x.status === 'active').slice(0, 7)) {
    const n = 2 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i += 1) {
      const [who, body] = CONVOS[i];
      const fromClient = who === 'client';
      const ts = daysAgo(n - i, 8 + i);
      const isLast = i === n - 1;
      await insert('messages', {
        sender_id: fromClient ? c.userId : c.trainer.userId, recipient_id: fromClient ? c.trainer.userId : c.userId, body,
        read_at: isLast && fromClient && chance(0.6) ? null : ts, created_at: ts,
      });
    }
  }
  await insert('messages', { sender_id: trainers[0].userId, recipient_id: superAdminId, body: 'Hi team, could you add a few more mobility exercises to the master library?', read_at: daysAgo(3), created_at: daysAgo(3) });
  await insert('messages', { sender_id: trainers[0].userId, recipient_id: trainers[2].userId, body: 'Rohit, please update Karan\'s diet plan before Monday.', read_at: daysAgo(1), created_at: daysAgo(1) });
  await insert('messages', { sender_id: trainers[2].userId, recipient_id: trainers[0].userId, body: 'On it — will share the new plan tomorrow.', read_at: null, created_at: daysAgo(0, 8) });
  await insert('messages', { sender_id: superAdminId, recipient_id: trainers[0].userId, body: 'Absolutely — we will add them in the next content update. Thanks for the feedback!', read_at: null, created_at: daysAgo(2) });

  // --- Notifications
  const notifRows = [];
  for (const c of clients) {
    notifRows.push([c.userId, 'workout_plan', 'Your workout plan has been updated.', 'Your trainer adjusted this week\'s exercises.', '/client/workout', daysAgo(6), daysAgo(5)]);
    notifRows.push([c.userId, 'diet_plan', 'Your trainer added a new diet plan.', 'Check your meals for the week.', '/client/diet', daysAgo(10), daysAgo(9)]);
    notifRows.push([c.userId, 'reminder', 'Time to update your progress.', 'Log your weight and measurements for this fortnight.', '/client/progress', daysAgo(1), null]);
    notifRows.push([c.userId, 'message', 'New message from your trainer.', 'Tap to read the latest message.', '/client/messages', daysAgo(0, 8), null]);
  }
  for (const tr of trainers) {
    notifRows.push([tr.userId, 'progress', 'Rahul logged new measurements', 'Weight is down 0.8 kg since last check-in.', '/admin/progress', daysAgo(1), null]);
    notifRows.push([tr.userId, 'reminder', '3 clients haven\'t updated progress in 14+ days', 'Send them a reminder from the Clients page.', '/admin/clients', daysAgo(2), null]);
    notifRows.push([tr.userId, 'announcement', 'New: Diet Plan Builder with automatic macros', 'Build meal plans from the food master — totals are calculated for you.', '/admin/diets', daysAgo(12), daysAgo(11)]);
  }
  notifRows.push([superAdminId, 'organization', 'New organization registered', 'FitNation Studio started a 14-day trial.', '/super-admin/organizations', daysAgo(9), null]);
  notifRows.push([superAdminId, 'subscription', 'Subscription renewed', 'Elevate Fitness Studio renewed the Professional plan.', '/super-admin/subscriptions', daysAgo(4), daysAgo(4)]);
  await query('INSERT INTO notifications (user_id, type, title, body, link, created_at, read_at) VALUES ?', [notifRows]);

  // --- Audit log sample
  const auditRows = [
    [superAdminId, 'login', 'user', superAdminId, 'admin@trainovax.fit signed in', '127.0.0.1', daysAgo(1)],
    [superAdminId, 'create', 'organization', orgIds[2], 'Created organization "FitNation Studio"', '127.0.0.1', daysAgo(9)],
    [superAdminId, 'create', 'exercise', 1, 'Created exercise "Barbell Bench Press"', '127.0.0.1', daysAgo(300)],
    [trainers[0].userId, 'login', 'user', trainers[0].userId, 'ajay@trainovax.fit signed in', '127.0.0.1', daysAgo(0, 9)],
    [trainers[0].userId, 'create', 'client', clients[0].id, `Created client ${clients[0].name}`, '127.0.0.1', `${clients[0].joined} 10:00:00`],
    [trainers[0].userId, 'create', 'workout_plan', clients[0].workoutPlanId, `Assigned workout plan to ${clients[0].name}`, '127.0.0.1', daysAgo(56)],
    [trainers[0].userId, 'deactivate', 'client', clients[5].id, `Deactivated client ${clients[5].name}`, '127.0.0.1', daysAgo(20)],
    [trainers[1].userId, 'create', 'progress_record', 1, `Recorded measurements for ${clients[6].name}`, '127.0.0.1', daysAgo(3)],
  ];
  await query('INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, ip_address, created_at) VALUES ?', [auditRows]);

  console.log('\n✓ Seed complete\n');
  console.log('  Demo logins');
  console.log(`  Super Admin : admin@trainovax.fit      / ${DEMO_PASSWORDS.super_admin}`);
  console.log(`  Admin       : ajay@trainovax.fit       / ${DEMO_PASSWORDS.admin}`);
  console.log(`  Admin       : priya@ironpulse.fit   / ${DEMO_PASSWORDS.admin}`);
  console.log(`  Trainer     : rohit@trainovax.fit      / ${DEMO_PASSWORDS.admin}  (mobile app)`);
  console.log(`  Trainer     : vivek@ironpulse.fit   / ${DEMO_PASSWORDS.admin}  (mobile app)`);
  console.log('  Trainer invite codes (for client sign-up): AJAY01, PRIYA01, ROHIT01, VIVEK01');
  console.log(`  Client      : rahul@example.com     / ${DEMO_PASSWORDS.client}  (all 10 clients use this password)\n`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().then(() => pool.end()).catch(async (err) => { console.error('Seed failed:', describeDbError(err)); await pool.end(); process.exit(1); });
}
export { main as seed, transaction };
