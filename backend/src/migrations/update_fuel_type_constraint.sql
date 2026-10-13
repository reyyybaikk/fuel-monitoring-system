-- Update fuel_transactions fuel_type check constraint to include Pertamax Turbo
ALTER TABLE fuel_transactions DROP CONSTRAINT IF EXISTS fuel_transactions_fuel_type_check;
ALTER TABLE fuel_transactions ADD CONSTRAINT fuel_transactions_fuel_type_check 
  CHECK (fuel_type IN ('Pertalite', 'Pertamax', 'Pertamax Turbo', 'Biosolar', 'Dexlite', 'Pertamina Dex'));
