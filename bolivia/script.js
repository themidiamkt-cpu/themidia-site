const PIXEL_ID='595890515304194';
if(!window.fbq){const f=function(){f.callMethod?f.callMethod.apply(f,arguments):f.queue.push(arguments)};f.queue=[];f.loaded=true;f.version='2.0';window.fbq=f;window._fbq=f;const s=document.createElement('script');s.async=true;s.src='https://connect.facebook.net/en_US/fbevents.js';document.head.appendChild(s)}
window.fbq('init',PIXEL_ID);window.fbq('track','PageView');
const form=document.querySelector('#lead-form'),statusEl=document.querySelector('#status');
const params=new URLSearchParams(location.search),keys=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
const digits=v=>String(v||'').replace(/\D/g,'').replace(/^591/,'');
form.whatsapp.addEventListener('input',e=>{e.target.value=digits(e.target.value).slice(0,8)});
document.querySelectorAll('[data-cta="whatsapp"],[data-cta="float"]').forEach(a=>a.addEventListener('click',()=>window.fbq('track','Contact',{content_name:'bolivia_whatsapp'})));
const label='Quiero mi diagnóstico';
form.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=form.querySelector('button'),d=new FormData(form);
  const nombre=String(d.get('nombre')||'').trim(),negocio=String(d.get('negocio')||'').trim(),rubro=String(d.get('rubro')||'').trim();
  const ig=String(d.get('instagram')||'').trim().replace(/^@/,'').replace(/\s/g,'');
  const phone=digits(d.get('whatsapp'));
  if(nombre.length<2||negocio.length<2||rubro.length<2||!/^[67]\d{7}$/.test(phone)||(ig&&!/^[\w.]{1,30}$/.test(ig))){statusEl.textContent='Revisa los datos: el WhatsApp debe tener 8 dígitos (empieza con 6 o 7).';return}
  btn.disabled=true;btn.textContent='Enviando...';statusEl.textContent='';
  try{
    const body={nombre,negocio,rubro,instagram:ig,whatsapp:phone,page_url:location.href,website:d.get('website')};
    keys.forEach(k=>body[k]=params.get(k)||null);
    const r=await fetch('submit.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    if(!r.ok)throw new Error();
    statusEl.textContent='¡Listo! Recibimos tus datos y te escribiremos por WhatsApp.';form.reset();
    window.fbq('track','Lead',{content_name:'bolivia_diagnostico'});
  }catch{statusEl.textContent='No pudimos registrar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp.'}
  finally{btn.disabled=false;btn.textContent=label}
});
