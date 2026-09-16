const fuelTransactionRepository = require('../repositories/fuelTransactionRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const fuelAnalysisQueue = require('../config/queue');
const redisClient = require('../config/redis');

class FuelTransactionService {
  async createTransaction(data, userId) {
    const { vehicle_id, filling_source, fuel_type, fuel_amount, odometer, total_cost } = data;

    if (!vehicle_id || !filling_source || !fuel_type || !fuel_amount || !odometer || !total_cost) {
      const error = new Error('Field vehicle_id, filling_source, fuel_type, fuel_amount, odometer, dan total_cost wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(fuel_amount) || Number(fuel_amount) <= 0 ||
        isNaN(odometer) || Number(odometer) < 0 || 
        isNaN(total_cost) || Number(total_cost) < 0) {
      const error = new Error('Nilai jumlah BBM, odometer, dan total harga tidak valid');
      error.statusCode = 400; 
      throw error;
    }

    const validSources = ['SPBU', 'ECERAN'];
    if (!validSources.includes(filling_source.toUpperCase())) {
      const error = new Error('Sumber pengisian harus SPBU atau ECERAN');
      error.statusCode = 400; 
      throw error;
    }

    const validFuelTypes = ['Pertalite', 'Pertamax', 'Biosolar', 'Dexlite', 'Pertamina Dex'];
    const isFuelValid = validFuelTypes.some(type => type.toLowerCase() === fuel_type.toLowerCase());
    if (!isFuelValid) {
      const error = new Error(`Jenis BBM tidak valid. Gunakan: ${validFuelTypes.join(', ')}`);
      error.statusCode = 400; 
      throw error;
    }

    const vehicle = await vehicleRepository.findById(vehicle_id);
    if (!vehicle || !vehicle.is_active) {
      const error = new Error('Kendaraan tidak ditemukan atau sudah tidak aktif');
      error.statusCode = 404; 
      throw error;
    }

    if (data.receipt_photo && data.receipt_photo.buffer) {
      const crypto = require('crypto');
      const receiptHash = crypto.createHash('sha256').update(data.receipt_photo.buffer).digest('hex');
      const duplicateReceipt = await fuelTransactionRepository.findByReceiptHash(receiptHash);
      if (duplicateReceipt) {
        const error = new Error(`Foto nota/struk ini sudah pernah diunggah pada Transaksi ID #${duplicateReceipt.id}. Dilarang menggunakan foto nota yang sama lebih dari 1 kali!`);
        error.statusCode = 400;
        throw error;
      }
    }

    const payload = { ...data, driver_id: userId, fuel_type };
    const newTransaction = await fuelTransactionRepository.create(payload);

    try {
      await redisClient.lPush('fuel_queue', JSON.stringify({ transactionId: newTransaction.id }));
      console.log(`[Queue] Job ID ${newTransaction.id} masuk ke 'fuel_queue'.`);
    } catch (error) {
      console.error(`[Queue Error] Gagal memasukkan transaksi ${newTransaction.id} ke antrean:`, error.message);
    }

    return newTransaction;
  }

  async getTransactions(query, user) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;

    const filters = {
      vehicle_id: query.vehicle_id || null,
      driver_id: query.driver_id || null,
      status: query.status || null,
      fuel_type: query.fuel_type || null,
      is_anomaly: query.is_anomaly !== undefined ? query.is_anomaly : (query.has_anomaly !== undefined ? query.has_anomaly : null),
      role: user.role,
      userId: user.id
    };

    const data = await fuelTransactionRepository.findAll({ limit, offset, ...filters });
    const total = await fuelTransactionRepository.countAll(filters);

    return { 
      data, 
      pagination: { 
        page, 
        limit, 
        total, 
        totalPages: Math.ceil(total / limit) || 1 
      } 
    };
  }

  async getTransactionById(id, user) {
    const transaction = await fuelTransactionRepository.findById(id);
    if (!transaction) {
      const error = new Error('Transaksi BBM tidak ditemukan');
      error.statusCode = 404; 
      throw error;
    }
    if (user.role === 'DRIVER' && transaction.driver_id !== user.id) {
      const error = new Error('Forbidden: Anda tidak memiliki hak akses melihat transaksi ini');
      error.statusCode = 403; 
      throw error;
    }
    return transaction;
  }

  async getTransactionPhoto(id, type, user) {
    const photoRecord = await fuelTransactionRepository.getPhotoByIdAndType(id, type);
    if (!photoRecord) {
      const error = new Error('Transaksi BBM tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (user.role === 'DRIVER' && photoRecord.driver_id !== user.id) {
      const error = new Error('Forbidden: Anda tidak memiliki hak akses melihat foto transaksi ini');
      error.statusCode = 403;
      throw error;
    }

    if (!photoRecord.photo_url) {
      const error = new Error(`Foto '${type}' tidak tersedia untuk transaksi ini`);
      error.statusCode = 404;
      throw error;
    }

    return {
      url: photoRecord.photo_url
    };
  }

  async updateTransactionStatus(id, status) {
    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Status tidak valid. Gunakan: APPROVED atau REJECTED');
      error.statusCode = 400; 
      throw error;
    }
    const transaction = await fuelTransactionRepository.findById(id);
    if (!transaction) {
      const error = new Error('Transaksi BBM tidak ditemukan');
      error.statusCode = 404; 
      throw error;
    }
    return await fuelTransactionRepository.updateStatus(id, status);
  }

  async getAnalytics(start, end) {
    return await fuelTransactionRepository.getAnalytics(start, end);
  }

  async getSummary() {
    return await fuelTransactionRepository.getSummary();
  }

  async generatePdfReport(query, user) {
    const PDFDocument = require('pdfkit');
    const axios = require('axios');

    // 1. Fetch Data
    const filters = {
      vehicle_id: query.vehicle_id === 'ALL' ? null : query.vehicle_id,
      ul_nd: user.region || null,
      start_date: query.start_date,
      end_date: query.end_date
      // status: 'APPROVED' // Dihapus sementara agar semua data muncul untuk pengetesan
    };

    const transactions = await fuelTransactionRepository.findAllForExport(filters);
    const vehicle = filters.vehicle_id ? await vehicleRepository.findById(filters.vehicle_id) : null;

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- HEADER ---
        doc.fontSize(16).font('Helvetica-Bold').text('BERITA ACARA MONITORING BBM', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Unit Layanan   : ${user.region || 'UPKAL2 REGIONAL'}`);
        doc.text(`Periode Audit  : ${query.start_date} s/d ${query.end_date}`);
        doc.text(`Model Armada   : ${vehicle ? `${vehicle.license_plate} - ${vehicle.vehicle_type}` : 'Seluruh Armada'}`);
        doc.moveDown();

        // --- TABLE HEADER ---
        const tableTop = 140;
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('No', 30, tableTop);
        doc.text('Tanggal', 50, tableTop);
        doc.text('No. Pol', 100, tableTop);
        doc.text('Odometer', 160, tableTop);
        doc.text('Liter', 230, tableTop);
        doc.text('Total Rupiah', 300, tableTop);
        doc.moveTo(30, tableTop + 12).lineTo(565, tableTop + 12).stroke();

        // --- TABLE ROWS ---
        let y = tableTop + 20;
        if (transactions.length === 0) {
          doc.font('Helvetica-Oblique').text('Tidak ditemukan data transaksi untuk periode ini.', 30, y);
        } else {
          transactions.forEach((tx, i) => {
            if (y > 750) { doc.addPage(); y = 50; }
            doc.font('Helvetica').fontSize(8);
            doc.text(i + 1, 30, y);
            doc.text(new Date(tx.created_at).toLocaleDateString('id-ID'), 50, y);
            doc.text(tx.license_plate, 100, y);
            doc.text(`${tx.odometer} Km`, 160, y);
            doc.text(`${tx.fuel_amount} L`, 230, y);
            doc.text(`Rp ${Number(tx.total_cost).toLocaleString('id-ID')}`, 300, y);
            y += 15;
          });
        }

        // --- LAMPIRAN BUKTI FISIK (New Page) ---
        if (transactions.length > 0) {
          doc.addPage();
          doc.fontSize(12).font('Helvetica-Bold').text('LAMPIRAN BUKTI FISIK TRANSAKSI', { align: 'left' });
          doc.moveDown();

          for (const [index, tx] of transactions.entries()) {
            // Cek sisa halaman, jika tidak cukup buat halaman baru
            if (doc.y > 600) doc.addPage();

            doc.fontSize(10).font('Helvetica-Bold').text(`TRANSAKSI #${tx.id} - ${tx.license_plate} (${new Date(tx.created_at).toLocaleDateString('id-ID')})`);
            doc.moveDown(0.5);

            const imageWidth = 170;
            const startX = 30;
            const currentY = doc.y;

            const photoTypes = [
              { key: 'odometer_photo_path', label: '1. Odo Sebelum' },
              { key: 'odometer_after_photo_path', label: '2. Odo Sesudah' },
              { key: 'receipt_photo_path', label: '3. Nota / Struk' }
            ];

            for (let i = 0; i < photoTypes.length; i++) {
              const photo = photoTypes[i];
              const xPos = startX + (i * (imageWidth + 10));

              doc.fontSize(7).font('Helvetica-Bold').text(photo.label, xPos, currentY, { width: imageWidth, align: 'center' });

              const imgPath = tx[photo.key];
              if (imgPath) {
                try {
                  // Construct Supabase URL
                  const imgUrl = `https://jgqpxhoyqrfvspmpopqa.supabase.co/storage/v1/object/public/fuel-proofs/${imgPath}`;
                  const response = await axios.get(imgUrl, { responseType: 'arraybuffer' });
                  doc.image(response.data, xPos, currentY + 12, { width: imageWidth, height: 120 });
                } catch (err) {
                  doc.fontSize(7).font('Helvetica-Oblique').text('[Gagal memuat gambar]', xPos, currentY + 50, { width: imageWidth, align: 'center' });
                }
              } else {
                doc.fontSize(7).font('Helvetica-Oblique').text('[Tidak ada foto]', xPos, currentY + 50, { width: imageWidth, align: 'center' });
              }
            }

            doc.moveDown(18); // Beri jarak antar baris transaksi (120px height + margin)
          }
        }

        // --- SIGNATURE ---
        if (doc.y > 700) doc.addPage();
        const footerY = doc.y + 50;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Mengetahui,', 50, footerY);
        doc.text('Manajer Unit Layanan', 50, footerY + 12);
        doc.text('( ............................ )', 50, footerY + 70);

        doc.text('Dibuat Oleh,', 400, footerY);
        doc.text('Admin Pengawas', 400, footerY + 12);
        doc.text(user.full_name || 'Admin', 400, footerY + 70);

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new FuelTransactionService();
