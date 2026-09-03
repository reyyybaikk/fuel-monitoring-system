// Simple test harness for fuelRoutes validation logic
// Mock response object to capture status and payload
function createRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (payload) {
    this.body = payload;
    return this;
  };
  res.send = function (payload) {
    this.body = payload;
    return this;
  };
  return res;
}

// Validation function extracted from fuelRoutes.js (GET /vehicles/verify/:plateNumber)
function validateVehicle(vehicle, plateNumber) {
  const res = createRes();
  // Master-data active flag check
  if (!vehicle.is_active) {
    return res.status(400).json({
      success: false,
      message: `Kendaraan dengan No. Polisi '${plateNumber}' sudah tidak aktif dalam master data dan tidak dapat diisi BBM.`,
    });
  }
  // Operational status check
  if (vehicle.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: `Unit dengan No. Polisi '${plateNumber}' sedang berstatus ${vehicle.status} dan tidak dapat diisi BBM.`,
    });
  }
  // Success path
  return res.status(200).json({
    success: true,
    message: 'Kendaraan terverifikasi!',
    data: {
      id: vehicle.id,
      plateNumber: vehicle.plate_number,
      unitCode: vehicle.unit_code,
      region: vehicle.region,
    },
  });
}

// Test cases
const testCases = [
  { desc: 'Case 1: is_active=true, status=active', vehicle: { is_active: true, status: 'active', id: 1, plate_number: 'AB1234', unit_code: 'U01', region: 'R1' }, expectedStatus: 200 },
  { desc: 'Case 2: is_active=true, status=maintenance', vehicle: { is_active: true, status: 'maintenance', id: 2, plate_number: 'CD5678', unit_code: 'U02', region: 'R2' }, expectedStatus: 400 },
  { desc: 'Case 3: is_active=true, status=inactive', vehicle: { is_active: true, status: 'inactive', id: 3, plate_number: 'EF9012', unit_code: 'U03', region: 'R3' }, expectedStatus: 400 },
  { desc: 'Case 4: is_active=false, status=active', vehicle: { is_active: false, status: 'active', id: 4, plate_number: 'GH3456', unit_code: 'U04', region: 'R4' }, expectedStatus: 400 },
];

let allPassed = true;
for (const tc of testCases) {
  const plateNumber = tc.vehicle.plate_number;
  const res = validateVehicle(tc.vehicle, plateNumber);
  const pass = res.statusCode === tc.expectedStatus;
  console.log(`${tc.desc} => status ${res.statusCode} ${pass ? 'PASS' : 'FAIL'}`);
  if (!pass) allPassed = false;
}
process.exit(allPassed ? 0 : 1);

