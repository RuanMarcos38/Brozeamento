import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.js';
import {createFranchiseInterest,franchiseAdminData,franchiseAdminWrite} from '../src/franchise.js';
const request={full_name:'Maria de Teste',email:'maria@example.invalid',whatsapp:'47999999999',city:'Joinville',state:'SC',occupation:'Empreendedora',experience:'Experiência comercial',participation:'operar',investment_range:'A definir',start_window:'Ainda sem previsão',comments:'Gostaria de saber mais',privacy:true};
test('leads de franquia ficam isolados de clientes, reservas e dados de saúde',async()=>{
 const f=await fixture();try{
  const lead=await createFranchiseInterest(f.db,request);
  assert.equal(lead.received,true);
  const rows=await f.db.query('SELECT * FROM franchise_leads WHERE id=$1',[lead.reference]);
  assert.equal(rows.rows.length,1);assert.equal(rows.rows[0].stage,'novo');
  const customers=await f.db.query('SELECT count(*)::int n FROM customers');assert.equal(customers.rows[0].n,0);
  assert.equal((await franchiseAdminData(f.db,{role:'owner'},{})).leads.length,1);
  await assert.rejects(franchiseAdminData(f.db,{role:'viewer'},{}),e=>e.status===403);
  await assert.rejects(franchiseAdminWrite(f.db,{role:'viewer',id:null},{id:lead.reference,action:'stage',stage:'aprovado'}),e=>e.status===403);
  const u=(await f.db.query("INSERT INTO users(email,password_hash) VALUES('franchise@example.invalid','test') RETURNING id")).rows[0];
  const owner={id:u.id,role:'owner'};
  await franchiseAdminWrite(f.db,owner,{id:lead.reference,action:'stage',stage:'primeiro_contato'});
  await franchiseAdminWrite(f.db,owner,{id:lead.reference,action:'note',note:'Primeiro contato realizado'});
  await franchiseAdminWrite(f.db,owner,{id:lead.reference,action:'task',title:'Agendar apresentação'});
  const data=await franchiseAdminData(f.db,owner,{stage:'primeiro_contato'});
  assert.equal(data.leads.length,1);assert.equal(data.tasks.length,1);
  assert.ok(data.history.some(x=>x.action==='note'));
  await franchiseAdminWrite(f.db,owner,{id:lead.reference,action:'complete_task',task_id:data.tasks[0].id});
  assert.ok((await franchiseAdminData(f.db,owner,{})).tasks[0].completed_at);
 }finally{await f.close();}
});
test('cadastro exige consentimento e validações e não salva entradas rejeitadas',async()=>{
 const f=await fixture();try{
  await assert.rejects(createFranchiseInterest(f.db,{...request,privacy:false}),e=>e.status===400);
  await assert.rejects(createFranchiseInterest(f.db,{...request,email:'invalid'}),e=>e.status===400);
  await assert.rejects(createFranchiseInterest(f.db,{...request,website:'spam.example'}),e=>e.status===400);
  await assert.rejects(createFranchiseInterest(f.db,{...request,comments:'x'.repeat(1501)}),e=>e.status===400);
  assert.equal((await f.db.query('SELECT count(*)::int n FROM franchise_leads')).rows[0].n,0);
 }finally{await f.close();}
});
