import {connect} from './db.js';
import {app} from './app.js';
const env=process.env;
if(!env.DATABASE_URL||!env.APP_URL)throw Error('Configure DATABASE_URL e APP_URL privados no Easypanel');
const origin=new URL(env.APP_URL);if(origin.protocol!=='https:'||origin.origin!==env.APP_URL)throw Error('APP_URL deve ser a origem HTTPS exata, sem barra final');
if(env.RUN_MIGRATIONS==='true')await import('../scripts/migrate.js');
const db=await connect();await db.query('SELECT 1');
if(env.BOOTSTRAP_COMMERCIAL==='true'&&(await db.query('SELECT count(*)::integer total FROM services')).rows[0].total===0)await import('../scripts/configure-commercial.js');
const {server,service}=app(db);let stopping=false;let active=null;
const tick=()=>{if(stopping||active)return;active=(async()=>{try{await service.jobs();await db.query('DELETE FROM rate_limits WHERE resets_at<now()');await db.query('DELETE FROM sessions WHERE expires_at<now()');}catch(e){console.error(JSON.stringify({event:'worker_error',message:e.message}));}finally{active=null;}})();};
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(env.PORT||3000),'0.0.0.0',resolve);});
const timer=setInterval(tick,15000);timer.unref();tick();console.log('JR: frontend, API e worker iniciados na porta '+(env.PORT||3000));
async function shutdown(){if(stopping)return;stopping=true;clearInterval(timer);server.closeIdleConnections();await new Promise(r=>server.close(r));if(active)await active;await db.close();process.exit(0);}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
