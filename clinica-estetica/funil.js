const cidades = ['Campinas','Hortolândia','Sumaré','Americana','Indaiatuba','Valinhos','Vinhedo','Paulínia','Outra'];
const options = {
  profissionais: [['solo','Só eu'],['2-4','2 a 4'],['5+','5 ou mais']],
  ticket: [['ate-250','Até R$ 250'],['250-400','R$ 250 a R$ 400'],['400-800','R$ 400 a R$ 800'],['acima-800','Acima de R$ 800']],
  anuncios: [['sim','Sim'],['nao','Não'],['parei','Já investi e parei']],
  verba: [['ate-1500','Até R$ 1.500'],['1500-3000','R$ 1.500 a R$ 3.000'],['acima-3000','Mais de R$ 3.000']],
  atendimento: [['recepcionista','Sim, recepcionista'],['proprio','Sou eu mesma'],['ninguem','Não']]
};
const ddds = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
function phoneDigits(value) { const digits = String(value || '').replace(/\D/g,''); return digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits; }
function validPhone(value) { const v = phoneDigits(value); return v.length === 11 && ddds.has(v.slice(0,2)) && /^9\d{8}$/.test(v.slice(2)) && !/^(\d)\1{8}$/.test(v.slice(2)); }
function formatPhone(value) { const v = phoneDigits(value).slice(0,11); if (!v) return ''; if(v.length < 3)return '('+v; return '('+v.slice(0,2)+') '+v.slice(2,7)+(v.length>7?'-'+v.slice(7):''); }
function validInstagram(value) { const v = String(value||'').replace(/^@/,''); return /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_.]{1,30}$/.test(v); }
const privacyVersion = '2026-10-08';
const config = window.CLINICA_CONFIG || {};
function fallbackQualification(lead){
  const qualified=lead.profissionais!=='solo'&&lead.verba!=='ate-1500'&&lead.ticket!=='ate-250';
  const high=qualified&&['400-800','acima-800'].includes(lead.ticket)&&lead.atendimento==='recepcionista';
  const pontuacao=({solo:0,'2-4':20,'5+':25}[lead.profissionais]||0)+({'ate-1500':0,'1500-3000':20,'acima-3000':25}[lead.verba]||0)+({'ate-250':0,'250-400':15,'400-800':20,'acima-800':25}[lead.ticket]||0)+({recepcionista:20,proprio:10,ninguem:0}[lead.atendimento]||0)+(lead.anuncios==='sim'?5:0);
  return {qualified,status_qualificacao:high?'PRIORIDADE ALTA':qualified?'QUALIFICADO':'NUTRIÇÃO',pontuacao};
}
function directWebhookUrl(){
  try{const url=new URL(String(config.directWebhookUrl||''),location.href);return url.protocol==='https:'?url.href:'';}catch{return '';}
}
async function submitToStaticWebhook(payload){
  const url=directWebhookUrl();
  if(!url)throw new Error('O envio ainda não está configurado nesta página.');
  const qualification=fallbackQualification(payload);
  const body={event:'landing_estetica_lead',...payload,...payload.attribution,utms:payload.attribution,origem:'landing-estetica',...qualification,criado_em:new Date().toISOString(),delivery_mode:'static_webhook_fallback'};
  // text/plain é uma requisição simples: o navegador consegue enviá-la ao n8n
  // mesmo quando o workflow não expõe cabeçalhos CORS para uma página estática.
  await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  return {ok:true,qualified:qualification.qualified,redirect:`/clinica-estetica/obrigado/${qualification.qualified?'qualificado':'nutricao'}/`};
}
const privacyUrl = new URL('privacidade/', location.href).href;
const getStore = (key) => { try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; } };
const setStore = (key,value) => { try { sessionStorage.setItem(key,JSON.stringify(value)); } catch {} };
const incoming = new URLSearchParams(location.search);
const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
let attribution = getStore('tm_estetica_attribution') || {};
if (keys.some(k=>incoming.has(k))) {
  const fresh = Object.fromEntries(keys.map(k=>[k,(incoming.get(k)||'').slice(0,500)]));
  attribution = { ...fresh, captured_at: Date.now() };
  setStore('tm_estetica_attribution',attribution);
}
const cookie = (key) => document.cookie.split('; ').find(v=>v.startsWith(key+'='))?.slice(key.length+1) || '';
function initPixel() {
  if (!/^\d+$/.test(config.pixelId || '')) return;
  if (!window.fbq) { const fbq = function(){fbq.callMethod ? fbq.callMethod.apply(fbq,arguments) : fbq.queue.push(arguments);}; fbq.queue=[];fbq.loaded=true;fbq.version='2.0';window.fbq=fbq;window._fbq=fbq;
    const script=document.createElement('script');script.async=true;script.src='https://connect.facebook.net/en_US/fbevents.js';document.head.append(script);
  }
  window.fbq('init',config.pixelId);
  // Somente esta página dispara PageView. Obrigados nunca redisparam Lead.
  if(document.getElementById('lead-form')) window.fbq('track','PageView');
}
initPixel();
document.querySelectorAll('[data-instagram]').forEach(a=>a.href=config.instagramUrl || a.href);
document.querySelectorAll('[data-whatsapp]').forEach(a=>a.href=config.whatsappUrl || a.href);
document.querySelectorAll('[data-booking]').forEach(a=>{
  if(config.bookingUrl) a.href=config.bookingUrl;
  else { a.href=(config.whatsappUrl || 'https://wa.me/5519999315179')+'?text='+encodeURIComponent('Olá! Pedi meu diagnóstico e quero agendar uma conversa online de 20 minutos.'); a.textContent='Agendar conversa pelo WhatsApp ↗'; }
});
const form = document.getElementById('lead-form');
if(form) setupForm();
setupModal();
function setupForm(){
  const steps = [
    {key:'nome',label:'Como você se chama?',help:'Vamos começar por você.',placeholder:'Seu nome',autocomplete:'given-name',max:100},
    {key:'whatsapp',label:'Qual é o seu WhatsApp?',help:'É por aqui que seu diagnóstico vai chegar. Inclua o DDD.',placeholder:'(19) 99999-9999',autocomplete:'tel',type:'tel',max:20},
    {key:'clinica',label:'Qual é o nome da sua clínica?',help:'Queremos conhecer o seu negócio.',placeholder:'Nome da clínica',autocomplete:'organization',max:150},
    {key:'instagram',label:'E o Instagram da clínica?',help:'Informe o nome do perfil para a nossa análise.',placeholder:'suaclinica',max:31},
    {key:'cidade',label:'Em qual cidade vocês atendem?',help:'Assim, entendemos melhor a sua região.'},
    {key:'profissionais',label:'Quantos profissionais atendem na clínica?',help:'Considere você e os demais profissionais.'},
    {key:'ticket',label:'Qual o ticket médio do seu principal procedimento?',help:'Selecione a faixa mais próxima do valor cobrado.'},
    {key:'anuncios',label:'Investe em anúncios hoje?',help:'Toda resposta ajuda a entender o seu momento.'},
    {key:'verba',label:'Quanto pode investir por mês em anúncios, além da gestão?',help:'Considere a verba destinada ao Instagram e Facebook.'},
    {key:'atendimento',label:'Tem alguém responsável por responder o WhatsApp da clínica?',help:'Última pergunta. Agora falta pouco!'}
  ];
  const area=document.getElementById('question-area'), error=document.getElementById('form-error'), next=document.getElementById('next-button'), back=document.getElementById('back-button');
  const data={}; let step=0, busy=false, eventId=null;
  function node(tag,attrs={},text=''){const el=document.createElement(tag); for(const [k,v] of Object.entries(attrs)) el.setAttribute(k,v);el.textContent=text;return el;}
  function showError(message){error.textContent=message;error.hidden=false;area.querySelector('input,select')?.setAttribute('aria-invalid','true');}
  function render(focus=false){
    const s=steps[step]; area.replaceChildren();error.hidden=true;
    document.getElementById('step-count').textContent=String(step+1).padStart(2,'0')+' / 10';
    document.getElementById('progress-fill').style.width=((step+1)*10)+'%';
    document.querySelector('[role=progressbar]').setAttribute('aria-valuenow',step+1);
    const label=node(options[s.key]?'h3':'label',{class:'question-label',id:'question-label',...(options[s.key]?{tabindex:'-1'}:{for:'answer'})},s.label);
    area.append(label,node('p',{class:'question-help',id:'question-help'},s.help));
    if(options[s.key]){
      const fs=node('fieldset',{class:'radio-options','aria-describedby':'question-help'});fs.append(node('legend',{class:'sr-only'},s.label));
      options[s.key].forEach(([value,text])=>{const item=node('label',{class:'radio-option'});const input=node('input',{type:'radio',name:s.key,value,required:''});input.checked=data[s.key]===value;input.addEventListener('change',()=>{data[s.key]=value;error.hidden=true;});item.append(input,node('span',{},text));fs.append(item);});area.append(fs);
    } else if(s.key==='cidade'){
      const select=node('select',{id:'answer',class:'field',name:s.key,required:'','aria-describedby':'question-help form-error'});select.append(node('option',{value:''},'Selecione a cidade'));cidades.forEach(c=>select.append(node('option',{value:c},c)));select.value=data.cidade||'';area.append(select);
      const extra=node('div',{class:'other-city'});extra.hidden=select.value!=='Outra';extra.append(node('label',{for:'cidade-outra'},'Qual cidade?'));const other=node('input',{id:'cidade-outra',name:'cidade_outra',class:'field',type:'text',maxlength:'100',placeholder:'Sua cidade e estado',autocomplete:'address-level2'});other.value=data.cidade_outra||'';other.addEventListener('input',()=>data.cidade_outra=other.value);extra.append(other);area.append(extra);select.addEventListener('change',()=>{data.cidade=select.value;extra.hidden=select.value!=='Outra';if(!extra.hidden)other.focus();error.hidden=true;});
    }else{
      const input=node('input',{id:'answer',name:s.key,class:'field',type:s.type||'text',placeholder:s.placeholder,maxlength:s.max,autocomplete:s.autocomplete||'off',required:'','aria-describedby':'question-help form-error'});input.value=data[s.key]||'';
      if(s.key==='instagram'){input.autocapitalize='none';input.spellcheck=false;const wrapper=node('div',{class:'prefix-field'});wrapper.append(node('span',{'aria-hidden':'true'},'@'),input);area.append(wrapper);} else area.append(input);
      input.addEventListener('input',()=>{if(s.key==='whatsapp')input.value=formatPhone(input.value);data[s.key]=input.value;input.removeAttribute('aria-invalid');error.hidden=true;});
    }
    if(step===9){const label=node('label',{class:'consent'});const check=node('input',{type:'checkbox',id:'consentimento',name:'consentimento',required:''});check.checked=data.consentimento===true;check.addEventListener('change',()=>{data.consentimento=check.checked;error.hidden=true;});const text=node('span',{},'Autorizo a The Mídia a usar meus dados para analisar minha clínica e entrar em contato pelo WhatsApp com o diagnóstico, conteúdos e informações sobre seus serviços, conforme a ');text.append(node('a',{href:privacyUrl,target:'_blank',rel:'noopener'},'Política de Privacidade'),document.createTextNode('. Posso cancelar o contato a qualquer momento.'));label.append(check,text);area.append(label);}
    back.hidden=step===0;next.replaceChildren(document.createTextNode(step===9?'Receber meu diagnóstico':'Continuar'),node('span',{'aria-hidden':'true'},step===9?'↗':'→'));
    if(focus){ const focusTarget=options[s.key]?label:area.querySelector('#answer'); focusTarget?.focus({preventScroll:true}); if(window.innerWidth<761)document.querySelector('.form-card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}); }
  }
  function validate(){
    const s=steps[step], value=String(data[s.key]||'').trim();
    if(!value)return options[s.key]||s.key==='cidade'?'Selecione uma opção para continuar.':'Preencha este campo para continuar.';
    if(['nome','clinica'].includes(s.key)&&value.length<2)return 'Digite pelo menos 2 caracteres.';
    if(s.key==='whatsapp'&&!validPhone(value))return 'Informe um celular válido com DDD, como (19) 98765-4321.';
    if(s.key==='instagram'&&!validInstagram(value))return 'Informe apenas o @ do perfil, sem espaços ou link.';
    if(s.key==='cidade'&&value==='Outra'&&String(data.cidade_outra||'').trim().length<2)return 'Informe o nome da sua cidade.';
    if(step===9&&!data.consentimento)return 'Marque o consentimento para podermos entrar em contato.';
    return '';
  }
  back.addEventListener('click',()=>{if(!busy&&step>0){step--;render(true);}});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;const issue=validate();if(issue){showError(issue);return;}
    if(step<9){step++;render(true);return;}
    busy=true;next.disabled=true;back.disabled=true;next.textContent='Enviando seu diagnóstico…';error.hidden=true;
    eventId ||= crypto.randomUUID();
    const fbc=cookie('_fbc') || (attribution.fbclid ? `fb.1.${attribution.captured_at||Date.now()}.${attribution.fbclid}`:'');
    const payload={...data,whatsapp:'55'+phoneDigits(data.whatsapp),instagram:'@'+data.instagram.replace(/^@/,''),event_id:eventId,privacy_version:privacyVersion,consentimento:true,attribution:Object.fromEntries(keys.map(k=>[k,attribution[k]||''])),fbp:cookie('_fbp'),fbc,website:form.elements.website.value};
    try{
      let result;
      let primaryError;
      let primaryStatus=0;
      try{
        const response=await fetch(config.endpoint||'/api/clinica-estetica',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
        primaryStatus=response.status;
        let parsed;try{parsed=await response.json();}catch{throw Object.assign(new Error('Resposta inválida da API.'),{status:response.status});}
        if(!response.ok||!parsed.ok)throw Object.assign(new Error(parsed.error || 'A API não aceitou o envio.'),{status:response.status});
        result=parsed;
      }catch(err){
        primaryError=err;
        // A página publicada no Hostinger pode não ter uma função Node para /api.
        // Nesses casos, entrega o mesmo payload diretamente ao webhook público.
        const canFallback=Boolean(directWebhookUrl())&&!([400,401,403,413].includes(err?.status||primaryStatus));
        if(!canFallback)throw err;
        result=await submitToStaticWebhook(payload);
      }
      if(!result||!['/clinica-estetica/obrigado/qualificado/','/clinica-estetica/obrigado/nutricao/'].includes(result.redirect))throw primaryError||new Error('Resposta inesperada. Tente novamente.');
      const sentKey='tm_estetica_sent_'+eventId;
      if(!getStore(sentKey)&&window.fbq){window.fbq('track','Lead',{content_name:'Diagnóstico clínica de estética'},{eventID:eventId});if(result.qualified)window.fbq('trackCustom','LeadQualificado',{content_name:'Diagnóstico clínica de estética'},{eventID:eventId});setStore(sentKey,true);}
      setStore('tm_estetica_success',{event_id:eventId,at:Date.now()});
      await new Promise(resolve=>setTimeout(resolve,180));location.assign(result.redirect);
    }catch(err){showError(err.name==='TimeoutError'?'O envio demorou mais que o esperado. Tente novamente. Suas respostas foram mantidas.':err.message);next.textContent='Tentar enviar novamente';busy=false;next.disabled=false;back.disabled=false;}
  });
  render();
  const sticky=document.querySelector('.mobile-cta'), hero=document.querySelector('.hero'), diagnostic=document.getElementById('diagnostico');
  if(sticky&&hero&&diagnostic){let formVisible=false,heroVisible=true;const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target.id==='diagnostico')formVisible=entry.isIntersecting;else heroVisible=entry.isIntersecting;}sticky.classList.toggle('is-visible',!formVisible&&!heroVisible);},{threshold:0});observer.observe(diagnostic);observer.observe(hero);}
  document.querySelectorAll('a[href="#diagnostico"]').forEach(link=>link.addEventListener('click',()=>{setTimeout(()=>area.querySelector('input,select,h3')?.focus({preventScroll:true}),400);}));
}

function setupModal(){
  const modal=document.getElementById('qualification-modal');
  if(!modal)return;
  const dialog=modal.querySelector('.form-modal'), close=modal.querySelector('[data-close-form]'), open=document.querySelector('[data-open-form]'), closedState=document.getElementById('closed-form-state');
  let lastFocus=null;
  const focusables=()=>[...dialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  function setOpen(value){
    modal.hidden=!value;modal.setAttribute('aria-hidden',String(!value));document.body.classList.toggle('modal-open',value);
    if(closedState)closedState.hidden=value;
    if(value){lastFocus=document.activeElement;requestAnimationFrame(()=>document.querySelector('#answer, #question-label')?.focus({preventScroll:true}));}
    else{(open||lastFocus)?.focus?.({preventScroll:true});}
  }
  close?.addEventListener('click',()=>setOpen(false));open?.addEventListener('click',()=>setOpen(true));
  modal.addEventListener('click',event=>{if(event.target===modal)setOpen(false);});
  document.addEventListener('keydown',event=>{
    if(modal.hidden)return;
    if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
    if(event.key!=='Tab')return;
    const items=focusables();if(!items.length)return;const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  setOpen(true);
}
