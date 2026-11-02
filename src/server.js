import {connect} from './db.js';import {app} from './app.js';
if(!process.env.DATABASE_URL||!process.env.APP_URL)throw Error('Configure DATABASE_URL e APP_URL');
if(process.env.NODE_ENV==='production'&&!process.env.APP_URL.startsWith('https://'))throw Error('Produção requer HTTPS');
const db=await connect();const {server}=app(db);server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('JR disponível na porta '+(process.env.PORT||3000)));process.on('SIGTERM',()=>server.close(async()=>{await db.close();process.exit(0);}));
