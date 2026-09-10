const driverService = require('../services/driverService');

class DriverController {
  async getAll(req, res, next) {
    try {
      const result = await driverService.getDrivers(req.query);
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const driver = await driverService.getDriverById(req.params.id);
      res.status(200).json({
        success: true,
        data: driver
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DriverController();