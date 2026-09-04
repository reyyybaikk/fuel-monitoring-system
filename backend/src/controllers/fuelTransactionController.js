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
      const {
        odometer,
        fuel_amount,
        total_cost,
        notes,
        vehicle_id,
        filling_source,
        fuel_type,
        latitude,
        longitude,
        address,
      } = req.body;

      // ---------- Validation ----------
      const vehicleIdInt = parseInt(vehicle_id, 10);
      if (isNaN(vehicleIdInt)) {
        return res.status(400).json({ success: false, error: 'vehicle_id must be a valid integer' });
      }
      if (latitude !== undefined && latitude !== null && isNaN(parseFloat(latitude))) {
        return res.status(400).json({ success: false, error: 'latitude must be a number' });
      }
      if (longitude !== undefined && longitude !== null && isNaN(parseFloat(longitude))) {
        return res.status(400).json({ success: false, error: 'longitude must be a number' });
      }
      const allowedSources = ['SPBU', 'ECERAN'];
      const allowedFuelTypes = ['Pertalite', 'Pertamax', 'Biosolar', 'Dexlite', 'Pertamina Dex'];
      if (!filling_source || !allowedSources.includes(filling_source)) {
        return res.status(400).json({ success: false, error: 'filling_source must be SPBU or ECERAN' });
      }
      if (!fuel_type || !allowedFuelTypes.includes(fuel_type)) {
        return res.status(400).json({ success: false, error: 'fuel_type is invalid. Choose from Pertalite, Pertamax, Biosolar, Dexlite, Pertamina Dex' });
      }

      // ---------- Resolve driver / user UID ----------
      const { driverId, userUid } = await this._resolveUser(req);
      if (!driverId) {
        const err = new Error('Unable to determine driver_id for this transaction');
        err.statusCode = 400;
        throw err;
      }

      // ---------- Handle optional file uploads ----------
      let receiptPath = null;
      let odometerBeforePath = null;
      let odometerAfterPath = null;

      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        // Expect: 0 - receipt (mandatory), 1 - odometer before, 2 - odometer after
        const [receipt, odometerBefore, odometerAfter] = req.files;
        if (receipt) {
          receiptPath = await uploadFile(receipt.buffer, `fuel/${Date.now()}_receipt_${receipt.originalname}`);
        }
        if (odometerBefore) {
          odometerBeforePath = await uploadFile(odometerBefore.buffer, `fuel/${Date.now()}_odo_before_${odometerBefore.originalname}`);
        }
        if (odometerAfter) {
          odometerAfterPath = await uploadFile(odometerAfter.buffer, `fuel/${Date.now()}_odo_after_${odometerAfter.originalname}`);
        }
      }

      // ---------- Insert transaction into DB ----------
      const insertQuery = `
        INSERT INTO fuel_transactions (
          driver_id,
          user_uid,
          vehicle_id,
          filling_source,
          fuel_type,
          odometer,
          latitude,
          longitude,
          fuel_amount,
          total_cost,
          notes,
          receipt_photo_path,
          odometer_photo_path,
          odometer_after_photo_path,
          address,
          status
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'PENDING'
        ) RETURNING *;
      `;
      const values = [
        driverId,
        userUid || null,
        vehicleIdInt,
        filling_source,
        fuel_type,
        odometer,
        latitude ? parseFloat(latitude) : null,
        longitude ? parseFloat(longitude) : null,
        fuel_amount,
        total_cost,
        notes,
        receiptPath,
        odometerBeforePath,
        odometerAfterPath,
        address || null,
      ];

      const newTransaction = (await db.query(insertQuery, values)).rows[0];

      // ---------- Queue ML analysis job ----------
      await fuelAnalysisQueue.add('analyse', { transactionId: newTransaction.id });

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