import asyncHandler from '../utils/asyncHandler.js';
import { query, queryOne } from '../config/db.js';
import { clientScope } from '../services/accessService.js';
import { dailyAdherence, summarize } from '../services/adherenceService.js';
import { round1 } from '../utils/fitness.js';

function lastMonths(n) {
  const out = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i -= 1) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

/** Average weight change from start (kg) per month across a set of clients. */
function weightTrend(records, months) {
  const byClient = new Map();
  for (const r of records) { if (!byClient.has(r.client_id)) byClient.set(r.client_id, []); byClient.get(r.client_id).push(r); }
  return months.map((m) => {
    const changes = [];
    for (const recs of byClient.values()) {
      const upto = recs.filter((r) => r.record_date.slice(0, 7) <= m);
      if (upto.length >= 1 && recs[0].record_date.slice(0, 7) <= m) changes.push(upto[upto.length - 1].weight_kg - recs[0].weight_kg);
    }
    return { month: m, avg_change_kg: changes.length ? round1(changes.reduce((a, b) => a + b, 0) / changes.length) : null, clients: changes.length };
  });
}

export const admin = asyncHandler(async (req, res) => {
  const scope = clientScope(req.user);
  const clientRows = await query(`SELECT c.id, c.status FROM clients c WHERE c.deleted_at IS NULL AND ${scope.sql}`, scope.params);
  const ids = clientRows.map((c) => c.id);
  const activeIds = clientRows.filter((c) => c.status === 'active').map((c) => c.id);
  const inIds = ids.length ? ids : [0];

  const [counts, recentClients, tasks, records, goals, adherence, attention, recentProgress] = await Promise.all([
    queryOne(`SELECT
        (SELECT COUNT(*) FROM workout_plans WHERE client_id IN (?) AND status = 'active' AND deleted_at IS NULL) AS workout_plans,
        (SELECT COUNT(*) FROM diet_plans WHERE client_id IN (?) AND status = 'active' AND deleted_at IS NULL) AS diet_plans,
        (SELECT COUNT(*) FROM progress_records WHERE client_id IN (?) AND deleted_at IS NULL AND record_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) AS progress_updates,
        (SELECT COUNT(*) FROM clients WHERE id IN (?) AND created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS new_this_month`, [inIds, inIds, inIds, inIds]),
    query(`SELECT c.id, c.full_name, c.photo_url, c.fitness_goal, c.status, c.current_weight_kg, c.starting_weight_kg, c.created_at,
        (SELECT MAX(record_date) FROM progress_records pr WHERE pr.client_id = c.id AND pr.deleted_at IS NULL) AS last_progress_date
        FROM clients c WHERE c.id IN (?) ORDER BY c.created_at DESC LIMIT 6`, [inIds]),
    query(`SELECT t.*, c.full_name AS client_name FROM tasks t LEFT JOIN clients c ON c.id = t.client_id
        WHERE t.user_id = ? AND t.status = 'open' AND t.deleted_at IS NULL ORDER BY t.due_date IS NULL, t.due_date LIMIT 6`, [req.user.id]),
    query(`SELECT client_id, record_date, weight_kg FROM progress_records WHERE client_id IN (?) AND deleted_at IS NULL AND weight_kg IS NOT NULL ORDER BY client_id, record_date`, [inIds]),
    query('SELECT fitness_goal AS goal, COUNT(*) AS count FROM clients WHERE id IN (?) GROUP BY fitness_goal ORDER BY count DESC', [inIds]),
    dailyAdherence(activeIds, 7),
    query(`SELECT c.id, c.full_name, c.photo_url, MAX(pr.record_date) AS last_progress_date FROM clients c
        LEFT JOIN progress_records pr ON pr.client_id = c.id AND pr.deleted_at IS NULL
        WHERE c.id IN (?) AND c.status = 'active' GROUP BY c.id HAVING last_progress_date IS NULL OR last_progress_date < DATE_SUB(CURDATE(), INTERVAL 14 DAY)
        ORDER BY last_progress_date LIMIT 5`, [inIds]),
    query(`SELECT pr.id, pr.record_date, pr.weight_kg, pr.body_fat_pct, c.id AS client_id, c.full_name, c.photo_url FROM progress_records pr
        JOIN clients c ON c.id = pr.client_id WHERE pr.client_id IN (?) AND pr.deleted_at IS NULL ORDER BY pr.record_date DESC, pr.id DESC LIMIT 5`, [inIds]),
  ]);

  // Per-client weight change leaderboard
  const byClient = new Map();
  for (const r of records) { if (!byClient.has(r.client_id)) byClient.set(r.client_id, []); byClient.get(r.client_id).push(r); }
  const names = ids.length ? await query('SELECT id, full_name FROM clients WHERE id IN (?)', [ids]) : [];
  const clientWeightChange = [...byClient.entries()].filter(([, recs]) => recs.length > 1).map(([id, recs]) => ({
    client_id: id, name: names.find((n) => n.id === id)?.full_name, start: recs[0].weight_kg, current: recs[recs.length - 1].weight_kg,
    change_kg: round1(recs[recs.length - 1].weight_kg - recs[0].weight_kg),
  })).sort((a, b) => a.change_kg - b.change_kg).slice(0, 8);

  res.json({
    success: true,
    data: {
      stats: {
        total_clients: ids.length, active_clients: activeIds.length, inactive_clients: ids.length - activeIds.length, ...counts,
        ...summarize(adherence),
      },
      recentClients, tasks, goals, adherence, attention, recentProgress, clientWeightChange,
      weightTrend: weightTrend(records, lastMonths(6)),
    },
  });
});

