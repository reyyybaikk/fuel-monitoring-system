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
        doc.text('Stand Akhir/Odo', 225, tableTop);
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
            doc.text(`${Number(tx.odometer).toLocaleString('id-ID')} Km`, 155, y);
            doc.text(tx.odometer_next ? `${Number(tx.odometer_next).toLocaleString('id-ID')} Km` : '-', 225, y);
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
            if (doc.y > 550) doc.addPage();

            doc.fontSize(9).font('Helvetica-Bold').text(`DATA TRANSAKSI #${index + 1} - ${tx.license_plate}`, 30, doc.y, { underline: true });
            doc.moveDown(0.5);

            const startX = 30;
            const currentY = doc.y;

            // --- TATA LETAK ASIMETRIS (LANDSCAPE & PORTRAIT) ---

            // 1. Odo Sebelum & Sesudah (LANDSCAPE - Baris Atas)
            const odoWidth = 265;
            const odoHeight = 150;

            const odos = [
              { key: 'odometer_photo_path', label: '1. Odometer Awal (Landscape)', x: startX },
              { key: 'odometer_after_photo_path', label: '2. Odometer Akhir (Landscape)', x: startX + odoWidth + 5 }
            ];

            for (const odo of odos) {
              doc.fontSize(7).font('Helvetica-Bold').text(odo.label, odo.x, currentY, { width: odoWidth, align: 'center' });
              const imgPath = tx[odo.key];
              if (imgPath) {
                try {
                  let imgUrl = imgPath.startsWith('http') ? imgPath : `https://jgqpxhoyqrfvspmpopqa.supabase.co/storage/v1/object/public/uploads/${imgPath}`;
                  const response = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 8000 });
                  doc.image(response.data, odo.x, currentY + 10, { fit: [odoWidth, odoHeight], align: 'center', valign: 'center' });
                } catch (err) {
                  doc.fontSize(6).fillColor('red').text('[Gagal memuat]', odo.x, currentY + 50, { width: odoWidth, align: 'center' }).fillColor('black');
                }
              }
            }

            // 2. Struk/Nota (PORTRAIT - Baris Bawah)
            const receiptY = currentY + odoHeight + 25;
            const receiptWidth = 200; // Lebih ramping karena Portrait
            const receiptHeight = 280; // Lebih tinggi
            const receiptX = (595 - receiptWidth) / 2; // Center horizontal di kertas A4

            doc.fontSize(7).font('Helvetica-Bold').text('3. Nota / Struk Pembelian (Portrait)', 30, receiptY, { width: 535, align: 'center' });

            if (tx.receipt_photo_path) {
              try {
                let imgUrl = tx.receipt_photo_path.startsWith('http') ? tx.receipt_photo_path : `https://jgqpxhoyqrfvspmpopqa.supabase.co/storage/v1/object/public/uploads/${tx.receipt_photo_path}`;
                const response = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 8000 });
                doc.image(response.data, receiptX, receiptY + 10, { fit: [receiptWidth, receiptHeight], align: 'center' });
                doc.y = receiptY + receiptHeight + 20; // Update cursor Y ke bawah struk
              } catch (err) {
                doc.fontSize(6).fillColor('red').text('[Gagal memuat struk]', 30, receiptY + 50, { width: 535, align: 'center' }).fillColor('black');
                doc.y = receiptY + 70;
              }
            } else {
               doc.y = receiptY + 20;
            }

            doc.moveDown(2);
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
