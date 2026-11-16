import {version,term,clothingNotice,questions,skinConditions} from './anamnese-schema.js';
const $=id=>document.getElementById(id),token=sessionStorage.getItem('jr_booking_token');let context,strokes=[],drawing=false;
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});const x=await r.json();if(!r.ok)throw Error(x.error);return x;}
function status(text,error=false){$('status').textContent=text;$('status').className=error?'error':'';}
function labelInput(id,label,type='text',value=''){const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');Object.assign(i,{id,type,value,required:true,maxLength:254});l.append(i);$('identity').append(l);return i;}
const canvas=$('signature'),ctx=canvas.getContext('2d');function draw(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.lineWidth=2;ctx.strokeStyle='#35281f';for(const stroke of strokes){ctx.beginPath();stroke.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0]*canvas.width,p[1]*canvas.height));ctx.stroke();}}
function point(e){const b=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-b.left)/b.width)),Math.max(0,Math.min(1,(e.clientY-b.top)/b.height))];}
canvas.onpointerdown=e=>{if(strokes.length>=100)return;drawing=true;canvas.setPointerCapture(e.pointerId);strokes.push([point(e)]);};canvas.onpointermove=e=>{if(!drawing||strokes.flat().length>=3900)return;strokes.at(-1).push(point(e));draw();};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;strokes=strokes.filter(s=>s.length>=2);draw();};$('clear-signature').onclick=()=>{strokes=[];draw();$('typed-signature').value='';};
// Typed signatures are stored as text, with a separate explicit confirmation action.
function signatureFeedback(message){$('signature-feedback').textContent=message;}
let typed='';$('use-typed').onclick=()=>{const name=$('typed-signature').value.trim();if(name.length<3||name!==$('name').value.trim())return signatureFeedback('Digite o mesmo nome completo informado no início da ficha.');typed=name;strokes=[];ctx.clearRect(0,0,900,240);ctx.font='36px Georgia';ctx.fillText(name,25,130,850);signatureFeedback('Assinatura digitada confirmada. Clique em Assinar e salvar ficha para concluir.');};
canvas.addEventListener('pointerdown',()=>{typed='';signatureFeedback('');});
canvas.addEventListener('pointerup',()=>{if(strokes.flat().length>=3)signatureFeedback('Assinatura desenhada registrada. Clique em Assinar e salvar ficha para concluir.');});
$('clear-signature').addEventListener('click',()=>{typed='';signatureFeedback('Assinatura limpa.');});
$('typed-signature').addEventListener('input',()=>{if(typed){typed='';draw();signatureFeedback('Nome alterado. Confirme a assinatura digitada novamente.');}});
function renderSkinConditions(answers){
 const group=document.createElement('fieldset');
 const heading=document.createElement('legend');
 heading.textContent='Condições da pele';
 const help=document.createElement('p');
 help.textContent='Selecione todas as opções que se aplicam ou marque Nenhuma.';
 group.append(heading,help);
 const choices=[];
 for(const [id,label,detail] of [...questions.filter(([key])=>skinConditions.includes(key)),['none','Nenhuma das opções']]){
  const row=document.createElement('label');
  row.className='check';
  const check=document.createElement('input');
  check.type='checkbox';check.id='q-'+id;check.checked=answers[id]?.value==='SIM';
  row.append(check,document.createTextNode(label));
  group.append(row);
  let detailInput;
  if(detail){
   const detailLabel=document.createElement('label');
   detailLabel.textContent='Locais — '+label;
   detailInput=document.createElement('input');
   detailInput.id='detail-'+id;detailInput.maxLength=500;detailInput.value=answers[id]?.detail||'';
   detailLabel.append(detailInput);group.append(detailLabel);
  }
  choices.push({check,detailInput});
 }
 const none=choices.at(-1).check;
 none.checked=skinConditions.every(id=>answers[id]?.value==='NÃO');
 function sync(changed){
  if(changed===none&&none.checked)for(const {check} of choices.slice(0,-1))check.checked=false;
  else if(changed?.checked)none.checked=false;
  choices[0].check.setCustomValidity(choices.some(({check})=>check.checked)?'':'Selecione uma condição ou Nenhuma das opções.');
  for(const {check,detailInput} of choices)if(detailInput){
   detailInput.required=check.checked;
   detailInput.parentElement.hidden=!check.checked;
  }
 }
 for(const {check} of choices)check.addEventListener('change',()=>sync(check));
 sync();
 $('questions').append(group);
}
async function init(){try{if(!token)throw Error('Abra esta ficha pelo link privado da sua reserva.');context=await api('/api/anamnese');$('professional').textContent=context.professional?'Profissional: '+context.professional:'';if(!context.ready)throw Error('A ficha está em configuração. Entre em contato com a equipe antes do pagamento.');const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());const data=context.record?.payload||{};
for(const [id,label,type,value] of [['evaluation_date','Data da avaliação','date',today],['name','Nome completo','text',context.customer.name],['sex','Sexo: MASC ou FEM','text',context.audience==='feminino'?'FEM':'MASC'],['birth_date','Data de nascimento','date',''],['phone','Telefone','tel',context.customer.phone],['email','E-mail','email',context.customer.email],['profession','Profissão','text',''],['phototype','Fototipo de pele (1 a 6)','number',''],['location','Local','text','']]){const i=labelInput(id,label,type,data[id]||value);if(type==='date')i.max=today;if(id==='phototype'){i.min=1;i.max=6;}if(id==='evaluation_date'){i.value=today;i.readOnly=true;}}
$('signature-name').value=$('name').value;$('name').oninput=()=>{$('signature-name').value=$('name').value;};
for(const [id,label,detail,options]of questions){if(skinConditions.includes(id))continue;const box=document.createElement('div');box.className='question';const l=document.createElement('label');l.textContent=label;const s=document.createElement('select');s.id='q-'+id;s.required=true;for(const v of ['',...(options||['SIM','NÃO'])])s.add(new Option(v||'Selecione',v));l.append(s);box.append(l);if(detail){const d=document.createElement('label');d.className='detail';d.textContent=detail;const input=document.createElement('input');input.id='detail-'+id;input.maxLength=500;d.append(input);box.append(d);s.onchange=()=>{d.hidden=s.value!=='SIM';input.required=s.value==='SIM';};s.onchange();}if(data.answers?.[id]){s.value=data.answers[id].value;if(detail){$('questions').append(box);$('detail-'+id).value=data.answers[id].detail||'';s.onchange();}}$('questions').append(box);}
renderSkinConditions(data.answers||{});

for(const v of context.audience==='feminino'?['Sem biquíni *NUA','Biquíni de Tecido','Biquíni de Fita']:['A definir com o profissional antes do atendimento'])$('clothing').add(new Option(v,v));$('clothing').value=data.clothing||$('clothing').value;$('clothing-notice').textContent=context.audience==='feminino'?clothingNotice:'A vestimenta será combinada com o profissional; nenhuma modalidade masculina adicional é presumida.';$('term').textContent=term;$('retention').textContent='Prazo configurado de retenção: '+context.retention_days+' dias. Acesso restrito à gestão autorizada e ao profissional responsável.';
$('clinical-form').hidden=!!context.record;$('actions').hidden=!context.record;status(context.record?'Ficha assinada em '+new Date(context.record.accepted_at).toLocaleString('pt-BR')+'. Revisão '+context.record.revision+'.':'Preencha todos os campos e assine. A reserva mantém seu prazo original de pagamento.');
}catch(e){status(e.message,true);}}
$('revise').onclick=()=>{$('clinical-form').hidden=false;$('actions').hidden=true;strokes=[];typed='';draw();signatureFeedback('');$('saved-confirmation').textContent='';status('A nova assinatura criará outra revisão; a anterior será preservada durante a retenção.');};
$('clinical-form').onsubmit=async e=>{e.preventDefault();const submit=e.submitter;submit.disabled=true;try{const x={version,accepted:$('accepted').checked,health_consent:$('health-consent').checked,signature:strokes,typed_signature:typed,previous_revision:context.record?.revision||0,answers:{}};for(const id of ['evaluation_date','name','sex','birth_date','phone','email','profession','phototype','location','clothing'])x[id]=$(id).value;for(const [id,,detail]of questions)x.answers[id]={value:skinConditions.includes(id)?($('q-'+id).checked?'SIM':'NÃO'):$('q-'+id).value,...(detail?{detail:$('detail-'+id).value}:{})};const record=await api('/api/anamnese',x);context.record={...record,payload:x};$('clinical-form').hidden=true;$('actions').hidden=false;status('');$('saved-confirmation').textContent='Ficha assinada e salva com sucesso. Revisão '+record.revision+'.';$('saved-confirmation').focus();}catch(e){signatureFeedback(e.message);}finally{submit.disabled=false;}};
$('download').onclick=async()=>{try{const r=await fetch('/api/anamnese/pdf',{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw Error((await r.json()).error);const url=URL.createObjectURL(await r.blob()),a=document.createElement('a');a.href=url;a.download='anamnese-rr.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}catch(e){status(e.message,true);}};init();
