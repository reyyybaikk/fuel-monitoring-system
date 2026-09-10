const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const db = require('../config/db'); // Menggunakan koneksi pg pool PostgreSQL

// ==========================================
// 1. ENDPOINT: VERIFIKASI NOMOR POLISI (Untuk Aplikasi Android)
// ==========================================
router.get('/vehicles/verify/:plateNumber', async (req, res) => {
    try {
        const { plateNumber } = req.params;
        
        const queryText = 'SELECT * FROM vehicles WHERE LOWER(plate_number) = LOWER($1)';
        const { rows } = await db.query(queryText, [plateNumber.trim()]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Kendaraan dengan No. Polisi '${plateNumber}' tidak ditemukan di database.`
            });
        }

        const vehicle = rows[0];

        // Validate master‑data active flag
        if (!vehicle.is_active) {
            return res.status(400).json({
                success: false,
                message: `Kendaraan dengan No. Polisi '${plateNumber}' sudah tidak aktif dalam master data dan tidak dapat diisi BBM.`,
            });
        }

        // Validate operational status
        if (vehicle.status !== 'active') {
            return res.status(400).json({
                success: false,
                message: `Unit dengan No. Polisi '${plateNumber}' sedang berstatus ${vehicle.status} dan tidak dapat diisi BBM.`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Kendaraan terverifikasi!',
            data: {
                id: vehicle.id,
                plateNumber: vehicle.plate_number,
                unitCode: vehicle.unit_code,
                region: vehicle.region
            }
        });

    } catch (error) {
        console.error('Error saat verifikasi kendaraan:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// ==========================================
// 2. ENDPOINT: INPUT / SYNC TRANSAKSI BBM
// ==========================================
router.post('/fuel/transaction', async (req, res) => {
    try {
        const {
            transactionUuid,
            driverId,
            vehicleId,
            odometerBefore,
            odometerAfter,
            liters,
            totalCost,
            photoPath,
            isSynced
        } = req.body;

        const checkDuplicate = await db.query(
            'SELECT * FROM fuel_transactions WHERE transaction_uuid = $1', 
            [transactionUuid]
        );

        if (checkDuplicate.rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: 'Transaksi sudah pernah disinkronkan sebelumnya (Duplicate prevented).',
                data: checkDuplicate.rows[0]
            });
        }

        const insertQuery = `
            INSERT INTO fuel_transactions (
                transaction_uuid, driver_id, vehicle_id, odometer_before, 
                odometer_after, fuel_amount, total_cost, photo_path, is_synced, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *;
        `;

        const values = [
            transactionUuid,
            driverId,
            vehicleId,
            odometerBefore,
            odometerAfter,
            liters,
            totalCost,
            photoPath || null,
            isSynced !== undefined ? isSynced : true
        ];

        const result = await db.query(insertQuery, values);

        return res.status(201).json({
            success: true,
            message: 'Data transaksi BBM berhasil disimpan ke server!',
            data: result.rows[0]
        });

    } catch (error) {
        console.error('Error saat menyimpan transaksi:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Gagal menyimpan transaksi ke server', 
            error: error.message 
        });
    }
}); // close router.post




// ==========================================
// 3. ENDPOINT: GENERATE QR CODE (Untuk Admin Cetak Stiker)
// ==========================================
router.get('/vehicles/qrcode/:plateNumber', async (req, res) => {
    try {
        const { plateNumber } = req.params;

        // Cari kendaraan berdasarkan nomor polisi di database
        const { rows } = await db.query(
            'SELECT * FROM vehicles WHERE LOWER(plate_number) = LOWER($1)', 
            [plateNumber.trim()]
        );

        if (rows.length === 0) {
            return res.status(404).send(`<h3>Kendaraan dengan No. Polisi '${plateNumber}' tidak ditemukan di database.</h3>`);
        }

        const vehicle = rows[0];

        // Payload QR Code berisi nomor polisi asli kendaraan
        const qrPayload = vehicle.plate_number; 
        const qrImageBase64 = await QRCode.toDataURL(qrPayload);

        // Render halaman web sederhana agar admin bisa langsung melihat dan mencetak stiker
        res.send(`
            <html>
                <head>
                    <title>Stiker QR - ${vehicle.plate_number}</title>
                </head>
                <body style="background-color: #f4f4f4; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <div style="background: white; text-align: center; font-family: Arial, sans-serif; padding: 25px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 320px;">
                        <h4 style="margin: 0 0 10px 0; color: #1E3A8A;">PLN NUSA DAYA</h4>
                        <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #555;">UPKAL2 - ${vehicle.region}</h3>
                        <div style="background: #eef2f6; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                            <h2 style="margin: 0; color: #111; font-size: 22px; letter-spacing: 1px;">${vehicle.plate_number}</h2>
                            <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Unit: ${vehicle.unit_code || '-'}</p>
                        </div>
                        <img src="${qrImageBase64}" alt="QR ${vehicle.plate_number}" style="width: 200px; height: 200px;" />
                        <p style="font-size: 10px; color: #888; margin-top: 10px;">Scan menggunakan Aplikasi Fuel Monitoring</p>
                        <button onclick="window.print()" style="background-color: #2563EB; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer; width: 100%; margin-top: 10px;">Cetak Stiker</button>
                    </div>
                </body>
            </html>
        `);

    } catch (error) {
        console.error('Gagal generate QR Code:', error);
        res.status(500).send('Internal Server Error');
    }
});

// --------------------
// 4. ENDPOINT: AGGREGASI ANALITIK BBM (Laporan & Analitik)
// --------------------
router.get('/fuel/analytics', async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = start ? new Date(start) : new Date('1970-01-01');
    const endDate = end ? new Date(end) : new Date();

    const query = `
      SELECT DATE_TRUNC('month', created_at) AS month,
             SUM(fuel_amount) AS total_liters,
             SUM(total_cost) AS total_cost,
             CASE WHEN SUM(fuel_amount) > 0 THEN SUM(total_cost) / SUM(fuel_amount) ELSE 0 END AS avg_price_per_liter
      FROM fuel_transactions
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY month
      ORDER BY month ASC;
    `;
    const { rows } = await db.query(query, [startDate, endDate]);

    return res.status(200).json({
      success: true,
      message: 'Aggregasi laporan BBM berhasil diambil',
      data: rows.map(r => ({
        month: r.month.toISOString().substring(0, 7), // YYYY-MM
        totalLiters: parseFloat(r.total_liters),
        totalCost: parseFloat(r.total_cost),
        avgPricePerLiter: parseFloat(r.avg_price_per_liter)
      }))
    });
  } catch (error) {
    console.error('Error pada endpoint analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data analitik',
      error: error.message
    });
  }
});

// --------------------
// 5. ENDPOINT: SUMMARY DATA (Dashboard)
// --------------------
router.get('/fuel/summary', async (req, res) => {
  try {
      const query = `
        SELECT COUNT(*) AS total_transactions,
               SUM(fuel_amount) AS total_liters,
               SUM(total_cost) AS total_cost,
               SUM(CASE WHEN ml_is_anomaly THEN 1 ELSE 0 END) AS anomaly_count
        FROM fuel_transactions;
      `;
    const { rows } = await db.query(query);
    const r = rows[0];
    return res.status(200).json({
      success: true,
      message: 'Summary data retrieved',
      data: {
        totalTransactions: parseInt(r.total_transactions),
        totalLiters: parseFloat(r.total_liters),
        totalCost: parseFloat(r.total_cost),
        anomalyCount: parseInt(r.anomaly_count)
      }
    });
  } catch (error) {
    console.error('Error on summary endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil summary',
      error: error.message
    });
  }
});

module.exports = router;