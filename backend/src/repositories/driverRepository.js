const db = require('../config/db');

class DriverRepository {
  // Mengambil semua user dengan role 'DRIVER' dan status aktif
  async findAllDrivers({ limit, offset, search }) {
    let query = `
      SELECT id, username, email, full_name, role, is_active, created_at 
      FROM users 
      WHERE role = 'DRIVER' AND is_active = TRUE
    `;
    const values = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (full_name ILIKE $${paramIndex} OR username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  // Menghitung total driver untuk pagination
  async countAllDrivers({ search }) {
    let query = `SELECT COUNT(*) FROM users WHERE role = 'DRIVER' AND is_active = TRUE`;
    const values = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (full_name ILIKE $${paramIndex} OR username ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  // Mencari driver berdasarkan ID
  async findDriverById(id) {
    const query = `
      SELECT id, username, email, full_name, role, is_active, created_at 
      FROM users 
      WHERE id = $1 AND role = 'DRIVER'
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new DriverRepository();