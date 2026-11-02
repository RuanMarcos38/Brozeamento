ALTER TABLE bookings ADD COLUMN package_id uuid REFERENCES packages(id);
ALTER TABLE bookings ADD COLUMN package_sessions integer;
ALTER TABLE bookings ADD COLUMN package_validity_days integer;
ALTER TABLE bookings ADD COLUMN receipt_token_hash text UNIQUE;
