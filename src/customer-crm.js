import {all,one,audit} from './db.js';
import {requireValue,uuid} from './security.js';

export const crmStages={novo:'Novos clientes',agendado:'Agendados',atendido:'Atendidos',retoque:'Hora do retoque',pausado:'Pausados'};
const manager=user=>requireValue(['owner','manager'].includes(user.role),'CRM restrito à gestão',403);
export async function syncContacts(db){
 await db.query(`INSERT INTO crm_contacts(email,name,phone,source_created_at)
 SELECT DISTINCT ON(lower(email)) lower(email),name,phone,created_at FROM customers ORDER BY lower(email),created_at DESC,id DESC
 ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,source_created_at=EXCLUDED.source_created_at
 WHERE EXCLUDED.source_created_at>crm_contacts.source_created_at`);
 await db.query(`UPDATE crm_contacts c SET last_visit_at=v.last_visit,next_retouch_at=GREATEST(v.last_visit+interval '15 days',now())
 FROM (SELECT lower(cu.email) email,max(b.ends_at) last_visit FROM bookings b JOIN customers cu ON cu.id=b.customer_id
 WHERE b.state='confirmed' AND b.attendance='completed' AND b.ends_at<=now() GROUP BY lower(cu.email)) v
 WHERE c.email=v.email AND (c.last_visit_at IS NULL OR v.last_visit>c.last_visit_at)`);
}
export async function enqueueCustomerConfirmation(db,bookingId){
 const settings=(await one(db,"SELECT value FROM settings WHERE key='customer_crm'"))?.value;
 if(!settings?.confirmations)return false;
 const b=await one(db,`SELECT b.id,b.parent_booking_id,c.email,c.name,c.phone,c.created_at FROM bookings b JOIN customers c ON c.id=b.customer_id WHERE b.id=$1 AND b.state='confirmed'`,[bookingId]);
 if(!b||b.parent_booking_id)return true;
 const contact=await one(db,`INSERT INTO crm_contacts(email,name,phone,source_created_at) VALUES(lower($1),$2,$3,$4)
 ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id`,[b.email,b.name,b.phone,b.created_at]);
 for(const channel of ['email','whatsapp'])await db.query(`INSERT INTO crm_messages(contact_id,booking_id,kind,channel,dedupe_key)
 VALUES($1,$2,'confirmation',$3,$4) ON CONFLICT(dedupe_key) DO NOTHING`,[contact.id,b.id,channel,'confirmation:'+b.id+':'+channel]);
 return true;
}
const effectiveStage=`CASE WHEN c.paused THEN 'pausado' WHEN c.stage IS NOT NULL THEN c.stage
 WHEN EXISTS(SELECT 1 FROM bookings b JOIN customers cu ON cu.id=b.customer_id LEFT JOIN booking_holds h ON h.booking_id=b.id WHERE lower(cu.email)=c.email AND b.starts_at>now() AND (b.state='confirmed' OR (b.state='pending' AND h.expires_at>now()))) THEN 'agendado'
 WHEN c.next_retouch_at<=now() OR EXISTS(SELECT 1 FROM crm_messages m WHERE m.contact_id=c.id AND m.kind='retouch' AND m.anchor_at IS NOT DISTINCT FROM c.last_visit_at AND m.state IN ('pending','sending','sent')) THEN 'retoque'
 WHEN c.last_visit_at IS NOT NULL THEN 'atendido' ELSE 'novo' END`;
