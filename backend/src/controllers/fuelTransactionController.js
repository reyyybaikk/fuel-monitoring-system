// Controller for fuel transactions
// Refactored to provide a clean, consistent API

const db = require('../config/db'); // Database connection
const { uploadFile } = require('../services/uploadService');
const fuelTransactionService = require('../services/fuelTransactionService');
const fuelAnalysisQueue = require('../config/queue'); // Queue for ML analysis

class FuelTransactionController {
  // Helper to resolve driverId and userUid from req.user
  async _resolveUser(req) {
    let driverId = null;
    let userUid = null;
    // req.user.id may be numeric driver ID or a Supabase UID string
    if (typeof req.user?.id === 'number') {
      driverId = req.user.id;
    } else if (typeof req.user?.id === 'string') {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (uuidRegex.test(req.user.id)) {
        userUid = req.user.id; // Supabase UID
      }
    }
    // Fallback: try to resolve driverId via email if still unknown
    if (!driverId && req.user?.email) {
      const result = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [req.user.email]);
      if (result.rows.length > 0) {
        driverId = result.rows[0].id;
      }
    }
    return { driverId, userUid };
  }

  // 1. Create a new fuel transaction
  async create(req, res, next) {
    try {
      // Resolve driver / user UID
      const { driverId, userUid } = await this._resolveUser(req);
      if (!driverId) {
        const err = new Error('Unable to determine driver_id for this transaction');
        err.statusCode = 400;
        throw err;
      }

      // Prepare data for service
      const transactionData = {
        ...req.body,
        user_uid: userUid,
        // Extract files from req.files (result of upload.fields in middleware)
        odometer_photo: req.files?.['odometer_photo']?.[0],
        receipt_photo: req.files?.['receipt_photo']?.[0],
        odometer_after_photo: req.files?.['odometer_after_photo']?.[0]
      };

      // Use service layer to handle business logic, validation, and persistence
      const newTransaction = await fuelTransactionService.createTransaction(transactionData, driverId);

      return res.status(201).json({
        success: true,
        message: 'Fuel transaction created successfully',
        data: newTransaction,
      });
    } catch (error) {
      // Pass to centralized error handler
      next(error);
    }
  }

  // 2. Get all transactions (paginated / filtered via service layer)
  async getAll(req, res, next) {
    try {
      const result = await fuelTransactionService.getTransactions(req.query, req.user);
      res.status(200).json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  // 3. Get a transaction by ID
  async getById(req, res, next) {
    try {
      const transaction = await fuelTransactionService.getTransactionById(req.params.id, req.user);
      res.status(200).json({ success: true, data: transaction });
    } catch (error) {
      next(error);
    }
  }

  // 4. Stream a transaction photo (odometer, receipt, etc.)
  async getPhoto(req, res, next) {
    try {
      const { id, type } = req.params;
      const photo = await fuelTransactionService.getTransactionPhoto(id, type, req.user);
      res.set('Content-Type', photo.mimetype);
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(photo.data);
    } catch (error) {
      next(error);
    }
  }

  // 5. Update transaction status (admin/manager action)
  async updateStatus(req, res, next) {
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
  }
}

module.exports = new FuelTransactionController();