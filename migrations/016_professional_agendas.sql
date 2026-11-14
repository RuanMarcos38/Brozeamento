-- Separate new appointments while preserving every historic booking and payment.
DO $$
DECLARE source services%ROWTYPE; target resources%ROWTYPE; new_service uuid;
BEGIN
 SELECT s.* INTO source FROM services s JOIN resources r ON r.id=s.resource_id
 WHERE s.active AND s.name='Sessão de bronzeamento' AND r.name='Atendimento R&R' AND r.staff_id IS NULL LIMIT 1;
 IF NOT FOUND THEN RETURN; END IF;
 IF (SELECT count(*) FROM services s JOIN resources r ON r.id=s.resource_id WHERE s.active AND s.name='Sessão de bronzeamento' AND r.name='Atendimento R&R' AND r.staff_id IS NULL)<>1 THEN
 RAISE EXCEPTION 'Mais de um catálogo legado: revisar antes de separar agendas'; END IF;
 IF EXISTS(SELECT 1 FROM bookings b LEFT JOIN booking_holds h ON h.booking_id=b.id WHERE b.resource_id=source.resource_id AND b.starts_at>now() AND (b.state IN ('confirmed','conflict') OR (b.state='pending' AND h.expires_at>now()))) THEN
 RAISE EXCEPTION 'Reservas futuras legadas precisam de profissional antes da migração'; END IF;
 IF EXISTS(SELECT 1 FROM customer_credits c JOIN packages p ON p.id=c.package_id WHERE p.service_id=source.id AND c.remaining>0 AND c.expires_at>now()) THEN
 RAISE EXCEPTION 'Créditos legados ativos precisam de revisão antes da migração'; END IF;
 IF (SELECT count(*) FROM resources r JOIN staff s ON s.id=r.staff_id WHERE (s.name='Rafaela Cristine' AND r.audience='feminino') OR (s.name='Ruan Marcos' AND r.audience='masculino'))<>2 THEN
 RAISE EXCEPTION 'Revisar cadastro dos dois profissionais'; END IF;
 INSERT INTO settings(key,value) VALUES('before_professional_agendas_20261110',jsonb_build_object('service',to_jsonb(source))) ON CONFLICT DO NOTHING;
 FOR target IN SELECT r.* FROM resources r JOIN staff s ON s.id=r.staff_id WHERE (s.name='Rafaela Cristine' AND r.audience='feminino') OR (s.name='Ruan Marcos' AND r.audience='masculino')
 LOOP
 INSERT INTO services(name,description,price_cents,duration_minutes,buffer_minutes,active,care,resource_id,anamnesis_required)
 VALUES(source.name,'Agendamento por profissional novembro/2026',source.price_cents,source.duration_minutes,source.buffer_minutes,true,source.care,target.id,source.anamnesis_required) RETURNING id INTO new_service;
 INSERT INTO packages(service_id,name,price_cents,sessions,validity_days,active)
 SELECT new_service,name,price_cents,sessions,validity_days,active FROM packages WHERE service_id=source.id;
 IF NOT EXISTS(SELECT 1 FROM business_hours WHERE resource_id=target.id) THEN
 INSERT INTO business_hours(resource_id,weekday,opens,closes) SELECT target.id,weekday,opens,closes FROM business_hours WHERE resource_id=source.resource_id ON CONFLICT DO NOTHING;
 END IF;
 -- Preserve existing future closure periods for both agendas.
 INSERT INTO calendar_blocks(resource_id,starts_at,ends_at,reason)
 SELECT target.id,starts_at,ends_at,'Indisponibilidade preservada da agenda anterior' FROM calendar_blocks WHERE resource_id=source.resource_id AND ends_at>now();
 END LOOP;
 UPDATE services SET active=false WHERE id=source.id;
 INSERT INTO audit_logs(action,entity_id,details) VALUES('catalog.professional_agendas',source.id::text,'{"historic_bookings_unchanged":true,"prices_unchanged":true}');
END $$;