export async function crmData(db,user,q={}){
 manager(user);await syncContacts(db);
 if(q.id){requireValue(uuid(q.id),'Cliente inválido');const contact=await one(db,`SELECT id,email,name,phone,stage,notes,paused,email_enabled,whatsapp_enabled,last_visit_at,next_retouch_at,created_at FROM crm_contacts WHERE id=$1`,[q.id]);requireValue(contact,'Cliente não encontrado',404);
 const bookings=await all(db,`SELECT b.id,b.service_name,b.starts_at,b.ends_at,b.state,b.attendance,b.amount_cents,b.parent_booking_id,s.name professional_name,p.name package_name FROM bookings b JOIN customers cu ON cu.id=b.customer_id LEFT JOIN resources r ON r.id=b.resource_id LEFT JOIN staff s ON s.id=r.staff_id LEFT JOIN packages p ON p.id=b.package_id WHERE lower(cu.email)=$1 ORDER BY b.starts_at DESC`,[contact.email]);
 const payments=await all(db,`SELECT p.id,p.booking_id,p.status,p.amount_cents,p.approved_at FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN customers cu ON cu.id=b.customer_id WHERE lower(cu.email)=$1 ORDER BY p.updated_at DESC`,[contact.email]);
 const credits=await all(db,`SELECT cr.remaining,cr.expires_at,p.name FROM customer_credits cr JOIN customers cu ON cu.id=cr.customer_id JOIN packages p ON p.id=cr.package_id WHERE lower(cu.email)=$1 ORDER BY cr.expires_at DESC`,[contact.email]);
 const page=Math.max(0,Number.parseInt(q.messages_page)||0);
 const messages=await all(db,`SELECT id,kind,channel,state,recipient,body,attempts,sent_at,last_error,run_at,created_at FROM crm_messages WHERE contact_id=$1 ORDER BY created_at DESC LIMIT 51 OFFSET $2`,[contact.id,page*50]);
 return {contact,bookings,payments,credits,messages:messages.slice(0,50),more_messages:messages.length>50,messages_page:page};
 }
 const search=String(q.search||'').slice(0,120),stage=String(q.stage||'');requireValue(!stage||Object.hasOwn(crmStages,stage),'Etapa inválida');const page=Math.max(0,Number.parseInt(q.page)||0);
 const query=`WITH cards AS (SELECT c.id,c.name,c.email,c.phone,c.paused,c.email_enabled,c.whatsapp_enabled,c.last_visit_at,c.next_retouch_at,${effectiveStage} stage,
 (SELECT count(*)::int FROM bookings b JOIN customers cu ON cu.id=b.customer_id WHERE lower(cu.email)=c.email) bookings_count,
 (SELECT COALESCE(sum(p.amount_cents),0) FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN customers cu ON cu.id=b.customer_id WHERE lower(cu.email)=c.email AND p.status='approved') paid_cents
 FROM crm_contacts c) SELECT * FROM cards WHERE ($1='' OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%' OR phone ILIKE '%'||$1||'%') AND ($2='' OR stage=$2)`;
 const contacts=await all(db,query+' ORDER BY name,id LIMIT 61 OFFSET $3',[search,stage,page*60]);
 return {contacts:contacts.slice(0,60),more:contacts.length>60,page,search,stage,total:(await one(db,'SELECT count(*)::int total FROM crm_contacts')).total,stages:crmStages,settings:(await one(db,"SELECT value FROM settings WHERE key='customer_crm'")).value,delivery:await all(db,'SELECT channel,state,count(*)::int total FROM crm_messages GROUP BY channel,state')};
}
export async function crmWrite(db,user,x){
 manager(user);
 if(x.action==='settings'){requireValue(user.role==='owner','Somente o proprietário altera a automação',403);requireValue(typeof x.confirmations==='boolean'&&typeof x.retouch==='boolean','Configuração inválida');await db.query("UPDATE settings SET value=$1 WHERE key='customer_crm'",[JSON.stringify({confirmations:x.confirmations,retouch:x.retouch,interval_days:15})]);}
 else if(x.action==='create'){
 requireValue(typeof x.name==='string'&&x.name.trim().length>=2&&x.name.length<=120&&typeof x.email==='string'&&x.email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)&&typeof x.phone==='string'&&/^\+?[\d ()-]{10,25}$/.test(x.phone),'Confira nome, e-mail e WhatsApp');
 requireValue(!await one(db,'SELECT id FROM crm_contacts WHERE email=lower($1)',[x.email.trim()]),'E-mail já cadastrado',409);
 await db.query('INSERT INTO customers(name,email,phone) VALUES($1,$2,$3)',[x.name.trim(),x.email.trim().toLowerCase(),x.phone]);await syncContacts(db);
 }else{
 requireValue(uuid(x.id),'Cliente inválido');const c=await one(db,'SELECT id FROM crm_contacts WHERE id=$1',[x.id]);requireValue(c,'Cliente não encontrado',404);
 if(x.action==='update'){requireValue(typeof x.notes==='string'&&x.notes.length<=5000&&(!x.stage||Object.hasOwn(crmStages,x.stage))&&['paused','email_enabled','whatsapp_enabled'].every(k=>typeof x[k]==='boolean'),'Dados inválidos');await db.query('UPDATE crm_contacts SET notes=$2,stage=$3,paused=$4,email_enabled=$5,whatsapp_enabled=$6 WHERE id=$1',[x.id,x.notes,x.stage||null,x.paused,x.email_enabled,x.whatsapp_enabled]);}
 else if(x.action==='retry'){requireValue(uuid(x.message_id),'Mensagem inválida');await db.query("UPDATE crm_messages SET state='pending',run_at=now(),last_error=null,attempts=0 WHERE id=$1 AND contact_id=$2 AND state='failed'",[x.message_id,x.id]);}
 else requireValue(false,'Ação inválida');
 }
 await audit(db,user.id,'crm.'+x.action,x.id||null);return {ok:true};
}
export async function unsubscribeCRM(db,secret){requireValue(uuid(secret),'Link inválido',404);const c=await one(db,'UPDATE crm_contacts SET paused=true WHERE unsubscribe_token=$1 RETURNING id',[secret]);requireValue(c,'Link inválido',404);await audit(db,null,'crm.unsubscribe',c.id);return {ok:true};}

