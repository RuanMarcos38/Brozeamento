export async function connect(){const {Pool}=await import('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:10000});return {query:(q,p)=>pool.query(q,p),transaction:async fn=>{const c=await pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}},close:()=>pool.end()};}
export const one=async(db,q,p=[])=>(await db.query(q,p)).rows[0];
export const all=async(db,q,p=[])=>(await db.query(q,p)).rows;
export const audit=(db,actor,action,id,details={})=>db.query('INSERT INTO audit_logs(actor_id,action,entity_id,details) VALUES($1,$2,$3,$4)',[actor||null,action,id,JSON.stringify(details)]);
