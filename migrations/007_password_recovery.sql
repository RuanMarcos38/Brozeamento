CREATE TABLE password_resets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 email text NOT NULL,
 token_hash text UNIQUE NOT NULL,
 delivery_secret text,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes',
 used_at timestamptz,
 delivery_state text NOT NULL DEFAULT 'pending' CHECK(delivery_state IN ('pending','processing','sent','failed','skipped')),
 attempts integer NOT NULL DEFAULT 0,
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 locked_at timestamptz,
 change_notified_at timestamptz
);
CREATE INDEX password_resets_user_idx ON password_resets(user_id,created_at);
CREATE INDEX password_resets_delivery_idx ON password_resets(delivery_state,next_attempt_at);