export async function customerCRMJobs(db,email,whatsapp,env){
 await syncContacts(db);const settings=(await one(db,"SELECT value FROM settings WHERE key='customer_crm'"))?.value||{};
 if(settings.retouch)await db.transaction(async tx=>{
 const contacts=await all(tx,`SELECT c.* FROM crm_contacts c WHERE NOT c.paused AND (c.email_enabled OR c.whatsapp_enabled) AND c.next_retouch_at<=now()
 AND NOT EXISTS(SELECT 1 FROM bookings b JOIN customers cu ON cu.id=b.customer_id LEFT JOIN booking_holds h ON h.booking_id=b.id WHERE lower(cu.email)=c.email AND b.starts_at>now() AND (b.state='confirmed' OR (b.state='pending' AND h.expires_at>now())))
 ORDER BY c.next_retouch_at FOR UPDATE SKIP LOCKED LIMIT 100`);
 for(const c of contacts){for(const channel of ['email','whatsapp'])if(c[channel+'_enabled'])await tx.query(`INSERT INTO crm_messages(contact_id,kind,channel,dedupe_key,anchor_at) VALUES($1,'retouch',$2,$3,$4) ON CONFLICT(dedupe_key) DO NOTHING`,[c.id,channel,'retouch:'+c.id+':'+new Date(c.next_retouch_at).toISOString()+':'+channel,c.last_visit_at]);await tx.query("UPDATE crm_contacts SET next_retouch_at=now()+interval '15 days' WHERE id=$1",[c.id]);}
 });
 // A provider may have accepted a message before a crash. Never blindly resend it.
 await db.query("UPDATE crm_messages SET state='uncertain',last_error='Envio interrompido; confira o provedor antes de reenviar.' WHERE state='sending' AND locked_at<now()-interval '10 minutes'");
 const tasks=await db.transaction(async tx=>all(tx,`UPDATE crm_messages SET state='sending',locked_at=now(),attempts=attempts+1 WHERE id IN
 (SELECT id FROM crm_messages WHERE state='pending' AND run_at<=now() ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 10) RETURNING *`));
 for(const task of tasks){let sending=false;try{
 const c=await one(db,'SELECT * FROM crm_contacts WHERE id=$1',[task.contact_id]);
 const enabled=task.kind==='retouch'?settings.retouch:settings.confirmations;
 if(!enabled||(task.kind==='retouch'&&(c.paused||!c[task.channel+'_enabled']))){await db.query("UPDATE crm_messages SET state='skipped',last_error='Automação pausada ou canal desativado' WHERE id=$1",[task.id]);continue;}
 let text,recipient;
 if(task.kind==='confirmation'){
 const b=await one(db,`SELECT b.*,cu.name customer_name,cu.email,cu.phone,st.name professional_name FROM bookings b JOIN customers cu ON cu.id=b.customer_id LEFT JOIN resources r ON r.id=b.resource_id LEFT JOIN staff st ON st.id=r.staff_id WHERE b.id=$1`,[task.booking_id]);
 if(!b||b.state!=='confirmed'||new Date(b.starts_at)<new Date()){await db.query("UPDATE crm_messages SET state='skipped',last_error='Reserva cancelada, não confirmada ou passada' WHERE id=$1",[task.id]);continue;}
 const sessions=await all(db,'SELECT starts_at FROM bookings WHERE id=$1 OR parent_booking_id=$1 ORDER BY starts_at',[b.id]);
 text=`Olá, ${b.customer_name}! Seu agendamento na R&R Bronzeamento está confirmado. Obrigado pela confiança!\nServiço: ${b.service_name}\nProfissional: ${b.professional_name||'Equipe R&R'}\n${sessions.map((s,i)=>'Sessão '+(i+1)+': '+new Date(s.starts_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})).join('\n')}\nHorários de São Paulo. Confira os cuidados de preparação em ${env.APP_URL}/#preparacao\nDúvidas ou reagendamento: contato@rrbronzeamento.com.br`;
 recipient=task.channel==='email'?b.email:b.phone;
 }else{
 const upcoming=await one(db,`SELECT b.id FROM bookings b JOIN customers cu ON cu.id=b.customer_id LEFT JOIN booking_holds h ON h.booking_id=b.id WHERE lower(cu.email)=$1 AND b.starts_at>now() AND (b.state='confirmed' OR (b.state='pending' AND h.expires_at>now())) LIMIT 1`,[c.email]);
 if(upcoming||String(task.anchor_at)!==String(c.last_visit_at)||Date.now()-new Date(task.created_at)>7*86400000){await db.query("UPDATE crm_messages SET state='skipped',last_error='Novo agendamento, atendimento recente ou lembrete vencido' WHERE id=$1",[task.id]);continue;}
 text=`Olá, ${c.name}! ${c.last_visit_at?'Já pensou em retocar seu bronze?':'Que tal reservar um momento para renovar seu bronze?'} A equipe R&R Bronzeamento espera por você. Consulte os horários e agende: ${env.APP_URL}/#agendar\nPara parar os lembretes dos dois canais: ${env.APP_URL}/preferencias#${c.unsubscribe_token}`;
 recipient=task.channel==='email'?c.email:c.phone;
 }
 if(task.channel==='whatsapp'){recipient=String(recipient).replace(/\D/g,'');if([10,11].includes(recipient.length))recipient='55'+recipient;requireValue(/^\d{12,15}$/.test(recipient),'WhatsApp inválido');requireValue(whatsapp?.whatsappReady(),'WhatsApp não configurado',503);}else requireValue(email.ready(),'E-mail não configurado',503);
 await db.query('UPDATE crm_messages SET recipient=$2,body=$3 WHERE id=$1',[task.id,recipient,text]);sending=true;
 const result=task.channel==='email'?await email.deliver(recipient,task.kind==='retouch'?'Seu próximo bronze · R&R Bronzeamento':'Agendamento confirmado — obrigado! · R&R Bronzeamento',text,task.dedupe_key):await whatsapp.whatsapp(recipient,text);
 await db.query("UPDATE crm_messages SET state='sent',sent_at=now(),provider_id=$2,last_error=null WHERE id=$1",[task.id,result?.id||null]);
 }catch(e){const definitive=!sending||[400,401,403,404,422,429].includes(e.providerStatus)||['EAUTH','EENVELOPE','EDNS','ECONNECTION'].includes(e.code);const retry=definitive&&task.attempts<4&&(!sending||e.providerStatus===429||['EDNS','ECONNECTION'].includes(e.code));await db.query("UPDATE crm_messages SET state=$2,last_error=$3,run_at=now()+interval '15 minutes' WHERE id=$1",[task.id,retry?'pending':definitive?'failed':'uncertain',String(e.message).slice(0,200)]);}
 }
}
