// src/services/uploadService.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY   // untuk client‑side; gunakan SERVICE_ROLE_KEY di server‑only
);

/**
 * Upload a local file buffer to Supabase Storage.
 * @param {Buffer} fileBuffer
 * @param {string} destPath  – contoh: `uploads/2023/09/receipt.png`
 * @returns {Promise<string>} public URL
 */
async function uploadFile(fileBuffer, destPath) {
  const { data, error } = await supabase.storage
    .from('uploads')                 // bucket yang dibuat di Supabase UI
    .upload(destPath, fileBuffer, {
      upsert: true,
      contentType: 'application/octet-stream',
    });

  if (error) throw error;
  // Jika bucket bersifat public, URL langsung dapat di‑access
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/uploads/${destPath}`;
}

module.exports = { uploadFile };