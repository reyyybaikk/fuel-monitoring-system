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

  // Sinkronisasi / pencarian otomatis user Firebase ke PostgreSQL
  async findOrCreateFirebaseUser({ email, fullName }) {
    let user = await this.findByEmail(email);
    if (user) {
      return user;
    }

    // Buat username unik berdasarkan email
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 35);
    let username = baseUsername;
    let existingUser = await this.findByUsername(username);
    if (existingUser) {
      username = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const newUser = await this.createUser({
      username,
      email,
      password_hash: 'FIREBASE_AUTH_PROVIDER',
      full_name: fullName || username,
      role: 'DRIVER'
    });

    console.log(`[Firebase Auto-Provision] Driver baru dibuat otomatis di PostgreSQL: ${email} (ID: ${newUser.id})`);
    return newUser;
  }

  // Mengambil driver default aktif atau membuat driver fallback untuk mobile app
  async getDefaultDriver() {
    const query = "SELECT id, username, email, full_name, role, is_active FROM users WHERE role = 'DRIVER' AND is_active = TRUE ORDER BY id ASC LIMIT 1";
    const result = await db.query(query);
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Jika belum ada driver sama sekali di database, buat akun driver default
    return await this.createUser({
      username: 'driver_mobile',
      email: 'driver.mobile@upkal2.com',
      password_hash: 'DRIVER_DEFAULT_FALLBACK',
      full_name: 'Driver Mobile UPKAL2',
      role: 'DRIVER'
    });
  }
}

module.exports = new UserRepository();