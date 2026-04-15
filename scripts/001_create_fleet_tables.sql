-- Fleet Management Database Schema

-- Locations table (pickup/dropoff points)
CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle categories (e.g., Sedan, SUV, etc.)
CREATE TABLE IF NOT EXISTS vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  license_plate TEXT NOT NULL UNIQUE,
  year INTEGER,
  color TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'running', 'idle', 'garage', 'maintenance')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicle availability/bookings table
CREATE TABLE IF NOT EXISTS vehicle_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'booked' CHECK (status IN ('booked', 'completed', 'cancelled')),
  customer_name TEXT,
  customer_phone TEXT,
  pickup_location_id UUID REFERENCES locations(id),
  dropoff_location_id UUID REFERENCES locations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle ON vehicle_bookings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON vehicle_bookings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON vehicle_bookings(status);

-- Enable Row Level Security (RLS) - for now allow all operations since this is an admin dashboard
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (admin dashboard)
CREATE POLICY "Allow all on locations" ON locations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vehicle_categories" ON vehicle_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vehicles" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vehicle_bookings" ON vehicle_bookings FOR ALL USING (true) WITH CHECK (true);
