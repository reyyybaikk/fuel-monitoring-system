const vehicleService = require('../services/vehicleService');

class VehicleController {
  async getAll(req, res, next) {
    try {
      const result = await vehicleService.getVehicles(req.query);
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
      const vehicle = await vehicleService.getVehicleById(req.params.id);
      res.status(200).json({
        success: true,
        data: vehicle
      });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const newVehicle = await vehicleService.createVehicle(req.body);
      res.status(201).json({
        success: true,
        message: 'Kendaraan berhasil ditambahkan',
        data: newVehicle
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const updatedVehicle = await vehicleService.updateVehicle(req.params.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Data kendaraan berhasil diperbarui',
        data: updatedVehicle
      });
    } catch (error) {
      next(error);
    }
  }

  async remove(req, res, next) {
    try {
      const deleted = await vehicleService.deleteVehicle(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Kendaraan berhasil dinonaktifkan',
        data: deleted
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VehicleController();