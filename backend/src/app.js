const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const requestLogger = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const fuelTransactionRoutes = require('./routes/fuelTransactionRoutes');

const app = express();

// Middleware dasar
app.use(cors());
app.use(express.json());

// Pasang logger aktivitas request
app.use(requestLogger);
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Endpoint Health Check Lanjutan (Memeriksa Backend & PostgreSQL)
app.get('/health', async (req, res, next) => {
  try {
    await db.query('SELECT 1');
    
    res.status(200).json({
      success: true,
      message: 'System is healthy',
      services: {
        backend: 'UP',
        database: 'UP'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    error.statusCode = 503; // Service Unavailable
    error.message = 'Database connection failed during health check';
    next(error);
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/fuel-transactions', fuelTransactionRoutes);

// Error Handling Middlewares (Must be at the bottom)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;