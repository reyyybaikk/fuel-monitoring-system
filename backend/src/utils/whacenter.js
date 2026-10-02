// src/utils/whacenter.js
const axios = require('axios');
const { WHACENTER_DEVICE_ID } = process.env;

/**
 * Mengirim pesan teks melalui Whacenter.
 * @param {string} target   Nomor WhatsApp tujuan (format internasional, contoh: 628123456789)
 * @param {string} message  Isi pesan teks
 */
async function sendWhacenterMessage(target, message) {
  if (!WHACENTER_DEVICE_ID) {
    console.warn('[Whacenter] Device ID belum dikonfigurasi di .env');
    return;
  }

  const url = 'https://app.whacenter.com/api/send';
  const params = {
    device_id: WHACENTER_DEVICE_ID,
    number: target,
    message,
  };

  try {
    console.log('[Whacenter] Mengirim →', params);
    await axios.get(url, { params });
    console.log(`[Whacenter] Pesan terkirim ke ${target}`);
  } catch (err) {
    console.error(`[Whacenter] Gagal kirim ke ${target}:`, err.message);
  }
}

module.exports = { sendWhacenterMessage };
