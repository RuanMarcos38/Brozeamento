import {one,all} from './db.js';
import {requireValue} from './security.js';
export async function professionalData(db,part,user,query){
 requireValue(['agenda','clientes'].includes(part),'Área restrita à gestão',403);
 const resources=await all(db,'SELECT r.id,r.name,r.active FROM resources r JOIN clinical_access a ON a.staff_id=r.staff_id WHERE a.user_id=$1',[user.id]);
 const ids=resources.map(r=>r.id);
 if(part==='agenda'){
 const from=query.from||new Date().toISOString().slice(0,10),to=query.to||new Date(Date.now()+31*86400000).toISOString().slice(0,10);
 requireValue(/^\d{4}-\d{2}-\d{2}$/.test(from)&&/^\d{4}-\d{2}-\d{2}$/.test(to),'Período inválido');
 return {resources,agenda_open:(await one(db,"SELECT value FROM settings WHERE key='booking'")).value.agenda_open!==false,bookings:await all(db,"SELECT b.*,c.name customer_name,c.email customer_email,c.phone customer_phone FROM bookings b JOIN customers c ON c.id=b.customer_id WHERE b.resource_id=ANY($1::uuid[]) AND starts_at>=($2::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND starts_at<(($3::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo') ORDER BY starts_at LIMIT 3000",[ids,from,to]),blocks:await all(db,'SELECT cb.*,r.name resource_name FROM calendar_blocks cb JOIN resources r ON r.id=cb.resource_id WHERE cb.resource_id=ANY($1::uuid[])',[ids])};
 }
 return {customers:await all(db,"SELECT c.id,c.name,c.email,c.phone,c.created_at,jsonb_agg(jsonb_build_object('id',b.id,'service',b.service_name,'starts_at',b.starts_at,'state',b.state,'amount_cents',b.amount_cents,'attendance',b.attendance) ORDER BY b.starts_at DESC) bookings FROM customers c JOIN bookings b ON b.customer_id=c.id WHERE b.resource_id=ANY($1::uuid[]) GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500",[ids]),credits:[]};
}
