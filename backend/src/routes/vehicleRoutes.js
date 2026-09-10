const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const db = require('../config/db'); // Koneksi pg pool PostgreSQL
const vehicleController = require('../controllers/vehicleController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// ==========================================
// 1. ENDPOINT: VERIFIKASI NOMOR POLISI (Untuk Aplikasi Android & Web QR Scanner)
// ==========================================
router.get('/verify/:licensePlate', async (req, res) => {
    try {
        const { licensePlate } = req.params;
        
        // Mengabaikan spasi dan huruf besar-kecil saat pencarian
        const queryText = `
            SELECT * FROM vehicles 
            WHERE LOWER(REPLACE(license_plate, ' ', '')) = LOWER(REPLACE($1, ' ', ''))
        `;
        const { rows } = await db.query(queryText, [licensePlate.trim()]);

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: `Kendaraan dengan No. Polisi '${licensePlate}' tidak ditemukan di database.`
            });
        }

        const vehicle = rows[0];

        if (!vehicle.is_active) {
            return res.status(400).json({
                success: false,
                message: `Unit dengan No. Polisi '${vehicle.license_plate}' sedang tidak aktif dan tidak dapat diisi BBM.`
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Kendaraan terverifikasi!',
            data: {
                id: vehicle.id,
                licensePlate: vehicle.license_plate,
                vehicleType: vehicle.vehicle_type,
                ulNd: vehicle.ul_nd,
                ulPln: vehicle.ul_pln
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
// 2. ENDPOINT: GENERATE QR CODE (Untuk Admin Cetak Stiker)
// ==========================================
router.get('/qrcode/:licensePlate', async (req, res) => {
    try {
        const { licensePlate } = req.params;

        // Mengabaikan spasi agar pencarian via URL lebih fleksibel
        const queryText = `
            SELECT * FROM vehicles 
            WHERE LOWER(REPLACE(license_plate, ' ', '')) = LOWER(REPLACE($1, ' ', ''))
        `;
        const { rows } = await db.query(queryText, [licensePlate.trim()]);

        if (rows.length === 0) {
            return res.status(404).send(`<h3>Kendaraan dengan No. Polisi '${licensePlate}' tidak ditemukan di database.</h3>`);
        }

        const vehicle = rows[0];
        const qrPayload = vehicle.license_plate; 
        const qrImageBase64 = await QRCode.toDataURL(qrPayload);

        res.send(`
            <html>
                <head>
                    <title>Stiker QR - ${vehicle.license_plate}</title>
                </head>
                <body style="background-color: #f4f4f4; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
                    <div style="background: white; text-align: center; font-family: Arial, sans-serif; padding: 25px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); width: 320px;">
                        <h4 style="margin: 0 0 10px 0; color: #1E3A8A;">PLN NUSA DAYA</h4>
                        <h3 style="margin: 0 0 15px 0; font-size: 14px; color: #555;">UPKAL2 - ${vehicle.ul_nd || '-'}</h3>
                        <div style="background: #eef2f6; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                            <h2 style="margin: 0; color: #111; font-size: 22px; letter-spacing: 1px;">${vehicle.license_plate}</h2>
                            <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;">Tipe: ${vehicle.vehicle_type || '-'}</p>
                        </div>
                        <img src="${qrImageBase64}" alt="QR ${vehicle.license_plate}" style="width: 200px; height: 200px;" />
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

// ==========================================
// 3. ENDPOINT: CRUD MASTER KENDARAAN (Untuk Web Dashboard)
// ==========================================
router.get('/', vehicleController.getAll);
router.get('/:id', vehicleController.getById);
router.post('/', authenticate, authorize('ADMIN'), vehicleController.create);
router.put('/:id', authenticate, authorize('ADMIN'), vehicleController.update);
router.delete('/:id', authenticate, authorize('ADMIN'), vehicleController.remove);

module.exports = router;