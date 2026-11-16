-- Additive: existing reservations, identities and financial snapshots are preserved.
ALTER TABLE services ADD COLUMN IF NOT EXISTS anamnesis_required boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS clinical_access (
 user_id uuid NOT NULL REFERENCES users(id), staff_id uuid NOT NULL REFERENCES staff(id),
 PRIMARY KEY(user_id,staff_id)
);
CREATE TABLE IF NOT EXISTS anamneses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id),
 customer_id uuid NOT NULL REFERENCES customers(id), staff_id uuid NOT NULL REFERENCES staff(id),
 revision integer NOT NULL CHECK(revision>0), version text NOT NULL,
 encrypted_payload text NOT NULL, digest text NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, UNIQUE(booking_id,revision)
);
CREATE INDEX IF NOT EXISTS anamneses_booking_idx ON anamneses(booking_id,revision DESC);
CREATE INDEX IF NOT EXISTS anamneses_staff_idx ON anamneses(staff_id,accepted_at DESC);
