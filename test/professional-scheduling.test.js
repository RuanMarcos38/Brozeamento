import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './helpers.js';
import {dashboardData} from '../src/analytics.js';
import {adminData} from '../src/admin.js';
const migration=await readFile(new URL('../migrations/016_professional_agendas.sql',import.meta.url),'utf8');
async function run(f){if(typeof f.raw.exec==='function')await f.raw.exec(migration);else await f.db.query(migration);}
async function legacy(f){await f.db.query("UPDATE resources SET name='Atendimento R&R' WHERE id=$1",[f.resource]);await f.db.query("UPDATE services SET name='Sessão de bronzeamento',price_cents=22990 WHERE id=$1",[f.serviceId]);}
test('professional agendas preserve legacy history, isolate slots and filter all dashboard metrics',async()=>{
 const f=await fixture({migrationsThrough:'015_approved_legacy_prices.sql'});
 try{
 const old=await f.booking.create(f.input);await f.db.query("UPDATE bookings SET state='expired' WHERE id=$1",[old.id]);await legacy(f);
 await f.db.query("INSERT INTO packages(service_id,name,price_cents,sessions,validity_days,active) VALUES($1,'Bronze Express — 3 sessões',71990,3,90,true)",[f.serviceId]);
 await run(f);await run(f);
 const services=(await f.db.query("SELECT s.*,r.staff_id,st.name professional_name FROM services s JOIN resources r ON r.id=s.resource_id JOIN staff st ON st.id=r.staff_id WHERE s.active ORDER BY st.name")).rows;
 assert.equal(services.length,2);assert.notEqual(services[0].resource_id,services[1].resource_id);
 const oldAfter=(await f.db.query('SELECT * FROM bookings WHERE id=$1',[old.id])).rows[0];assert.equal(oldAfter.resource_id,f.resource);assert.equal(oldAfter.amount_cents,old.amount_cents);
 const first=await f.booking.create({...f.input,service_id:services[0].id,token:'b'.repeat(64)});
 const second=await f.booking.create({...f.input,service_id:services[1].id,token:'c'.repeat(64)});
 assert.equal(first.starts_at.getTime(),second.starts_at.getTime());
 await assert.rejects(f.booking.create({...f.input,service_id:services[0].id,token:'d'.repeat(64)}),/indisponível/);
 await f.booking.applyPayment(f.payment(first));await f.booking.applyPayment(f.payment(second));
 const range={from:new Date().toISOString().slice(0,10),to:f.day};
 const all=await dashboardData(f.db,range),female=await dashboardData(f.db,{...range,professional_id:services[0].staff_id}),male=await dashboardData(f.db,{...range,professional_id:services[1].staff_id});
 assert.equal(all.summary.total,3);assert.equal(female.summary.total,1);assert.equal(male.summary.total,1);
 assert.equal(Number(all.finance.gross),45980);assert.equal(Number(female.finance.gross),22990);assert.equal(Number(male.finance.gross),22990);
 assert.equal(female.upcoming.length,1);assert.equal(male.upcoming.length,1);
 assert.equal(Number(female.trend.reduce((s,x)=>s+Number(x.gross),0)),22990);
 const agenda=await adminData(f.db,'agenda',range);assert.equal(agenda.bookings.find(b=>b.id===first.id).professional_name,'Rafaela Cristine');
 assert.equal((await f.db.query('SELECT count(*)::int n FROM packages WHERE service_id=$1',[services[0].id])).rows[0].n,1);
 await assert.rejects(dashboardData(f.db,{...range,professional_id:'invalid'}),/Profissional inválido/);
 }finally{await f.close();}
});
test('agenda migration refuses to orphan a future legacy appointment',async()=>{
 const f=await fixture({migrationsThrough:'015_approved_legacy_prices.sql'});
 try{await legacy(f);await f.booking.create(f.input);await assert.rejects(run(f),/Reservas futuras legadas/);assert.equal((await f.db.query('SELECT active FROM services WHERE id=$1',[f.serviceId])).rows[0].active,true);}finally{await f.close();}
});
