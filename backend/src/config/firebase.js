const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');
const fs = require('fs');

let isFirebaseInitialized = false;
let authInstance = null;

// Cari file serviceAccountKey.json di folder config atau dari Environment Variable
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccountKey.json');

try {
  let app = null;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Jika kredensial disimpan sebagai string JSON di .env
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    authInstance = getAuth(app);
    console.log('[Firebase Admin] Berhasil diinisialisasi dari ENV variable.');
  } else if (fs.existsSync(serviceAccountPath)) {
    // Jika file serviceAccountKey.json ada di disk
    const serviceAccount = require(serviceAccountPath);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    isFirebaseInitialized = true;
    authInstance = getAuth(app);
    console.log(`[Firebase Admin] Berhasil diinisialisasi dari file: ${serviceAccountPath}`);
  } else {
    console.warn(`[Firebase Admin Warning] File serviceAccountKey.json belum ditemukan di ${serviceAccountPath}. Backend tetap berjalan untuk JWT lokal.`);
  }
} catch (error) {
  console.error('[Firebase Admin Init Error]', error.message);
}

/**
 * Memverifikasi Firebase ID Token yang dikirim dari aplikasi mobile
 * @param {string} idToken 
 * @returns {Promise<any | null>}
 */
const verifyFirebaseToken = async (idToken) => {
  if (!isFirebaseInitialized || !authInstance) {
    throw new Error('Firebase Admin belum diinisialisasi. Letakkan serviceAccountKey.json di backend/src/config/');
  }
  try {
    const decodedToken = await authInstance.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('[Firebase Token Verify Error]', error.message);
    return null;
  }
};

module.exports = {
  getAuthInstance: () => authInstance,
  isFirebaseInitialized: () => isFirebaseInitialized,
  verifyFirebaseToken
};
