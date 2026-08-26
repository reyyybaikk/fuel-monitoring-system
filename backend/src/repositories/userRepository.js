const db = require('../config/db');

class UserRepository {
  // Mencari user berdasarkan email
  async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0]; // Mengembalikan data user pertama atau undefined jika tidak ada
  }

  // Mencari user berdasarkan username
  async findByUsername(username) {
    const query = 'SELECT * FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    return result.rows[0];
  }

  // Mencari user berdasarkan ID
  async findById(id) {
    const query = 'SELECT id, username, email, full_name, role, is_active, created_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Membuat / mendaftarkan user baru ke database
  async createUser(userData) {
    const { username, email, password_hash, full_name, role } = userData;
    const query = `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, full_name, role, is_active, created_at;
    `;
    const values = [username, email, password_hash, full_name, role];
    const result = await db.query(query, values);
    return result.rows[0]; // Mengembalikan data user yang baru saja dibuat (tanpa password_hash)
  }
}

module.exports = new UserRepository();