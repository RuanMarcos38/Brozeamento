import {one,all} from './db.js';
import {requireValue,uuid} from './security.js';
import {analyticsRange} from './analytics.js';
const events=['page_view','booking_start','booking_complete','booking_female','booking_male','whatsapp_click','franchise_submit','heartbeat'];
const safe=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
export async function recordVisitorEvent(db,x){
 requireValue(x&&x.consent===true,'Consentimento necessário',403);
 requireValue(uuid(x.session),'Sessão inválida');
 requireValue(events.includes(x.name),'Evento inválido');
 const path=safe(x.path,100);requireValue(/^\/[a-z0-9/_-]*$/i.test(path),'Página inválida');
 const source=['google','instagram','facebook','direto','outro'].includes(x.source)?x.source:'outro';
 const device=['desktop','mobile','tablet','outro'].includes(x.device)?x.device:'outro';
 const utm=safe(x.utm_source,60).replace(/[^\w .-]/g,'');
 await db.transaction(async tx=>{
  await tx.query("INSERT INTO site_visitor_sessions(id,source,device) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET last_seen=now()",[x.session,source,device]);
  if(x.name!=='heartbeat')await tx.query('INSERT INTO site_analytics_events(session_id,name,path,utm_source) VALUES($1,$2,$3,$4)',[x.session,x.name,path,utm||null]);
 });
 return {accepted:true};
}
export async function visitorMetrics(db,user,query={}){
 requireValue(['owner','manager'].includes(user.role),'Acesso administrativo necessário',403);
 const range=analyticsRange(query),p=[range.from,range.to];
 const when="e.created_at >= ($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND e.created_at < (($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')";
 const [active,totals,sources,pages,trend,devices,utm]=await Promise.all([
  one(db,"SELECT count(*)::int n FROM site_visitor_sessions WHERE last_seen >= now()-interval '5 minutes'"),
  one(db,`SELECT count(*) FILTER(WHERE e.name='page_view')::int page_views,count(DISTINCT e.session_id) FILTER(WHERE e.name='page_view')::int unique_visitors,count(*) FILTER(WHERE e.name='booking_start')::int bookings_started,count(*) FILTER(WHERE e.name='booking_complete')::int bookings_completed,count(*) FILTER(WHERE e.name='booking_female')::int female_clicks,count(*) FILTER(WHERE e.name='booking_male')::int male_clicks,count(*) FILTER(WHERE e.name='whatsapp_click')::int whatsapp_clicks,count(*) FILTER(WHERE e.name='franchise_submit')::int franchise_submissions FROM site_analytics_events e WHERE ${when}`,p),
  all(db,`SELECT s.source,count(DISTINCT e.session_id)::int visitors FROM site_analytics_events e JOIN site_visitor_sessions s ON s.id=e.session_id WHERE ${when} AND e.name='page_view' GROUP BY s.source ORDER BY visitors DESC`,p),
  all(db,`SELECT e.path,count(*)::int views FROM site_analytics_events e WHERE ${when} AND e.name='page_view' GROUP BY e.path ORDER BY views DESC LIMIT 30`,p),
  all(db,`SELECT (e.created_at AT TIME ZONE 'America/Sao_Paulo')::date::text AS "day",count(DISTINCT e.session_id)::int visitors FROM site_analytics_events e WHERE ${when} AND e.name='page_view' GROUP BY 1 ORDER BY 1`,p),
  all(db,`SELECT s.device,count(DISTINCT e.session_id)::int visitors FROM site_analytics_events e JOIN site_visitor_sessions s ON s.id=e.session_id WHERE ${when} AND e.name='page_view' GROUP BY s.device ORDER BY visitors DESC`,p),
  all(db,`SELECT e.utm_source,count(DISTINCT e.session_id)::int visitors FROM site_analytics_events e WHERE ${when} AND e.utm_source IS NOT NULL GROUP BY e.utm_source ORDER BY visitors DESC LIMIT 25`,p)
 ]);
 const commercial=await all(db,`SELECT st.name professional_name,
 (SELECT count(*)::int FROM bookings b JOIN resources r ON r.id=b.resource_id WHERE r.staff_id=st.id AND b.created_at>=($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND b.created_at<(($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo') AND b.parent_booking_id IS NULL) reservations,
 (SELECT count(*)::int FROM bookings b JOIN resources r ON r.id=b.resource_id WHERE r.staff_id=st.id AND b.state='confirmed' AND b.parent_booking_id IS NULL AND b.created_at>=($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND b.created_at<(($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')) confirmed,
 (SELECT COALESCE(sum(p.amount_cents),0)::bigint FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN resources r ON r.id=b.resource_id WHERE r.staff_id=st.id AND p.status='approved' AND COALESCE(p.approved_at,p.updated_at)>=($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND COALESCE(p.approved_at,p.updated_at)<(($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')) revenue
 FROM staff st WHERE st.active ORDER BY st.name`,p);
 return {commercial,range,active:active.n,totals:{...totals,conversion_rate:totals.bookings_started?Number((100*totals.bookings_completed/totals.bookings_started).toFixed(2)):0},sources,pages,trend,devices,utm};
}
