import {one,all,audit} from './db.js';
import {requireValue,uuid} from './security.js';

export async function onboardProfessional(db,user,input){
 const name=typeof input.name==='string'?input.name.trim().replace(/\s+/g,' '):'';
 requireValue(name.length>=2&&name.length<=120,'Informe o nome do profissional');
 requireValue(uuid(input.template_resource_id),'Escolha uma agenda modelo');
 return db.transaction(async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(184728392)');
  requireValue(!await one(tx,'SELECT id FROM staff WHERE lower(trim(name))=lower($1)',[name]),'Já existe um profissional com esse nome',409);
  const source=await one(tx,`SELECT r.id,r.audience FROM resources r JOIN staff st ON st.id=r.staff_id
   WHERE r.id=$1 AND r.active AND st.active AND r.audience IN ('feminino','masculino')`,[input.template_resource_id]);
  requireValue(source,'Escolha uma agenda ativa de atendimento feminino ou masculino',409);
  const services=await all(tx,'SELECT * FROM services WHERE resource_id=$1 AND active ORDER BY id',[source.id]);
  requireValue(services.length,'A agenda modelo precisa ter serviços ativos',409);
  const schedule=await one(tx,'SELECT id FROM business_hours WHERE resource_id=$1 LIMIT 1',[source.id]);
  requireValue(schedule,'A agenda modelo precisa ter horários configurados',409);
  const staff=await one(tx,'INSERT INTO staff(name) VALUES($1) RETURNING id',[name]);
  const resource=await one(tx,'INSERT INTO resources(name,staff_id,audience) VALUES($1,$2,$3) RETURNING id',[name,staff.id,source.audience]);
  await tx.query(`INSERT INTO business_hours(resource_id,weekday,opens,closes)
   SELECT $1,weekday,opens,closes FROM business_hours WHERE resource_id=$2`,[resource.id,source.id]);
  for(const service of services){
   const copy=await one(tx,`INSERT INTO services(name,description,price_cents,duration_minutes,buffer_minutes,active,care,resource_id,anamnesis_required)
    VALUES($1,$2,$3,$4,$5,true,$6,$7,$8) RETURNING id`,
    [service.name,service.description==='Catálogo R&R novembro/2026'?'Bronzeamento a jato':service.description,
     service.price_cents,service.duration_minutes,service.buffer_minutes,service.care,resource.id,service.anamnesis_required]);
   await tx.query(`INSERT INTO packages(service_id,name,price_cents,sessions,validity_days,active)
    SELECT $1,name,price_cents,sessions,validity_days,true FROM packages WHERE service_id=$2 AND active`,[copy.id,service.id]);
  }
  await audit(tx,user.id,'professional.onboarded',staff.id,{resource_id:resource.id,template_resource_id:source.id});
  return {ok:true,staff_id:staff.id,resource_id:resource.id};
 });
}
