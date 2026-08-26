const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const requestLogger = require('./middleware/logger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware dasar
app.use(cors());
app.use(express.json());

// Pasang logger aktivitas request
app.use(requestLogger);

// Endpoint Health Check Lanjutan (Memeriksa Backend & PostgreSQL)
app.get('/health', async (req, res, next) => {
  try {
    // Menguji koneksi database secara langsung saat endpoint diakses
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
    // Jika database mati, lemparkan error ke global error handler
    error.statusCode = 503; // Service Unavailable
    error.message = 'Database connection failed during health check';
    next(error);
  }
});

// 1. Tangkap URL yang tidak terdaftar (404)
app.use(notFoundHandler);

// 2. Tangkap semua error global
app.use(errorHandler);

module.exports = app;