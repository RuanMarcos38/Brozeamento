import {one,all,audit} from './db.js';
import {requireValue} from './security.js';
const stages=['novo','primeiro_contato','em_analise','reuniao','proposta','negociacao','aprovado','descartado'];
const clean=(v,max=160)=>typeof v==='string'?v.trim().slice(0,max+1):'';
function field(v,max=160,min=2){const s=clean(v,max);requireValue(s.length>=min&&s.length<=max,'Confira os campos obrigatórios');return s;}
export async function createFranchiseInterest(db,x){
 requireValue(x&&typeof x==='object'&&!Array.isArray(x),'Dados inválidos');
 requireValue(x.website==null||x.website==='', 'Cadastro não aceito',400);
 requireValue(x.privacy===true,'Aceite a política de privacidade',400);
 const name=field(x.full_name),email=field(x.email,254,5).toLowerCase(),whatsapp=field(x.whatsapp,24,10),city=field(x.city,120),state=field(x.state,2,2).toUpperCase(),occupation=field(x.occupation);
 requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'E-mail inválido');
 requireValue(/^\+?[0-9 ()-]{10,24}$/.test(whatsapp),'WhatsApp inválido');
 requireValue(/^[A-Z]{2}$/.test(state),'Estado inválido');
 requireValue(['operar','investir','ambos'].includes(x.participation),'Escolha sua modalidade');
 const investment=field(x.investment_range||'Não informado',60,1),start=field(x.start_window,60,1);
 const experience=clean(x.experience,1200),comments=clean(x.comments,1500);
 requireValue(experience.length<=1200&&comments.length<=1500,'Texto excede o limite');
 return db.transaction(async db=>{const r=await one(db,`INSERT INTO franchise_leads(full_name,email,whatsapp,city,state,occupation,experience,participation,investment_range,start_window,comments,privacy_accepted_at,privacy_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),'2026-11-07') RETURNING id`,[name,email,whatsapp,city,state,occupation,experience,x.participation,investment,start,comments]);
 await db.query("INSERT INTO franchise_lead_history(lead_id,action,details) VALUES($1,'created','Cadastro de interesse enviado')",[r.id]);
 await db.query('UPDATE franchise_leads SET availability=$2 WHERE id=$1',[r.id,clean(x.availability,300)]);const settings=(await one(db,"SELECT value FROM settings WHERE key='booking'")).value;if(settings.notify_owner_email&&settings.owner_email)await db.query('INSERT INTO franchise_notifications(lead_id,recipient) VALUES($1,$2) ON CONFLICT DO NOTHING',[r.id,settings.owner_email]);
 return {received:true,reference:r.id};});
}
export async function franchiseAdminData(db,user,query={}){
 requireValue(['owner','manager'].includes(user.role),'Acesso restrito à gestão comercial',403);
 const state=clean(query.state,2).toUpperCase(),stage=clean(query.stage,32),city=clean(query.city,120);
 requireValue(!state||/^[A-Z]{2}$/.test(state),'Estado inválido');
 requireValue(!stage||stages.includes(stage),'Etapa inválida');
 const leads=await all(db,'SELECT * FROM franchise_leads WHERE ($1::text=\'\' OR state=$1) AND ($2::text=\'\' OR stage=$2) AND ($3::text=\'\' OR city ILIKE \'%\'||$3||\'%\') ORDER BY created_at DESC LIMIT 500',[state,stage,city]);
 const ids=leads.map(l=>l.id);
 const history=ids.length?await all(db,'SELECT * FROM franchise_lead_history WHERE lead_id=ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 2000',[ids]):[];
 const tasks=ids.length?await all(db,'SELECT * FROM franchise_tasks WHERE lead_id=ANY($1::uuid[]) ORDER BY created_at DESC LIMIT 1000',[ids]):[];
 return {stages,leads,history,tasks,users:await all(db,'SELECT id,email FROM users WHERE active ORDER BY email')};
}
export async function franchiseAdminWrite(db,user,x){
 requireValue(['owner','manager'].includes(user.role),'Acesso restrito à gestão comercial',403);
 requireValue(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(x?.id||''),'Lead inválido');
 const lead=await one(db,'SELECT id,stage FROM franchise_leads WHERE id=$1',[x.id]);requireValue(lead,'Lead não encontrado',404);
 if(x.action==='assign'){requireValue(!x.assigned_to||await one(db,'SELECT id FROM users WHERE id=$1 AND active',[x.assigned_to]),'Responsável inválido');await db.query('UPDATE franchise_leads SET assigned_to=$2,updated_at=now() WHERE id=$1',[lead.id,x.assigned_to||null]);await db.query("INSERT INTO franchise_lead_history(lead_id,actor_id,action,details) VALUES($1,$2,'assigned',$3)",[lead.id,user.id,x.assigned_to||'Sem responsável']);}
 else if(x.action==='stage'){
  requireValue(stages.includes(x.stage),'Etapa inválida');
  await db.query('UPDATE franchise_leads SET stage=$2,updated_at=now() WHERE id=$1',[lead.id,x.stage]);
  await db.query('INSERT INTO franchise_lead_history(lead_id,actor_id,action,details) VALUES($1,$2,$3,$4)',[lead.id,user.id,'stage',lead.stage+' → '+x.stage]);
 }else if(x.action==='note'){
  const note=field(x.note,2000,2);
  await db.query("INSERT INTO franchise_lead_history(lead_id,actor_id,action,details) VALUES($1,$2,'note',$3)",[lead.id,user.id,note]);
 }else if(x.action==='task'){
  const title=field(x.title,180,2);
  const due=x.due_at?new Date(x.due_at):null;
  requireValue(!due||!isNaN(due),'Data inválida');
  await db.query('INSERT INTO franchise_tasks(lead_id,title,due_at,actor_id) VALUES($1,$2,$3,$4)',[lead.id,title,due,user.id]);
 }else if(x.action==='complete_task'){
  requireValue(/^[0-9a-f-]{36}$/i.test(x.task_id||''),'Tarefa inválida');
  const t=await db.query('UPDATE franchise_tasks SET completed_at=now() WHERE id=$1 AND lead_id=$2 AND completed_at IS NULL RETURNING id',[x.task_id,lead.id]);
  requireValue(t.rows.length===1,'Tarefa já encerrada ou inexistente',404);
 }else requireValue(false,'Ação inválida');
 await audit(db,user.id,'franchise.'+x.action,lead.id);
 return {ok:true};
}

