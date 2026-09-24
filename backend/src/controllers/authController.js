const userRepository = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const db = require('../config/db');
const axios = require('axios');
const logger = require('../config/logger');

// Fungsi untuk Mengirim OTP via Fonnte
const requestOtp = async (req, res, next) => {
  try {
    const { whatsapp_number } = req.body;
    if (!whatsapp_number) throw new Error('Nomor WhatsApp wajib diisi');

    // Sanitasi nomor untuk Fonnte (hanya angka)
    const cleanNumber = whatsapp_number.replace(/[^0-9]/g, '');

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 Digit
    const expiresAt = new Date(Date.now() + 5 * 60000); // Expire dalam 5 menit

    // Simpan ke database
    await db.query(
      'INSERT INTO otp_verifications (whatsapp_number, otp_code, expires_at) VALUES ($1, $2, $3)',
      [cleanNumber, otp, expiresAt]
    );

    // Kirim via Fonnte
    const fonnteToken = process.env.WA_API_KEY;

    console.log(`[OTP] Mencoba mengirim ke ${cleanNumber}...`);

    const response = await axios.post('https://api.fonnte.com/send', {
      target: cleanNumber,
      message: `Kode verifikasi Fuel Monitoring Anda adalah: *${otp}*. Kode ini berlaku selama 5 menit.`,
      countryCode: '62'
    }, {
      headers: { Authorization: fonnteToken }
    });

    // Cek respon resmi dari Fonnte
    if (response.data && response.data.status === true) {
        console.log(`[OTP SUCCESS] Berhasil dikirim ke ${cleanNumber}. KODE OTP: ${otp}`);
        res.status(200).json({ success: true, message: 'OTP berhasil dikirim ke WhatsApp' });
    } else {
        console.error(`[OTP Error] Fonnte Error:`, response.data);
        throw new Error(response.data.reason || 'Fonnte gagal mengirim pesan. Pastikan token API benar.');
    }

  } catch (error) {
    console.error(`[OTP Exception]`, error.message);
    next(error);
  }
};

// Fungsi untuk Verifikasi OTP
const verifyOtp = async (req, res, next) => {
  try {
    const { whatsapp_number, otp_code } = req.body;
    const cleanNumber = whatsapp_number.replace(/[^0-9]/g, '');

    const result = await db.query(
      'SELECT * FROM otp_verifications WHERE whatsapp_number = $1 AND otp_code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [cleanNumber, otp_code]
    );

    if (result.rows.length === 0) {
      const error = new Error('Kode OTP salah atau sudah kedaluwarsa');
      error.statusCode = 400;
      throw error;
    }

    // Hapus OTP yang sudah terpakai
    await db.query('DELETE FROM otp_verifications WHERE whatsapp_number = $1', [cleanNumber]);

    res.status(200).json({ success: true, message: 'WhatsApp terverifikasi' });
  } catch (error) {
    next(error);
  }
};

// Endpoint untuk Resolver WhatsApp ke Email (untuk Firebase Auth login di Mobile App)
const resolveWhatsapp = async (req, res, next) => {
  try {
    const { whatsapp_number } = req.body;
    if (!whatsapp_number) {
      const error = new Error('Nomor WhatsApp wajib diisi');
      error.statusCode = 400;
      throw error;
    }
    const cleanWhatsapp = whatsapp_number.replace(/[^0-9]/g, '');
    const user = await userRepository.findByWhatsapp(cleanWhatsapp);
    if (!user) {
      const error = new Error('Nomor WhatsApp tidak terdaftar');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      success: true,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

// Controller untuk Registrasi User
const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, whatsapp_number, role } = req.body;
    let error;

    if (!username || !email || !password || !full_name || !whatsapp_number || !role) {
      error = new Error('Semua field (username, email, password, full_name, whatsapp_number, role) wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    // ✅ VALIDASI KHUSUS AKUN GOOGLE (@gmail.com)
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      error = new Error('Registrasi ditolak. Harus menggunakan email @gmail.com');
      error.statusCode = 400;
      throw error;
    }

    const validRoles = ['ADMIN_PUSAT', 'ADMIN', 'MANAGER', 'DRIVER'];
    if (!validRoles.includes(role)) {
      error = new Error('Role tidak valid. Gunakan: ADMIN_PUSAT, ADMIN, MANAGER, atau DRIVER');
      error.statusCode = 400;
      throw error;
    }

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      error = new Error('Email sudah terdaftar digunakan');
      error.statusCode = 409;
      throw error;
    }

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      error = new Error('Username sudah digunakan');
      error.statusCode = 409;
      throw error;
    }

    const password_hash = await hashPassword(password);

    const newUser = await userRepository.createUser({
      username,
      email,
      password_hash,
      full_name,
      whatsapp_number,
      role
    });

    res.status(201).json({
      success: true,
      message: 'User berhasil didaftarkan',
      data: newUser
    });
  } catch (error) {
    next(error);
  }
};

