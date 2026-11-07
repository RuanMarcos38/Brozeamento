import {test} from 'node:test';import assert from 'node:assert/strict';import {fixture} from './helpers.js';
test('Ruan Marcos recebe recurso masculino isolado e não altera reservas femininas',async()=>{
 const f=await fixture();try{
  const staff=(await f.db.query("SELECT id,name FROM staff WHERE lower(name)='ruan marcos'")).rows;
  assert.equal(staff.length,1);
  const resources=(await f.db.query("SELECT * FROM resources WHERE audience='masculino' AND staff_id=$1",[staff[0].id])).rows;
  assert.equal(resources.length,1);
  const old=(await f.db.query('SELECT audience FROM resources WHERE id=$1',[f.resource])).rows[0];
  assert.equal(old.audience,'geral');
  assert.equal((await f.db.query('SELECT count(*)::int n FROM bookings')).rows[0].n,0);
  const active=await f.booking.services();
  assert.ok(active.every(s=>s.audience&&s.resource_id));
  assert.ok(!active.some(s=>s.resource_id===resources[0].id));
 }finally{await f.close();}
});