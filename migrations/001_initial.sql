
CREATE TABLE users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, password_hash text NOT NULL, active boolean NOT NULL DEFAULT true);
CREATE TABLE admin_roles(user_id uuid PRIMARY KEY REFERENCES users(id), role text NOT NULL CHECK(role IN ('owner','manager','viewer')));
CREATE TABLE sessions(token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), csrf text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE staff(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, active boolean NOT NULL DEFAULT true);
CREATE TABLE resources(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, staff_id uuid REFERENCES staff(id), active boolean NOT NULL DEFAULT true);
CREATE TABLE services(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL DEFAULT '', price_cents integer NOT NULL CHECK(price_cents>0), duration_minutes integer NOT NULL CHECK(duration_minutes BETWEEN 1 AND 480), buffer_minutes integer NOT NULL DEFAULT 0 CHECK(buffer_minutes BETWEEN 0 AND 120), active boolean NOT NULL DEFAULT false, care text NOT NULL DEFAULT '', resource_id uuid NOT NULL REFERENCES resources(id));
CREATE TABLE business_hours(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES resources(id), weekday integer NOT NULL CHECK(weekday BETWEEN 0 AND 6), opens time NOT NULL, closes time NOT NULL CHECK(closes>opens), UNIQUE(resource_id,weekday,opens));
CREATE TABLE customers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL, phone text NOT NULL, reminder_consent boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX customers_email_idx ON customers(email);
CREATE TABLE bookings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), service_id uuid NOT NULL REFERENCES services(id), resource_id uuid NOT NULL REFERENCES resources(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at), occupied_until timestamptz NOT NULL CHECK(occupied_until>=ends_at), state text NOT NULL CHECK(state IN ('pending','confirmed','expired','cancelled','refunded','conflict')), amount_cents integer NOT NULL CHECK(amount_cents>=0), service_name text NOT NULL, token_hash text UNIQUE NOT NULL, checkout_key text UNIQUE NOT NULL, checkout_url text, event_id text, attendance text NOT NULL DEFAULT 'scheduled' CHECK(attendance IN ('scheduled','completed','no_show')), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX bookings_starts_idx ON bookings(starts_at);
CREATE INDEX bookings_customer_idx ON bookings(customer_id);
CREATE INDEX bookings_state_idx ON bookings(state);
CREATE TABLE booking_holds(booking_id uuid PRIMARY KEY REFERENCES bookings(id), expires_at timestamptz NOT NULL, last_checked_at timestamptz);
CREATE INDEX holds_expiry_idx ON booking_holds(expires_at);
CREATE TABLE calendar_blocks(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resource_id uuid NOT NULL REFERENCES resources(id), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at), reason text NOT NULL);
-- Every occupied UTC minute has one owner. This database constraint covers all API/worker concurrency,
-- different service lengths, buffers, manual blocks, paid and temporary reservations.
CREATE TABLE occupied_minutes(resource_id uuid NOT NULL REFERENCES resources(id), minute timestamptz NOT NULL, booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE, block_id uuid REFERENCES calendar_blocks(id) ON DELETE CASCADE, PRIMARY KEY(resource_id,minute), CHECK((booking_id IS NULL)<>(block_id IS NULL)));
CREATE FUNCTION booking_occupancy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM occupied_minutes WHERE booking_id=NEW.id;
IF NEW.state IN ('pending','confirmed') THEN
INSERT INTO occupied_minutes(resource_id,minute,booking_id) SELECT NEW.resource_id,t,NEW.id FROM generate_series(date_trunc('minute',NEW.starts_at),NEW.occupied_until-interval '1 microsecond',interval '1 minute') t;
END IF; RETURN NEW; END $$;
CREATE TRIGGER booking_occupancy AFTER INSERT OR UPDATE OF starts_at,occupied_until,state,resource_id ON bookings FOR EACH ROW EXECUTE FUNCTION booking_occupancy();
CREATE FUNCTION block_occupancy() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
DELETE FROM occupied_minutes WHERE block_id=NEW.id;
INSERT INTO occupied_minutes(resource_id,minute,block_id) SELECT NEW.resource_id,t,NEW.id FROM generate_series(date_trunc('minute',NEW.starts_at),NEW.ends_at-interval '1 microsecond',interval '1 minute') t;
RETURN NEW; END $$;
CREATE TRIGGER block_occupancy AFTER INSERT OR UPDATE ON calendar_blocks FOR EACH ROW EXECUTE FUNCTION block_occupancy();
CREATE TABLE payments(id text PRIMARY KEY, booking_id uuid NOT NULL REFERENCES bookings(id), status text NOT NULL, amount_cents integer NOT NULL, fee_cents integer NOT NULL DEFAULT 0, approved_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX payments_booking_idx ON payments(booking_id);
CREATE TABLE payment_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id text NOT NULL, status text NOT NULL, event_key text UNIQUE NOT NULL, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE packages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), service_id uuid NOT NULL REFERENCES services(id), name text NOT NULL, price_cents integer NOT NULL CHECK(price_cents>0), sessions integer NOT NULL CHECK(sessions>0), validity_days integer NOT NULL CHECK(validity_days>0), active boolean NOT NULL DEFAULT false);
CREATE TABLE customer_credits(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id), package_id uuid NOT NULL REFERENCES packages(id), source_payment_id text UNIQUE REFERENCES payments(id), total integer NOT NULL CHECK(total>0), remaining integer NOT NULL CHECK(remaining>=0 AND remaining<=total), expires_at timestamptz NOT NULL);
CREATE TABLE credit_consumptions(booking_id uuid PRIMARY KEY REFERENCES bookings(id), credit_id uuid NOT NULL REFERENCES customer_credits(id), restored boolean NOT NULL DEFAULT false);
CREATE TABLE calendar_integrations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL DEFAULT 'google', calendar_id text NOT NULL, status text NOT NULL DEFAULT 'not_connected', last_error text, last_synced_at timestamptz);
CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), booking_id uuid NOT NULL REFERENCES bookings(id), kind text NOT NULL CHECK(kind IN ('calendar','confirmation','reminder')), dedupe_key text UNIQUE NOT NULL, state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent')), attempts integer NOT NULL DEFAULT 0, run_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz, last_error text);
CREATE INDEX notifications_due_idx ON notifications(state,run_at);
CREATE TABLE audit_logs(id bigserial PRIMARY KEY, actor_id uuid REFERENCES users(id), action text NOT NULL, entity_id text, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE settings(key text PRIMARY KEY, value jsonb NOT NULL);
INSERT INTO settings VALUES ('booking','{"hold_minutes":60,"policy":"","privacy_contact":"","reminders_enabled":false}');
CREATE TABLE rate_limits(key text PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL);