// Controller untuk Login User
const login = async (req, res, next) => {
  try {
    logger.info('[LOGIN REQUEST BODY]: %o', req.body);
    const identifier = req.body.email || req.body.username || req.body.nik || req.body.whatsapp_number;
    logger.info('[LOGIN IDENTIFIER]: %s', identifier);
    const { password } = req.body;
    let error;

    if (!identifier || !password) {
      error = new Error('Email/Username/Nomor WhatsApp dan password wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    let user = null;
    if (identifier.includes('@')) {
      user = await userRepository.findByEmail(identifier);
      logger.info('[FOUND BY EMAIL]: %s', user ? user.id : 'null');
    } else {
      user = await userRepository.findByUsername(identifier);
      logger.info('[FOUND BY USERNAME]: %s', user ? user.id : 'null');
      if (!user) {
        const cleanWhatsapp = identifier.replace(/[^0-9]/g, '');
        user = await userRepository.findByWhatsapp(cleanWhatsapp);
        logger.info('[FOUND BY WHATSAPP]: %s clean:%s hashPrefix:%s', user ? user.id : 'null', cleanWhatsapp, user ? user.password_hash.substring(0,10) : 'N/A');
      }
    }

    if (!user) {
      logger.warn('[LOGIN ERROR] User not found for identifier: %s', identifier);
      error = new Error('Email/Username/Nomor WhatsApp atau password salah');
      error.statusCode = 401;
      throw error;
    }

    if (!user.is_active) {
      error = new Error('Akun Anda telah dinonaktifkan oleh Administrator');
      error.statusCode = 403;
      throw error;
    }

        let isPasswordValid = false;
    try {
      isPasswordValid = await comparePassword(password, user.password_hash);
    } catch (e) {
      logger.error('[COMPARE PASSWORD EXCEPTION]: %s', e.message);
    }
    // Fallback plain‑text comparison if hash check failed
    if (!isPasswordValid && user.password_hash === password) {
      isPasswordValid = true;
    }
    logger.info('[PASSWORD VALID]: %s', isPasswordValid);
    if (!isPasswordValid) {
      error = new Error('Email/Username/Nomor WhatsApp atau password salah');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken(user);
    // Set auth token as HttpOnly cookie for middleware
    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    // Send token in response body as before
    res.status(200).json({
      success: true,
      message: 'Login berhasil',
      token: token,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        whatsapp_number: user.whatsapp_number,
        user: {
          id: user.id,
          username: user.username,
          name: user.full_name,
          email: user.email,
          role: user.role,
          whatsapp_number: user.whatsapp_number,
          region: user.region
        },
        token: token
      }
    });
  } catch (error) {
    console.error('[LOGIN EXCEPTION]:', error);
    next(error);
  }
};

// Controller untuk Mengambil Profil User yang Sedang Login (BARU)
const getMe = async (req, res, next) => {
  try {
    // req.user.id didapatkan dari hasil dekode token JWT di middleware authenticate
    const userId = req.user.id;
    const user = await userRepository.findById(userId);

    if (!user) {
      const error = new Error('User tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Controller untuk Sinkronisasi / Registrasi Langsung dari Firebase Mobile App
const firebaseSync = async (req, res, next) => {
  try {
    // Pastikan user tersebut terautentikasi via Firebase
    if (req.user.isFallback) {
      const error = new Error('Sinkronisasi gagal: Token Firebase tidak valid atau belum terverifikasi.');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken(req.user);

    res.status(200).json({
      success: true,
      message: 'User Firebase berhasil disinkronkan ke server PostgreSQL',
      token: token,
      data: {
        id: req.user.id,
        email: req.user.email,
        username: req.user.username,
        full_name: req.user.full_name,
        whatsapp_number: req.user.whatsapp_number,
        role: req.user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  resolveWhatsapp,
  diagnoseUser: async (req, res) => {
    try {
      const users = await db.query('SELECT id, username, email, whatsapp_number FROM users');
      res.json({ success: true, count: users.rows.length, users: users.rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },
  firebaseSync,
  requestOtp,
  verifyOtp
};
