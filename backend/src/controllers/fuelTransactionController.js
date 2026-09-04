const db = require('../config/db'); // Sesuaikan dengan path file pool/koneksi database Anda
const { uploadFile } = require('../services/uploadService');

// 1. Membuat Transaksi Baru
exports.create = async (req, res) => {
  try {
    // ==== Extract request payload ==== //
    const { odometer, fuel_amount, total_cost, notes } = req.body;

    // Resolve driver ID (numeric) and safe UID (uuid or null)
    let driverId = null;
    let userUid = null;
    // Middleware may set req.user.id as numeric driver ID (fallback) or Supabase UID (string)
    if (typeof req.user.id === 'number') {
      driverId = req.user.id;
    } else if (typeof req.user.id === 'string') {
      // If the string matches UUID pattern, treat it as UID; otherwise try to map via email
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (uuidRegex.test(req.user.id)) {
        userUid = req.user.id; // Supabase UID
      } else if (req.user.email) {
        // Attempt to resolve driver integer ID via email lookup
        const result = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [req.user.email]);
        if (result.rows.length > 0) {
          driverId = result.rows[0].id;
        }
      }
    }
    // Fallback: if driverId still null, try to resolve from email directly
    if (!driverId && req.user.email) {
      const result = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [req.user.email]);
      if (result.rows.length > 0) {
        driverId = result.rows[0].id;
      }
    }
    // Ensure driverId is present; otherwise throw error
    if (!driverId) {
      const err = new Error('Tidak dapat menentukan driver_id untuk transaksi ini');
      err.statusCode = 400;
      throw err;
    }
    // Ensure userUid is either a UUID string or null (acceptable for RLS column)
    const uidValue = userUid || null;

    // ==== Optional file upload (photo) ==== //
    const file = req.file;
    const files = req.files;
    let photoUrl = null;
    if (file) {
      photoUrl = await uploadFile(file.buffer, `fuel/${Date.now()}_${file.originalname}`);
    } else if (files && files.length > 0) {
      // contoh: gunakan file pertama
      const first = files[0];
      photoUrl = await uploadFile(first.buffer, `fuel/${Date.now()}_${first.originalname}`);
    }

    // ==== Insert transaction ke PostgreSQL, menyertakan user_uid ==== //
    const insertQuery = `
      INSERT INTO fuel_transactions (
        driver_id,
        user_uid,
        odometer,
        fuel_amount,
        total_cost,
        notes,
        photo_url,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      RETURNING *;
    `;
    const values = [
      driverId,
      uidValue, // UUID Supabase (or null) – stored in user_uid column
      odometer,
      fuel_amount,
      total_cost,
      notes,
      photoUrl
    ];
    const { rows } = await db.query(insertQuery, values);
    const newTransaction = rows[0];

    // ==== Queue job untuk ML analysis ==== //
    const fuelAnalysisQueue = require('../config/queue');
    await fuelAnalysisQueue.add('analyse', { transactionId: newTransaction.id });

    return res.status(201).json({
      success: true,
      message: 'Fuel transaction created successfully',
      data: { transaction: newTransaction }
    });
  } catch (error) {
    console.error('Error creating fuel transaction:', error);
    const status = error.statusCode || 500;
    return res.status(status).json({ success: false, error: error.message });
  }
};

// 2. Mendapatkan Semua Daftar Transaksi
exports.getAll = async (req, res) => {
  try {
    // Contoh query ambil semua data
    // const result = await db.query('SELECT * FROM fuel_transactions ORDER BY created_at DESC');

    return res.status(200).json({
      success: true,
      message: 'Get all fuel transactions successful',
      data: [] // result.rows
    });
  } catch (error) {
    console.error('Error getting fuel transactions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Mendapatkan Detail Transaksi Berdasarkan ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    // const result = await db.query('SELECT * FROM fuel_transactions WHERE id = $1', [id]);

    // if (result.rows.length === 0) {
    //   return res.status(404).json({ success: false, message: 'Transaction not found' });
    // }

    return res.status(200).json({
      success: true,
      message: 'Get fuel transaction detail successful',
      data: {} // result.rows[0]
    });
  } catch (error) {
    console.error('Error getting fuel transaction by id:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Stream Foto dari Database / Storage
exports.getPhoto = async (req, res) => {
  try {
    const { id, type } = req.params;
    // Logika mengambil binary data foto berdasarkan ID dan tipenya (odometer/receipt/dll)
    
    return res.status(200).json({
      success: true,
      message: `Fetching photo type ${type} for transaction ${id}`
    });
  } catch (error) {
    console.error('Error getting photo:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Update Status Transaksi (Admin / Manager)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Contoh: APPROVED / REJECTED
    const approverId = req.user.id;

    // const queryText = 'UPDATE fuel_transactions SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *';
    // const result = await db.query(queryText, [status, approverId, id]);

    return res.status(200).json({
      success: true,
      message: 'Transaction status updated successfully',
      data: {} // result.rows[0]
    });
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};