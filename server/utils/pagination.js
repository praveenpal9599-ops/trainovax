/**
 * Parse common list query params: page, pageSize, search, sortBy, sortDir.
 * sortBy is validated against a whitelist map { apiName: 'sql.column' } to prevent SQL injection.
 */
export function parseListQuery(q, { sortable = {}, defaultSort, defaultDir = 'desc', maxPageSize = 100 } = {}) {
  const page = Math.max(1, parseInt(q.page, 10) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(q.pageSize, 10) || 10));
  const sortKey = sortable[q.sortBy] ? q.sortBy : defaultSort;
  const sortCol = sortable[sortKey] || 'id';
  const sortDir = String(q.sortDir || defaultDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const search = typeof q.search === 'string' ? q.search.trim().slice(0, 100) : '';
  return { page, pageSize, offset: (page - 1) * pageSize, sortCol, sortDir, search, all: q.all === 'true' };
}

export function paged(rows, total, { page, pageSize }) {
  return { data: rows, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

/** Tiny WHERE builder. */
export class Where {
  constructor() { this.parts = []; this.params = []; }
  add(sql, ...params) { this.parts.push(sql); this.params.push(...params); return this; }
  addIf(cond, sql, ...params) { if (cond !== undefined && cond !== null && cond !== '') this.add(sql, ...params); return this; }
  search(term, columns) {
    if (!term) return this;
    const like = `%${term.replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    this.parts.push(`(${columns.map((c) => `${c} LIKE ?`).join(' OR ')})`);
    columns.forEach(() => this.params.push(like));
    return this;
  }
  get sql() { return this.parts.length ? `WHERE ${this.parts.join(' AND ')}` : ''; }
}
