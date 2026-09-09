const userRepository = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');
const db = require('../config/db');
const axios = require('axios'); // Pastikan sudah install axios: npm install axios

// Fungsi untuk Mengirim OTP via Fonnte
const requestOtp = async (req, res, next) => {
  try {
    const { whatsapp_number } = req.body;
    if (!whatsapp_number) throw new Error('Nomor WhatsApp wajib diisi');

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 Digit
    const expiresAt = new Date(Date.now() + 5 * 60000); // Expire dalam 5 menit

    // Simpan ke database
    await db.query(
      'INSERT INTO otp_verifications (whatsapp_number, otp_code, expires_at) VALUES ($1, $2, $3)',
      [whatsapp_number, otp, expiresAt]
    );

    // Kirim via Fonnte
    const fonnteToken = process.env.WA_API_KEY;
    await axios.post('https://api.fonnte.com/send', {
      target: whatsapp_number,
      message: `Kode verifikasi Fuel Monitoring Anda adalah: *${otp}*. Kode ini berlaku selama 5 menit.`,
      countryCode: '62'
    }, {
      headers: { Authorization: fonnteToken }
    });

    res.status(200).json({ success: true, message: 'OTP berhasil dikirim ke WhatsApp' });
  } catch (error) {
    next(error);
  }
};

// Fungsi untuk Verifikasi OTP
const verifyOtp = async (req, res, next) => {
  try {
    const { whatsapp_number, otp_code } = req.body;

    const result = await db.query(
      'SELECT * FROM otp_verifications WHERE whatsapp_number = $1 AND otp_code = $2 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [whatsapp_number, otp_code]
    );

    if (result.rows.length === 0) {
      const error = new Error('Kode OTP salah atau sudah kedaluwarsa');
      error.statusCode = 400;
      throw error;
    }

    // Hapus OTP yang sudah terpakai
    await db.query('DELETE FROM otp_verifications WHERE whatsapp_number = $1', [whatsapp_number]);

    res.status(200).json({ success: true, message: 'WhatsApp terverifikasi' });
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

    const validRoles = ['ADMIN', 'MANAGER', 'DRIVER'];
    if (!validRoles.includes(role)) {
      error = new Error('Role tidak valid. Gunakan: ADMIN, MANAGER, atau DRIVER');
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
    const identifier = req.body.email || req.body.username || req.body.nik;
    const { password } = req.body;
    let error;

    if (!identifier || !password) {
      error = new Error('Username/Email dan password wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    let user = null;
    if (identifier.includes('@')) {
      user = await userRepository.findByEmail(identifier);
    } else {
      user = await userRepository.findByUsername(identifier);
    }

    if (!user) {
      error = new Error('Username/Email atau password salah');
      error.statusCode = 401;
      throw error;
    }

    if (!user.is_active) {
      error = new Error('Akun Anda telah dinonaktifkan oleh Administrator');
      error.statusCode = 403;
      throw error;
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      error = new Error('Username/Email atau password salah');
      error.statusCode = 401;
      throw error;
    }

    const token = generateToken(user);
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
        user: {
          id: user.id,
          username: user.username,
          name: user.full_name,
          email: user.email,
          role: user.role
        },
        token: token
      }
    });
  } catch (error) {
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
    // Pastikan user tidak menggunakan fallback (default driver)
    if (req.user.isFallback) {
      const error = new Error('Sinkronisasi gagal: Token Firebase tidak valid atau belum terverifikasi.');
      error.statusCode = 401;
      throw error;
    }

    // req.user sudah diisi oleh authenticate middleware dari Firebase ID Token
    // Kita perlu generate JWT Lokal kita agar mobile app bisa menyimpan token sesi resmi
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
  firebaseSync,
  requestOtp,
  verifyOtp
};