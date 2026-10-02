// src/repositories/regionContactRepository.js
const db = require('../config/db');

/**
 * Mengambil nomor WhatsApp admin wilayah berdasarkan nilai region.
 * Cocokkan dengan kolom `ul_nd` atau `ul_pln` pada tabel `region_contacts`.
 * @param {string} region   Nilai region (contoh: "JAKARTA")
 * @returns {Promise<string|null>}   Nomor WhatsApp admin atau null bila tidak ditemukan.
 */
async function getAdminWhatsappByRegion(region) {
  const query = `
    SELECT admin_whatsapp
    FROM region_contacts
    WHERE LOWER(ul_nd) = LOWER($1) OR LOWER(ul_pln) = LOWER($1)
    LIMIT 1
  `;
  const { rows } = await db.query(query, [region]);
  return rows[0] ? rows[0].admin_whatsapp : null;
}

module.exports = { getAdminWhatsappByRegion };
