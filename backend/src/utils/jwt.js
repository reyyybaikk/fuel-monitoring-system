const jwt = require('jsonwebtoken');

// Fungsi untuk membuat token JWT berdasarkan data user
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  const secret = process.env.JWT_SECRET;
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  };

  return jwt.sign(payload, secret, options);
};

// Fungsi untuk memverifikasi keaslian token
const verifyToken = (token) => {
  try {
    const secret = process.env.JWT_SECRET;
    return jwt.verify(token, secret);
  } catch (error) {
    return null; // Jika token palsu atau kedaluwarsa
  }
};

module.exports = {
  generateToken,
  verifyToken
};