const userRepository = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');

// Controller untuk Registrasi User
const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, role } = req.body;
    let error;

    if (!username || !email || !password || !full_name || !role) {
      error = new Error('Semua field (username, email, password, full_name, role) wajib diisi');
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
  firebaseSync
};