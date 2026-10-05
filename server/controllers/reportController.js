import asyncHandler from '../utils/asyncHandler.js';
import { query } from '../config/db.js';
import { clientScope } from '../services/accessService.js';
import { perClientAdherence } from '../services/adherenceService.js';
import { round1 } from '../utils/fitness.js';

/** Business & outcome report, scoped to the caller (platform-wide for Super Admin). */
export const overview = asyncHandler(async (req, res) => {
  const days = [7, 30, 90, 180, 365].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const scope = clientScope(req.user);
  const clients = await query(`SELECT c.id, c.full_name, c.fitness_goal, c.status, c.starting_weight_kg, c.current_weight_kg, c.created_at,
      o.name AS organization_name, tu.name AS trainer_name
      FROM clients c LEFT JOIN organizations o ON o.id = c.organization_id LEFT JOIN trainers t ON t.id = c.trainer_id LEFT JOIN users tu ON tu.id = t.user_id
      WHERE c.deleted_at IS NULL AND ${scope.sql}`, scope.params);
  const ids = clients.map((c) => c.id);
  const inIds = ids.length ? ids : [0];

  const [attendance, progressCounts, firstLast] = await Promise.all([
    query(`SELECT client_id, SUM(status IN ('present','late')) AS attended, COUNT(*) AS total FROM attendance
      WHERE client_id IN (?) AND session_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY client_id`, [inIds, days]),
    query(`SELECT client_id, COUNT(*) AS n FROM progress_records WHERE client_id IN (?) AND deleted_at IS NULL AND record_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY client_id`, [inIds, days]),
    query(`SELECT client_id, record_date, weight_kg, body_fat_pct, waist_cm FROM progress_records WHERE client_id IN (?) AND deleted_at IS NULL ORDER BY client_id, record_date`, [inIds]),
  ]);
  const adherence = await perClientAdherence(clients.filter((c) => c.status === 'active').map((c) => c.id), Math.min(days, 30));

  const rows = clients.map((c) => {
    const recs = firstLast.filter((r) => r.client_id === c.id);
    const w = recs.filter((r) => r.weight_kg != null); const bf = recs.filter((r) => r.body_fat_pct != null); const wa = recs.filter((r) => r.waist_cm != null);
    const att = attendance.find((a) => a.client_id === c.id);
    const ad = adherence.get(c.id);
    return {
      id: c.id, name: c.full_name, goal: c.fitness_goal, status: c.status, trainer: c.trainer_name, organization: c.organization_name,
      weight_change_kg: w.length > 1 ? round1(w[w.length - 1].weight_kg - w[0].weight_kg) : null,
      body_fat_change: bf.length > 1 ? round1(bf[bf.length - 1].body_fat_pct - bf[0].body_fat_pct) : null,
      waist_change_cm: wa.length > 1 ? round1(wa[wa.length - 1].waist_cm - wa[0].waist_cm) : null,
      attendance_pct: att?.total ? Math.round((100 * att.attended) / att.total) : null,
      progress_updates: progressCounts.find((p) => p.client_id === c.id)?.n || 0,
      workout_completion_pct: ad?.workout_completion_pct ?? null,
      diet_adherence_pct: ad?.diet_adherence_pct ?? null,
    };
  });

  const byGoal = Object.values(rows.reduce((acc, r) => {
    acc[r.goal] = acc[r.goal] || { goal: r.goal, clients: 0, changes: [] };
    acc[r.goal].clients += 1; if (r.weight_change_kg != null) acc[r.goal].changes.push(r.weight_change_kg);
    return acc;
  }, {})).map((g) => ({ goal: g.goal, clients: g.clients, avg_weight_change_kg: g.changes.length ? round1(g.changes.reduce((a, b) => a + b, 0) / g.changes.length) : null }));

  const avg = (k) => { const v = rows.map((r) => r[k]).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  res.json({
    success: true,
    data: {
      days,
      summary: {
        clients: rows.length, active: rows.filter((r) => r.status === 'active').length,
        avg_attendance_pct: avg('attendance_pct'), avg_workout_completion_pct: avg('workout_completion_pct'), avg_diet_adherence_pct: avg('diet_adherence_pct'),
        total_weight_change_kg: round1(rows.reduce((a, r) => a + (r.weight_change_kg || 0), 0)),
      },
      byGoal, clients: rows,
    },
  });
});
