const vehicleRepository = require('../repositories/vehicleRepository');

class VehicleService {
  async getVehicles(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = query.search || '';
    const ul_nd = query.ul_nd || '';
    const vehicle_type = query.vehicle_type || '';

    const filters = { search, ul_nd, vehicle_type };

    const data = await vehicleRepository.findAll({ limit, offset, ...filters });
    const total = await vehicleRepository.countAll(filters);

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

  async getVehicleById(id) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      const error = new Error('Kendaraan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return vehicle;
  }

  async createVehicle(data) {
    // Cek duplikasi berdasarkan nomor polisi
    const existing = await vehicleRepository.findByLicensePlate(data.license_plate);
    if (existing) {
      const error = new Error(`Kendaraan dengan plat nomor '${data.license_plate}' sudah terdaftar`);
      error.statusCode = 409; // Conflict
      throw error;
    }

    return await vehicleRepository.create(data);
  }

  async updateVehicle(id, data) {
    // Pastikan kendaraan ada
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      const error = new Error('Kendaraan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Jika plat nomor diubah, pastikan tidak bentrok dengan data lain
    if (data.license_plate && data.license_plate !== vehicle.license_plate) {
      const existing = await vehicleRepository.findByLicensePlate(data.license_plate);
      if (existing) {
        const error = new Error(`Plat nomor '${data.license_plate}' sudah digunakan oleh kendaraan lain`);
        error.statusCode = 409;
        throw error;
      }
    }

    return await vehicleRepository.update(id, data);
  }

  async deleteVehicle(id) {
    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) {
      const error = new Error('Kendaraan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Menggunakan soft delete agar riwayat transaksi BBM tetap aman
    return await vehicleRepository.softDelete(id);
  }
}

module.exports = new VehicleService();