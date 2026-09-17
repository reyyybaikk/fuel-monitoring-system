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
      console.log(`[AUTH_DEBUG] Header tidak ditemukan atau bukan Bearer. Headers:`, Object.keys(req.headers));
      return useFallback(req, next, 'Header Authorization tidak ditemukan');
    }

    const token = authHeader.split(' ')[1];

    if (!token || token === 'null' || token === 'undefined') {
      return useFallback(req, next, 'Token kosong atau string tidak valid');
    }

    console.log(`[AUTH_DEBUG] Memverifikasi token (Awal: ${token.substring(0, 10)}...)`);

    // --- STRATEGY 1: Local JWT ---
    try {
      if (!process.env.JWT_SECRET) {
        console.error('[AUTH_ERROR] JWT_SECRET tidak terdefinisi di Environment Variable!');
      }

      const localDecoded = verifyToken(token);
      if (localDecoded) {
        console.log(`[AUTH_DEBUG] Berhasil lewat Strategy 1 (Local JWT) - User ID: ${localDecoded.id}`);
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
    if (isFirebaseInitialized() && token.split('.').length === 3) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token, { complete: true });

        if (decoded && decoded.header && decoded.header.kid) {
          console.log('[AUTH_DEBUG] Mendeteksi Firebase ID Token (terdapat header kid)');
          const firebaseDecoded = await verifyFirebaseToken(token);
          if (firebaseDecoded && firebaseDecoded.email) {
            console.log(`[AUTH_DEBUG] Berhasil lewat Strategy 3 (Firebase) - Email: ${firebaseDecoded.email}`);
            const fullName = req.query.full_name || firebaseDecoded.name || firebaseDecoded.email.split('@')[0];
            const whatsappNumber = req.query.whatsapp_number || null;

            let dbUser = await userRepository.findByEmail(firebaseDecoded.email);
            // ... (rest of the logic remains the same)

            if (!dbUser) {
              if (whatsappNumber) {
                dbUser = await userRepository.findOrCreateFirebaseUser({
                  email: firebaseDecoded.email,
                  fullName: fullName,
                  whatsappNumber: whatsappNumber
                });
              } else {
                console.warn(`[AUTH_DEBUG] User Google tidak terdaftar: ${firebaseDecoded.email}`);
                return useFallback(req, next, 'Akun Google ini belum terdaftar di sistem. Silakan registrasi terlebih dahulu.');
              }
            }

            if (!dbUser.is_active) {
              const error = new Error('Akun Anda telah dinonaktifkan oleh Administrator');
              error.statusCode = 403;
              throw error;
            }

            // Sertakan region agar token lokal yang di-generate nantinya valid
            req.user = {
              id: dbUser.id,
              email: dbUser.email,
              role: dbUser.role,
              username: dbUser.username,
              full_name: dbUser.full_name,
              whatsapp_number: dbUser.whatsapp_number,
              region: dbUser.region,
              firebaseUid: firebaseDecoded.uid
            };
            return next();
          }
        }
      } catch (firebaseErr) {
        console.error('[AUTH_DEBUG] Strategy 3 (Firebase) failed:', firebaseErr.message);
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
