import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
import {one,all,audit} from './db.js';
import {requireValue,hash,uuid} from './security.js';
import {version,term,clothingNotice,questions} from '../public/anamnese-schema.js';
function key(env){requireValue(/^[a-f0-9]{64}$/i.test(env.ANAMNESIS_ENCRYPTION_KEY||''),'Ficha indisponível: a equipe precisa configurar o armazenamento privado.',503);return Buffer.from(env.ANAMNESIS_ENCRYPTION_KEY,'hex');}
export function clinicalReady(env){return /^[a-f0-9]{64}$/i.test(env.ANAMNESIS_ENCRYPTION_KEY||'')&&Number.isInteger(Number(env.ANAMNESIS_RETENTION_DAYS))&&Number(env.ANAMNESIS_RETENTION_DAYS)>0&&Number(env.ANAMNESIS_RETENTION_DAYS)<=3650;}
function encrypt(payload,env,aad){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key(env),iv);cipher.setAAD(Buffer.from(aad));const data=Buffer.concat([cipher.update(JSON.stringify(payload),'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64')).join('.');}
function decrypt(value,env,aad){const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64'));const cipher=createDecipheriv('aes-256-gcm',key(env),iv);cipher.setAAD(Buffer.from(aad));cipher.setAuthTag(tag);return JSON.parse(Buffer.concat([cipher.update(data),cipher.final()]).toString());}
export async function clinicalBooking(db,bearer){requireValue(/^[a-f0-9]{64}$/.test(bearer||''),'Reserva não encontrada',404);const b=await one(db,'SELECT b.*,c.name,c.email,c.phone,r.staff_id,r.audience,st.name professional_name,s.anamnesis_required FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN resources r ON r.id=b.resource_id LEFT JOIN staff st ON st.id=r.staff_id JOIN services s ON s.id=b.service_id WHERE b.token_hash=$1 OR b.receipt_token_hash=$1',[hash(bearer)]);requireValue(b,'Reserva não encontrada',404);return b;}
export function validateClinical(x,b){
 requireValue(x.version===version&&x.accepted===true&&x.health_consent===true,'Leia e aceite o termo e o tratamento de dados de saúde.');
 const data={};for(const name of ['name','sex','birth_date','phone','email','profession','phototype','location','clothing','evaluation_date']){requireValue(typeof x[name]==='string'&&x[name].trim().length>0&&x[name].length<=254,'Preencha o campo '+name);data[name]=x[name].trim();}
 requireValue(['MASC','FEM'].includes(data.sex)&&/^[1-6]$/.test(data.phototype),'Sexo ou fototipo inválido');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
 for(const field of ['birth_date','evaluation_date'])requireValue(/^\d{4}-\d{2}-\d{2}$/.test(data[field])&&!isNaN(Date.parse(data[field]))&&new Date(data[field]).toISOString().slice(0,10)===data[field]&&data[field]<=today,'Data inválida');
 requireValue(data.birth_date>='1900-01-01'&&data.evaluation_date===today,'Confira as datas da ficha');
 requireValue(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)&&data.phone.replace(/\D/g,'').length>=10,'Confira telefone e e-mail');
 const choices=b.audience==='feminino'?['Sem biquíni *NUA','Biquíni de Tecido','Biquíni de Fita']:['A definir com o profissional antes do atendimento'];
 requireValue(choices.includes(data.clothing),'Vestimenta inválida');
 data.answers={};for(const [id,,detail,options] of questions){const answer=x.answers?.[id];requireValue((options||['SIM','NÃO']).includes(answer?.value),'Responda todas as perguntas da ficha.');data.answers[id]={value:answer.value};if(detail&&answer.value==='SIM'){requireValue(typeof answer.detail==='string'&&answer.detail.trim().length>0&&answer.detail.length<=500,'Complete os detalhes das respostas SIM.');if(id==='pressure')requireValue(['ALTA','BAIXA'].includes(answer.detail),'Informe ALTA ou BAIXA');if(id==='pregnancy')requireValue(/^\d{1,2}$/.test(answer.detail)&&Number(answer.detail)>=1&&Number(answer.detail)<=45,'Informe as semanas de gestação');data.answers[id].detail=answer.detail.trim();}}
 const typed=typeof x.typed_signature==='string'?x.typed_signature.trim():'';if(typed){requireValue(typed===data.name&&typed.length>=3&&typed.length<=120,'A assinatura digitada deve corresponder ao nome completo.');x.signature=[];}else {requireValue(Array.isArray(x.signature)&&x.signature.length>0&&x.signature.length<=100,'Assine a ficha.');let points=0;for(const stroke of x.signature){requireValue(Array.isArray(stroke)&&stroke.length>=2&&stroke.length<=2000,'Assinatura inválida');points+=stroke.length;for(const p of stroke)requireValue(Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&n>=0&&n<=1),'Assinatura inválida');}requireValue(points>=3&&points<=4000,'Assinatura inválida');}
 return {...data,signature:x.signature,typed_signature:typed,version,term,clothingNotice,accepted:true,health_consent:true};
}
export async function saveClinical(db,env,bearer,x){requireValue(clinicalReady(env),'Ficha indisponível: configure criptografia e retenção.',503);const b=await clinicalBooking(db,bearer);requireValue(b.staff_id,'A reserva precisa estar vinculada a um profissional.',409);requireValue(['pending','confirmed'].includes(b.state),'Esta reserva não aceita atualização de ficha.',409);const payload=validateClinical(x,b);return db.transaction(async tx=>{const current=await one(tx,'SELECT id,state FROM bookings WHERE id=$1 FOR UPDATE',[b.id]);requireValue(['pending','confirmed'].includes(current.state),'Esta reserva não aceita atualização de ficha.',409);const latest=await one(tx,'SELECT revision,digest FROM anamneses WHERE booking_id=$1 ORDER BY revision DESC LIMIT 1',[b.id]);requireValue(Number(x.previous_revision||0)===(latest?.revision||0),'A ficha foi atualizada. Recarregue antes de assinar novamente.',409);const revision=(latest?.revision||0)+1,digest=createHash('sha256').update(JSON.stringify(payload)).digest('hex');const row=await one(tx,"INSERT INTO anamneses(booking_id,customer_id,staff_id,revision,version,encrypted_payload,digest,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,now()+$8::int*interval '1 day') RETURNING id,revision,accepted_at",[b.id,b.customer_id,b.staff_id,revision,version,encrypt(payload,env,b.id+':'+revision),digest,Number(env.ANAMNESIS_RETENTION_DAYS)]);await audit(tx,null,'anamnesis.signed',row.id,{revision});return {...row,digest};});}
export async function readClinical(db,env,b,{user=null,id=null}={}){
 let row;if(user){requireValue(uuid(id),'Ficha inválida');row=await one(db,'SELECT a.* FROM anamneses a WHERE a.id=$1 AND ( $2::boolean OR EXISTS(SELECT 1 FROM clinical_access ca WHERE ca.user_id=$3 AND ca.staff_id=a.staff_id))',[id,user.role==='owner',user.id]);requireValue(row,'Ficha não encontrada ou acesso não autorizado',404);}else row=await one(db,'SELECT * FROM anamneses WHERE booking_id=$1 ORDER BY revision DESC LIMIT 1',[b.id]);
 if(!row)return null;requireValue(new Date(row.expires_at)>new Date(),'Prazo de retenção da ficha encerrado',410);const payload=decrypt(row.encrypted_payload,env,row.booking_id+':'+row.revision);await audit(db,user?.id,'anamnesis.read',row.id);return {id:row.id,booking_id:row.booking_id,revision:row.revision,accepted_at:row.accepted_at,digest:row.digest,payload};
}
const reviewFields = new Set([
 'respiratory', 'pressure', 'epilepsy', 'degenerative', 'allergies', 'wounds',
 'bruises', 'medication', 'pregnancy', 'vitiligo', 'psoriasis', 'fasting', 'sweating'
]);

