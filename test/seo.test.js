import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers.js';
import {app} from '../src/app.js';
test('HTML público e dados estruturados acompanham preços ativos, sem depender de JavaScript',async()=>{
 const f=await fixture();const env={APP_URL:'https://jr.example.invalid',CALENDAR_MODE:'internal',NODE_ENV:'production'};const {server}=app(f.db,{env,gateway:f.gateway,calendar:f.calendar,email:f.email});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 try{
 await f.db.query('UPDATE services SET name=$1,price_cents=36000 WHERE id=$2',['Sessão <especial> & cuidado',f.serviceId]);
 await f.db.query('INSERT INTO packages(service_id,name,price_cents,sessions,validity_days,active) VALUES($1,$2,97200,3,90,true)',[f.serviceId,'Pacote de 3 sessões']);
 let response=await fetch(base+'/'),html=await response.text();
 assert.equal(response.status,200);
 assert.ok(html.includes('class="procedure-grid"'));
 assert.ok(html.includes('Bronze Tradicional')&&html.includes('Bronze Express'));
 assert.ok(html.includes('href="/rr-refresh.css?v=procedimentos1"'));
 assert.ok(!html.includes('R$')&&!html.includes('Ruan Marcos')&&!html.includes('Rafaela Cristine'));
 const graph=JSON.parse(html.split('<script type="application/ld+json">')[1].split('</script>')[0])['@graph'];
 assert.equal(graph.find(x=>x.name==='Sessão <especial> & cuidado').offers,undefined);
 const catalog=await (await fetch(base+'/api/services')).json();
 assert.equal(Number(catalog.services.find(s=>s.id===f.serviceId).price_cents),36000);
 assert.equal(Number(catalog.packages.find(p=>p.service_id===f.serviceId).price_cents),97200);
 response=await fetch(base+'/index.html',{redirect:'manual'});assert.equal(response.status,301);assert.equal(response.headers.get('location'),'/');
 const robots=await (await fetch(base+'/robots.txt')).text();assert.ok(robots.includes('Sitemap: '+env.APP_URL+'/sitemap.xml'));assert.ok(robots.includes('Disallow: /primeiro-acesso'));
 const font=await fetch(base+'/assets/rr-dm-sans-0.woff2');assert.equal(font.status,200);assert.equal(font.headers.get('content-type'),'font/woff2');const localCss=await fetch(base+'/assets/rr-fonts.css?v=ssl2');assert.equal(localCss.status,200);assert.ok((await localCss.text()).includes('/assets/rr-playfair-display-1.woff2'));const image=await fetch(base+'/assets/jr-bronzeamento.webp');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await f.close();}
});

test('agendamento valida o público cadastrado e mantém o bloqueio de horários', async () => {
 const f=await fixture();
 const env={APP_URL:'http://localhost',CALENDAR_MODE:'internal',CALENDAR_REQUIRED:'false'};
 const {server}=app(f.db,{env,gateway:f.gateway,calendar:f.calendar,email:f.email});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const reserve=payload=>fetch(base+'/api/bookings',{
  method:'POST',headers:{'Content-Type':'application/json',Origin:env.APP_URL},body:JSON.stringify(payload)
 });
 try{
  const staff=(await f.db.query("SELECT id FROM staff WHERE name='Rafaela Cristine'")).rows[0];
  await f.db.query("UPDATE resources SET staff_id=$1,audience='feminino' WHERE id=$2",[staff.id,f.resource]);
  const catalog=await (await fetch(base+'/api/services')).json();
  const selected=catalog.services.find(service=>service.id===f.serviceId);
  assert.equal(selected.staff_id,staff.id);
  assert.equal(selected.audience,'feminino');
  const mismatch=await reserve({...f.input,gender:'masculino'});
  assert.equal(mismatch.status,400);
  const reservation=await reserve({...f.input,gender:'feminino'});
  assert.equal(reservation.status,201,await reservation.clone().text());
  const duplicate=await reserve({...f.input,gender:'feminino',token:'b'.repeat(64)});
  assert.equal(duplicate.status,409);
  const saved=(await f.db.query('SELECT service_id,resource_id FROM bookings WHERE resource_id=$1',[f.resource])).rows;
  assert.deepEqual(saved,[{service_id:f.serviceId,resource_id:f.resource}]);
  assert.equal(f.emails.length,0);
 }finally{
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
  await f.close();
 }
});
