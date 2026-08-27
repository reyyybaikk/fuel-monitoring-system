const fuelTransactionRepository = require('../repositories/fuelTransactionRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const fuelAnalysisQueue = require('../config/queue');

class FuelTransactionService {
  async createTransaction(data, userId) {
    const { vehicle_id, filling_source, fuel_type, fuel_amount, odometer, total_cost } = data;

    // 1. Validasi field wajib
    if (!vehicle_id || !filling_source || !fuel_type || !fuel_amount || !odometer || !total_cost) {
      const error = new Error('Field vehicle_id, filling_source, fuel_type, fuel_amount, odometer, dan total_cost wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validasi numerik
    if (Number(fuel_amount) <= 0 || Number(odometer) < 0 || Number(total_cost) < 0) {
      const error = new Error('Nilai jumlah BBM, odometer, dan total harga tidak valid');
      error.statusCode = 400;
      throw error;
    }

    // 3. Validasi enum filling_source & fuel_type
    const validSources = ['SPBU', 'ECERAN'];
    if (!validSources.includes(filling_source.toUpperCase())) {
      const error = new Error('Sumber pengisian harus SPBU atau ECERAN');
      error.statusCode = 400; throw error;
    }

    const validFuelTypes = ['Pertalite', 'Pertamax', 'Biosolar', 'Dexlite', 'Pertamina Dex'];
    // Gunakan pencarian case-insensitive jika perlu, atau pastikan exact match
    const isFuelValid = validFuelTypes.some(type => type.toLowerCase() === fuel_type.toLowerCase());
    if (!isFuelValid) {
      const error = new Error(`Jenis BBM tidak valid. Gunakan: ${validFuelTypes.join(', ')}`);
      error.statusCode = 400; throw error;
    }

    // 4. Pastikan kendaraan aktif
    const vehicle = await vehicleRepository.findById(vehicle_id);
    if (!vehicle || !vehicle.is_active) {
      const error = new Error('Kendaraan tidak ditemukan atau sudah tidak aktif');
      error.statusCode = 404; throw error;
    }

    const payload = { ...data, driver_id: userId, fuel_type: fuel_type };
    
    // 1. Simpan data ke PostgreSQL secara permanen
    const newTransaction = await fuelTransactionRepository.create(payload);

    // 2. BACKGROUND JOB (PRODUCER)
    // Masukkan ID transaksi ke dalam antrean Redis untuk dianalisis oleh Worker (di latar belakang)
    try {
      // Nama job: 'analyze-transaction', Data: { transactionId: 15 }
      await fuelAnalysisQueue.add(
        'analyze-transaction', 
        { transactionId: newTransaction.id },
        {
          attempts: 3, // Jika gagal, ulangi maksimal 3 kali
          backoff: {
            type: 'exponential',
            delay: 2000 // Jeda waktu bertambah tiap coba ulang (2 detik, 4 detik, dst)
          },
          removeOnComplete: true, // Hapus dari Redis jika sukses agar tidak menuh-menuhin memori
          removeOnFail: false // Biarkan tertinggal di Redis jika gagal total agar bisa kita periksa manual
        }
      );
      console.log(`[Queue] Job untuk transaksi ID ${newTransaction.id} berhasil ditambahkan ke antrean.`);
    } catch (error) {
      // PENTING: Jika Redis gagal, kita HANYA mencatat error.
      // Jangan melakukan "throw error" di sini, agar aplikasi HP Driver tetap mendapatkan respons SUKSES dari PostgreSQL.
      console.error(`[Queue Error] Gagal memasukkan transaksi ${newTransaction.id} ke antrean:`, error.message);
    }

    // 3. Kembalikan data sukses ke pengguna
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
      role: user.role,
      userId: user.id
    };

    const data = await fuelTransactionRepository.findAll({ limit, offset, ...filters });
    const total = await fuelTransactionRepository.countAll(filters);

    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  }

  async getTransactionById(id, user) {
    const transaction = await fuelTransactionRepository.findById(id);
    if (!transaction) {
      const error = new Error('Transaksi BBM tidak ditemukan');
      error.statusCode = 404; throw error;
    }
    if (user.role === 'DRIVER' && transaction.driver_id !== user.id) {
      const error = new Error('Forbidden: Anda tidak memiliki hak akses melihat transaksi ini');
      error.statusCode = 403; throw error;
    }
    return transaction;
  }

  async updateTransactionStatus(id, status) {
    const validStatuses = ['APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Status tidak valid. Gunakan: APPROVED atau REJECTED');
      error.statusCode = 400; throw error;
    }
    const transaction = await fuelTransactionRepository.findById(id);
    if (!transaction) {
      const error = new Error('Transaksi BBM tidak ditemukan');
      error.statusCode = 404; throw error;
    }
    return await fuelTransactionRepository.updateStatus(id, status);
  }
}
module.exports = new FuelTransactionService();