export const superAdmin = asyncHandler(async (_req, res) => {
  const months = lastMonths(12);
  const [stats, clientGrowth, orgGrowth, byPlan, goals, topOrgs, activity, recentOrgs] = await Promise.all([
    queryOne(`SELECT
        (SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL) AS organizations,
        (SELECT COUNT(*) FROM organizations WHERE deleted_at IS NULL AND status = 'active') AS active_organizations,
        (SELECT COUNT(*) FROM trainers t JOIN users u ON u.id = t.user_id WHERE t.deleted_at IS NULL AND u.deleted_at IS NULL) AS trainers,
        (SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL) AS clients,
        (SELECT COUNT(*) FROM clients WHERE deleted_at IS NULL AND status = 'active') AS active_clients,
        (SELECT COUNT(*) FROM exercises WHERE deleted_at IS NULL) AS exercises,
        (SELECT COUNT(*) FROM foods WHERE deleted_at IS NULL) AS foods,
        (SELECT COUNT(*) FROM workout_templates WHERE deleted_at IS NULL) + (SELECT COUNT(*) FROM diet_templates WHERE deleted_at IS NULL) AS templates,
        (SELECT COUNT(*) FROM subscriptions WHERE deleted_at IS NULL AND status IN ('active','trial')) AS active_subscriptions,
        (SELECT COALESCE(SUM(CASE WHEN billing_cycle = 'yearly' THEN amount / 12 ELSE amount END), 0) FROM subscriptions WHERE deleted_at IS NULL AND status = 'active') AS mrr,
        (SELECT COUNT(*) FROM workout_plans WHERE deleted_at IS NULL AND status = 'active') AS active_workout_plans,
        (SELECT COUNT(*) FROM diet_plans WHERE deleted_at IS NULL AND status = 'active') AS active_diet_plans`),
    query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count FROM clients WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY month`),
    query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count FROM organizations WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY month`),
    query(`SELECT sp.name AS plan, COUNT(s.id) AS count, COALESCE(SUM(s.amount),0) AS revenue FROM subscription_plans sp
        LEFT JOIN subscriptions s ON s.plan_id = sp.id AND s.deleted_at IS NULL AND s.status IN ('active','trial') GROUP BY sp.id ORDER BY sp.price_monthly`),
    query('SELECT fitness_goal AS goal, COUNT(*) AS count FROM clients WHERE deleted_at IS NULL GROUP BY fitness_goal ORDER BY count DESC'),
    query(`SELECT o.id, o.name, o.city, o.status, COUNT(c.id) AS clients FROM organizations o LEFT JOIN clients c ON c.organization_id = o.id AND c.deleted_at IS NULL
        WHERE o.deleted_at IS NULL GROUP BY o.id ORDER BY clients DESC LIMIT 5`),
    query(`SELECT a.id, a.action, a.entity_type, a.description, a.created_at, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 8`),
    query('SELECT id, name, city, status, created_at FROM organizations WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5'),
  ]);
  let running = 0;
  const growth = months.map((m) => ({
    month: m,
    clients: clientGrowth.find((x) => x.month === m)?.count || 0,
    organizations: orgGrowth.find((x) => x.month === m)?.count || 0,
  })).map((g) => { running += g.clients; return { ...g, cumulative_clients: running }; });
  res.json({ success: true, data: { stats: { ...stats, mrr: Math.round(stats.mrr) }, growth, byPlan, goals, topOrgs, activity, recentOrgs } });
});
