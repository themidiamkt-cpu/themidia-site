import { createHmac } from 'node:crypto';
import { buildSubmission, InputError } from './lead.mjs';
const DEFAULT_N8N_WEBHOOK_URL='https://automacao2.themidiamarketing.com.br/webhook/form-themidia';
export function createService(env=process.env,fetcher=fetch){
  const webhookUrl=env.N8N_WEBHOOK_URL||DEFAULT_N8N_WEBHOOK_URL;
  // CRM é opcional: sem endereço https válido o lead segue para os outros destinos e nada entra na fila do CRM.
  // Endereço errado aqui nunca derruba o formulário.
  const crmUrl=(()=>{try{return new URL(env.CRM_WEBHOOK_URL).protocol==='https:'?env.CRM_WEBHOOK_URL:null;}catch{return null;}})();
  function configured(){
    if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY||!env.META_PIXEL_ID||!env.META_CAPI_TOKEN)throw new InputError('O envio está temporariamente indisponível. Tente novamente em alguns minutos.',503);
    for(const url of [env.SUPABASE_URL,webhookUrl])if(new URL(url).protocol!=='https:')throw new InputError('Integração indisponível.',503);
    if(!/^\d+$/.test(env.META_PIXEL_ID)||!/^v\d+\.\d+$/.test(env.META_API_VERSION||'v24.0'))throw new InputError('Integração indisponível.',503);
  }
  async function rpc(name,body){
    const response=await fetcher(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:`Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000)});
    if(!response.ok){
      const detail=await response.text();
      if(detail.includes('EVENT_ID_CONFLICT'))throw new InputError('Este envio já foi recebido com outras respostas. Atualize a página antes de enviar novamente.',409);
      if(detail.includes('RATE_LIMIT'))throw new InputError('Você já enviou uma solicitação recentemente. Aguarde alguns minutos.',429);
      throw new Error(`database_${response.status}`);
    }
    return response.json();
  }
  async function deliver(job){
    let status='delivered',error=null;
    try{
      let response;
      if(job.channel==='n8n'){
        const body=JSON.stringify(job.payload);const headers={'Content-Type':'application/json','X-Event-Id':job.event_id,'Idempotency-Key':job.event_id};
        if(env.N8N_WEBHOOK_SECRET)headers['X-Webhook-Signature']='sha256='+createHmac('sha256',env.N8N_WEBHOOK_SECRET).update(body).digest('hex');
        response=await fetcher(webhookUrl,{method:'POST',headers,body,signal:AbortSignal.timeout(6500)});
      }else if(job.channel==='crm'){
        if(!crmUrl)throw new Error('crm_not_configured');
        const body=JSON.stringify(job.payload);const headers={'Content-Type':'application/json'};
        // Assinatura opcional: só quando a entrada do CRM tem segredo. HMAC SHA-256 em hex do corpo exato enviado.
        if(env.CRM_WEBHOOK_SECRET)headers['X-Deskcomm-Signature']=createHmac('sha256',env.CRM_WEBHOOK_SECRET).update(body).digest('hex');
        response=await fetcher(crmUrl,{method:'POST',headers,body,signal:AbortSignal.timeout(6500)});
      }else{
        if(!env.META_PIXEL_ID||!env.META_CAPI_TOKEN)throw new Error('meta_not_configured');
        if(!/^\d+$/.test(env.META_PIXEL_ID)||!/^v\d+\.\d+$/.test(env.META_API_VERSION||'v24.0'))throw new Error('meta_invalid_config');
        const payload={...job.payload,...(env.META_TEST_EVENT_CODE?{test_event_code:env.META_TEST_EVENT_CODE}:{})};
        response=await fetcher(`https://graph.facebook.com/${env.META_API_VERSION||'v24.0'}/${env.META_PIXEL_ID}/events`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${env.META_CAPI_TOKEN}`},body:JSON.stringify(payload),signal:AbortSignal.timeout(6500)});
      }
      if(!response.ok)throw new Error(`${job.channel}_http_${response.status}`);
      if(job.channel==='meta'){const result=await response.json();if(!result.events_received)throw new Error('meta_no_events_received');}
    }catch(err){status='failed';error=/^(meta_|n8n_|crm_)/.test(err.message)?err.message:'delivery_unavailable';}
    await rpc('landing_estetica_finish_delivery',{p_id:job.id,p_status:status,p_error:error});
    return {channel:job.channel,status};
  }
  async function processPending(eventId=null){
    configured();
    const jobs=await rpc('landing_estetica_claim_deliveries',{p_event_id:eventId,p_limit:10});
    // Entregas em paralelo com limite fornecido pelo banco e lease contra concorrência.
    return Promise.allSettled((jobs||[]).map(deliver));
  }
  async function submit(input,context={}){
    const built=buildSubmission(input,{...context,siteUrl:env.PUBLIC_SITE_URL||'https://www.themidiamarketing.com.br'});
    configured();
    const deliveries=crmUrl?built.deliveries:built.deliveries.filter(d=>d.channel!=='crm');
    const saved=await rpc('landing_estetica_submit',{p_submission:built.submission,p_deliveries:deliveries});
    // Uma falha secundária nunca perde o lead já salvo. A fila mantém a retentativa.
    // Junto com as entregas deste lead, refaz as antigas que falharam e já venceram a espera (n8n, Meta ou CRM fora do ar).
    // As duas chamadas correm ao mesmo tempo: o banco entrega cada item a uma só, e o tempo de resposta não aumenta.
    try{await Promise.all([processPending(saved.event_id),processPending()]);}catch{console.warn('landing_estetica: entrega pendente para retentativa');}
    return {ok:true,event_id:saved.event_id,qualified:saved.qualified,redirect:`/clinica-estetica/obrigado/${saved.qualified?'qualificado':'nutricao'}/`};
  }
  return {submit,processPending};
}
