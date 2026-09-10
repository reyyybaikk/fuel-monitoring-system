const BASE_URL = import.meta.env.VITE_API_URL || 'https://fuel-monitoring-system.onrender.com';

export const api = {
  // Verify vehicle by plate number
  verifyVehicle: (plate) => `${BASE_URL}/api/vehicles/verify/${plate}`,
  // Create fuel transaction
  createTransaction: () => `${BASE_URL}/api/fuel/transaction`,
  // QR code for vehicle sticker
  qrcode: (plate) => `${BASE_URL}/api/vehicles/qrcode/${plate}`,
  // Analytics endpoint (optional query params: ?start=YYYY-MM-DD&end=YYYY-MM-DD)
  analytics: (query = '') => `${BASE_URL}/api/fuel/analytics${query}`,
  // List transactions (optional query params for pagination/filter)
  transactions: (query = '') => `${BASE_URL}/api/fuel/transaction${query}`,
  // List all vehicles (fleet data)
  vehicles: () => `${BASE_URL}/api/vehicles`,
  // Dashboard summary data
  summary: () => `${BASE_URL}/api/fuel/summary`,
};
