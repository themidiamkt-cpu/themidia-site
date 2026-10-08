import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { qualify, validateLead, buildSubmission, hash } from '../lib/clinica-estetica/lead.mjs';
import { createService } from '../lib/clinica-estetica/service.mjs';
import { options, validPhone, formatPhone } from '../clinica-estetica/fields.mjs';
import handler from '../api/clinica-estetica.js';
const base=()=>({nome:'Pessoa Teste',whatsapp:'(19) 98765-4321',clinica:'Clínica Teste',instagram:'@clinica.teste',cidade:'Campinas',profissionais:'2-4',ticket:'400-800',anuncios:'sim',verba:'1500-3000',atendimento:'recepcionista',consentimento:true,privacy_version:'2026-10-08',event_id:randomUUID(),attribution:{utm_source:'instagram',utm_campaign:'teste'}});
test('matriz de qualificação: 324 combinações com precedência da nutrição e pontuação 0 a 100',()=>{
 let count=0;for(const [profissionais]of options.profissionais)for(const [ticket]of options.ticket)for(const [verba]of options.verba)for(const [atendimento]of options.atendimento)for(const [anuncios]of options.anuncios){
  const result=qualify({profissionais,ticket,verba,atendimento,anuncios});
  const nutrition=profissionais==='solo'||ticket==='ate-250'||verba==='ate-1500';
  assert.equal(result.qualified,!nutrition);assert.ok(result.pontuacao>=0&&result.pontuacao<=100);
  if(nutrition)assert.equal(result.status_qualificacao,'NUTRIÇÃO');else if(atendimento==='recepcionista'&&['400-800','acima-800'].includes(ticket))assert.equal(result.status_qualificacao,'PRIORIDADE ALTA');else assert.equal(result.status_qualificacao,'QUALIFICADO');count++;
 }assert.equal(count,324);
 assert.equal(qualify({...base(),profissionais:'5+',ticket:'acima-800',verba:'acima-3000'}).pontuacao,100);
});
test('DDD válido, número brasileiro normalizado e máscara',()=>{assert.ok(validPhone('5519987654321'));assert.ok(validPhone('(55) 99876-5432'));for(const phone of ['(20) 98765-4321','19999999999','1987654321','55123456'])assert.equal(validPhone(phone),false);assert.equal(validateLead(base()).whatsapp,'5519987654321');assert.equal(formatPhone('+55 19 98765-4321'),'(19) 98765-4321');});
test('não aceita consentimento falso, opções forjadas, @ inválido, cidade Outra vazia nem honeypot',()=>{for(const patch of [{consentimento:false},{consentimento:'true'},{privacy_version:'old'},{profissionais:'9'},{instagram:'https://instagram.com/teste'},{instagram:'x..y'},{cidade:'Outra'},{event_id:'x'},{website:'spam'}])assert.throws(()=>validateLead({...base(),...patch}));assert.equal(validateLead({...base(),cidade:'Outra',cidade_outra:'Limeira/SP'}).cidade_outra,'Limeira/SP');});
test('score e status enviados pelo navegador são ignorados',()=>{const lead=buildSubmission({...base(),profissionais:'solo',pontuacao:100,status_qualificacao:'PRIORIDADE ALTA',qualified:true});assert.equal(lead.submission.qualified,false);assert.equal(lead.submission.status_qualificacao,'NUTRIÇÃO');});
test('CAPI contém eventos deduplicáveis, telefone hash e timestamp do servidor',()=>{
 const input=base();const now=new Date('2026-10-08T19:00:00Z');const {submission,deliveries}=buildSubmission(input,{now,ip:'127.0.0.1',userAgent:'test'});
 assert.equal(submission.criado_em,now.toISOString());assert.equal(submission.attribution.utm_source,'instagram');const events=deliveries.find(d=>d.channel==='meta').payload.data;
 assert.deepEqual(events.map(e=>e.event_name),['Lead','LeadQualificado']);for(const event of events){assert.equal(event.event_id,input.event_id);assert.equal(event.user_data.ph[0],hash('5519987654321'));assert.equal(event.event_time,1791486000);assert.ok(!JSON.stringify(event).includes('98765'));}
 const low=buildSubmission({...input,ticket:'ate-250'}).deliveries[1].payload.data;assert.deepEqual(low.map(e=>e.event_name),['Lead']);
});
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-secret',N8N_WEBHOOK_URL:'https://n8n.example.test/webhook/test',N8N_WEBHOOK_SECRET:'sign-test',META_PIXEL_ID:'123',META_CAPI_TOKEN:'meta-test',PUBLIC_SITE_URL:'https://example.test'};
const defaultWebhook='https://automacao2.themidiamarketing.com.br/webhook/form-themidia';
const crmUrl='https://crm.example.test/api/v1/webhooks/in/token-de-teste';
function mockGateway({failN8n=false,failSave=false,failCrm=false,webhookUrl=env.N8N_WEBHOOK_URL}={}){
 const targetWebhook=webhookUrl||defaultWebhook;const state={failCrm};
 let jobs=[],calls=[];const saved=new Map();
 const fetcher=async(url,opts)=>{const body=JSON.parse(opts.body);calls.push({url,body,headers:opts.headers,raw:opts.body});
  if(url.endsWith('/landing_estetica_submit')){if(failSave)return new Response('{}',{status:500});const sub=body.p_submission;if(!saved.has(sub.event_id)){saved.set(sub.event_id,sub);jobs.push(...body.p_deliveries.map(d=>({...d,event_id:sub.event_id,id:randomUUID(),status:'pending'})));}const got=saved.get(sub.event_id);return Response.json({event_id:got.event_id,qualified:got.qualified});}
  if(url.endsWith('/landing_estetica_claim_deliveries')){const pending=jobs.filter(j=>j.status==='pending');pending.forEach(j=>j.status='processing');return Response.json(pending);}
  if(url.endsWith('/landing_estetica_finish_delivery')){jobs.find(j=>j.id===body.p_id).status=body.p_status;return Response.json(null);}
  if(url===targetWebhook)return new Response('{}',{status:failN8n?502:200});
  if(url===crmUrl)return new Response('{}',{status:state.failCrm?503:201});
  if(url.includes('graph.facebook.com'))return Response.json({events_received:body.data.length});
  throw new Error('URL inesperada');};return {fetcher,calls,state,get jobs(){return jobs;}};
}
test('salva antes de enviar webhook/CAPI e repetições não duplicam entregas',async()=>{const gateway=mockGateway();const service=createService(env,gateway.fetcher);const input=base();const result=await service.submit(input);assert.equal(result.ok,true);assert.equal(result.redirect,'/clinica-estetica/obrigado/qualificado/');assert.equal('pontuacao'in result,false);assert.equal(gateway.calls[0].url.endsWith('landing_estetica_submit'),true);await service.submit(input);assert.equal(gateway.calls.filter(c=>c.url===env.N8N_WEBHOOK_URL).length,1);const webhook=gateway.calls.find(c=>c.url===env.N8N_WEBHOOK_URL);assert.equal(webhook.body.utm_source,'instagram');assert.equal(webhook.body.utm_campaign,'teste');assert.equal(webhook.body.utms.utm_campaign,'teste');assert.equal(webhook.body.status_qualificacao,'PRIORIDADE ALTA');assert.match(webhook.headers['X-Webhook-Signature'],/^sha256=[a-f0-9]{64}$/);assert.equal(webhook.headers['Idempotency-Key'],input.event_id);});
test('usa o webhook oficial quando a variável de URL está vazia',async()=>{const gateway=mockGateway({webhookUrl:''});await createService({...env,N8N_WEBHOOK_URL:''},gateway.fetcher).submit(base());assert.equal(gateway.calls.filter(c=>c.url===defaultWebhook).length,1);});
test('falha n8n mantém lead salvo e registra entrega para retentativa',async()=>{const gateway=mockGateway({failN8n:true});const result=await createService(env,gateway.fetcher).submit(base());assert.equal(result.ok,true);assert.equal(gateway.jobs.find(j=>j.channel==='n8n').status,'failed');assert.equal(gateway.jobs.find(j=>j.channel==='meta').status,'delivered');});
test('falha ao gravar não dispara eventos e ambiente vazio não simula sucesso',async()=>{const gateway=mockGateway({failSave:true});await assert.rejects(()=>createService(env,gateway.fetcher).submit(base()));assert.equal(gateway.calls.length,1);await assert.rejects(()=>createService({},gateway.fetcher).submit(base()),err=>err.status===503);});
test('CRM: pacote plano e legível, com o identificador do envio e só as UTMs preenchidas',()=>{
 const input=base();const {deliveries}=buildSubmission(input);const crm=deliveries.find(d=>d.channel==='crm').payload;
 assert.deepEqual(deliveries.map(d=>d.channel),['n8n','meta','crm']);
 assert.equal(crm.external_id,input.event_id);assert.equal(crm.nome,'Pessoa Teste');assert.equal(crm.whatsapp,'5519987654321');assert.equal(crm.clinica,'Clínica Teste');assert.equal(crm.cidade,'Campinas');
 assert.equal(crm.profissionais,'2 a 4');assert.equal(crm.ticket_medio,'R$ 400 a R$ 800');assert.equal(crm.investe_em_anuncios,'Sim');assert.equal(crm.verba_de_anuncios,'R$ 1.500 a R$ 3.000');assert.equal(crm.atendimento_whatsapp,'Sim, recepcionista');
 assert.equal(crm.qualificacao,'PRIORIDADE ALTA');assert.equal(crm.origem,'landing-estetica');assert.equal(crm.utm_source,'instagram');assert.equal(crm.utm_campaign,'teste');
 for(const key of ['utm_medium','fingerprint','fbp','fbc','fbclid','consentimento','attribution','utms','event_id'])assert.equal(key in crm,false,key);
 // O CRM descarta objeto e lista: tudo precisa ser texto ou número.
 for(const value of Object.values(crm))assert.ok(['string','number'].includes(typeof value));
 assert.equal(buildSubmission({...input,cidade:'Outra',cidade_outra:'Limeira/SP'}).deliveries[2].payload.cidade,'Limeira/SP');
});
test('CRM configurado: recebe o lead uma vez, assinado quando há segredo, e repetição não duplica',async()=>{
 const gateway=mockGateway();const service=createService({...env,CRM_WEBHOOK_URL:crmUrl,CRM_WEBHOOK_SECRET:'segredo-do-crm-teste'},gateway.fetcher);const input=base();
 await service.submit(input);await service.submit(input);
 const sent=gateway.calls.filter(c=>c.url===crmUrl);assert.equal(sent.length,1);assert.equal(sent[0].body.external_id,input.event_id);
 assert.equal(sent[0].headers['X-Deskcomm-Signature'],createHmac('sha256','segredo-do-crm-teste').update(sent[0].raw).digest('hex'));
 assert.equal(gateway.jobs.find(j=>j.channel==='crm').status,'delivered');
 const semSegredo=mockGateway();await createService({...env,CRM_WEBHOOK_URL:crmUrl},semSegredo.fetcher).submit(base());
 assert.equal('X-Deskcomm-Signature'in semSegredo.calls.find(c=>c.url===crmUrl).headers,false);
});
test('CRM sem endereço, ou com endereço inválido, fica fora da fila e o formulário segue funcionando',async()=>{
 for(const url of [undefined,'','http://crm.example.test/x','nao-e-url']){
  const gateway=mockGateway();const result=await createService({...env,CRM_WEBHOOK_URL:url},gateway.fetcher).submit(base());assert.equal(result.ok,true);
  assert.deepEqual(gateway.calls[0].body.p_deliveries.map(d=>d.channel),['n8n','meta']);assert.equal(gateway.jobs.some(j=>j.channel==='crm'),false);assert.equal(gateway.calls.some(c=>c.url===url),false);
 }
});
test('CRM fora do ar: lead salvo, n8n e Meta entregues, entrega do CRM fica para nova tentativa',async()=>{
 const gateway=mockGateway({failCrm:true});const result=await createService({...env,CRM_WEBHOOK_URL:crmUrl},gateway.fetcher).submit(base());
 assert.equal(result.ok,true);assert.equal(gateway.jobs.find(j=>j.channel==='crm').status,'failed');assert.equal(gateway.jobs.find(j=>j.channel==='n8n').status,'delivered');assert.equal(gateway.jobs.find(j=>j.channel==='meta').status,'delivered');
 assert.equal(gateway.calls.filter(c=>c.url.endsWith('/landing_estetica_finish_delivery')).find(c=>c.body.p_status==='failed').body.p_error,'crm_http_503');
});
test('lead novo refaz a entrega antiga que falhou',async()=>{
 const gateway=mockGateway({failCrm:true});const service=createService({...env,CRM_WEBHOOK_URL:crmUrl},gateway.fetcher);
 await service.submit(base());const antiga=gateway.jobs.find(j=>j.channel==='crm');assert.equal(antiga.status,'failed');
 gateway.state.failCrm=false;antiga.status='pending'; // a espera da nova tentativa venceu
 await service.submit({...base(),whatsapp:'(19) 91234-5678'});
 assert.equal(antiga.status,'delivered');assert.equal(gateway.calls.filter(c=>c.url===crmUrl).length,3);assert.equal(gateway.jobs.filter(j=>j.channel==='crm'&&j.status==='delivered').length,2);
});
async function request({method='POST',headers={},body=base()}={}){const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};await handler({method,headers:{'content-type':'application/json',host:'localhost:4173',...headers},body},res);return res;}
test('API bloqueia método, conteúdo incorreto, origem externa, JSON inválido e payload grande',async()=>{assert.equal((await request({method:'GET'})).statusCode,405);assert.equal((await request({headers:{'content-type':'text/plain'}})).statusCode,415);assert.equal((await request({headers:{origin:'https://evil.example'}})).statusCode,403);assert.equal((await request({body:'{invalid'})).statusCode,400);assert.equal((await request({body:{...base(),pad:'x'.repeat(17000)}})).statusCode,413);});
