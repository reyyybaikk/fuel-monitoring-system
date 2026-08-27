const db = require('./db');

const runMigration = async () => {
  try {
    console.log('Running database migration...');

    // 1. Create users table
    const createUsersQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'DRIVER')),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(createUsersQuery);
    console.log('Table "users" is ready.');

    // 2. Create vehicles table (Master Data Armada UPKAL2)
    const createVehiclesQuery = `
      CREATE TABLE IF NOT EXISTS vehicles (
        id SERIAL PRIMARY KEY,
        license_plate VARCHAR(30) UNIQUE NOT NULL,
        vehicle_type VARCHAR(100) NOT NULL,
        ul_nd VARCHAR(100),
        ul_pln VARCHAR(100),
        usage_purpose VARCHAR(255),
        project_name VARCHAR(150),
        fuel_tank_capacity NUMERIC(10, 2),
        fuel_type VARCHAR(50),
        fuel_consumption_rate NUMERIC(10, 2),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await db.query(createVehiclesQuery);
    console.log('Table "vehicles" is ready.');

  // 3. Create fuel_transactions table (Core Business with Filling Source, GPS & Photos)
    
    // TAMBAHKAN BARIS INI UNTUK MENGHAPUS TABEL LAMA:
    await db.query('DROP TABLE IF EXISTS fuel_transactions CASCADE;'); 
    console.log('Old "fuel_transactions" table dropped.');

    const createFuelTransactionsQuery = `
      CREATE TABLE IF NOT EXISTS fuel_transactions (
        id SERIAL PRIMARY KEY,
        vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
        driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        filling_source VARCHAR(20) NOT NULL CHECK (filling_source IN ('SPBU', 'ECERAN')),
        fuel_type VARCHAR(50) NOT NULL CHECK (fuel_type IN ('Pertalite', 'Pertamax', 'Biosolar', 'Dexlite', 'Pertamina Dex')),
        fuel_amount NUMERIC(10, 2) NOT NULL,
        odometer INTEGER NOT NULL,
        total_cost NUMERIC(12, 2) NOT NULL,
        latitude NUMERIC(10, 8),
        longitude NUMERIC(11, 8),
        odometer_photo_path TEXT,
        receipt_photo_path TEXT,
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  
    await db.query(createFuelTransactionsQuery);
    console.log('Table "fuel_transactions" is updated and ready.');

    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();