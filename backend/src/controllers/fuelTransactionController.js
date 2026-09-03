const db = require('../config/database'); // Sesuaikan dengan path file pool/koneksi database Anda
const { uploadFile } = require('../services/uploadService');

// 1. Membuat Transaksi Baru
exports.create = async (req, res) => {
  try {
    // Ambil data teks dari body request
    const { odometer, volume, total_cost, notes } = req.body;
    const driverId = req.user.id; // Didapat dari middleware authenticate (JWT)

    // Cek apakah ada file yang diunggah (mendukung req.file tunggal atau req.files jamak dari multer)
    const file = req.file; 
    const files = req.files; 
    
    let publicUrl = null;

    if (file) {
      // Jika menggunakan single upload
      publicUrl = await uploadFile(file.buffer, `fuel/${Date.now()}_${file.originalname}`);
    } else if (files) {
      // Jika menggunakan multiple upload (misal: odometer, receipt, dll)
      // Anda bisa memprosesnya di sini sesuai kebutuhan struktur penyimpanan Anda
    }

    // Contoh Query Simpan ke PostgreSQL
    /*
    const queryText = `
      INSERT INTO fuel_transactions (driver_id, odometer, volume, total_cost, notes, photo_url, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *;
    `;
    const values = [driverId, odometer, volume, total_cost, notes, publicUrl];
    const newTransaction = await db.query(queryText, values);
    */

    return res.status(201).json({
      success: true,
      message: 'Fuel transaction created successfully',
      data: {
        // transaction: newTransaction.rows[0],
        publicUrl
      }
    });

  } catch (error) {
    console.error('Error creating fuel transaction:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
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