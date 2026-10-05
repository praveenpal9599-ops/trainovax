import { query } from '../config/db.js';

/**
 * Create notifications for one or many users.
 * @param {number|number[]} userIds
 * @param {{type?:string,title:string,body?:string,link?:string}} n
 */
export async function notify(userIds, { type = 'general', title, body = null, link = null }, conn) {
  const ids = [].concat(userIds).filter(Boolean);
  if (!ids.length) return;
  const values = ids.map((id) => [id, type, title, body, link]);
  await query('INSERT INTO notifications (user_id, type, title, body, link) VALUES ?', [values], conn);
}

/** Notify the login account attached to a client (if any). */
export async function notifyClient(clientId, n, conn) {
  const rows = await query('SELECT user_id FROM clients WHERE id = ? AND user_id IS NOT NULL', [clientId], conn);
  if (rows[0]) await notify(rows[0].user_id, n, conn);
}
