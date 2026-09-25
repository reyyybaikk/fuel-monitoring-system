// Controller for fuel transactions
// Refactored to provide a clean, consistent API

const db = require('../config/db'); // Database connection
const { uploadFile } = require('../services/uploadService');
const fuelTransactionService = require('../services/fuelTransactionService');

class FuelTransactionController {
  // Helper to resolve driverId and userUid from req.user
  async _resolveUser(req) {
    let driverId = null;
    let userUid = null;
    if (typeof req.user?.id === 'number') {
      driverId = req.user.id;
    } else if (typeof req.user?.id === 'string') {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (uuidRegex.test(req.user.id)) {
        userUid = req.user.id;
      }
    }
    if (!driverId && req.user?.email) {
      const result = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [req.user.email]);
      if (result.rows.length > 0) {
        driverId = result.rows[0].id;
      }
    }
    return { driverId, userUid };
  }

  // 1. Create a new fuel transaction
  create = async (req, res, next) => {
    try {
      const { driverId, userUid } = await this._resolveUser(req);
      if (!driverId) {
        const err = new Error('Unable to determine driver_id for this transaction');
        err.statusCode = 400;
        throw err;
      }

      const transactionData = {
        ...req.body,
        user_uid: userUid,
        odometer_photo: req.files?.['odometer_photo']?.[0],
        receipt_photo: req.files?.['receipt_photo']?.[0],
        odometer_after_photo: req.files?.['odometer_after_photo']?.[0]
      };

      const newTransaction = await fuelTransactionService.createTransaction(transactionData, driverId);

      return res.status(201).json({
        success: true,
        message: 'Fuel transaction created successfully',
        data: newTransaction,
      });
    } catch (error) {
      next(error);
    }
  };

  // 2. Get all transactions
  getAll = async (req, res, next) => {
    try {
      const result = await fuelTransactionService.getTransactions(req.query, req.user);
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  };

  // 3. Get a transaction by ID
  getById = async (req, res, next) => {
    try {
      const transaction = await fuelTransactionService.getTransactionById(req.params.id, req.user);
      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  };

  // 4. Stream a transaction photo (Now redirects to Supabase Storage)
  getPhoto = async (req, res, next) => {
    try {
      const { id, type } = req.params;
      const photo = await fuelTransactionService.getTransactionPhoto(id, type, req.user);

      // Redirect ke URL Supabase Storage untuk efisiensi bandwidth backend
      return res.redirect(photo.url);
    } catch (error) {
      next(error);
    }
  };

  // 5. Update transaction status
  updateStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await fuelTransactionService.updateTransactionStatus(id, status);
      res.status(200).json({
        success: true,
        message: `Transaction status updated to ${updated.status}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  // 10. Update transaction data (Correction)
  update = async (req, res, next) => {
    try {
      const { id } = req.params;
      const updated = await fuelTransactionService.updateTransactionData(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Data transaksi berhasil dikoreksi',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  // 6. Get Analytics (Ported from legacy)
  getAnalytics = async (req, res, next) => {
    try {
      const { start, end } = req.query;
      const result = await fuelTransactionService.getAnalytics(start, end, req.user);
      res.status(200).json({ success: true, message: 'Analytics data retrieved', data: result });
    } catch (error) {
      next(error);
    }
  };

  // 7. Get Summary (Ported from legacy)
  getSummary = async (req, res, next) => {
    try {
      const result = await fuelTransactionService.getSummary(req.user, req.query);
      res.status(200).json({ success: true, message: 'Summary data retrieved', data: result });
    } catch (error) {
      next(error);
    }
  };

  // 8. Export PDF (New)
  exportPdf = async (req, res, next) => {
    try {
      const pdfBuffer = await fuelTransactionService.generatePdfReport(req.query, req.user);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=Laporan_Audit_BBM.pdf',
        'Content-Length': pdfBuffer.length,
      });
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  // 9. Export PDF Preview (New)
  exportPdfPreview = async (req, res, next) => {
    try {
      const result = await fuelTransactionService.getExportPreview(req.query, req.user);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  };
  // 10. ML Feedback Loop
  submitFeedback = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { isAnomaly, notes } = req.body;
      
      if (typeof isAnomaly !== 'boolean') {
        const error = new Error('isAnomaly must be a boolean');
        error.statusCode = 400;
        throw error;
      }

      const updated = await fuelTransactionService.saveFeedback(id, isAnomaly, notes);
      res.status(200).json({
        success: true,
        message: 'Feedback berhasil disimpan',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new FuelTransactionController();
