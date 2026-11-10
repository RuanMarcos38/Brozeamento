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
 assert.equal(response.status,200);assert.ok(response.headers.get('content-security-policy').includes('upgrade-insecure-requests'));assert.equal(response.headers.get('strict-transport-security'),'max-age=31536000');assert.ok(html.includes('R$ 360,00'));assert.ok(html.includes('R$ 972,00'));assert.ok(html.includes('R$ 324,00'));assert.ok(html.includes('R$ 108,00'));assert.ok(html.includes('90 dias'));assert.ok(html.includes('Sessão &lt;especial&gt; &amp; cuidado'));
 assert.ok(!html.includes('https://fonts.googleapis.com'));assert.ok(!html.includes('https://fonts.gstatic.com'));assert.ok(html.includes('/assets/rr-fonts.css?v=ssl2'));assert.ok(!html.includes('taxa de deslocamento'));assert.ok(html.includes('Joinville'));assert.ok(html.includes('rel="canonical" href="'+env.APP_URL+'/"/>')||html.includes('rel="canonical" href="'+env.APP_URL+'/">'));
 const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);const service=data['@graph'].find(x=>x['@type']==='Service');assert.equal(service.offers[0].price,'360.00');assert.equal(service.offers[1].price,'972.00');assert.equal(service.areaServed.name,'Joinville');assert.equal((html.match(/<h1>/g)||[]).length,1);assert.equal((html.match(/data:image\/webp;base64,/g)||[]).length,5);
 await f.db.query('UPDATE services SET price_cents=40000 WHERE id=$1',[f.serviceId]);html=await (await fetch(base+'/')).text();assert.ok(html.includes('R$ 400,00'));assert.ok(!html.includes('R$ 360,00'));
 await f.db.query('UPDATE packages SET active=false');html=await (await fetch(base+'/')).text();assert.ok(!html.includes('R$ 972,00'));
 response=await fetch(base+'/index.html',{redirect:'manual'});assert.equal(response.status,301);assert.equal(response.headers.get('location'),'/');
 const robots=await (await fetch(base+'/robots.txt')).text();assert.ok(robots.includes('Sitemap: '+env.APP_URL+'/sitemap.xml'));assert.ok(robots.includes('Disallow: /primeiro-acesso'));
 const font=await fetch(base+'/assets/rr-dm-sans-0.woff2');assert.equal(font.status,200);assert.equal(font.headers.get('content-type'),'font/woff2');const localCss=await fetch(base+'/assets/rr-fonts.css?v=ssl2');assert.equal(localCss.status,200);assert.ok((await localCss.text()).includes('/assets/rr-playfair-display-1.woff2'));const image=await fetch(base+'/assets/jr-bronzeamento.webp');assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));await f.close();}
});
