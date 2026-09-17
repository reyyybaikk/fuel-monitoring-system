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
      userId: user.id,
      region: user.region
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

  async updateTransactionData(id, data) {
    const transaction = await fuelTransactionRepository.findById(id);
    if (!transaction) {
      const error = new Error('Transaksi BBM tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Pembenahan data oleh admin biasanya mengubah status menjadi REVIEW atau APPROVED
    const updated = await fuelTransactionRepository.update(id, {
      ...data,
      status: data.status || 'APPROVED'
    });

    // PUSH ke antrean ML-Engine untuk verifikasi ulang data yang sudah dikoreksi
    try {
      await redisClient.lPush('fuel_queue', JSON.stringify({ transactionId: id }));
      console.log(`[Queue] Re-verifikasi Job ID ${id} (Koreksi Admin) masuk ke 'fuel_queue'.`);
    } catch (error) {
      console.error(`[Queue Error] Gagal memasukkan koreksi transaksi ${id} ke antrean:`, error.message);
    }

    return updated;
  }

  async getAnalytics(start, end, user) {
    return await fuelTransactionRepository.getAnalytics(start, end, user.role, user.region);
  }

  async getSummary(user, query = {}) {
    // Jika Admin Pusat memberikan filter manual ul_nd, prioritaskan itu.
    // Jika Admin Wilayah, gunakan wilayah dari profil user (paksa di repository)
    const filterRegion = user.role === 'ADMIN_PUSAT' ? (query.ul_nd || null) : user.region;
    return await fuelTransactionRepository.getSummary(user.role, filterRegion);
  }

  async getExportPreview(query, user) {
    const filters = {
      vehicle_id: query.vehicle_id === 'ALL' ? null : query.vehicle_id,
      ul_nd: (user.role === 'ADMIN_WILAYAH' || user.role === 'ADMIN') ? user.region : (query.ul_nd || null),
      start_date: query.start_date,
      end_date: query.end_date
    };
    return await fuelTransactionRepository.findAllForExport(filters);
  }

  async generatePdfReport(query, user) {
    const PDFDocument = require('pdfkit');
    const axios = require('axios');

    const filters = {
      vehicle_id: query.vehicle_id === 'ALL' ? null : query.vehicle_id,
      ul_nd: user.role === 'ADMIN_PUSAT' ? (query.ul_nd || null) : user.region,
      start_date: query.start_date,
      end_date: query.end_date
    };

    const transactions = await fuelTransactionRepository.findAllForExport(filters);
    const vehicle = filters.vehicle_id ? await vehicleRepository.findById(filters.vehicle_id) : null;

    return new Promise(async (resolve, reject) => {
      try {
        // A4 Margin 15mm approx 42.5 points
        const doc = new PDFDocument({ margin: 42, size: 'A4' });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // --- 1. HEADER (Identik dengan Web Preview) ---
        doc.fontSize(9).font('Helvetica-Bold');
        const displayRegion = filters.ul_nd ? `UL ${filters.ul_nd.replace('Unit Layanan ', '')}` : 'UPKAL2 REGIONAL';

        doc.fillColor('#4b5563').text('Unit Layanan', { continued: true }).fillColor('black').text(` : ${displayRegion}`.toUpperCase());
        doc.fillColor('#4b5563').text('Periode Audit', { continued: true }).fillColor('black').text(` : ${query.start_date} s/d ${query.end_date}`);
        const vInfo = vehicle ? `${vehicle.license_plate} - ${vehicle.vehicle_type}` : (query.vehicle_id === 'ALL' ? 'Seluruh Armada' : 'Laporan Kolektif');
        doc.fillColor('#4b5563').text('Model Kendaraan', { continued: true }).fillColor('black').text(` : ${vInfo}`.toUpperCase());

        doc.moveDown(1);
        doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor('#cbd5e1').stroke();
        doc.moveDown(1.5);

        // --- 2. TABEL LOG TRANSAKSI ---
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text('LOG TRANSAKSI BAHAN BAKAR', { characterSpacing: 1 });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(7).font('Helvetica-Bold').fillColor('black');

        // Headers
        doc.text('No', 42, tableTop, { width: 20 });
        doc.text('Tanggal', 65, tableTop, { width: 50 });
        doc.text('No. Pol / Pelat', 115, tableTop, { width: 80 });
        doc.text('Stand Awal/Odo', 195, tableTop, { width: 70 });
        doc.text('Stand Akhir/Odo', 265, tableTop, { width: 70 });
        doc.text('Liter / Jenis BBM', 335, tableTop, { width: 90 });
        doc.text('Total Rupiah Pembelian', 425, tableTop, { width: 128 });

        doc.moveTo(42, tableTop + 12).lineTo(553, tableTop + 12).strokeColor('#94a3b8').stroke();

        let y = tableTop + 20;
        if (transactions.length === 0) {
          doc.font('Helvetica-Oblique').text('Tidak ditemukan data transaksi.', 42, y);
        } else {
          transactions.forEach((tx, i) => {
            if (y > 750) { doc.addPage(); y = 50; }
            doc.font('Helvetica').fontSize(7);
            doc.text(i + 1, 42, y, { width: 20 });
            doc.text(new Date(tx.created_at).toLocaleDateString('id-ID'), 65, y);
            doc.text(tx.license_plate, 115, y);
            doc.text(`${Number(tx.odometer).toLocaleString('id-ID')} Km`, 195, y);
            doc.text(tx.odometer_next ? `${Number(tx.odometer_next).toLocaleString('id-ID')} Km` : '-', 265, y);
            doc.text(`${tx.fuel_amount} L / ${tx.fuel_type || 'BBM'}`, 335, y);
            doc.text(`Rp ${Number(tx.total_cost).toLocaleString('id-ID')}`, 425, y);
            y += 15;
          });
        }

        // --- 3. LAMPIRAN BUKTI FISIK (Identik Web Layout) ---
        if (transactions.length > 0) {
          doc.addPage();
          doc.fontSize(10).font('Helvetica-Bold').text('LAMPIRAN BUKTI FISIK TRANSAKSI');
          doc.moveDown(0.2);
          doc.moveTo(42, doc.y).lineTo(180, doc.y).strokeColor('black').stroke();
          doc.moveDown(1.5);

          for (const [index, tx] of transactions.entries()) {
            // Check remaining space for a full entry (Approx 200 units needed)
            if (doc.y > 600) doc.addPage();

            const entryTop = doc.y;
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
            doc.rect(42, entryTop, 511, 15).fill('#f1f5f9');
            doc.fillColor('black').text(`DATA #${index + 1} - ${tx.license_plate} • ${new Date(tx.created_at).toLocaleString('id-ID')}`, 48, entryTop + 4);

            doc.moveDown(1);
            const imageY = doc.y;
            const imageWidth = 165;
            const imageHeight = 110;
            const gap = 8;

            const photoTypes = [
              { key: 'odometer_photo_path', label: '1. Odo Sebelum' },
              { key: 'odometer_after_photo_path', label: '2. Odo Sesudah' },
              { key: 'receipt_photo_path', label: '3. Nota / Struk' }
            ];

            for (let i = 0; i < photoTypes.length; i++) {
              const photo = photoTypes[i];
              const xPos = 42 + (i * (imageWidth + gap));

              // Header Label Box
              doc.fontSize(6).font('Helvetica-Bold').fillColor('#4b5563');
              doc.rect(xPos, imageY, imageWidth, 12).fill('#f8fafc');
              doc.fillColor('#4b5563').text(photo.label, xPos, imageY + 3, { width: imageWidth, align: 'center' });

              const imgPath = tx[photo.key];
              if (imgPath) {
                try {
                  let imgUrl = imgPath.startsWith('http') ? imgPath : `https://jgqpxhoyqrfvspmpopqa.supabase.co/storage/v1/object/public/uploads/${imgPath}`;
                  const response = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 10000 });
                  doc.image(response.data, xPos, imageY + 14, { fit: [imageWidth, imageHeight], align: 'center', valign: 'center' });
                  // Draw Border for Image
                  doc.rect(xPos, imageY + 14, imageWidth, imageHeight).strokeColor('#cbd5e1').stroke();
                } catch (err) {
                  doc.fontSize(6).fillColor('red').text('[Gagal memuat bukti]', xPos, imageY + 50, { width: imageWidth, align: 'center' }).fillColor('black');
                }
              } else {
                doc.fontSize(6).fillColor('#94a3b8').text('[Tanpa Berkas]', xPos, imageY + 50, { width: imageWidth, align: 'center' });
              }
            }

            doc.y = imageY + imageHeight + 25;
          }
        }

        // --- 4. PENGESAHAN (Identik Web Layout) ---
        if (doc.y > 700) doc.addPage();
        doc.moveDown(4);
        const footerY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');

        doc.text('Mengetahui,', 42, footerY, { align: 'center', width: 200 });
        doc.font('Helvetica-Oblique').text('Manajer Unit Layanan', 42, footerY + 12, { align: 'center', width: 200 });
        doc.font('Helvetica-Bold').text('( ............................ )', 42, footerY + 80, { align: 'center', width: 200 });

        doc.text('Dibuat Oleh,', 353, footerY, { align: 'center', width: 200 });
        doc.font('Helvetica-Oblique').text('Admin Pengawas Wilayah', 353, footerY + 12, { align: 'center', width: 200 });
        doc.font('Helvetica-Bold').text(user.full_name || 'Admin', 353, footerY + 80, { align: 'center', width: 200 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new FuelTransactionService();
