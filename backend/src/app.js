const express = require('express');
const cors = require('cors');
const path = require('path');

// Single declarations for configuration & middleware
const db = require('./config/db');
const redisClient = require('./config/redis');
const requestLogger = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const fuelTransactionRoutes = require('./routes/fuelTransactionRoutes');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Static Files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Unified Health Check Endpoint (PostgreSQL + Redis)
app.get('/api/health', async (req, res) => {
  const healthStatus = {
    backend: 'UP',
    database: 'UP',
    redis: 'UP',
    timestamp: new Date().toISOString()
  };

  // 1. Check PostgreSQL
  try {
    await db.query('SELECT 1');
  } catch (error) {
    console.error('[HealthCheck] DB Error:', error.message);
    healthStatus.database = 'DOWN';
  }

  // 2. Check Redis
  try {
    const pingResult = await redisClient.ping();
    if (pingResult !== 'PONG') throw new Error('Redis did not return PONG');
  } catch (error) {
    console.error('[HealthCheck] Redis Error:', error.message);
    healthStatus.redis = 'DOWN';
  }

  // Determine overall status
  const isHealthy = healthStatus.database === 'UP' && healthStatus.redis === 'UP';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: isHealthy,
    services: healthStatus
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/fuel-transactions', fuelTransactionRoutes);

// Error Handling Middleware (Must remain at the bottom)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;