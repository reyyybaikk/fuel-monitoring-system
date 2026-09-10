const db = require('../config/db');

class VehicleRepository {
  // Mengambil daftar kendaraan dengan pagination dan pencarian/filter opsional
  async findAll({ limit, offset, search, ul_nd, vehicle_type }) {
    let query = `
      SELECT id, license_plate, vehicle_type, ul_nd, ul_pln, usage_purpose, 
             project_name, fuel_tank_capacity, fuel_type, fuel_consumption_rate, 
             is_active, created_at, updated_at 
      FROM vehicles 
      WHERE is_active = TRUE
    `;
    const values = [];
    let paramIndex = 1;

    // Filter pencarian berdasarkan nomor plat atau nama proyek
    if (search) {
      query += ` AND (license_plate ILIKE $${paramIndex} OR project_name ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    // Filter berdasarkan Wilayah/UL ND
    if (ul_nd) {
      query += ` AND ul_nd = $${paramIndex}`;
      values.push(ul_nd);
      paramIndex++;
    }

    // Filter berdasarkan jenis kendaraan
    if (vehicle_type) {
      query += ` AND vehicle_type = $${paramIndex}`;
      values.push(vehicle_type);
      paramIndex++;
    }

    // Urutkan dan tambahkan limit & offset untuk pagination
    query += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  // Menghitung total data untuk keperluan pagination metadata
  async countAll({ search, ul_nd, vehicle_type }) {
    let query = `SELECT COUNT(*) FROM vehicles WHERE is_active = TRUE`;
    const values = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (license_plate ILIKE $${paramIndex} OR project_name ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    if (ul_nd) {
      query += ` AND ul_nd = $${paramIndex}`;
      values.push(ul_nd);
      paramIndex++;
    }

    if (vehicle_type) {
      query += ` AND vehicle_type = $${paramIndex}`;
      values.push(vehicle_type);
      paramIndex++;
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  // Mencari kendaraan berdasarkan ID
  async findById(id) {
    const query = `
      SELECT id, license_plate, vehicle_type, ul_nd, ul_pln, usage_purpose, 
             project_name, fuel_tank_capacity, fuel_type, fuel_consumption_rate, 
             is_active, created_at, updated_at 
      FROM vehicles 
      WHERE id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  // Mencari kendaraan berdasarkan plat nomor (untuk pencegahan duplikasi)
  async findByLicensePlate(licensePlate) {
    const query = `SELECT * FROM vehicles WHERE license_plate = $1`;
    const result = await db.query(query, [licensePlate]);
    return result.rows[0];
  }

  // Menambah kendaraan baru
  async create(data) {
    const {
      license_plate,
      vehicle_type,
      ul_nd,
      ul_pln,
      usage_purpose,
      project_name,
      fuel_tank_capacity,
      fuel_type,
      fuel_consumption_rate
    } = data;

    const query = `
      INSERT INTO vehicles (
        license_plate, vehicle_type, ul_nd, ul_pln, usage_purpose, 
        project_name, fuel_tank_capacity, fuel_type, fuel_consumption_rate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [
      license_plate,
      vehicle_type,
      ul_nd || null,
      ul_pln || null,
      usage_purpose || null,
      project_name || null,
      fuel_tank_capacity || null,
      fuel_type || null,
      fuel_consumption_rate || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Memperbarui data kendaraan
  async update(id, data) {
    const {
      license_plate,
      vehicle_type,
      ul_nd,
      ul_pln,
      usage_purpose,
      project_name,
      fuel_tank_capacity,
      fuel_type,
      fuel_consumption_rate
    } = data;

    const query = `
      UPDATE vehicles 
      SET license_plate = $1,
          vehicle_type = $2,
          ul_nd = $3,
          ul_pln = $4,
          usage_purpose = $5,
          project_name = $6,
          fuel_tank_capacity = $7,
          fuel_type = $8,
          fuel_consumption_rate = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;
    const values = [
      license_plate,
      vehicle_type,
      ul_nd || null,
      ul_pln || null,
      usage_purpose || null,
      project_name || null,
      fuel_tank_capacity || null,
      fuel_type || null,
      fuel_consumption_rate || null,
      id
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // Soft Delete (Mengubah status is_active menjadi FALSE agar data historis transaksi tetap aman)
  async softDelete(id) {
    const query = `
      UPDATE vehicles 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $1 
      RETURNING id, license_plate, is_active;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new VehicleRepository();