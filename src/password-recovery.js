import {randomBytes,randomUUID,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {hash,passwordHash,requireValue,uuid} from './security.js';
import {audit,one} from './db.js';
export const recoveryMessage='Se houver uma conta ativa com esse e-mail, você receberá um link para criar uma nova senha. Confira também a pasta de spam. O link vale por 15 minutos.';
export class PasswordRecovery{
 constructor(db,env,email){Object.assign(this,{db,env,email});}
 ready(){return (!(this.env.SMTP_HOST||this.env.SMTP_USER)||!!(this.env.SMTP_HOST&&this.env.SMTP_USER&&this.env.SMTP_PASSWORD))&&this.email.ready()&&typeof this.email.deliver==='function'&&String(this.env.EMAIL_LOOKUP_SECRET||'').length>=32&&/^https:\/\//.test(this.env.APP_URL||'');}
 key(){return createHash('sha256').update('rr-password-recovery:'+this.env.EMAIL_LOOKUP_SECRET).digest();}
 seal(value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key(),iv);const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return [iv,cipher.getAuthTag(),encrypted].map(x=>x.toString('base64')).join('.');}
 open(value){const [iv,tag,data]=value.split('.').map(x=>Buffer.from(x,'base64'));const decipher=createDecipheriv('aes-256-gcm',this.key(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');}
 async request(input){
  const email=String(input.email||'').trim().toLowerCase();requireValue(email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Informe um e-mail válido');
  requireValue(this.ready(),'A recuperação por e-mail ainda não está disponível. O administrador precisa concluir a configuração de envio.',503);
  const key=hash('password-recovery:'+email);const quota=await one(this.db,"INSERT INTO rate_limits(key,count,resets_at) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.resets_at<now() THEN 1 ELSE rate_limits.count+1 END,resets_at=CASE WHEN rate_limits.resets_at<now() THEN now()+interval '1 hour' ELSE rate_limits.resets_at END RETURNING count",[key]);
  const secret=randomBytes(32).toString('hex'),id=randomUUID(),encrypted=this.seal(secret);
  if(quota.count<=3)await this.db.query("INSERT INTO password_resets(id,user_id,email,token_hash,delivery_secret) SELECT $1,u.id,u.email,$3,$4 FROM users u JOIN admin_roles r ON r.user_id=u.id WHERE lower(u.email)=$2 AND u.active",[id,email,hash(secret),encrypted]);
  return {message:recoveryMessage};
 }
 async reset(input){
  requireValue(uuid(input.id)&&typeof input.token==='string'&&/^[a-f0-9]{64}$/.test(input.token),'Link inválido ou expirado. Solicite uma nova recuperação.');
  requireValue(typeof input.password==='string'&&input.password.length>=14&&input.password.length<=256,'Use uma senha de 14 a 256 caracteres');
  requireValue(input.password===input.confirm_password,'As senhas precisam ser iguais');
  const nextHash=passwordHash(input.password);
  return this.db.transaction(async tx=>{
   const candidate=await one(tx,'SELECT user_id FROM password_resets WHERE id=$1',[input.id]);requireValue(candidate,'Link inválido ou expirado. Solicite uma nova recuperação.');
   const user=await one(tx,'SELECT id,email,active FROM users WHERE id=$1 FOR UPDATE',[candidate.user_id]);
   const reset=await one(tx,'SELECT * FROM password_resets WHERE id=$1 AND token_hash=$2 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[input.id,hash(input.token)]);
   requireValue(user?.active&&reset&&reset.email===user.email,'Link inválido ou expirado. Solicite uma nova recuperação.');
   await tx.query('UPDATE users SET password_hash=$1 WHERE id=$2',[nextHash,user.id]);
   await tx.query("UPDATE password_resets SET used_at=now(),delivery_secret=NULL,delivery_state=CASE WHEN delivery_state IN ('pending','processing') THEN 'skipped' ELSE delivery_state END ,change_notified_at=CASE WHEN id=$2 THEN NULL ELSE now() END WHERE user_id=$1 AND used_at IS NULL",[user.id,input.id]);
   await tx.query('DELETE FROM sessions WHERE user_id=$1',[user.id]);
   await audit(tx,user.id,'admin.password_reset',input.id);
   return {message:'Senha atualizada. Entre no painel com sua nova senha.'};
  });
 }
 async jobs(){
  if(!this.ready())return;
  await this.db.query("UPDATE password_resets SET delivery_secret=NULL,delivery_state='skipped' WHERE expires_at<=now() AND delivery_state IN ('pending','processing')");
  const rows=(await this.db.query("UPDATE password_resets SET delivery_state='processing',locked_at=now(),attempts=attempts+1 WHERE id IN (SELECT id FROM password_resets WHERE used_at IS NULL AND expires_at>now() AND next_attempt_at<=now() AND (delivery_state='pending' OR (delivery_state='processing' AND locked_at<now()-interval '2 minutes')) ORDER BY created_at LIMIT 5 FOR UPDATE SKIP LOCKED) RETURNING *")).rows;
  for(const row of rows){try{
   const user=await one(this.db,'SELECT email,active FROM users WHERE id=$1',[row.user_id]);
   if(!user?.active||user.email!==row.email){await this.db.query("UPDATE password_resets SET delivery_state='skipped',delivery_secret=NULL WHERE id=$1",[row.id]);continue;}
   const secret=this.open(row.delivery_secret),link=new URL('/admin/redefinir-senha',this.env.APP_URL);link.hash=new URLSearchParams({id:row.id,token:secret}).toString();
   await this.email.deliver(row.email,'Redefinir sua senha · R&R Bronzeamento','Foi solicitada uma nova senha para o painel da R&R Bronzeamento.\n\nCrie sua nova senha pelo link privado abaixo. Ele tem uso único e expira 15 minutos após a solicitação:\n'+link.href+'\n\nSe você não fez essa solicitação, ignore este e-mail. Sua senha atual continua válida. Nunca compartilhe este link ou sua senha.','password-reset:'+row.id);
   await this.db.query("UPDATE password_resets SET delivery_state='sent',delivery_secret=NULL,locked_at=NULL WHERE id=$1",[row.id]);
  }catch{
   await this.db.query("UPDATE password_resets SET delivery_state=$2,next_attempt_at=now()+interval '30 seconds'*$3,locked_at=NULL,delivery_secret=CASE WHEN $2='failed' THEN NULL ELSE delivery_secret END WHERE id=$1",[row.id,row.attempts>=5?'failed':'pending',2**row.attempts]);
   console.error(JSON.stringify({event:'password_recovery_delivery_failed',id:row.id}));
  }}
  const changed=(await this.db.query("SELECT p.id,p.email,p.user_id FROM password_resets p JOIN users u ON u.id=p.user_id AND u.email=p.email WHERE p.used_at IS NOT NULL AND p.change_notified_at IS NULL AND u.active ORDER BY p.used_at LIMIT 5")).rows;
  for(const row of changed){try{await this.email.deliver(row.email,'Sua senha foi alterada · R&R Bronzeamento','A senha do seu painel R&R Bronzeamento foi alterada. As sessões anteriores foram encerradas. Se não foi você, entre em contato com a equipe imediatamente. Não compartilhe sua senha.','password-changed:'+row.id);await this.db.query('UPDATE password_resets SET change_notified_at=now() WHERE id=$1',[row.id]);}catch{console.error(JSON.stringify({event:'password_change_notice_failed',id:row.id}));}}
  await this.db.query("DELETE FROM password_resets WHERE expires_at<now()-interval '7 days'");
 }
}
