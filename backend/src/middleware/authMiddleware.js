const { verifyToken } = require('../utils/jwt');

// Middleware untuk Authentication (Memeriksa token JWT)
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Token akses tidak disertakan atau format salah (Gunakan: Bearer <token>)');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
      const error = new Error('Token tidak valid atau sudah kedaluwarsa');
      error.statusCode = 401;
      throw error;
    }

    req.user = decoded; // Menyimpan data payload user (id, email, role)
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware untuk Authorization (Memeriksa hak akses role)
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      // Pastikan authenticate dijalankan sebelum authorize agar req.user tersedia
      if (!req.user) {
        const error = new Error('Unauthorized: Sesi pengguna tidak terdeteksi');
        error.statusCode = 401;
        throw error;
      }

      // Periksa apakah role user terdaftar dalam daftar role yang diizinkan
      if (!allowedRoles.includes(req.user.role)) {
        const error = new Error(`Forbidden: Role '${req.user.role}' tidak memiliki hak akses untuk fitur ini`);
        error.statusCode = 403; // Forbidden
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticate,
  authorize
};