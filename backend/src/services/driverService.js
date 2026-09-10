const driverRepository = require('../repositories/driverRepository');

class DriverService {
  async getDrivers(query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const search = query.search || '';

    const filters = { search };

    const data = await driverRepository.findAllDrivers({ limit, offset, ...filters });
    const total = await driverRepository.countAllDrivers(filters);

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

  async getDriverById(id) {
    const driver = await driverRepository.findDriverById(id);
    if (!driver) {
      const error = new Error('Driver tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }
    return driver;
  }
}

module.exports = new DriverService();