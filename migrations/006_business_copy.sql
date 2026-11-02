UPDATE services SET care=replace(care,'pela JR;','pela R&R;') WHERE care LIKE '%pela JR;%';
UPDATE notifications SET recipient='contato@rrbronzeamento.com.br' WHERE kind='owner_email' AND recipient='anakaroka01@gmail.com' AND state IN ('pending','failed');
