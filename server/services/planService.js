import { query, queryOne, transaction } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { sumNutrition } from '../utils/fitness.js';

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k] ?? null]));

/**
 * Load a nested plan/template with its groups (days/meals) and items (exercises/foods).
 * Items are enriched with master data (exercise details or food nutrition).
 */
export async function loadNested(S, id, conn) {
  const root = await queryOne(`SELECT * FROM ${S.root} WHERE id = ? ${S.softDelete ? 'AND deleted_at IS NULL' : ''}`, [id], conn);
  if (!root) return null;
  const groups = await query(`SELECT * FROM ${S.group} WHERE ${S.groupFk} = ? ORDER BY sort_order, id`, [id], conn);
  const groupIds = groups.map((g) => g.id);
  let items = [];
  if (groupIds.length) {
    items = S.kind === 'workout'
      ? await query(`SELECT i.*, e.name AS exercise_name, e.equipment, e.instructions, e.video_url, e.image_url, e.exercise_type,
            e.description AS exercise_description, mg.name AS muscle_group, ec.name AS category
          FROM ${S.item} i JOIN exercises e ON e.id = i.exercise_id
          LEFT JOIN muscle_groups mg ON mg.id = e.primary_muscle_id LEFT JOIN exercise_categories ec ON ec.id = e.category_id
          WHERE i.${S.itemFk} IN (?) ORDER BY i.sort_order, i.id`, [groupIds], conn)
      : await query(`SELECT i.*, f.name AS food_name, f.serving_size, f.serving_unit, f.calories, f.protein_g, f.carbs_g, f.fat_g,
            f.fiber_g, f.sugar_g, f.is_vegetarian, f.is_vegan, fc.name AS category
          FROM ${S.item} i JOIN foods f ON f.id = i.food_id LEFT JOIN food_categories fc ON fc.id = f.category_id
          WHERE i.${S.itemFk} IN (?) ORDER BY i.sort_order, i.id`, [groupIds], conn);
  }
  root[S.groupsKey] = groups.map((g) => {
    const its = items.filter((i) => i[S.itemFk] === g.id);
    return S.kind === 'diet' ? { ...g, [S.itemsKey]: its, totals: sumNutrition(its) } : { ...g, [S.itemsKey]: its };
  });
  if (S.kind === 'diet') root.totals = sumNutrition(items);
  return root;
}

/**
 * Sync nested children: rows with an `id` that belongs to this parent are updated, new rows inserted,
 * and rows missing from the payload deleted. Keeping ids stable preserves workout/diet logs.
 */
async function syncChildren(conn, S, rootId, groupsPayload) {
  const existingGroups = await query(`SELECT id FROM ${S.group} WHERE ${S.groupFk} = ?`, [rootId], conn);
  const existingGroupIds = new Set(existingGroups.map((g) => g.id));
  const keptGroupIds = [];

  for (const [gi, g] of groupsPayload.entries()) {
    const gRow = { ...pick(g, S.groupFields), sort_order: gi };
    let groupId = g.id && existingGroupIds.has(g.id) ? g.id : null;
    if (groupId) await conn.query(`UPDATE ${S.group} SET ? WHERE id = ?`, [gRow, groupId]);
    else { const [r] = await conn.query(`INSERT INTO ${S.group} SET ?`, [{ ...gRow, [S.groupFk]: rootId }]); groupId = r.insertId; }
    keptGroupIds.push(groupId);

    const existingItems = await query(`SELECT id FROM ${S.item} WHERE ${S.itemFk} = ?`, [groupId], conn);
    const existingItemIds = new Set(existingItems.map((i) => i.id));
    const keptItemIds = [];
    for (const [ii, it] of (g[S.itemsKey] || []).entries()) {
      const iRow = { ...pick(it, S.itemFields), sort_order: ii };
      if (it.id && existingItemIds.has(it.id)) { await conn.query(`UPDATE ${S.item} SET ? WHERE id = ?`, [iRow, it.id]); keptItemIds.push(it.id); }
      else { const [r] = await conn.query(`INSERT INTO ${S.item} SET ?`, [{ ...iRow, [S.itemFk]: groupId }]); keptItemIds.push(r.insertId); }
    }
    await conn.query(`DELETE FROM ${S.item} WHERE ${S.itemFk} = ? ${keptItemIds.length ? 'AND id NOT IN (?)' : ''}`, keptItemIds.length ? [groupId, keptItemIds] : [groupId]);
  }
  await conn.query(`DELETE FROM ${S.group} WHERE ${S.groupFk} = ? ${keptGroupIds.length ? 'AND id NOT IN (?)' : ''}`, keptGroupIds.length ? [rootId, keptGroupIds] : [rootId]);
}

export async function createNested(S, data, conn) {
  const run = async (c) => {
    const [r] = await c.query(`INSERT INTO ${S.root} SET ?`, [pick(data, S.rootFields)]);
    const groups = (data[S.groupsKey] || []).map((g) => ({ ...g, id: undefined, [S.itemsKey]: (g[S.itemsKey] || []).map((i) => ({ ...i, id: undefined })) }));
    await syncChildren(c, S, r.insertId, groups);
    return r.insertId;
  };
  return conn ? run(conn) : transaction(run);
}

export async function updateNested(S, id, data) {
  return transaction(async (c) => {
    const rootData = pick(data, S.rootFields);
    if (Object.keys(rootData).length) await c.query(`UPDATE ${S.root} SET ? WHERE id = ?`, [rootData, id]);
    if (data[S.groupsKey]) await syncChildren(c, S, id, data[S.groupsKey]);
  });
}

export async function softDelete(S, id) {
  await query(`UPDATE ${S.root} SET deleted_at = NOW() WHERE id = ?`, [id]);
}

/** Copy a loaded nested structure into another structure (plan <-> template), stripping ids. */
export function toPayload(S, loaded, overrides = {}) {
  return {
    ...loaded, ...overrides,
    [S.groupsKey]: loaded[S.groupsKey].map((g) => ({
      ...pick(g, S.groupFields),
      [S.itemsKey]: g[S.itemsKey].map((i) => pick(i, S.itemFields)),
    })),
  };
}

export async function mustLoad(S, id, label) {
  const row = await loadNested(S, id);
  if (!row) throw ApiError.notFound(`${label} not found`);
  return row;
}
