const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const db = require('../config/db');

async function importCsvToDatabase(fileName) {
    const filePath = path.join(__dirname, '../../data', fileName);

    if (!fs.existsSync(filePath)) {
        console.log(`⚠️ File ${fileName} tidak ditemukan di path: ${filePath}`);
        return;
    }

    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log(`📥 Memproses ${results.length} data dari ${fileName}...`);

            let successCount = 0;
            for (const row of results) {
                // Mengambil nilai secara akurat berdasarkan header asli CSV
                const licensePlate = row['NO. POLISI'] || row['no. polisi'];
                const vehicleType = row['JENIS KENDARAAN'] || row['jenis kendaraan'] || 'Operational Vehicle';
                const ulNd = row['UL ND'] || row['ul nd'] || '';
                const ulPln = row['UL PLN'] || row['ul pln'] || '';
                const usagePurpose = row['KEGUNAAN'] || row['kegunaan'] || '';
                const projectName = row['PROJECT'] || row['project'] || '';

                // Pastikan hanya memasukkan baris yang memiliki nomor polisi valid
                if (licensePlate && licensePlate.trim() !== '' && licensePlate.trim() !== 'NO. POLISI') {
                    try {
                        const query = `
                            INSERT INTO vehicles (
                                license_plate, vehicle_type, ul_nd, ul_pln, 
                                usage_purpose, project_name, is_active, created_at, updated_at
                            )
                            VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
                            ON CONFLICT (license_plate) 
                            DO UPDATE SET 
                                vehicle_type = EXCLUDED.vehicle_type,
                                ul_nd = EXCLUDED.ul_nd,
                                ul_pln = EXCLUDED.ul_pln;
                        `;
                        
                        await db.query(query, [
                            licensePlate.trim(),
                            vehicleType.trim(),
                            ulNd.trim(),
                            ulPln.trim(),
                            usagePurpose.trim(),
                            projectName.trim()
                        ]);
                        successCount++;
                    } catch (err) {
                        console.error(`❌ Gagal menyimpan plat ${licensePlate}:`, err.message);
                    }
                }
            }
            console.log(`✅ Selesai! Berhasil mengimpor ${successCount} data dari ${fileName}\n`);
        });
}

async function runAllSeeds() {
    console.log('🚀 Memulai proses seeding ulang data CSV ke tabel vehicles...');
    
    await importCsvToDatabase('Unit-Armada-UPKAL2 - Banjarmasin.csv');
    await importCsvToDatabase('Unit-Armada-UPKAL2 - Barabai.csv');
    await importCsvToDatabase('Unit-Armada-UPKAL2 - Kapuas.csv');
    await importCsvToDatabase('Unit-Armada-UPKAL2 - Palangkaraya.csv');
    await importCsvToDatabase('Unit-Armada-UPKAL2 - Pangkalanbun.csv');
}

runAllSeeds();