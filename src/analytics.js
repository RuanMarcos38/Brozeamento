import {one,all} from './db.js';
import {requireValue} from './security.js';
export function analyticsRange(query={}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
 const from=query.from||new Date(new Date(today+'T12:00:00Z').getTime()-29*86400000).toISOString().slice(0,10),to=query.to||today;
 requireValue(/^\d{4}-\d{2}-\d{2}$/.test(from)&&/^\d{4}-\d{2}-\d{2}$/.test(to)&&!isNaN(Date.parse(from))&&!isNaN(Date.parse(to))&&from<=to,'Selecione um período válido');
 requireValue([from,to].every(d=>new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d),'Selecione datas existentes');
 const days=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;requireValue(days<=366,'Consulte até 366 dias por vez');
 const previousTo=new Date(Date.parse(from)-86400000).toISOString().slice(0,10),previousFrom=new Date(Date.parse(from)-days*86400000).toISOString().slice(0,10);
 return {from,to,days,previousFrom,previousTo};
}
export async function dashboardData(db,query={}){
 const range=analyticsRange(query),values=[range.from,range.to];
 const bookingWindow="starts_at >= ($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND starts_at < (($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')";
 const paymentWindow="approved_at >= ($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND approved_at < (($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')";
 const [summary,finance,previous,trend,states,services,upcoming,customers,jobs,conflicts,settings,operations,legacyAlerts]=await Promise.all([
 one(db,"SELECT count(*)::int total,count(*) FILTER(WHERE state='confirmed')::int confirmed,count(*) FILTER(WHERE state='pending')::int pending,count(*) FILTER(WHERE state='expired')::int expired,count(*) FILTER(WHERE state='cancelled')::int cancelled,count(*) FILTER(WHERE state='refunded')::int refunded,count(*) FILTER(WHERE state='conflict')::int conflict,count(*) FILTER(WHERE attendance='completed')::int completed,count(*) FILTER(WHERE attendance='no_show')::int no_show FROM bookings WHERE "+bookingWindow,values),
 one(db,"SELECT COALESCE(sum(amount_cents),0) gross,COALESCE(sum(fee_cents),0) fees,count(*)::int payments FROM payments WHERE status='approved' AND "+paymentWindow,values),
 one(db,"SELECT COALESCE(sum(amount_cents),0) gross FROM payments WHERE status='approved' AND "+paymentWindow,[range.previousFrom,range.previousTo]),
 all(db,"SELECT (approved_at AT TIME ZONE 'America/Sao_Paulo')::date::text AS report_day,sum(amount_cents) gross FROM payments WHERE status='approved' AND "+paymentWindow+" GROUP BY 1 ORDER BY 1",values),
 all(db,"SELECT state,count(*)::int count FROM bookings WHERE "+bookingWindow+" GROUP BY state",values),
 all(db,"WITH b AS (SELECT service_id,count(*)::int bookings,count(*) FILTER(WHERE state='confirmed')::int confirmed FROM bookings WHERE "+bookingWindow+" GROUP BY service_id),p AS (SELECT b.service_id,sum(p.amount_cents) gross FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.status='approved' AND p."+paymentWindow+" GROUP BY b.service_id) SELECT s.name,COALESCE(b.bookings,0) bookings,COALESCE(b.confirmed,0) confirmed,COALESCE(p.gross,0) gross FROM services s LEFT JOIN b ON b.service_id=s.id LEFT JOIN p ON p.service_id=s.id WHERE COALESCE(b.bookings,0)>0 OR COALESCE(p.gross,0)>0 ORDER BY COALESCE(p.gross,0) DESC,COALESCE(b.bookings,0) DESC LIMIT 10",values),
 all(db,"SELECT b.id,b.service_name,b.starts_at,b.state,b.parent_booking_id,c.name customer_name,r.name resource_name FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN resources r ON r.id=b.resource_id JOIN booking_holds h ON h.booking_id=b.id WHERE b.starts_at>now() AND (b.state='confirmed' OR (b.state='pending' AND h.expires_at>now())) ORDER BY b.starts_at LIMIT 8"),
 one(db,"WITH first_seen AS (SELECT lower(email) email,min(created_at) first_at FROM customers GROUP BY lower(email)),attended AS (SELECT DISTINCT lower(c.email) email FROM bookings b JOIN customers c ON c.id=b.customer_id WHERE b.state='confirmed' AND b."+bookingWindow+") SELECT (SELECT count(*)::int FROM first_seen WHERE first_at>=($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo') AND first_at<(($2::date+1)::timestamp AT TIME ZONE 'America/Sao_Paulo')) new_customers,(SELECT count(*)::int FROM attended) served,(SELECT count(*)::int FROM attended a WHERE EXISTS(SELECT 1 FROM bookings b JOIN customers c ON c.id=b.customer_id WHERE lower(c.email)=a.email AND b.state='confirmed' AND b.starts_at<($1::date::timestamp AT TIME ZONE 'America/Sao_Paulo'))) returning_customers",values),
 all(db,"SELECT kind,state,count(*)::int count FROM notifications GROUP BY kind,state"),
 all(db,"SELECT id,service_name,starts_at,state FROM bookings WHERE state='conflict' ORDER BY starts_at LIMIT 20"),
 one(db,"SELECT value FROM settings WHERE key='booking'"),
 one(db,"SELECT (SELECT count(*)::int FROM bookings b JOIN booking_holds h ON h.booking_id=b.id WHERE b.state='pending' AND h.expires_at>now()) active_holds,(SELECT count(*)::int FROM calendar_blocks WHERE ends_at>now()) future_blocks,(SELECT count(*)::int FROM notifications WHERE kind IN ('owner_email','owner_whatsapp') AND state='failed') failed_alerts,(SELECT count(*)::int FROM bookings WHERE state='confirmed' AND (starts_at AT TIME ZONE 'America/Sao_Paulo')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date) today,(SELECT count(*)::int FROM bookings WHERE state='confirmed' AND starts_at >= (date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo') AND starts_at < ((date_trunc('week',now() AT TIME ZONE 'America/Sao_Paulo')+interval '7 days') AT TIME ZONE 'America/Sao_Paulo')) week"),
 all(db,"SELECT action,entity_id,created_at FROM audit_logs WHERE action IN ('payment.duplicate_requires_refund','payment.conflict') ORDER BY created_at DESC LIMIT 30")
 ]);
 return {range,summary:{...summary,today:operations.today,week:operations.week},alerts:legacyAlerts,finance,previous,trend:trend.map(({report_day,gross})=>({day:report_day,gross})),states,services,upcoming,customers,jobs,conflicts,operations,agenda_open:settings.value.agenda_open!==false};
}
