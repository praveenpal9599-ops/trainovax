import asyncHandler from '../utils/asyncHandler.js';
import { query } from '../config/db.js';
import { ROLES } from '../config/permissions.js';

export const lookups = asyncHandler(async (req, res) => {
  const [exerciseCategories, muscleGroups, foodCategories, equipment] = await Promise.all([
    query('SELECT id, name FROM exercise_categories ORDER BY name'),
    query('SELECT id, name FROM muscle_groups ORDER BY name'),
    query('SELECT id, name FROM food_categories ORDER BY name'),
    query("SELECT DISTINCT equipment AS name FROM exercises WHERE equipment IS NOT NULL AND equipment <> '' AND deleted_at IS NULL ORDER BY equipment"),
  ]);
  let trainers = [];
  if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.ADMIN) {
    const orgOnly = req.user.role === ROLES.ADMIN;
    trainers = await query(`SELECT t.id, u.name, t.organization_id, o.name AS organization_name, r.name AS role FROM trainers t JOIN users u ON u.id = t.user_id
      JOIN roles r ON r.id = u.role_id LEFT JOIN organizations o ON o.id = t.organization_id
      WHERE t.deleted_at IS NULL AND u.deleted_at IS NULL AND u.status='active' ${orgOnly ? 'AND t.organization_id = ?' : ''} ORDER BY u.name`, orgOnly ? [req.user.organizationId] : []);
  }
  let organizations = [];
  if (req.user.role === ROLES.SUPER_ADMIN) organizations = await query("SELECT id, name FROM organizations WHERE deleted_at IS NULL ORDER BY name");
  res.json({
    success: true,
    data: { exerciseCategories, muscleGroups, foodCategories, equipment: equipment.map((e) => e.name), trainers, organizations },
  });
});
