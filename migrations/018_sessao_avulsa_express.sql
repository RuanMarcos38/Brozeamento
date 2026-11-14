-- Add the standalone option to each agenda with an active standalone session.
INSERT INTO services(name,description,price_cents,duration_minutes,buffer_minutes,active,care,resource_id,anamnesis_required)
SELECT 'Sessão Avulsa Express', 'Sessão individual de bronzeamento a jato Express',
       27990, base.duration_minutes, base.buffer_minutes, true, base.care,
       base.resource_id, base.anamnesis_required
FROM (
 SELECT DISTINCT ON (s.resource_id) s.*
 FROM services s JOIN resources r ON r.id=s.resource_id
 WHERE s.active AND r.active
   AND s.name IN ('Sessão de bronzeamento','Sessão de bronzeamento a jato')
 ORDER BY s.resource_id,(s.name='Sessão de bronzeamento a jato') DESC,s.id
) AS base
WHERE NOT EXISTS (
 SELECT 1 FROM services existing
 WHERE existing.resource_id=base.resource_id
   AND lower(trim(existing.name))='sessão avulsa express'
);
