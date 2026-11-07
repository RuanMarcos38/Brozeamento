-- Consent-based, pseudonymous analytics. No IP, email, health or form field values stored.
CREATE TABLE IF NOT EXISTS site_visitor_sessions(
 id uuid PRIMARY KEY,
 first_seen timestamptz NOT NULL DEFAULT now(),
 last_seen timestamptz NOT NULL DEFAULT now(),
 source varchar(40) NOT NULL DEFAULT 'direto',
 device varchar(16) NOT NULL DEFAULT 'outro'
);
CREATE INDEX IF NOT EXISTS site_visitor_sessions_active_idx ON site_visitor_sessions(last_seen DESC);
CREATE TABLE IF NOT EXISTS site_analytics_events(
 id bigserial PRIMARY KEY,
 session_id uuid NOT NULL REFERENCES site_visitor_sessions(id) ON DELETE CASCADE,
 name varchar(40) NOT NULL,
 path varchar(100) NOT NULL,
 utm_source varchar(60),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_analytics_events_time_idx ON site_analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS site_analytics_events_session_idx ON site_analytics_events(session_id);
