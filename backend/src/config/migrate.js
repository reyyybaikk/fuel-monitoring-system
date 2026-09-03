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

    // 3. Create fuel_transactions table (Core Business with Filling Source, GPS & Photos in PostgreSQL BYTEA)
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
        odometer_photo_data BYTEA,
        odometer_photo_mimetype VARCHAR(50),
        receipt_photo_data BYTEA,
        receipt_photo_mimetype VARCHAR(50),
        odometer_after_photo_data BYTEA,
        odometer_after_photo_mimetype VARCHAR(50),
        status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
  
    await db.query(createFuelTransactionsQuery);
    console.log('Table "fuel_transactions" is updated and ready.');

    // 4. Add new BYTEA + OCR + ML + WhatsApp notification columns (safe, non-destructive)
    const alterQueries = [
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS odometer_photo_data BYTEA;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS odometer_photo_mimetype VARCHAR(50);`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS receipt_photo_data BYTEA;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS receipt_photo_mimetype VARCHAR(50);`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS odometer_after_photo_data BYTEA;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS odometer_after_photo_mimetype VARCHAR(50);`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS ocr_receipt_data JSONB;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS ocr_odometer_before INTEGER;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS ocr_odometer_after INTEGER;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS ml_is_anomaly BOOLEAN DEFAULT FALSE;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS ml_anomaly_score NUMERIC(4,2);`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS ml_anomaly_reasons TEXT;`,
      `ALTER TABLE fuel_transactions ADD COLUMN IF NOT EXISTS wa_notif_sent BOOLEAN DEFAULT FALSE;`,
    ];

    for (const q of alterQueries) {
      await db.query(q);
    }
    console.log('All BYTEA and ML columns synced to "fuel_transactions".');

    console.log('All migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();