-- Replace only business contact settings and the existing owner's login.
UPDATE settings SET value = replace(replace(value::text, 'anakaroka01@gmail.com', 'contato@rrbronzeamento.com.br'), 'JR Bronzeamento', 'R&R Bronzeamento')::jsonb WHERE key='booking';
UPDATE users SET email='contato@rrbronzeamento.com.br' WHERE lower(email)='anakaroka01@gmail.com' AND EXISTS(SELECT 1 FROM admin_roles WHERE user_id=users.id AND role='owner') AND NOT EXISTS(SELECT 1 FROM users WHERE lower(email)='contato@rrbronzeamento.com.br');
UPDATE resources SET name='Atendimento R&R' WHERE name='Atendimento JR';
