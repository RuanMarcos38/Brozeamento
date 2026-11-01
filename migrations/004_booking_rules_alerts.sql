ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK(kind IN ('calendar','confirmation','reminder','owner_email','owner_whatsapp'));
ALTER TABLE notifications ADD COLUMN recipient text;
UPDATE settings SET value=value||'{"hold_minutes":10,"slot_interval_minutes":120,"owner_email":"","owner_whatsapp":"","notify_owner_email":false,"notify_owner_whatsapp":false}'::jsonb WHERE key='booking';
UPDATE settings SET value=jsonb_set(value,'{policy}',to_jsonb(replace(COALESCE(value->>'policy',''),'60 minutos','10 minutos'))) WHERE key='booking';
UPDATE booking_holds h SET expires_at=LEAST(h.expires_at,b.created_at+interval '10 minutes') FROM bookings b WHERE b.id=h.booking_id AND b.state='pending';

ALTER TABLE notifications DROP CONSTRAINT notifications_state_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_state_check CHECK(state IN ('pending','processing','sent','failed','skipped'));
ALTER TABLE notifications ADD COLUMN provider_id text;
