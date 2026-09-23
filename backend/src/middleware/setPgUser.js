// Middleware to set PostgreSQL session variable for current user ID
// Must be placed after authentication middleware so req.user is available
const { pool } = require('../config/db');

module.exports = async function setPgUser(req, res, next) {
  try {
    if (req.user && req.user.id) {
      // Use SET LOCAL to set the variable for the duration of the current transaction
      await pool.query('SET LOCAL app.current_user_id = $1', [req.user.id]);
      // Optionally, you can log for debugging
      console.log(`[PG_USER] Session user set to ${req.user.id}`);
    }
    next();
  } catch (err) {
    console.error('[PG_USER] Failed to set session user:', err);
    // Continue without breaking the request; RLS may reject later
    next();
  }
};
