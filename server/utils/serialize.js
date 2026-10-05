/** Remove sensitive fields before sending a user to the client. */
export function publicUser(u) {
  if (!u) return null;
  // eslint-disable-next-line no-unused-vars
  const { password_hash, reset_token_hash, reset_token_expires, deleted_at, ...safe } = u;
  return safe;
}
/** Convert tinyint booleans. */
export const bool = (v) => v === 1 || v === true || v === '1';
