import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.js';
import {crmData,crmWrite,syncContacts,customerCRMJobs,unsubscribeCRM} from '../src/customer-crm.js';
const owner={role:'owner',id:null};
async function enable(f){await f.db.query(`UPDATE settings SET value='{"confirmations":true,"retouch":true,"interval_days":15}' WHERE key='customer_crm'`);}
function providers(){const sent=[];return {sent,email:{ready:()=>true,deliver:async(...args)=>{sent.push(['email',...args]);return {id:'email-id'};}},wa:{whatsappReady:()=>true,whatsapp:async(...args)=>{sent.push(['whatsapp',...args]);return {id:'wa-id'};}}};}
test('CRM includes all customers without duplicate cards, scopes access, and persists stages and notes',async()=>{const f=await fixture();try{
 await f.booking.create(f.input);await f.db.query('INSERT INTO customers(name,email,phone) VALUES($1,$2,$3)',['Outro registro',f.input.email,f.input.phone]);
 const x=await crmData(f.db,owner);assert.equal(x.total,1);assert.equal(x.contacts[0].bookings_count,1);
 await assert.rejects(crmData(f.db,{role:'professional'}),/restrito/);await assert.rejects(crmWrite(f.db,{role:'viewer'},{action:'create'}),/restrito/);
 const id=x.contacts[0].id;await crmWrite(f.db,owner,{action:'update',id,notes:'Prefere manhã',stage:'retoque',paused:false,email_enabled:true,whatsapp_enabled:false});
 const detail=await crmData(f.db,owner,{id});assert.equal(detail.contact.notes,'Prefere manhã');assert.equal(detail.bookings.length,1);assert.ok(!('token_hash' in detail.bookings[0]));assert.ok(!('unsubscribe_token' in detail.contact));
 assert.equal((await crmData(f.db,owner,{search:'registro'})).contacts.length,1);
}finally{await f.close();}});
test('approved payment queues one confirmation per channel despite duplicate webhook; no pending payment message',async()=>{const f=await fixture();try{
 await enable(f);const b=await f.booking.create(f.input);assert.equal((await f.db.query('SELECT * FROM crm_messages')).rows.length,0);
 const p=f.payment(b);await f.booking.applyPayment(p);await f.booking.applyPayment(p);
 assert.equal((await f.db.query('SELECT * FROM crm_messages')).rows.length,2);
 assert.equal((await f.db.query("SELECT * FROM notifications WHERE kind='confirmation'")).rows.length,0);
 const v=providers();await customerCRMJobs(f.db,v.email,v.wa,{APP_URL:'https://example.invalid'});await customerCRMJobs(f.db,v.email,v.wa,{APP_URL:'https://example.invalid'});
 assert.equal(v.sent.length,2);assert.match(v.sent[0].join(' '),/Obrigado pela confiança/);assert.ok(v.sent.some(x=>x[0]==='whatsapp'&&x[1]==='5511999999999'));
}finally{await f.close();}});
test('15-day cycles, pause, opt-out and future bookings suppress retouch without deleting history',async()=>{const f=await fixture();try{
 await enable(f);await crmWrite(f.db,owner,{action:'create',name:'Teste CRM',email:'crm@example.invalid',phone:'47999999999'});
 const v=providers(),env={APP_URL:'https://example.invalid'};await customerCRMJobs(f.db,v.email,v.wa,env);assert.equal(v.sent.length,0);
 await f.db.query("UPDATE crm_contacts SET next_retouch_at=now()-interval '1 minute'");await customerCRMJobs(f.db,v.email,v.wa,env);assert.equal(v.sent.length,2);await customerCRMJobs(f.db,v.email,v.wa,env);assert.equal(v.sent.length,2);
 const c=(await f.db.query('SELECT * FROM crm_contacts')).rows[0];assert.ok(new Date(c.next_retouch_at)>Date.now()+14*86400000);
 await unsubscribeCRM(f.db,c.unsubscribe_token);await f.db.query("UPDATE crm_contacts SET next_retouch_at=now()-interval '1 minute'");await customerCRMJobs(f.db,v.email,v.wa,env);assert.equal(v.sent.length,2);
 await f.db.query('UPDATE crm_contacts SET paused=false');await f.booking.create({...f.input,email:'crm@example.invalid'});await customerCRMJobs(f.db,v.email,v.wa,env);assert.equal(v.sent.length,2);
}finally{await f.close();}});
test('provider timeout is uncertain and never automatically repeated; other channel continues',async()=>{const f=await fixture();try{
 await enable(f);const b=await f.booking.create(f.input);await f.booking.applyPayment(f.payment(b));const v=providers();let calls=0;v.wa.whatsapp=async()=>{calls++;throw Error('Timeout');};
 await customerCRMJobs(f.db,v.email,v.wa,{APP_URL:'https://example.invalid'});await customerCRMJobs(f.db,v.email,v.wa,{APP_URL:'https://example.invalid'});
 assert.equal(calls,1);assert.equal(v.sent.length,1);assert.equal((await f.db.query("SELECT state FROM crm_messages WHERE channel='whatsapp'")).rows[0].state,'uncertain');
}finally{await f.close();}});
test('cancelled booking never sends confirmation; completed attendance resets next reminder',async()=>{const f=await fixture();try{
 await enable(f);const b=await f.booking.create(f.input);await f.booking.applyPayment(f.payment(b));await f.booking.cancel(b.id,null);const v=providers();await customerCRMJobs(f.db,v.email,v.wa,{APP_URL:'https://example.invalid'});assert.equal(v.sent.length,0);
 await f.db.query("UPDATE bookings SET state='confirmed',attendance='completed',starts_at=now()-interval '2 days',ends_at=now()-interval '2 days'+interval '1 hour',occupied_until=now()-interval '2 days'+interval '1 hour' WHERE id=$1",[b.id]);await syncContacts(f.db);
 const c=(await f.db.query('SELECT * FROM crm_contacts')).rows[0];assert.ok(c.last_visit_at);assert.ok(new Date(c.next_retouch_at)>Date.now()+12*86400000);
}finally{await f.close();}});
