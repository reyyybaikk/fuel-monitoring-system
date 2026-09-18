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
    const { range = '7d', ul_nd } = query;

    // Tentukan filter wilayah
    const filterRegion = user.role === 'ADMIN_PUSAT' ? (ul_nd || null) : user.region;

    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6); // Ambil 6 bulan terakhir untuk tren

    // Ambil data summary, tren bulanan, dan transaksi terbaru
    const [summary, monthlyTrend, recentTransactions] = await Promise.all([
      fuelTransactionRepository.getSummary(user.role, filterRegion),
      fuelTransactionRepository.getAnalytics(start.toISOString(), end.toISOString(), user.role, filterRegion),
      fuelTransactionRepository.findAll({
        limit: 10, offset: 0,
        role: user.role, region: filterRegion
      })
    ]);

    // Memastikan koordinat marker dikonversi ke format angka (float) untuk Frontend
    const markers = (summary.map_markers || []).map(m => ({
      ...m,
      lat: parseFloat(m.lat || -3.0),
      lng: parseFloat(m.lng || 114.0)
    }));

    return {
      ...summary,
      chart_data: monthlyTrend,
      recent_activities: recentTransactions,
      map_markers: markers
    };
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

    // Hitung Sub Total
    const totalLiter = transactions.reduce((sum, tx) => sum + Number(tx.fuel_amount || 0), 0);
    const totalRupiah = transactions.reduce((sum, tx) => sum + Number(tx.total_cost || 0), 0);

    return new Promise(async (resolve, reject) => {
      try {
        // PERBAIKAN: Set Portrait dan Ukuran A4 secara absolut (595.28 x 841.89 points)
        const doc = new PDFDocument({
            size: 'A4',
            layout: 'portrait',
            margin: 42,
            bufferPages: true
        });

        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        // Pastikan halaman pertama adalah Portrait
        doc.switchToPage(0);

        // --- 1. HEADER ---
        doc.fontSize(9).font('Helvetica-Bold');
        const displayRegion = filters.ul_nd ? `UL ${filters.ul_nd.replace('Unit Layanan ', '')}` : 'UPKAL2 REGIONAL';

        doc.fillColor('#4b5563').text('Unit Layanan', { continued: true }).fillColor('black').text(` : ${displayRegion}`.toUpperCase());
        doc.fillColor('#4b5563').text('Periode Audit', { continued: true }).fillColor('black').text(` : ${query.start_date} s/d ${query.end_date}`);
        const vInfo = vehicle ? `${vehicle.license_plate} - ${vehicle.vehicle_type}` : (query.vehicle_id === 'ALL' ? 'Seluruh Armada' : 'Laporan Kolektif');
        doc.fillColor('#4b5563').text('Model Kendaraan', { continued: true }).fillColor('black').text(` : ${vInfo}`.toUpperCase());

        doc.moveDown(1);
        doc.moveTo(42, doc.y).lineTo(553, doc.y).strokeColor('#cbd5e1').stroke();
        doc.moveDown(1.5);

        // --- 2. TABEL LOG TRANSAKSI DENGAN GARIS ---
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1e293b').text('LOG TRANSAKSI BAHAN BAKAR', { characterSpacing: 1 });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const colWidths = { no: 25, tgl: 50, plat: 75, standA: 70, standB: 70, bbm: 95, cost: 126 };
        const colX = {
            no: 42,
            tgl: 42 + 25,
            plat: 42 + 25 + 50,
            standA: 42 + 25 + 50 + 75,
            standB: 42 + 25 + 50 + 75 + 70,
            bbm: 42 + 25 + 50 + 75 + 70 + 70,
            cost: 42 + 25 + 50 + 75 + 70 + 70 + 95
        };

        const drawRowBorders = (y, height) => {
            doc.rect(42, y, 511, height).strokeColor('#94a3b8').stroke();
            // Vertical lines
            [colX.tgl, colX.plat, colX.standA, colX.standB, colX.bbm, colX.cost].forEach(x => {
                doc.moveTo(x, y).lineTo(x, y + height).stroke();
            });
        };

        // Header Background & Text
        doc.rect(42, tableTop, 511, 15).fill('#f1f5f9');
        doc.fillColor('black').fontSize(7).font('Helvetica-Bold');
        doc.text('No', colX.no, tableTop + 4, { width: colWidths.no, align: 'center' });
        doc.text('Tanggal', colX.tgl, tableTop + 4, { width: colWidths.tgl, align: 'center' });
        doc.text('No. Pol / Pelat', colX.plat, tableTop + 4, { width: colWidths.plat, align: 'center' });
        doc.text('Stand Awal/Odo', colX.standA, tableTop + 4, { width: colWidths.standA, align: 'center' });
        doc.text('Stand Akhir/Odo', colX.standB, tableTop + 4, { width: colWidths.standB, align: 'center' });
        doc.text('Liter / Jenis BBM', colX.bbm, tableTop + 4, { width: colWidths.bbm, align: 'center' });
        doc.text('Total Rupiah Pembelian', colX.cost, tableTop + 4, { width: colWidths.cost, align: 'center' });
        drawRowBorders(tableTop, 15);

        let y = tableTop + 15;
        if (transactions.length === 0) {
          doc.font('Helvetica-Oblique').text('Tidak ditemukan data transaksi.', 42, y + 5);
          drawRowBorders(y, 15);
          y += 15;
        } else {
          transactions.forEach((tx, i) => {
            if (y > 730) {
                doc.addPage();
                y = 50;
                // Redraw headers on new page? (Optional, skipping for now)
            }
            doc.font('Helvetica').fontSize(7).fillColor('black');
            doc.text(i + 1, colX.no, y + 4, { width: colWidths.no, align: 'center' });
            doc.text(new Date(tx.created_at).toLocaleDateString('id-ID'), colX.tgl, y + 4, { width: colWidths.tgl, align: 'center' });
            doc.text(tx.license_plate, colX.plat + 5, y + 4, { width: colWidths.plat - 5 });
            doc.text(`${Number(tx.odometer).toLocaleString('id-ID')} Km`, colX.standA, y + 4, { width: colWidths.standA, align: 'center' });
            doc.text(tx.odometer_next ? `${Number(tx.odometer_next).toLocaleString('id-ID')} Km` : '-', colX.standB, y + 4, { width: colWidths.standB, align: 'center' });
            doc.text(`${tx.fuel_amount} L / ${tx.fuel_type || 'BBM'}`, colX.bbm + 5, y + 4, { width: colWidths.bbm - 5 });
            doc.text(`Rp ${Number(tx.total_cost).toLocaleString('id-ID')}`, colX.cost, y + 4, { width: colWidths.cost - 5, align: 'right' });

            drawRowBorders(y, 15);
            y += 15;
          });
        }

        // --- SUB TOTAL ROW ---
        doc.rect(42, y, 511, 15).fill('#f1f5f9');
        doc.fillColor('black').font('Helvetica-Bold').fontSize(7);
        // Teks "SUBTOTAL" dirapikan posisinya agar pas di tengah kolom deskripsi (No s/d Stand Akhir)
        doc.text('SUBTOTAL', colX.no, y + 4, { width: colX.bbm - colX.no - 10, align: 'right' });
        doc.text(`${totalLiter.toFixed(2)} L`, colX.bbm, y + 4, { width: colWidths.bbm, align: 'center' });
        doc.text(`Rp ${totalRupiah.toLocaleString('id-ID')}`, colX.cost, y + 4, { width: colWidths.cost - 5, align: 'right' });
        drawRowBorders(y, 15);
        y += 30;

        // --- 3. LAMPIRAN BUKTI FISIK (Layout: 1 Halaman A4 = 1 Transaksi / 3 Foto) ---
        if (transactions.length > 0) {
          for (const [index, tx] of transactions.entries()) {
            doc.addPage();

            // Header Transaksi per Halaman
            doc.rect(42, 42, 511, 30).fill('#0b536f');
            doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
            doc.text(`DOKUMENTASI TRANSAKSI #${index + 1}`, 55, 48);
            doc.fontSize(8).font('Helvetica');
            doc.text(`${tx.license_plate} • ${tx.vehicle_type} • ${new Date(tx.created_at).toLocaleString('id-ID')}`, 55, 58);

            const photoTypes = [
              { key: 'odometer_photo_path', label: '1. FOTO ODOMETER SEBELUM PENGISIAN' },
              { key: 'odometer_after_photo_path', label: '2. FOTO ODOMETER / FUEL BAR SESUDAH' },
              { key: 'receipt_photo_path', label: '3. FOTO NOTA / STRUK PEMBELIAN FISIK' }
            ];

            let currentY = 85;
            const imageWidth = 511;
            const imageHeight = 215; // Ukuran optimal agar 3 foto + header muat di satu halaman A4

            for (const photo of photoTypes) {
              // Sub-Header Foto
              doc.rect(42, currentY, 511, 15).fill('#f1f5f9');
              doc.fillColor('#1e293b').fontSize(7).font('Helvetica-Bold');
              doc.text(photo.label, 50, currentY + 4);

              currentY += 20;

              const imgPath = tx[photo.key];
              if (imgPath) {
                try {
                  let imgUrl = imgPath.startsWith('http') ? imgPath : `https://jgqpxhoyqrfvspmpopqa.supabase.co/storage/v1/object/public/uploads/${imgPath}`;
                  const response = await axios.get(imgUrl, { responseType: 'arraybuffer', timeout: 15000 });
                  doc.image(response.data, 42, currentY, { fit: [imageWidth, imageHeight], align: 'center', valign: 'center' });

                  // Bingkai Foto
                  doc.rect(42, currentY, imageWidth, imageHeight).strokeColor('#cbd5e1').stroke();
                } catch (err) {
                  doc.fillColor('red').fontSize(8).text('[Gagal memuat bukti visual dari server]', 42, currentY + 100, { width: imageWidth, align: 'center' });
                }
              } else {
                doc.fillColor('#94a3b8').fontSize(8).text('[Berkas foto tidak tersedia]', 42, currentY + 100, { width: imageWidth, align: 'center' });
              }

              currentY += imageHeight + 15;
            }
          }
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new FuelTransactionService();
