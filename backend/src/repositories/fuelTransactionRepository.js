const db = require('../config/db');

class FuelTransactionRepository {
  async create(data) {
    const {
      vehicle_id, driver_id, filling_source, fuel_type, fuel_amount,
      odometer, total_cost, latitude, longitude,
      odometer_photo_path, receipt_photo_path, notes
    } = data;

    const query = `
      INSERT INTO fuel_transactions (
        vehicle_id, driver_id, filling_source, fuel_type, fuel_amount,
        odometer, total_cost, latitude, longitude,
        odometer_photo_path, receipt_photo_path, notes, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING')
      RETURNING *;
    `;
    const values = [
      vehicle_id, driver_id, filling_source.toUpperCase(), fuel_type, fuel_amount,
      odometer, total_cost, latitude || null, longitude || null,
      odometer_photo_path || null, receipt_photo_path || null, notes || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findAll({ limit, offset, vehicle_id, driver_id, status, fuel_type, role, userId }) {
    let query = `
      SELECT ft.id, ft.vehicle_id, v.license_plate, ft.driver_id, u.full_name as driver_name, 
             ft.filling_source, ft.fuel_type, ft.fuel_amount, ft.odometer, ft.total_cost, 
             ft.latitude, ft.longitude, ft.odometer_photo_path, ft.receipt_photo_path,
             ft.status, ft.notes, ft.created_at, ft.updated_at
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      JOIN users u ON ft.driver_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    // Proteksi IDOR & Filter
    if (role === 'DRIVER') {
      query += ` AND ft.driver_id = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    } else if (driver_id) {
      query += ` AND ft.driver_id = $${paramIndex}`;
      values.push(driver_id);
      paramIndex++;
    }

    if (vehicle_id) { query += ` AND ft.vehicle_id = $${paramIndex}`; values.push(vehicle_id); paramIndex++; }
    if (status) { query += ` AND ft.status = $${paramIndex}`; values.push(status); paramIndex++; }
    if (fuel_type) { query += ` AND ft.fuel_type = $${paramIndex}`; values.push(fuel_type); paramIndex++; }

    query += ` ORDER BY ft.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  async countAll({ vehicle_id, driver_id, status, fuel_type, role, userId }) {
    let query = `SELECT COUNT(*) FROM fuel_transactions ft WHERE 1=1`;
    const values = [];
    let paramIndex = 1;
    // (Logika filter sama dengan findAll, disingkat untuk efisiensi parameter)
    if (role === 'DRIVER') { query += ` AND ft.driver_id = $${paramIndex}`; values.push(userId); paramIndex++; }
    else if (driver_id) { query += ` AND ft.driver_id = $${paramIndex}`; values.push(driver_id); paramIndex++; }
    if (vehicle_id) { query += ` AND ft.vehicle_id = $${paramIndex}`; values.push(vehicle_id); paramIndex++; }
    if (status) { query += ` AND ft.status = $${paramIndex}`; values.push(status); paramIndex++; }
    if (fuel_type) { query += ` AND ft.fuel_type = $${paramIndex}`; values.push(fuel_type); paramIndex++; }
    const result = await db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  async findById(id) {
    const query = `
      SELECT ft.*, v.license_plate, u.full_name as driver_name
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      JOIN users u ON ft.driver_id = u.id
      WHERE ft.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async updateStatus(id, status) {
    const query = `UPDATE fuel_transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *;`;
    const result = await db.query(query, [status, id]);
    return result.rows[0];
  }
}
module.exports = new FuelTransactionRepository();