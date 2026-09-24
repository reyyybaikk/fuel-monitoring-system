const jwt = require('jsonwebtoken');
const logger = require('../config/logger'); // Winston logger

// Fungsi untuk membuat token JWT berdasarkan data user
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    region: user.region // WAJIB: Sertakan wilayah agar filter Dashboard/Transaksi berfungsi
  };

  // Pastikan secret ada; gunakan fallback untuk dev/testing
  const secret = process.env.JWT_SECRET || 'fallback_dev_secret_change_me';
  if (!process.env.JWT_SECRET) {
    logger.warn('[JWT] JWT_SECRET tidak didefinisikan di environment – memakai fallback dev secret');
  }

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  };

  return jwt.sign(payload, secret, options);
};

// Fungsi untuk memverifikasi keaslian token
const verifyToken = (token) => {
  const secret = process.env.JWT_SECRET || 'fallback_dev_secret_change_me';
  if (!process.env.JWT_SECRET) {
    logger.warn('[JWT] JWT_SECRET tidak didefinisikan di environment – verifikasi memakai fallback dev secret');
  }
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    logger.error('[JWT] verifyToken gagal: %s', error.message);
    return null; // Jika token palsu atau kedaluwarsa
  }
};

module.exports = {
  generateToken,
  verifyToken
};