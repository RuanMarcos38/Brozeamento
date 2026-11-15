import {customerCRMJobs} from './customer-crm.js';
import {franchiseJobs} from './franchise.js';
import {randomBytes} from 'node:crypto';
import {access,readFile,writeFile,link,unlink} from 'node:fs/promises';
import {connect} from './db.js';
import {app} from './app.js';
const env=process.env;
if(!env.DATABASE_URL||!env.APP_URL)throw Error('Configure DATABASE_URL e APP_URL privados no Easypanel');
const origin=new URL(env.APP_URL);if(origin.protocol!=='https:'||origin.origin!==env.APP_URL)throw Error('APP_URL deve ser a origem HTTPS exata, sem barra final');
if(env.RUN_MIGRATIONS==='true')await import('../scripts/migrate.js');
const db=await connect();await db.query('SELECT 1');
const clinicalDirectory='/var/lib/rr-anamnese';
const hasClinicalStorage=await access(clinicalDirectory).then(()=>true,error=>{
 if(error.code==='ENOENT')return false;
 throw error;
});
if(hasClinicalStorage){
 if(!env.ANAMNESIS_ENCRYPTION_KEY){
  const keyPath=clinicalDirectory+'/encryption.key';
  const existingKey=await readFile(keyPath,'utf8').catch(error=>{
   if(error.code==='ENOENT')return null;
   throw error;
  });
  if(existingKey===null){
   const existingForms=(await db.query('SELECT 1 FROM anamneses LIMIT 1')).rows.length;
   if(existingForms)throw Error('Restaure a chave original das fichas antes de ativar a anamnese');
   const temporary=keyPath+'.'+randomBytes(12).toString('hex');
   await writeFile(temporary,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});
   try{await link(temporary,keyPath);}catch(error){if(error.code!=='EEXIST')throw error;}
   finally{await unlink(temporary);}
  }
  env.ANAMNESIS_ENCRYPTION_KEY=(existingKey??await readFile(keyPath,'utf8')).trim();
  if(!/^[a-f0-9]{64}$/i.test(env.ANAMNESIS_ENCRYPTION_KEY))throw Error('Chave persistente de anamnese inválida');
 }
 env.ANAMNESIS_RETENTION_DAYS||='365';
}
if(env.BOOTSTRAP_COMMERCIAL==='true'&&(await db.query('SELECT count(*)::integer total FROM services')).rows[0].total===0)await import('../scripts/configure-commercial.js');
const {server,service,recovery}=app(db);let stopping=false;let active=null;
const tick=()=>{if(stopping||active)return;active=(async()=>{try{await customerCRMJobs(db,service.email,service.ownerAlerts,process.env);await service.jobs();await recovery.jobs();await franchiseJobs(db,service.email,process.env);await db.query('DELETE FROM rate_limits WHERE resets_at<now()');await db.query('DELETE FROM sessions WHERE expires_at<now()');await db.query("DELETE FROM site_analytics_events WHERE created_at<now()-interval '90 days'");await db.query("DELETE FROM site_visitor_sessions WHERE last_seen<now()-interval '90 days'");await db.query('DELETE FROM anamneses WHERE expires_at<=now()');}catch(e){console.error(JSON.stringify({event:'worker_error',message:e.message}));}finally{active=null;}})();};
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(env.PORT||3000),'0.0.0.0',resolve);});
const timer=setInterval(tick,15000);timer.unref();tick();console.log('JR: frontend, API e worker iniciados na porta '+(env.PORT||3000));
async function shutdown(){if(stopping)return;stopping=true;clearInterval(timer);server.closeIdleConnections();await new Promise(r=>server.close(r));if(active)await active;await db.close();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
