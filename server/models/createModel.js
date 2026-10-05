import { query, queryOne } from '../config/db.js';
import { parseListQuery, paged, Where } from '../utils/pagination.js';

/**
 * Small data-access factory for simple tables (masters, organizations …).
 * Only whitelisted `fields` can be written and only whitelisted `sortable` columns can be sorted —
 * all values are passed as placeholders.
 */
export default function createModel({
  table, alias = 't', select, fields, searchColumns = [], sortable = {}, filters = {},
  defaultSort = 'created', softDelete = true,
}) {
  const baseSelect = select || `SELECT ${alias}.* FROM ${table} ${alias}`;
  const notDeleted = softDelete ? `${alias}.deleted_at IS NULL` : null;
  const pick = (data) => Object.fromEntries(Object.entries(data).filter(([k, v]) => fields.includes(k) && v !== undefined));

  return {
    table,
    async list(q = {}, extra) {
      const opts = parseListQuery(q, { sortable: { created: `${alias}.created_at`, ...sortable }, defaultSort, defaultDir: q.sortDir || 'desc' });
      const w = new Where();
      if (notDeleted) w.add(notDeleted);
      if (extra?.sql) w.add(extra.sql, ...(extra.params || []));
      w.search(opts.search, searchColumns);
      for (const [key, col] of Object.entries(filters)) w.addIf(q[key], `${col} = ?`, q[key]);
      const countSql = `SELECT COUNT(*) AS total FROM (${baseSelect} ${w.sql}) x`;
      const { total } = await queryOne(countSql, w.params);
      const limit = opts.all ? '' : `LIMIT ${opts.pageSize} OFFSET ${opts.offset}`;
      const rows = await query(`${baseSelect} ${w.sql} ORDER BY ${opts.sortCol} ${opts.sortDir}, ${alias}.id DESC ${limit}`, w.params);
      return paged(rows, total, opts.all ? { page: 1, pageSize: Math.max(total, 1) } : opts);
    },
    async findById(id, conn) {
      return queryOne(`${baseSelect} WHERE ${alias}.id = ? ${notDeleted ? `AND ${notDeleted}` : ''}`, [id], conn);
    },
    async create(data, conn) {
      const row = pick(data);
      const res = await query(`INSERT INTO ${table} SET ?`, [row], conn);
      return res.insertId;
    },
    async update(id, data, conn) {
      const row = pick(data);
      if (!Object.keys(row).length) return;
      await query(`UPDATE ${table} SET ? WHERE id = ?`, [row, id], conn);
    },
    async remove(id, conn) {
      if (softDelete) await query(`UPDATE ${table} SET deleted_at = NOW() WHERE id = ?`, [id], conn);
      else await query(`DELETE FROM ${table} WHERE id = ?`, [id], conn);
    },
  };
}
