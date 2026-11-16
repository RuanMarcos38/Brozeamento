ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_check;
ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_role_check CHECK(role IN ('owner','manager','viewer','professional'));
