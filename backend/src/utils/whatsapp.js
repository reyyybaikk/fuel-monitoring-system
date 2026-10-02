// src/utils/whatsapp.js
// Helper wrapper that formats anomaly information and sends a WhatsApp message via Whacenter.
// It relies on the lower‑level `sendWhacenterMessage` utility defined in `whacenter.js`.

const { sendWhacenterMessage } = require('./whacenter');

// Optional env var for the destination phone number (international format, e.g. 628123456789).
// If not set, the helper will log a warning and skip sending.
const { WHACENTER_TARGET_NUMBER } = process.env;

/**
 * Sends an anomaly alert to the configured WhatsApp number.
 *
 * @param {number} transactionId  ID transaksi yang diproses
 * @param {number} amount        Jumlah bahan bakar / nilai transaksi
 * @param {string} fuelType      Tipe bahan bakar (mis. Solar, Premium)
 * @param {boolean} isAnomaly    Flag apakah anomali terdeteksi
 */
async function sendAnomalyAlert(transactionId, amount, fuelType, isAnomaly) {
  if (!WHACENTER_TARGET_NUMBER) {
    console.warn('[WhatsApp] WHACENTER_TARGET_NUMBER belum dikonfigurasi di .env – notifikasi dilewati');
    return;
  }

  const status = isAnomaly ? '🚨 *ANOMALI TERDETEKSI*' : '✅ *Tidak ada anomali*';
  const message = `${status}\nTransaction ID: ${transactionId}\nAmount: ${amount}\nFuel Type: ${fuelType}`;

  try {
    await sendWhacenterMessage(WHACENTER_TARGET_NUMBER, message);
    console.log('[WhatsApp] Notifikasi terkirim ke', WHACENTER_TARGET_NUMBER);
  } catch (err) {
    console.error('[WhatsApp] Gagal mengirim notifikasi:', err.message);
    // Jangan re‑throw sehingga job tidak gagal karena notifikasi saja.
  }
}

module.exports = { sendAnomalyAlert };
