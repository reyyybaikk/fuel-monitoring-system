const fuelTransactionService = require('../services/fuelTransactionService');

class FuelTransactionController {
  async create(req, res, next) {
    try {
      // Ambil path file jika ada lampiran foto (dikirim melalui multer uploadMiddleware)
      const odometer_photo_path = req.files && req.files['odometer_photo'] ? req.files['odometer_photo'][0].filename : null;
      const receipt_photo_path = req.files && req.files['receipt_photo'] ? req.files['receipt_photo'][0].filename : null;

      // Gabungkan data body dengan nama file foto
      const transactionData = {
        ...req.body,
        odometer_photo_path,
        receipt_photo_path
      };

      const newTransaction = await fuelTransactionService.createTransaction(transactionData, req.user.id);

      res.status(201).json({
        success: true,
        message: 'Transaksi BBM berhasil dicatat',
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