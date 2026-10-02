// src/utils/whatsapp.js
// Helper wrapper that formats anomaly information and sends a WhatsApp message via Whacenter.
// It relies on the lower‑level `sendWhacenterMessage` utility defined in `whacenter.js`.

const { sendWhacenterMessage } = require('./whacenter');

// Optional env var for the destination phone number (international format, e.g. 628123456789).
// If not set, the helper will log a warning and skip sending.
const { WHACENTER_TARGET_NUMBER } = process.env;

/**
 * Sends an anomaly alert to a specific WhatsApp number (fallback to env var)
 *
 * @param {number} transactionId  ID transaksi yang diproses
 * @param {number} amount        Jumlah bahan bakar / nilai transaksi
 * @param {string} fuelType      Tipe bahan bakar (mis. Solar, Premium)
 * @param {boolean} isAnomaly    Flag apakah anomali terdeteksi
 * @param {string} targetNumber  (Opsional) Nomor WhatsApp admin wilayah
 */
async function sendAnomalyAlert(transactionId, amount, fuelType, isAnomaly, targetNumber) {
  // Use the provided targetNumber; if missing, fall back to env var
  const number = targetNumber || WHACENTER_TARGET_NUMBER;
  if (!number) {
    console.warn('[WhatsApp] No target number provided – notification skipped');
    return;
  }

  const status = isAnomaly ? '🚨 *ANOMALI TERDETEKSI*' : '✅ *Tidak ada anomali*';
  const message = `${status}\nTransaction ID: ${transactionId}\nAmount: ${amount}\nFuel Type: ${fuelType}`;

  try {
    await sendWhacenterMessage(number, message);
    console.log('[WhatsApp] Notifikasi terkirim ke', number);
  } catch (err) {
    console.error('[WhatsApp] Gagal mengirim notifikasi:', err.message);
    // Do not re‑throw so the job does not fail because of notification
  }
}

module.exports = { sendAnomalyAlert };
