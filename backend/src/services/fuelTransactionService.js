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
    };

    const transactions = await fuelTransactionRepository.findAllForExport(filters);
    const vehicle = filters.vehicle_id ? await vehicleRepository.findById(filters.vehicle_id) : null;

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- HEADER (REVISI: SEDERHANA TANPA KOP SURAT) ---
        doc.fontSize(10).font('Helvetica-Bold');
        const displayRegion = user.region ? `UL ${user.region.replace('Unit Layanan ', '')}` : 'UPKAL2 REGIONAL';
        doc.text(`Unit Layanan   : ${displayRegion}`.toUpperCase());
        doc.text(`Periode Audit  : ${query.start_date} s/d ${query.end_date}`);
        doc.text(`Model Kendaraan: ${vehicle ? `${vehicle.license_plate} - ${vehicle.vehicle_type}` : 'Seluruh Armada'}`.toUpperCase());
        doc.moveDown(2);

        // --- TABLE HEADER (REVISI KOLOM) ---
        const tableTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(7);
        doc.text('No', 30, tableTop);
        doc.text('Tanggal', 45, tableTop);
        doc.text('No. Pol / Pelat', 85, tableTop);
        doc.text('Stand Awal/Odo', 155, tableTop);
        doc.text('Bar Bensin', 225, tableTop);
        doc.text('Liter / Jenis BBM', 285, tableTop);
        doc.text('Total Rupiah Pembelian', 385, tableTop);

        doc.moveTo(30, tableTop + 10).lineTo(565, tableTop + 10).stroke();

        // --- TABLE ROWS ---
        let y = tableTop + 15;
        if (transactions.length === 0) {
          doc.font('Helvetica-Oblique').text('Tidak ditemukan data transaksi untuk periode ini.', 30, y);
        } else {
          transactions.forEach((tx, i) => {
            if (y > 750) { doc.addPage(); y = 50; }
            doc.font('Helvetica').fontSize(7);
            doc.text(i + 1, 30, y, { width: 15, align: 'center' });
            doc.text(new Date(tx.created_at).toLocaleDateString('id-ID'), 45, y);
            doc.text(tx.license_plate, 85, y);
            doc.text(`${tx.odometer} Km`, 155, y);
            doc.text('-', 225, y); // Stand Bar Bensin placeholder
            doc.text(`${tx.fuel_amount} L / ${tx.fuel_type || 'BBM'}`, 285, y);
            doc.text(`Rp ${Number(tx.total_cost).toLocaleString('id-ID')}`, 385, y);
            y += 12;
          });
        }

        // --- LAMPIRAN BUKTI FISIK (3 FOTO PER TRANSAKSI) ---
        if (transactions.length > 0) {
          doc.addPage();
          doc.fontSize(10).font('Helvetica-Bold').text('LAMPIRAN BUKTI FISIK TRANSAKSI', { align: 'left' });
          doc.moveDown();

          for (const [index, tx] of transactions.entries()) {
            if (doc.y > 600) doc.addPage();

            doc.fontSize(8).font('Helvetica-Bold').text(`TRANSAKSI #${index + 1} - ${tx.license_plate} (${new Date(tx.created_at).toLocaleDateString('id-ID')})`);
            doc.moveDown(0.5);

            const imageWidth = 175;
            const startX = 30;
            const currentY = doc.y;

            const photoTypes = [
              { key: 'odometer_photo_path', label: '1. Odo Sebelum' },
              { key: 'odometer_after_photo_path', label: '2. Odo Sesudah' },
              { key: 'receipt_photo_path', label: '3. Nota / Struk' }
            ];

            for (let i = 0; i < photoTypes.length; i++) {
              const photo = photoTypes[i];
              const xPos = startX + (i * (imageWidth + 5));

              doc.fontSize(6).font('Helvetica-Bold').text(photo.label, xPos, currentY, { width: imageWidth, align: 'center' });

              const imgPath = tx[photo.key];
              if (imgPath) {
                try {
                  let imgUrl = imgPath.startsWith('http') ? imgPath : `https://jgqpxhoyqrfvspmpopqa.supabase.co/storage/v1/object/public/uploads/${imgPath}`;
                  const response = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 8000 });
                  doc.image(response.data, xPos, currentY + 10, { width: imageWidth, height: 110 });
                } catch (err) {
                  doc.fontSize(6).fillColor('red').text('[Gagal memuat]', xPos, currentY + 40, { width: imageWidth, align: 'center' }).fillColor('black');
                }
              } else {
                doc.fontSize(6).text('[Tanpa Berkas]', xPos, currentY + 40, { width: imageWidth, align: 'center' });
              }
            }

            doc.y = currentY + 130; // Move cursor down after 3 images
            doc.moveDown();
          }
        }

        // --- PENGESAHAN (FOOTER) ---
        if (doc.y > 700) doc.addPage();
        doc.moveDown(3);
        const footerY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');

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
