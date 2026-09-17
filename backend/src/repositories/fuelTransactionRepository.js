const db = require('../config/db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { uploadFile } = require('../services/uploadService');
const vehicleRepository = require('./vehicleRepository');

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

    // Ambil license plate untuk struktur folder storage
    const vehicle = await vehicleRepository.findById(vehicle_id);
    const plate = (vehicle ? vehicle.license_plate : 'unknown').replace(/\s+/g, '-').toUpperCase();

    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const storagePath = `transactions/${plate}/${yearMonth}`;
    const timestamp = Date.now();

    // 1. Upload ke Supabase
    const uploadTasks = [];
    let receipt_photo_url = null;
    let odometer_photo_url = null;
    let odometer_after_photo_url = null;
    let receipt_photo_hash = null;

    if (receipt_photo && receipt_photo.buffer) {
      receipt_photo_hash = crypto.createHash('sha256').update(receipt_photo.buffer).digest('hex');
      const ext = path.extname(receipt_photo.originalname || '.jpg').toLowerCase() || '.jpg';
      const fileName = `receipt-${timestamp}${ext}`;
      uploadTasks.push(
        uploadFile(receipt_photo.buffer, `${storagePath}/${fileName}`).then(url => receipt_photo_url = url)
      );
    }

    if (odometer_photo && odometer_photo.buffer) {
      const ext = path.extname(odometer_photo.originalname || '.jpg').toLowerCase() || '.jpg';
      const fileName = `odo-before-${timestamp}${ext}`;
      uploadTasks.push(
        uploadFile(odometer_photo.buffer, `${storagePath}/${fileName}`).then(url => odometer_photo_url = url)
      );
    }

    if (odometer_after_photo && odometer_after_photo.buffer) {
      const ext = path.extname(odometer_after_photo.originalname || '.jpg').toLowerCase() || '.jpg';
      const fileName = `odo-after-${timestamp}${ext}`;
      uploadTasks.push(
        uploadFile(odometer_after_photo.buffer, `${storagePath}/${fileName}`).then(url => odometer_after_photo_url = url)
      );
    }

    // Tunggu semua proses upload selesai
    await Promise.all(uploadTasks);

    const query = `
      INSERT INTO fuel_transactions (
        vehicle_id, driver_id, filling_source, fuel_type, fuel_amount,
        odometer, total_cost, latitude, longitude, address, notes, status,
        odometer_photo_path, receipt_photo_path, odometer_after_photo_path,
        receipt_photo_hash
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING', $12, $13, $14, $15)
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
      odometer_photo_url,
      receipt_photo_url,
      odometer_after_photo_url,
      receipt_photo_hash
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findAll({ limit, offset, vehicle_id, driver_id, status, fuel_type, is_anomaly, start_date, end_date, role, userId, region }) {
    let query = `
      SELECT ft.id, ft.vehicle_id, v.license_plate, v.vehicle_type, v.ul_nd as region, ft.driver_id, u.full_name as driver_name, 
             ft.filling_source, ft.fuel_type, ft.fuel_amount, ft.odometer, ft.total_cost, 
             ft.latitude, ft.longitude, ft.address,
             (ft.odometer_photo_path IS NOT NULL) AS has_odometer_photo,
             (ft.receipt_photo_path IS NOT NULL) AS has_receipt_photo,
             (ft.odometer_after_photo_path IS NOT NULL) AS has_odometer_after_photo,
             ft.odometer_photo_path, ft.receipt_photo_path, ft.odometer_after_photo_path,
             ft.ml_is_anomaly, ft.ml_anomaly_score, ft.ocr_receipt_data,
             ft.real_fuel_consumption,
             ft.status, ft.notes, ft.created_at, ft.updated_at
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      JOIN users u ON ft.driver_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    // Filter berdasarkan Role & Wilayah (Hak Akses)
    if (role === 'DRIVER') {
      query += ` AND ft.driver_id = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    } else if (role === 'ADMIN_WILAYAH' || role === 'ADMIN') {
      // Jika Admin Wilayah, kunci data hanya untuk wilayahnya
      if (region) {
        const cleanRegion = region.replace('Unit Layanan ', '').trim();
        query += ` AND (v.ul_nd ILIKE $${paramIndex} OR v.ul_pln ILIKE $${paramIndex})`;
        values.push(`%${cleanRegion}%`);
        paramIndex++;
      }
    }
    // Jika role === 'ADMIN_PUSAT', tidak ada filter wilayah (bisa lihat semua)

    if (driver_id) {
      query += ` AND ft.driver_id = $${paramIndex}`;
      values.push(driver_id);
      paramIndex++;
    }

    if (vehicle_id && vehicle_id !== 'ALL') { query += ` AND ft.vehicle_id = $${paramIndex}`; values.push(vehicle_id); paramIndex++; }
    if (status) { query += ` AND ft.status = $${paramIndex}`; values.push(status); paramIndex++; }
    if (fuel_type) { query += ` AND ft.fuel_type = $${paramIndex}`; values.push(fuel_type); paramIndex++; }

    // Filter Tanggal
    if (start_date) { query += ` AND ft.created_at >= $${paramIndex}`; values.push(start_date); paramIndex++; }
    if (end_date) { query += ` AND ft.created_at <= $${paramIndex}::timestamp + interval '1 day' - interval '1 second'`; values.push(end_date); paramIndex++; }

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

  async findAllForExport({ vehicle_id, ul_nd, start_date, end_date, status }) {
    let query = `
      SELECT
        ft.*,
        v.license_plate,
        v.vehicle_type,
        u.full_name as driver_name,
        LEAD(ft.odometer) OVER (PARTITION BY ft.vehicle_id ORDER BY ft.created_at ASC) as odometer_next
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      JOIN users u ON ft.driver_id = u.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (vehicle_id && vehicle_id !== 'ALL') {
      query += ` AND ft.vehicle_id = $${paramIndex}`;
      values.push(vehicle_id);
      paramIndex++;
    }

    if (ul_nd) {
      query += ` AND (v.ul_nd ILIKE $${paramIndex} OR v.ul_pln ILIKE $${paramIndex})`;
      values.push(`%${ul_nd.replace('Unit Layanan ', '').trim()}%`);
      paramIndex++;
    }

    if (start_date) {
      query += ` AND ft.created_at >= $${paramIndex}::timestamp`;
      values.push(`${start_date} 00:00:00`);
      paramIndex++;
    }

    if (end_date) {
      query += ` AND ft.created_at <= $${paramIndex}::timestamp`;
      values.push(`${end_date} 23:59:59`);
      paramIndex++;
    }

    query += ` ORDER BY ft.created_at ASC`;
    const result = await db.query(query, values);
    return result.rows;
  }

  async countAll({ vehicle_id, driver_id, status, fuel_type, is_anomaly, role, userId, region }) {
    let query = `
      SELECT COUNT(*)
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      WHERE 1=1
    `;
    const values = [];
    let paramIndex = 1;

    if (role === 'DRIVER') {
      query += ` AND ft.driver_id = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    } else if (role === 'ADMIN_WILAYAH' || role === 'ADMIN') {
      if (region) {
        const cleanRegion = region.replace('Unit Layanan ', '').trim();
        query += ` AND (v.ul_nd ILIKE $${paramIndex} OR v.ul_pln ILIKE $${paramIndex})`;
        values.push(`%${cleanRegion}%`);
        paramIndex++;
      }
    }

    if (driver_id) { query += ` AND ft.driver_id = $${paramIndex}`; values.push(driver_id); paramIndex++; }
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
             (ft.odometer_photo_path IS NOT NULL) AS has_odometer_photo,
             (ft.receipt_photo_path IS NOT NULL) AS has_receipt_photo,
             (ft.odometer_after_photo_path IS NOT NULL) AS has_odometer_after_photo,
             ft.odometer_photo_path, ft.receipt_photo_path, ft.odometer_after_photo_path,
             ft.ocr_receipt_data, ft.ocr_odometer_before, ft.ocr_odometer_after,
             ft.ml_is_anomaly, ft.ml_anomaly_score,
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
    let pathCol = 'receipt_photo_path';

    if (type === 'odometer' || type === 'odometer_photo' || type === 'odometer-before') {
      pathCol = 'odometer_photo_path';
    } else if (type === 'odometer-after' || type === 'odometer_after' || type === 'odometer_after_photo') {
      pathCol = 'odometer_after_photo_path';
    } else {
      pathCol = 'receipt_photo_path';
    }

    const query = `
      SELECT id, driver_id, ${pathCol} AS photo_url
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

  async update(id, data) {
    const { fuel_amount, odometer, total_cost, fuel_type, notes, status } = data;
    const query = `
      UPDATE fuel_transactions
      SET fuel_amount = COALESCE($1, fuel_amount),
          odometer = COALESCE($2, odometer),
          total_cost = COALESCE($3, total_cost),
          fuel_type = COALESCE($4, fuel_type),
          notes = COALESCE($5, notes),
          status = COALESCE($6, status),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;
    const values = [fuel_amount, odometer, total_cost, fuel_type, notes, status, id];
    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getSummary(role, region) {
    let whereClause = 'WHERE 1=1';
    let vehicleWhereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (role === 'ADMIN_WILAYAH' || role === 'ADMIN') {
      if (region) {
        const cleanRegion = region.replace('Unit Layanan ', '').trim();
        whereClause += ` AND (v.ul_nd ILIKE $${paramIndex} OR v.ul_pln ILIKE $${paramIndex})`;
        vehicleWhereClause += ` AND (ul_nd ILIKE $${paramIndex} OR ul_pln ILIKE $${paramIndex})`;
        values.push(`%${cleanRegion}%`);
        paramIndex++;
      }
    }

    const statsQuery = `
      SELECT
        SUM(ft.fuel_amount) as total_liters,
        SUM(ft.total_cost) as total_cost,
        COUNT(CASE WHEN ft.ml_is_anomaly = TRUE THEN 1 END) as anomaly_count
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      ${whereClause}
    `;
    const vehicleQuery = `
      SELECT
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_vehicles
      FROM vehicles
      ${vehicleWhereClause}
    `;
    const recentAnomaliesQuery = `
      SELECT ft.id, v.license_plate as plate, ft.ml_anomaly_score as score, ft.notes
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      ${whereClause} AND ft.ml_is_anomaly = TRUE
      ORDER BY ft.created_at DESC
      LIMIT 5
    `;

    const [statsRes, vehicleRes, anomaliesRes] = await Promise.all([
      db.query(statsQuery, values),
      db.query(vehicleQuery, values),
      db.query(recentAnomaliesQuery, values)
    ]);

    const stats = statsRes.rows[0];
    const vehicles = vehicleRes.rows[0];

    return {
      total_liters: parseFloat(stats.total_liters) || 0,
      total_cost: parseFloat(stats.total_cost) || 0,
      anomaly_count: parseInt(stats.anomaly_count, 10) || 0,
      total_vehicles: parseInt(vehicles.total_vehicles, 10) || 0,
      active_vehicles: parseInt(vehicles.active_vehicles, 10) || 0,
      liter_change_percentage: 4.2, // Placeholder default
      cost_change_percentage: -1.8, // Placeholder default
      recent_anomalies: anomaliesRes.rows
    };
  }

  async getAnalytics(start, end, role, region) {
    let whereClause = 'WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (start && end) {
      whereClause += ` AND ft.created_at BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      values.push(start, end);
      paramIndex += 2;
    }

    if (role === 'ADMIN_WILAYAH' || role === 'ADMIN') {
      if (region) {
        const cleanRegion = region.replace('Unit Layanan ', '').trim();
        whereClause += ` AND (v.ul_nd ILIKE $${paramIndex} OR v.ul_pln ILIKE $${paramIndex})`;
        values.push(`%${cleanRegion}%`);
        paramIndex++;
      }
    }

    let query = `
      SELECT
        TO_CHAR(ft.created_at, 'Dy') as day,
        SUM(ft.fuel_amount) as value,
        BOOL_OR(ft.ml_is_anomaly) as is_anomaly
      FROM fuel_transactions ft
      JOIN vehicles v ON ft.vehicle_id = v.id
      ${whereClause}
      GROUP BY TO_CHAR(ft.created_at, 'Dy'), DATE_TRUNC('day', ft.created_at)
      ORDER BY DATE_TRUNC('day', ft.created_at) ASC
      LIMIT 7`;

    const result = await db.query(query, values);
    return result.rows;
  }
}

module.exports = new FuelTransactionRepository();