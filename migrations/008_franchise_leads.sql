-- R&R Bronzeamento: commercial expansion leads, isolated from customers/booking and other tenants.
CREATE TABLE IF NOT EXISTS franchise_leads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 full_name varchar(160) NOT NULL,
 email varchar(254) NOT NULL,
 whatsapp varchar(24) NOT NULL,
 city varchar(120) NOT NULL,
 state char(2) NOT NULL,
 occupation varchar(160) NOT NULL,
 experience text NOT NULL DEFAULT '',
 participation varchar(24) NOT NULL CHECK (participation IN ('operar','investir','ambos')),
 investment_range varchar(60) NOT NULL,
 start_window varchar(60) NOT NULL,
 comments text NOT NULL DEFAULT '',
 privacy_accepted_at timestamptz NOT NULL,
 privacy_version varchar(30) NOT NULL,
 stage varchar(32) NOT NULL DEFAULT 'novo' CHECK (stage IN ('novo','primeiro_contato','em_analise','reuniao','proposta','negociacao','aprovado','descartado')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS franchise_leads_stage_created_idx ON franchise_leads(stage,created_at DESC);
CREATE INDEX IF NOT EXISTS franchise_leads_region_idx ON franchise_leads(state,city);
CREATE TABLE IF NOT EXISTS franchise_lead_history (
 id bigserial PRIMARY KEY, lead_id uuid NOT NULL REFERENCES franchise_leads(id) ON DELETE CASCADE,
 actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
 action varchar(60) NOT NULL, details text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS franchise_history_lead_idx ON franchise_lead_history(lead_id,created_at DESC);
CREATE TABLE IF NOT EXISTS franchise_tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lead_id uuid NOT NULL REFERENCES franchise_leads(id) ON DELETE CASCADE,
 title varchar(180) NOT NULL, due_at timestamptz, completed_at timestamptz, actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
