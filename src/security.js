import { randomBytes, scryptSync, timingSafeEqual, createHash, createHmac } from 'node:crypto';
export const token=()=>randomBytes(32).toString('hex');
export const hash=x=>createHash('sha256').update(String(x)).digest('hex');
export function passwordHash(password){if(password.length<14)throw Error('Use pelo menos 14 caracteres');const salt=token();return salt+':'+scryptSync(password,salt,64).toString('hex');}
export function passwordMatches(password,stored){try{const [salt,h]=stored.split(':');return timingSafeEqual(Buffer.from(h,'hex'),scryptSync(password,salt,64));}catch{return false;}}
export function verifyWebhook(headers,id,secret,now=Date.now()){
 if(!secret||!id||!headers['x-request-id'])return false;
 const parts=Object.fromEntries(String(headers['x-signature']||'').split(',').map(x=>x.trim().split('=')));
 if(!/^\d+$/.test(parts.ts||'')||! /^[a-f0-9]{64}$/i.test(parts.v1||''))return false;
 const timestamp=Number(parts.ts);const ms=timestamp<1e12?timestamp*1000:timestamp;
 if(Math.abs(now-ms)>300000)return false;
 const manifest='id:'+String(id).toLowerCase()+';request-id:'+headers['x-request-id']+';ts:'+parts.ts+';';
 return timingSafeEqual(createHmac('sha256',secret).update(manifest).digest(),Buffer.from(parts.v1,'hex'));
}
export class HttpError extends Error{constructor(status,message){super(message);this.status=status;}}
export const requireValue=(ok,message,status=400)=>{if(!ok)throw new HttpError(status,message);};
export function customerInput(x){requireValue(typeof x.name==='string'&&x.name.trim().length>=2&&x.name.length<=120,'Informe seu nome');requireValue(typeof x.email==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x.email)&&x.email.length<=254,'Informe um e-mail válido');requireValue(typeof x.phone==='string'&&/^\+?[0-9 ()-]{10,25}$/.test(x.phone),'Informe um WhatsApp válido');requireValue(x.privacy===true,'Leia a política de privacidade');return {name:x.name.trim(),email:x.email.trim().toLowerCase(),phone:x.phone,reminder_consent:x.reminders===true};}
export const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);

export const receiptToken=(id,secret)=>createHmac('sha256',secret).update('booking:'+id).digest('hex');
