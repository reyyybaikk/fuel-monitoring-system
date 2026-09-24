const db = require('../config/db');

class UserRepository {
  // Mencari user berdasarkan email
  async findByEmail(email) {
    const query = 'SELECT id, username, email, password_hash, full_name, whatsapp_number, role, is_active, region, created_at FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  // Mencari user berdasarkan username
  async findByUsername(username) {
    const query = 'SELECT id, username, email, password_hash, full_name, whatsapp_number, role, is_active, region, created_at FROM users WHERE username = $1';
    const result = await db.query(query, [username]);
    return result.rows[0];
  }

  // Mencari user berdasarkan nomor WhatsApp
  async findByWhatsapp(whatsappNumber) {
    const query = 'SELECT id, username, email, password_hash, full_name, whatsapp_number, role, is_active, region, created_at FROM users WHERE whatsapp_number = $1';
    const result = await db.query(query, [whatsappNumber]);
    return result.rows[0];
  }

  // Mencari user berdasarkan ID
  async findById(id) {
    const query = 'SELECT id, username, email, full_name, whatsapp_number, role, is_active, region, created_at FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Membuat / mendaftarkan user baru ke database
  async createUser(userData) {
    const { username, email, password_hash, full_name, whatsapp_number, role, region } = userData;
    const query = `
      INSERT INTO users (username, email, password_hash, full_name, whatsapp_number, role, region)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, username, email, full_name, whatsapp_number, role, is_active, region, created_at;
    `;
    const values = [username, email, password_hash, full_name, whatsapp_number, role, region || null];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Sinkronisasi / pencarian otomatis user Firebase ke PostgreSQL
  async findOrCreateFirebaseUser({ email, fullName, whatsappNumber }) {
    let user = await this.findByEmail(email);
    if (user) {
      // Jika user sudah ada tapi whatsapp_number belum terisi, update
      if (!user.whatsapp_number && whatsappNumber) {
        const updateQuery = 'UPDATE users SET whatsapp_number = $1 WHERE id = $2 RETURNING *';
        const updateResult = await db.query(updateQuery, [whatsappNumber, user.id]);
        return updateResult.rows[0];
      }
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
      whatsapp_number: whatsappNumber,
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
      whatsapp_number: '0000000000',
      role: 'DRIVER'
    });
  }
}

module.exports = new UserRepository();
