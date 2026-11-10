-- Register Rafaela in a separate agenda without reassigning existing services or bookings.
INSERT INTO staff(name)
 SELECT 'Rafaela Cristine'
 WHERE NOT EXISTS (SELECT 1 FROM staff WHERE lower(name) = 'rafaela cristine');

INSERT INTO resources(name, staff_id, audience, active)
 SELECT 'Atendimento feminino - Rafaela Cristine', s.id, 'feminino', true
 FROM staff s
 WHERE lower(s.name) = 'rafaela cristine'
 AND NOT EXISTS (
   SELECT 1 FROM resources r
   WHERE r.staff_id = s.id AND r.audience = 'feminino'
 )
 ORDER BY s.id
 LIMIT 1;
