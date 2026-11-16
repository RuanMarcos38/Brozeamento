// Run daily in the private server. Retention is explicitly configured before clinical activation.
import {connect} from '../src/db.js';
const db=await connect();try{const result=await db.query('DELETE FROM anamneses WHERE expires_at<=now()');console.log(JSON.stringify({event:'clinical_retention_applied',count:result.rowCount}));}finally{await db.close();}
