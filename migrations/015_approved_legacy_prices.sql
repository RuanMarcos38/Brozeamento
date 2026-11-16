-- Apply approved prices only to the already available legacy catalog.
-- Bookings, payments, credits, calendars and clinical activation remain unchanged.
INSERT INTO settings(key,value)
SELECT 'catalog_prices_before_20261110',jsonb_build_object(
 'services',(SELECT COALESCE(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM services s),
 'packages',(SELECT COALESCE(jsonb_agg(to_jsonb(p)),'[]'::jsonb) FROM packages p),
 'booking',(SELECT value FROM settings WHERE key='booking'))
ON CONFLICT DO NOTHING;
UPDATE services SET price_cents=22990
WHERE active AND name='Sessão de bronzeamento' AND price_cents=36000;
UPDATE packages p SET name='Bronze Tradicional — 3 sessões',price_cents=62990
FROM services s WHERE p.service_id=s.id AND s.active AND s.name='Sessão de bronzeamento'
AND p.name='Pacote de 3 sessões' AND p.sessions=3 AND p.price_cents=97200;
UPDATE packages p SET name='Bronze Tradicional — 5 sessões',price_cents=99990
FROM services s WHERE p.service_id=s.id AND s.active AND s.name='Sessão de bronzeamento'
AND p.name='Pacote de 5 sessões' AND p.sessions=5 AND p.price_cents=153000;
INSERT INTO packages(service_id,name,price_cents,sessions,validity_days,active)
SELECT s.id,v.name,v.price,v.sessions,90,true FROM services s
CROSS JOIN (VALUES ('Bronze Express — 3 sessões',71990,3),('Bronze Express — 5 sessões',104990,5)) v(name,price,sessions)
WHERE s.active AND s.name='Sessão de bronzeamento' AND s.price_cents=22990
AND NOT EXISTS(SELECT 1 FROM packages p WHERE p.service_id=s.id AND p.name=v.name);
UPDATE settings SET value=value||jsonb_build_object('policy',
'Atendimento domiciliar em Joinville/SC, sem taxa de deslocamento. Sessão avulsa: R$ 229,90. Bronze Tradicional: 3 sessões por R$ 629,90 ou 5 por R$ 999,90. Bronze Express: 3 sessões por R$ 719,90 ou 5 por R$ 1.049,90. Pacotes válidos por 90 dias após a aprovação do pagamento. Escolha todas as datas antes de pagar. Horários sujeitos à disponibilidade; a confirmação depende da aprovação e validação do pagamento. Pagamento por cartão ou Pix. Guarde o link privado da reserva. Cancelamento, reagendamento e dúvidas: contato@rrbronzeamento.com.br.')
WHERE key='booking';
