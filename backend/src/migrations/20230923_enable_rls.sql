-- Enable Row Level Security (RLS) for fuel_transactions and users tables
-- This migration assumes the existence of tables: users (id primary key) and fuel_transactions (user_id foreign key)

-- Enable RLS on fuel_transactions
ALTER TABLE fuel_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own fuel_transactions
CREATE POLICY user_own_fuel_transactions ON fuel_transactions
    USING (user_id = current_setting('app.current_user_id')::int);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own user record
CREATE POLICY user_self ON users
    USING (id = current_setting('app.current_user_id')::int);

-- Optional: Force RLS for all users (including superusers) unless bypassed
ALTER TABLE fuel_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
