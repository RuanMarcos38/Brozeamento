ALTER TABLE bookings ADD COLUMN parent_booking_id uuid REFERENCES bookings(id);
ALTER TABLE bookings ADD CONSTRAINT package_parent_not_self CHECK(parent_booking_id IS NULL OR parent_booking_id<>id);
CREATE INDEX bookings_parent_idx ON bookings(parent_booking_id);
