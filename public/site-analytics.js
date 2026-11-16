/* R&R: optional analytics. No cookies, form values, personal information or health fields are collected. */
(()=>{'use strict';
const key='rr_analytics_consent_v1';
const allowed=['page_view','booking_start','booking_complete','booking_female','booking_male','whatsapp_click','franchise_submit','heartbeat'];
let consent;
try{consent=localStorage.getItem(key);}catch{consent='no';}
function session(){let id=sessionStorage.getItem('rr_an_sid');if(!id){id=crypto.randomUUID();sessionStorage.setItem('rr_an_sid',id);}return id;}
function source(){const p=new URLSearchParams(location.search);const v=(p.get('utm_source')||'').toLowerCase();if(/google/.test(v))return 'google';if(/instagram|ig/.test(v))return 'instagram';if(/facebook|fb/.test(v))return 'facebook';if(v)return 'outro';let host='';try{host=new URL(document.referrer).hostname;}catch{}if(/google\./.test(host))return 'google';if(/instagram\./.test(host))return 'instagram';if(/facebook\.|fb\./.test(host))return 'facebook';return host?'outro':'direto';}
function device(){const w=innerWidth;return w<700?'mobile':w<1024?'tablet':'desktop';}
function send(name){if(consent!=='yes'||!allowed.includes(name))return;const p={consent:true,session:session(),name,path:location.pathname.slice(0,100),source:source(),device:device(),utm_source:(new URLSearchParams(location.search).get('utm_source')||'').slice(0,60)};fetch('/api/visitor-event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive:true,credentials:'same-origin'}).catch(()=>{});}
function begin(){send('page_view');document.addEventListener('click',e=>{const item=e.target.closest('a,button');if(!item)return;const href=item.getAttribute('href')||'',label=(item.textContent||'').toLowerCase();if(item.dataset.audience==='feminino')send('booking_female');if(item.dataset.audience==='masculino')send('booking_male');if(href.includes('wa.me')||href.includes('api.whatsapp.com'))send('whatsapp_click');else if(href==='#agendar'||label.includes('consultar horário')||label.includes('agendar atendimento'))send('booking_start');else if(label.includes('atendimento masculino'))send('booking_male');else if(label.includes('atendimento feminino'))send('booking_female');});setInterval(()=>{if(document.visibilityState==='visible')send('heartbeat');},60000);}
if(consent==='yes')begin();
else if(consent!== 'no'){
 const bar=document.createElement('aside');bar.setAttribute('role','dialog');bar.setAttribute('aria-label','Preferências de privacidade');bar.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;max-width:750px;margin:auto;border-radius:12px;background:#fff;color:#28212d;padding:18px;box-shadow:0 5px 32px #0004;font:16px/1.5 sans-serif';
 const label=document.createElement('p');label.textContent='Podemos usar dados anônimos de navegação para melhorar a experiência? O agendamento funciona mesmo sem aceitar.';bar.append(label);
 for(const [name,val] of [['Recusar','no'],['Aceitar analytics','yes']]){const b=document.createElement('button');b.type='button';b.textContent=name;b.style.cssText='padding:10px 16px;margin-right:10px;cursor:pointer';b.onclick=()=>{try{localStorage.setItem(key,val);}catch{}consent=val;bar.remove();if(val==='yes')begin();};bar.append(b);}document.body.append(bar);
}
window.addEventListener('rr:booking-created',()=>send('booking_complete'));
window.addEventListener('rr:franchise-submitted',()=>send('franchise_submit'));
})();