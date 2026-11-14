ALTER TABLE franchise_leads ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES users(id);
ALTER TABLE franchise_leads ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT '';
CREATE TABLE IF NOT EXISTS franchise_notifications (
 lead_id uuid PRIMARY KEY REFERENCES franchise_leads(id),recipient text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing','sent','failed')),
 attempts integer NOT NULL DEFAULT 0, run_at timestamptz NOT NULL DEFAULT now(), locked_at timestamptz,
 last_error text
);
