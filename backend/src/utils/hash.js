const bcrypt = require('bcryptjs');

// Fungsi untuk mengenci / mengubah password biasa menjadi hash aman
const hashPassword = async (plainPassword) => {
  const saltRounds = 10; // Tingkat kerumitan enkripsi
  const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
  return hashedPassword;
};

// Fungsi untuk mencocokkan password login dengan hash yang ada di database
const comparePassword = async (plainPassword, hashedPassword) => {
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  return isMatch;
};

module.exports = {
  hashPassword,
  comparePassword
};