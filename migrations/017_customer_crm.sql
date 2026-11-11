CREATE TABLE crm_contacts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 email text NOT NULL UNIQUE,
 name text NOT NULL,
 phone text NOT NULL,
 source_created_at timestamptz NOT NULL DEFAULT now(),
 stage text CHECK(stage IN ('novo','agendado','atendido','retoque','pausado')),
 notes text NOT NULL DEFAULT '',
 paused boolean NOT NULL DEFAULT false,
 email_enabled boolean NOT NULL DEFAULT true,
 whatsapp_enabled boolean NOT NULL DEFAULT true,
 unsubscribe_token uuid NOT NULL DEFAULT gen_random_uuid(),
 last_visit_at timestamptz,
 next_retouch_at timestamptz NOT NULL DEFAULT now()+interval '15 days',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX crm_unsubscribe_token ON crm_contacts(unsubscribe_token);
CREATE TABLE crm_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 contact_id uuid NOT NULL REFERENCES crm_contacts(id),
 booking_id uuid REFERENCES bookings(id),
 kind text NOT NULL CHECK(kind IN ('confirmation','retouch')),
 channel text NOT NULL CHECK(channel IN ('email','whatsapp')),
 dedupe_key text NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','sent','failed','uncertain','skipped')),
 recipient text,
 body text,
 provider_id text,
 attempts integer NOT NULL DEFAULT 0,
 run_at timestamptz NOT NULL DEFAULT now(),
 locked_at timestamptz,
 sent_at timestamptz,
 last_error text,
 anchor_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_messages_due ON crm_messages(state,run_at);
CREATE INDEX crm_messages_contact ON crm_messages(contact_id,created_at DESC);
CREATE INDEX customers_email_normalized ON customers(lower(email));
INSERT INTO settings(key,value) VALUES('customer_crm','{"confirmations":true,"retouch":true,"interval_days":15}') ON CONFLICT DO NOTHING;
INSERT INTO crm_contacts(email,name,phone,source_created_at)
 SELECT DISTINCT ON(lower(email)) lower(email),name,phone,created_at FROM customers ORDER BY lower(email),created_at DESC,id DESC
 ON CONFLICT(email) DO NOTHING;
