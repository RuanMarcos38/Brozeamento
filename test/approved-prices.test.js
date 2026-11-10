import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fixture} from './helpers.js';
test('approved legacy prices preserve existing bookings and are idempotent',async()=>{
 const f=await fixture({migrationsThrough:'014_franchise_followup.sql'});
 try{
 await f.db.query("UPDATE services SET name='Sessão de bronzeamento',price_cents=36000 WHERE id=$1",[f.serviceId]);
 const booked=await f.booking.create(f.input);
 await f.db.query("INSERT INTO packages(service_id,name,price_cents,sessions,validity_days,active) VALUES($1,'Pacote de 3 sessões',97200,3,90,true),($1,'Pacote de 5 sessões',153000,5,90,true)",[f.serviceId]);
 const sql=await readFile(new URL('../migrations/015_approved_legacy_prices.sql',import.meta.url),'utf8');
 for(let n=0;n<2;n++){if(typeof f.raw.exec==='function')await f.raw.exec(sql);else await f.db.query(sql);}
 assert.equal((await f.db.query('SELECT price_cents FROM services WHERE id=$1',[f.serviceId])).rows[0].price_cents,22990);
 assert.deepEqual((await f.db.query('SELECT price_cents FROM packages WHERE service_id=$1 ORDER BY price_cents',[f.serviceId])).rows.map(x=>x.price_cents),[62990,71990,99990,104990]);
 assert.equal((await f.booking.lookup(f.input.token)).amount_cents,booked.amount_cents);
 assert.equal(booked.amount_cents,36000);
 const policy=(await f.db.query("SELECT value FROM settings WHERE key='booking'")).rows[0].value.policy;
 assert.ok(policy.includes('sem taxa de deslocamento'));
 assert.ok((await f.db.query("SELECT value FROM settings WHERE key='catalog_prices_before_20261110'")).rows[0]);
 }finally{await f.close();}
});
