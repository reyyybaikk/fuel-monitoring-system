const fuelTransactionRepository = require('../repositories/fuelTransactionRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const fuelAnalysisQueue = require('../config/queue');
const redisClient = require('../config/redis');

class FuelTransactionService {
  async createTransaction(data, userId) {
    const { vehicle_id, filling_source, fuel_type, fuel_amount, odometer, total_cost } = data;

    // 1. Mandatory field validation
    if (!vehicle_id || !filling_source || !fuel_type || !fuel_amount || !odometer || !total_cost) {
      const error = new Error('Field vehicle_id, filling_source, fuel_type, fuel_amount, odometer, dan total_cost wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    // 2. Numeric validation
    if (isNaN(fuel_amount) || Number(fuel_amount) <= 0 || 
        isNaN(odometer) || Number(odometer) < 0 || 
        isNaN(total_cost) || Number(total_cost) < 0) {
      const error = new Error('Nilai jumlah BBM, odometer, dan total harga tidak valid');
      error.statusCode = 400; 
      throw error;
    }

    // 3. Enum validations
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

    // 4. Verify active vehicle status
    const vehicle = await vehicleRepository.findById(vehicle_id);
    if (!vehicle || !vehicle.is_active) {
      const error = new Error('Kendaraan tidak ditemukan atau sudah tidak aktif');
      error.statusCode = 404; 
      throw error;
    }

    // 5. Anti-Fraud: Cek apakah foto nota/struk sudah pernah digunakan sebelumnya (Duplicate Receipt Check)
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
    
    // Save record with photo BYTEA buffers directly to PostgreSQL
    const newTransaction = await fuelTransactionRepository.create(payload);

    // Queue transaction ID for background ML analysis
    try {
      // Option A: BullMQ Job
      await fuelAnalysisQueue.add(
        'analyze-transaction', 
        { transactionId: newTransaction.id },
        {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false
        }
      );

      // Option B: Direct Redis LPUSH for Python Worker
      await redisClient.lpush('fuel_queue', JSON.stringify({ transactionId: newTransaction.id }));

      console.log(`[Queue] Job untuk transaksi ID ${newTransaction.id} berhasil ditambahkan ke antrean.`);
    } catch (error) {
      // Non-blocking catch to ensure driver receives success HTTP payload even if Redis is down
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

    if (!photoRecord.photo_data) {
      const error = new Error(`Foto '${type}' tidak tersedia untuk transaksi ini`);
      error.statusCode = 404;
      throw error;
    }

    return {
      data: photoRecord.photo_data,
      mimetype: photoRecord.photo_mimetype || 'image/jpeg'
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
}

module.exports = new FuelTransactionService();