// src/services/uploadService.js
const { createClient } = require('@supabase/supabase-js');

// Menggunakan SUPABASE_URL dan SUPABASE_ANON_KEY dari file .env
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Upload a local file buffer to Supabase Storage.
 * @param {Buffer} fileBuffer - Buffer dari file yang di-upload (misal dari Multer)
 * @param {string} destPath - Path tujuan penyimpanan di bucket – contoh: `fuel/1689324_receipt.png`
 * @returns {Promise<string>} - Public URL dari file yang berhasil di-upload
 */
async function uploadFile(fileBuffer, destPath) {
  const { data, error } = await supabase.storage
    .from('uploads') // Pastikan bucket bernama 'uploads' sudah dibuat di dashboard Supabase
    .upload(destPath, fileBuffer, {
      upsert: true,
      contentType: 'application/octet-stream',
    });

  if (error) {
    throw error;
  }

  // Mengembalikan URL publik file yang dapat diakses langsung
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${destPath}`;
}

module.exports = { uploadFile };