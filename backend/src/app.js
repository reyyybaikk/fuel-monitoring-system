const express = require('express');
const cors = require('cors');
const path = require('path');

// Single declarations for configuration & middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const redisClient = require('./config/redis');
const requestLogger = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const fuelTransactionRoutes = require('./routes/fuelTransactionRoutes');
const imageRoutes = require('./routes/imageRoutes');

const app = express();

// Global Middleware
app.use(helmet());

// Global rate limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);
const cookieParser = require('cookie-parser');
app.use(cookieParser());
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
app.use('/api/images', imageRoutes);

// --- FRONTEND STATIC SERVING (Keep this at the bottom) ---
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Root endpoint – simple health check for Render
app.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Fuel Monitoring API is running' });
});

// Support for Single Page Application (SPA) - Fallback to index.html
app.use((req, res, next) => {
  // Dukung GET dan HEAD untuk rute non-API
  if ((req.method === 'GET' || req.method === 'HEAD') && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
      if (err) {
        next();
      }
    });
  }
  next();
});

// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