export function clinicalReview(payload) {
 const alerts=[];
 for(const [id,label,detail,options] of questions){
  const answer=payload.answers?.[id];
  if(!(options||['SIM','NÃO']).includes(answer?.value) ||
   (detail && answer.value==='SIM' && (typeof answer.detail!=='string'||!answer.detail.trim()))){
   alerts.push('Resposta incompleta ou inválida — '+label);
  }else if((reviewFields.has(id)&&answer.value==='SIM') ||
   (id==='depilation'&&answer.value==='SIM*menos 48h')){
   alerts.push(label);
  }
 }
 return alerts;
}

async function latestClinical(db,bookingId){
 return one(db,`SELECT a.*, a.expires_at>now() AS current,
  EXISTS(SELECT 1 FROM audit_logs l WHERE l.action='anamnesis.reviewed' AND l.entity_id=a.id::text) AS reviewed
  FROM anamneses a WHERE a.booking_id=$1 ORDER BY a.revision DESC LIMIT 1`,[bookingId]);
}

function verifiedClinical(row,env){
 requireValue(row?.current,'Ficha ausente ou vencida. Solicite uma ficha válida antes do atendimento.',409);
 try{
  return decrypt(row.encrypted_payload,env,row.booking_id+':'+row.revision);
 }catch{
  requireValue(false,'Ficha indisponível para conferência.',409);
 }
}

