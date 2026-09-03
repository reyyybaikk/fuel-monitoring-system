const fuelTransactionService = require('../services/fuelTransactionService');

class FuelTransactionController {
  async create(req, res, next) {
    try {
      // Ambil file buffer & mimetype dari memoryStorage jika dikirim melalui multipart/form-data
      const odometer_photo = req.files && req.files['odometer_photo'] ? req.files['odometer_photo'][0] : null;
      const receipt_photo = req.files && req.files['receipt_photo'] ? req.files['receipt_photo'][0] : null;
      const odometer_after_photo = req.files && req.files['odometer_after_photo'] ? req.files['odometer_after_photo'][0] : null;

      // Gabungkan data body dengan file buffers
      const transactionData = {
        ...req.body,
        odometer_photo,
        receipt_photo,
        odometer_after_photo
      };

      const newTransaction = await fuelTransactionService.createTransaction(transactionData, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Transaksi BBM berhasil dicatat dan foto disimpan langsung ke database',
        data: newTransaction
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await fuelTransactionService.getTransactions(req.query, req.user);
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const transaction = await fuelTransactionService.getTransactionById(req.params.id, req.user);
      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  async getPhoto(req, res, next) {
    try {
      const { id, type } = req.params;
      const photo = await fuelTransactionService.getTransactionPhoto(id, type, req.user);

      // Set header Content-Type & stream binary image
      res.set('Content-Type', photo.mimetype);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache 1 hari di client/browser
      res.send(photo.data);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const updated = await fuelTransactionService.updateTransactionStatus(req.params.id, req.body.status);
      res.status(200).json({ success: true, message: `Status diperbarui menjadi ${updated.status}`, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new FuelTransactionController();