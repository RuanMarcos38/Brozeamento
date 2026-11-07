import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture} from './helpers.js';
import {recordVisitorEvent,visitorMetrics} from '../src/site-monitoring.js';
test('monitoramento grava somente evento consentido e agrega dados reais',async()=>{
 const f=await fixture();
 try{
  const id=randomUUID();
  await assert.rejects(recordVisitorEvent(f.db,{consent:false,session:id,name:'page_view',path:'/'}),e=>e.status===403);
  await assert.rejects(recordVisitorEvent(f.db,{consent:true,session:id,name:'password',path:'/'}),e=>e.status===400);
  await recordVisitorEvent(f.db,{consent:true,session:id,name:'page_view',path:'/',source:'google',device:'mobile',utm_source:'campanha-teste'});
  await recordVisitorEvent(f.db,{consent:true,session:id,name:'booking_start',path:'/'});
  await recordVisitorEvent(f.db,{consent:true,session:id,name:'heartbeat',path:'/'});
  const result=await visitorMetrics(f.db,{role:'owner'},{});
  assert.equal(result.active,1);
  assert.equal(result.totals.page_views,1);
  assert.equal(result.totals.unique_visitors,1);
  assert.equal(result.totals.bookings_started,1);
  assert.equal(result.totals.bookings_completed,0);
  assert.equal(result.sources[0].source,'google');
  assert.equal((await f.db.query('SELECT count(*)::int n FROM site_analytics_events')).rows[0].n,2);
  await assert.rejects(visitorMetrics(f.db,{role:'viewer'},{}),e=>e.status===403);
 }finally{await f.close();}
});
