const db = require('../config/db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

class FuelTransactionRepository {
  // Mencari transaksi yang memiliki hash foto nota identik
  async findByReceiptHash(hash) {
    if (!hash) return null;
    const query = 'SELECT id, driver_id, created_at FROM fuel_transactions WHERE receipt_photo_hash = $1 LIMIT 1';
    const result = await db.query(query, [hash]);
    return result.rows[0];
  }

  async create(data) {
    const {
      vehicle_id, driver_id, filling_source, fuel_type, fuel_amount,
      odometer, total_cost, latitude, longitude, address, notes,
      odometer_photo, receipt_photo, odometer_after_photo
    } = data;

    // 1. Hitung Hash SHA-256 Foto Struk
    let receipt_photo_hash = null;
    let receipt_photo_path = null;
    let odometer_photo_path = null;
    let odometer_after_photo_path = null;

    const timestamp = Date.now();

    if (receipt_photo && receipt_photo.buffer) {
      receipt_photo_hash = crypto.createHash('sha256').update(receipt_photo.buffer).digest('hex');
      const ext = path.extname(receipt_photo.originalname || '.jpg').toLowerCase() || '.jpg';
      receipt_photo_path = `receipt_photo-${timestamp}-${Math.round(Math.random() * 1e8)}${ext}`;
      fs.writeFileSync(path.join(uploadDir, receipt_photo_path), receipt_photo.buffer);
    }

    if (odometer_photo && odometer_photo.buffer) {
      const ext = path.extname(odometer_photo.originalname || '.jpg').toLowerCase() || '.jpg';
      odometer_photo_path = `odometer_photo-${timestamp}-${Math.round(Math.random() * 1e8)}${ext}`;
      fs.writeFileSync(path.join(uploadDir, odometer_photo_path), odometer_photo.buffer);
    }

    if (odometer_after_photo && odometer_after_photo.buffer) {
      const ext = path.extname(odometer_after_photo.originalname || '.jpg').toLowerCase() || '.jpg';
      odometer_after_photo_path = `odometer_after_photo-${timestamp}-${Math.round(Math.random() * 1e8)}${ext}`;
      fs.writeFileSync(path.join(uploadDir, odometer_after_photo_path), odometer_after_photo.buffer);
    }

    const query = `
      INSERT INTO fuel_transactions (
        vehicle_id, driver_id, filling_source, fuel_type, fuel_amount,
        odometer, total_cost, latitude, longitude, address, notes, status,
        odometer_photo_path, receipt_photo_path, odometer_after_photo_path,
        receipt_photo_hash,
        odometer_photo_data, odometer_photo_mimetype,
        receipt_photo_data, receipt_photo_mimetype,
        odometer_after_photo_data, odometer_after_photo_mimetype
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id, vehicle_id, driver_id, filling_source, fuel_type, fuel_amount, 
                odometer, total_cost, latitude, longitude, address, status, notes, created_at, updated_at;
    `;

    const values = [
      vehicle_id,
      driver_id,
      filling_source.toUpperCase(),
      fuel_type,
      fuel_amount,
      odometer,
      total_cost,
      latitude || null,
      longitude || null,
      address || null,
      notes || null,
      odometer_photo_path,
      receipt_photo_path,
      odometer_after_photo_path,
      receipt_photo_hash,
      odometer_photo ? odometer_photo.buffer : null,
      odometer_photo ? odometer_photo.mimetype : null,
      receipt_photo ? receipt_photo.buffer : null,
      receipt_photo ? receipt_photo.mimetype : null,
      odometer_after_photo ? odometer_after_photo.buffer : null,
      odometer_after_photo ? odometer_after_photo.mimetype : null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findAll({ limit, offset, vehicle_id, driver_id, status, fuel_type, is_anomaly, role, userId }) {
    let query = `
      SELECT ft.id, ft.vehicle_id, v.license_plate, v.vehicle_type, v.ul_nd as region, ft.driver_id, u.full_name as driver_name, 
             ft.filling_source, ft.fuel_type, ft.fuel_amount, ft.odometer, ft.total_cost, 
             ft.latitude, ft.longitude, ft.address,
             (ft.odometer_photo_data IS NOT NULL) AS has_odometer_photo,
             (ft.receipt_photo_data IS NOT NULL) AS has_receipt_photo,
             (ft.odometer_after_photo_data IS NOT NULL) AS has_odometer_after_photo,
             ft.ml_is_anomaly, ft.ml_anomaly_score, ft.ml_anomaly_reasons, ft.ocr_receipt_data,
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
    if (is_anomaly !== undefined && is_anomaly !== null) {
      query += ` AND ft.ml_is_anomaly = $${paramIndex}`;
      values.push(is_anomaly === 'true' || is_anomaly === true);
      paramIndex++;
    }

    query += ` ORDER BY ft.id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    const result = await db.query(query, values);
    return result.rows;
  }

  async countAll({ vehicle_id, driver_id, status, fuel_type, is_anomaly, role, userId }) {
    let query = `SELECT COUNT(*) FROM fuel_transactions ft WHERE 1=1`;
    const values = [];
    let paramIndex = 1;

    if (role === 'DRIVER') { query += ` AND ft.driver_id = $${paramIndex}`; values.push(userId); paramIndex++; }
    else if (driver_id) { query += ` AND ft.driver_id = $${paramIndex}`; values.push(driver_id); paramIndex++; }
    if (vehicle_id) { query += ` AND ft.vehicle_id = $${paramIndex}`; values.push(vehicle_id); paramIndex++; }
    if (status) { query += ` AND ft.status = $${paramIndex}`; values.push(status); paramIndex++; }
    if (fuel_type) { query += ` AND ft.fuel_type = $${paramIndex}`; values.push(fuel_type); paramIndex++; }
    if (is_anomaly !== undefined && is_anomaly !== null) {
      query += ` AND ft.ml_is_anomaly = $${paramIndex}`;
      values.push(is_anomaly === 'true' || is_anomaly === true);
      paramIndex++;
    }

    const result = await db.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  async findById(id) {
    const query = `
      SELECT ft.id, ft.vehicle_id, v.license_plate, ft.driver_id, u.full_name as driver_name,
             ft.filling_source, ft.fuel_type, ft.fuel_amount, ft.odometer, ft.total_cost,
             ft.latitude, ft.longitude, ft.address, ft.status, ft.notes,
             (ft.odometer_photo_data IS NOT NULL) AS has_odometer_photo,
             (ft.receipt_photo_data IS NOT NULL) AS has_receipt_photo,
             (ft.odometer_after_photo_data IS NOT NULL) AS has_odometer_after_photo,
             ft.ocr_receipt_data, ft.ocr_odometer_before, ft.ocr_odometer_after,
             ft.ml_is_anomaly, ft.ml_anomaly_score, ft.ml_anomaly_reasons,
             ft.created_at, ft.updated_at
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      JOIN users u ON ft.driver_id = u.id
      WHERE ft.id = $1
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  async getPhotoByIdAndType(id, type) {
    let dataCol = 'receipt_photo_data';
    let mimeCol = 'receipt_photo_mimetype';

    if (type === 'odometer' || type === 'odometer_photo' || type === 'odometer-before') {
      dataCol = 'odometer_photo_data';
      mimeCol = 'odometer_photo_mimetype';
    } else if (type === 'odometer-after' || type === 'odometer_after' || type === 'odometer_after_photo') {
      dataCol = 'odometer_after_photo_data';
      mimeCol = 'odometer_after_photo_mimetype';
    } else {
      dataCol = 'receipt_photo_data';
      mimeCol = 'receipt_photo_mimetype';
    }

    const query = `
      SELECT id, driver_id, ${dataCol} AS photo_data, ${mimeCol} AS photo_mimetype
      FROM fuel_transactions
      WHERE id = $1
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