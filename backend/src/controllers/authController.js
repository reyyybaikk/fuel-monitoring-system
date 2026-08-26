const userRepository = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');

// Controller untuk Registrasi User
const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password || !full_name || !role) {
      const error = new Error('Semua field (username, email, password, full_name, role) wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    const validRoles = ['ADMIN', 'MANAGER', 'DRIVER'];
    if (!validRoles.includes(role)) {
      const error = new Error('Role tidak valid. Gunakan: ADMIN, MANAGER, atau DRIVER');
      error.statusCode = 400;
      throw error;
    }

    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      const error = new Error('Email sudah terdaftar digunakan');
      error.statusCode = 409;
      throw error;
    }

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      const error = new Error('Username sudah digunakan');
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
    const { email, password } = req.body;

    if (!email || !password) {
      const error = new Error('Email dan password wajib diisi');
      error.statusCode = 400;
      throw error;
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      const error = new Error('Email atau password salah');
      error.statusCode = 401;
      throw error;
    }

    if (!user.is_active) {
      const error = new Error('Akun Anda telah dinonaktifkan oleh Administrator');
      error.statusCode = 403;
      throw error;
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Email atau password salah');
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
        role: user.role
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

module.exports = {
  register,
  login,
  getMe
};