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

// Static Files for Uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Unified Health Check Endpoint
app.get('/api/health', async (req, res) => {
  const healthStatus = {
    backend: 'UP',
    database: 'UP',
    redis: 'UP',
    timestamp: new Date().toISOString()
  };

  try {
    await db.query('SELECT 1');
  } catch (error) {
    healthStatus.database = 'DOWN';
  }

  try {
    const pingResult = await redisClient.ping();
    if (pingResult !== 'PONG') throw new Error();
  } catch (error) {
    healthStatus.redis = 'DOWN';
  }

  const isHealthy = healthStatus.database === 'UP' && healthStatus.redis === 'UP';
  res.status(isHealthy ? 200 : 503).json({ success: isHealthy, services: healthStatus });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/fuel-transactions', fuelTransactionRoutes);

// --- FRONTEND STATIC SERVING (Keep this at the bottom) ---
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Support for Single Page Application (SPA) - Fallback to index.html
app.get('/:any*', (req, res, next) => {
  // If request is for /api, don't serve index.html, let it 404
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) {
      // If index.html not found, pass to error handler
      next();
    }
  });
});

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