export async function recordClinicalReview(db,env,user,{id,reviewed}){
 requireValue(uuid(id)&&reviewed===true,'Confirme a conferência da ficha.');
 return db.transaction(async tx=>{
  const booking=await one(tx,`SELECT b.id FROM bookings b JOIN anamneses a ON a.booking_id=b.id
   WHERE a.id=$1 AND ($2::boolean OR EXISTS(SELECT 1 FROM clinical_access ca WHERE ca.user_id=$3 AND ca.staff_id=a.staff_id))
   FOR UPDATE OF b`,[id,user.role==='owner',user.id]);
  requireValue(booking&&user.role!=='viewer','Ficha não encontrada ou acesso não autorizado',404);
  const row=await latestClinical(tx,booking.id);
  requireValue(row?.id===id,'Abra a versão mais recente da ficha.',409);
  const payload=verifiedClinical(row,env);
  requireValue(!clinicalReview(payload).some(alert=>alert.startsWith('Resposta incompleta ou inválida')),'Solicite uma nova ficha com todas as respostas completas.',409);
  if(!row.reviewed)await audit(tx,user.id,'anamnesis.reviewed',id);
  return {ok:true};
 });
}

export async function requireClinicalReview(db,env,bookingId){
 const row=await latestClinical(db,bookingId);
 verifiedClinical(row,env);
 requireValue(row.reviewed,'A versão atual da ficha precisa ser conferida antes de registrar o atendimento.',409);
}

export async function listClinical(db,user,{env,customerIds=null}={}){
 const forms=await all(db,`
  SELECT a.id,a.booking_id,a.customer_id,a.revision,a.accepted_at,c.name,st.name professional_name
  ${env ? `,a.encrypted_payload, EXISTS(SELECT 1 FROM audit_logs l WHERE l.action='anamnesis.reviewed' AND l.entity_id=a.id::text) AS reviewed` : ''}
  FROM anamneses a JOIN customers c ON c.id=a.customer_id JOIN staff st ON st.id=a.staff_id
  WHERE a.expires_at>now()
   AND ($1::boolean OR EXISTS(SELECT 1 FROM clinical_access ca WHERE ca.user_id=$2 AND ca.staff_id=a.staff_id))
   AND ($3::uuid[] IS NULL OR a.customer_id=ANY($3))
   AND ($3::uuid[] IS NULL OR NOT EXISTS (
    SELECT 1 FROM anamneses newer WHERE newer.booking_id=a.booking_id AND newer.revision>a.revision
   ))
  ORDER BY a.accepted_at DESC ${customerIds===null?'LIMIT 500':''}`,[user.role==='owner',user.id,customerIds]);
 return {forms:forms.map(({encrypted_payload,...form})=>{
  if(!env)return form;
  try {
   const payload=decrypt(encrypted_payload,env,form.booking_id+':'+form.revision);
   return {...form,name:payload.name||form.name,review:clinicalReview(payload).length?'review':'required'};
  } catch {
   return {...form,review:'unavailable'};
  }
 })};
}
export async function clinicalPDF(record){
 const {PDFDocument,StandardFonts,rgb}=await import('pdf-lib');const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);let page,y;const add=()=>{page=pdf.addPage([595,842]);y=790;};add();
 const text=(value,size=10)=>{const safe=String(value).replace(/[^\u0020-\u00ff\n]/g,' ');let line='';for(const word of safe.split(/\s+/)){if(font.widthOfTextAtSize(line+' '+word,size)>490){if(y<65)add();page.drawText(line,{x:48,y,size,font});y-=17;line='';}line+=(line?' ':'')+word;}if(y<65)add();page.drawText(line,{x:48,y,size,font});y-=22;};
 text('R&R BRONZEAMENTO',18);text('FICHA DE ANAMNESE - BRONZEAMENTO A JATO',13);const p=record.payload;
 const names={evaluation_date:'Data da avaliação',name:'Nome',sex:'Sexo',birth_date:'Data de nascimento',phone:'Telefone',email:'E-mail',profession:'Profissão',phototype:'Fototipo',location:'Local',clothing:'Vestimenta'};
 for(const [field,label]of Object.entries(names))text(label+': '+p[field]);for(const [id,label]of questions)text(label+' '+(p.answers?.[id]?.value||'Não informado')+(p.answers?.[id]?.detail?' - '+p.answers[id].detail:''));text(clothingNotice);text('TERMO DE RESPONSABILIDADE',13);text(p.term);text('Aceite do termo e consentimento para tratamento de dados de saúde registrados.');if(y<180)add();text('Assinatura eletrônica:');if(p.typed_signature)text(p.typed_signature,16);const top=y;for(const stroke of p.signature)for(let i=1;i<stroke.length;i++)page.drawLine({start:{x:48+stroke[i-1][0]*450,y:top-stroke[i-1][1]*100},end:{x:48+stroke[i][0]*450,y:top-stroke[i][1]*100},thickness:1.2,color:rgb(.15,.1,.08)});y-=125;text('Reserva: '+record.booking_id);text('Versão: '+p.version+' | Revisão: '+record.revision+' | Aceite: '+new Date(record.accepted_at).toISOString());text('SHA-256: '+record.digest,8);return Buffer.from(await pdf.save());
}
