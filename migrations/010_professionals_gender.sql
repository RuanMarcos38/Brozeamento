-- Extend existing professional/resource model; preserve all current IDs and bookings.
ALTER TABLE resources ADD COLUMN IF NOT EXISTS audience varchar(16) NOT NULL DEFAULT 'geral';
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_audience_allowed;
ALTER TABLE resources ADD CONSTRAINT resources_audience_allowed CHECK(audience IN ('geral','feminino','masculino'));
INSERT INTO staff(name)
 SELECT 'Ruan Marcos'
 WHERE NOT EXISTS(SELECT 1 FROM staff WHERE lower(name)=lower('Ruan Marcos'));
INSERT INTO resources(name,staff_id,audience,active)
 SELECT 'Atendimento masculino — Ruan Marcos',s.id,'masculino',true
 FROM staff s WHERE lower(s.name)=lower('Ruan Marcos')
 AND NOT EXISTS(SELECT 1 FROM resources WHERE lower(name)=lower('Atendimento masculino — Ruan Marcos'))
 LIMIT 1;
-- No prices, hours or bookable services are activated automatically.
