const { verifyToken } = require('../utils/jwt');
const { verifyFirebaseToken, isFirebaseInitialized } = require('../config/firebase');
const userRepository = require('../repositories/userRepository');

/**
 * Helper function to set a fallback user when authentication fails
 */
const useFallback = async (req, next, reason = 'Token tidak valid atau tidak ada') => {
  try {
    console.warn(`[Auth Fallback] ${reason}. Menggunakan default driver.`);
    const defaultDriver = await userRepository.getDefaultDriver();
    req.user = {
      id: defaultDriver.id,
      email: defaultDriver.email,
      role: defaultDriver.role || 'DRIVER',
      username: defaultDriver.username,
      isFallback: true
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Hybrid Authentication Middleware
 * Supports: Local JWT, Supabase JWT, and Firebase ID Token
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if Authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[AUTH_DEBUG] Headers received:`, Object.keys(req.headers));
      return useFallback(req, next, 'Header Authorization tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];

    // 2. Prevent processing empty or "null"/"undefined" strings as tokens
    if (!token || token === 'null' || token === 'undefined') {
      return useFallback(req, next, 'Token kosong atau invalid string');
    }

    // --- STRATEGY 1: Local JWT ---
    try {
      const localDecoded = verifyToken(token);
      if (localDecoded) {
        req.user = localDecoded;
        return next();
      }
    } catch (err) {
      console.error('[AUTH_DEBUG] Strategy 1 (Local JWT) failed:', err.message);
    }

    // --- STRATEGY 2: Supabase JWT ---
    // Only attempt if it looks like a JWT
    if (token.split('.').length === 3) {
      try {
        const jwt = require('jsonwebtoken');
        const publicKey = require('../config/jwtPublicKey.json');
        const supabasePayload = jwt.verify(token, publicKey, { algorithms: ['ES256'] });
        req.user = {
          id: supabasePayload.sub,
          email: supabasePayload.email,
          role: supabasePayload.role || 'user',
        };
        return next();
      } catch (supabaseErr) {
        // Ignore and continue to Firebase
      }
    }

    // --- STRATEGY 3: Firebase ID Token ---
    // Pengecekan lebih ketat: Hanya panggil Firebase jika header JWT memiliki 'kid'
    if (isFirebaseInitialized() && token.split('.').length === 3) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token, { complete: true });

        if (decoded && decoded.header && decoded.header.kid) {
          const firebaseDecoded = await verifyFirebaseToken(token);
          if (firebaseDecoded && firebaseDecoded.email) {
            const fullName = req.query.full_name || firebaseDecoded.name || firebaseDecoded.email.split('@')[0];
            const whatsappNumber = req.query.whatsapp_number || null;

            // --- PERUBAHAN: Aturan Registrasi Google/Firebase ---
            // Cek apakah user sudah ada di database lokal
            let dbUser = await userRepository.findByEmail(firebaseDecoded.email);

            if (!dbUser) {
              // Jika user TIDAK ditemukan di DB, kita hanya izinkan pembuatan akun
              // JIKA ada parameter whatsapp_number (berarti sedang dalam flow Registrasi)
              if (whatsappNumber) {
                dbUser = await userRepository.findOrCreateFirebaseUser({
                  email: firebaseDecoded.email,
                  fullName: fullName,
                  whatsappNumber: whatsappNumber
                });
              } else {
                // Jika tidak ada whatsapp_number, berarti ini Login Google tanpa registrasi
                console.warn(`[AUTH_DEBUG] User Google tidak terdaftar: ${firebaseDecoded.email}`);
                return useFallback(req, next, 'Akun Google ini belum terdaftar di sistem. Silakan registrasi terlebih dahulu.');
              }
            }

            if (!dbUser.is_active) {
              const error = new Error('Akun Anda telah dinonaktifkan oleh Administrator');
              error.statusCode = 403;
              throw error;
            }

            req.user = {
              id: dbUser.id,
              email: dbUser.email,
              role: dbUser.role,
              username: dbUser.username,
              full_name: dbUser.full_name,
              whatsapp_number: dbUser.whatsapp_number,
              firebaseUid: firebaseDecoded.uid
            };
            return next();
          }
        }
      } catch (firebaseErr) {
        // Abaikan error di sini, biarkan lanjut ke fallback
      }
    }

    // --- FINAL FALLBACK ---
    return useFallback(req, next, 'Semua metode autentikasi gagal');

  } catch (error) {
    next(error);
  }
};

/**
 * Authorization Middleware (Role-based access control)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        const error = new Error('Unauthorized: Sesi pengguna tidak terdeteksi');
        error.statusCode = 401;
        throw error;
      }

      if (!allowedRoles.includes(req.user.role)) {
        const error = new Error(`Forbidden: Role '${req.user.role}' tidak memiliki hak akses untuk fitur ini`);
        error.statusCode = 403;
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
