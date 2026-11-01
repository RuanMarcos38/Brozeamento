import {hash,passwordHash,requireValue} from './security.js';
import {one,audit} from './db.js';
export async function setupAdmin(db,env,bearer,password){
 requireValue(typeof bearer==='string'&&/^[a-f0-9]{64}$/.test(bearer)&&hash(bearer)===env.FIRST_ADMIN_SETUP_TOKEN_HASH,'Link de primeiro acesso inválido',404);
 requireValue(env.FIRST_ADMIN_SETUP_EXPIRES_AT&&Date.parse(env.FIRST_ADMIN_SETUP_EXPIRES_AT)>Date.now(),'Link de primeiro acesso expirado',410);
 requireValue(typeof env.FIRST_ADMIN_EMAIL==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.FIRST_ADMIN_EMAIL),'E-mail administrativo não configurado',503);
 requireValue(typeof password==='string'&&password.length>=14&&password.length<=256,'Use uma senha de 14 a 256 caracteres');
 const encrypted=passwordHash(password);
 return db.transaction(async c=>{await c.query('SELECT pg_advisory_xact_lock(184728393)');const existing=await one(c,'SELECT count(*)::integer total FROM users');requireValue(existing.total===0,'O primeiro acesso já foi concluído. Entre no painel.',409);const user=await one(c,'INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id',[env.FIRST_ADMIN_EMAIL.toLowerCase(),encrypted]);await c.query("INSERT INTO admin_roles(user_id,role) VALUES($1,'owner')",[user.id]);await audit(c,user.id,'admin.initial_setup',user.id);return {ok:true};});
}