export async function franchiseJobs(db,email,env){
 if(!email.ready())return;
 await db.query("UPDATE franchise_notifications SET state='pending' WHERE state='processing' AND locked_at<now()-interval '10 minutes'");
 const tasks=await db.query("UPDATE franchise_notifications SET state='processing',locked_at=now(),attempts=attempts+1 WHERE lead_id IN (SELECT lead_id FROM franchise_notifications WHERE state='pending' AND run_at<=now() ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 10) RETURNING *");
 for(const task of tasks.rows){try{await email.deliver(task.recipient,'Novo interesse de expansão · R&R Bronzeamento','Um novo cadastro de interesse foi recebido. Consulte os dados e registre o próximo contato no painel privado: '+env.APP_URL+'/admin . Referência: '+task.lead_id,'franchise:'+task.lead_id);await db.query("UPDATE franchise_notifications SET state='sent',last_error=null WHERE lead_id=$1",[task.lead_id]);}catch{await db.query("UPDATE franchise_notifications SET state=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,run_at=now()+interval '5 minutes',last_error='Falha ao enviar aviso; confira a conexão SMTP' WHERE lead_id=$1",[task.lead_id]);}}
}

export async function franchiseExport(db,user){requireValue(user.role==='owner','Exportação exclusiva do proprietário',403);const data=await franchiseAdminData(db,user);const keys=['id','full_name','email','whatsapp','city','state','stage','availability','created_at'];const cell=x=>'"'+String(x??'').replace(/^(?=\s*[=+@-])/ ,"'").replaceAll('"','""')+'"';await audit(db,user.id,'franchise.export',null,{count:data.leads.length});return '\uFEFF'+[keys.map(cell).join(','),...data.leads.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');}
