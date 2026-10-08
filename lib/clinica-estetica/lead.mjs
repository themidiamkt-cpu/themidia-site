import { createHash } from 'node:crypto';
import { cidades, options, validPhone, phoneDigits, validInstagram, privacyVersion } from '../../clinica-estetica/fields.mjs';
export class InputError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export const hash = value => createHash('sha256').update(String(value)).digest('hex');
const text=(v,max=150)=>typeof v==='string'?v.trim().slice(0,max):'';
export function qualify(lead){
  const qualified=lead.profissionais!=='solo'&&lead.verba!=='ate-1500'&&lead.ticket!=='ate-250';
  const high=qualified&&['400-800','acima-800'].includes(lead.ticket)&&lead.atendimento==='recepcionista';
  const pontuacao=({solo:0,'2-4':20,'5+':25}[lead.profissionais])+({'ate-1500':0,'1500-3000':20,'acima-3000':25}[lead.verba])+({'ate-250':0,'250-400':15,'400-800':20,'acima-800':25}[lead.ticket])+({recepcionista:20,proprio:10,ninguem:0}[lead.atendimento])+(lead.anuncios==='sim'?5:0);
  return {qualified,status_qualificacao:high?'PRIORIDADE ALTA':qualified?'QUALIFICADO':'NUTRIÇÃO',pontuacao};
}
export function validateLead(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new InputError('Dados inválidos.');
  if(text(input.website))throw new InputError('Não foi possível validar o envio.');
  if(input.consentimento!==true)throw new InputError('O consentimento é necessário para enviar.');
  if(input.privacy_version!==privacyVersion)throw new InputError('Atualize a página e confirme a política de privacidade.');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.event_id||''))throw new InputError('Identificador do envio inválido. Atualize a página.');
  const lead={nome:text(input.nome,100),clinica:text(input.clinica,150),instagram:text(input.instagram,31).replace(/^@/,''),cidade:text(input.cidade,100),cidade_outra:text(input.cidade_outra,100)};
  if(lead.nome.length<2||lead.clinica.length<2)throw new InputError('Preencha seu nome e o nome da clínica.');
  if(!validPhone(input.whatsapp))throw new InputError('Informe um WhatsApp válido com DDD.');
  lead.whatsapp='55'+phoneDigits(input.whatsapp);
  if(!validInstagram(lead.instagram))throw new InputError('Informe o @ do Instagram da clínica.');
  lead.instagram='@'+lead.instagram;
  if(!cidades.includes(lead.cidade)||(lead.cidade==='Outra'&&lead.cidade_outra.length<2))throw new InputError('Selecione a cidade da clínica.');
  if(lead.cidade!=='Outra')lead.cidade_outra='';
  for(const [key,values] of Object.entries(options)){if(!values.some(([value])=>value===input[key]))throw new InputError('Confira todas as respostas do formulário.');lead[key]=input[key];}
  const attribution=Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'].map(k=>[k,text(input.attribution?.[k],500)]));
  const fbp=/^fb\.\d+\.\d{10,16}\.\d+$/.test(input.fbp||'')?input.fbp:'';
  const fbc=/^fb\.\d+\.\d{10,16}\.[\w-]+$/.test(input.fbc||'')?text(input.fbc,600):'';
  return {...lead,attribution,fbp,fbc,consentimento:true,privacy_version:privacyVersion,event_id:input.event_id.toLowerCase(),origem:'landing-estetica'};
}
export function buildSubmission(input,{now=new Date(),ip='',userAgent='',siteUrl='https://www.themidiamarketing.com.br'}={}){
  const lead=validateLead(input),qualification=qualify(lead);
  const fingerprint=hash(JSON.stringify(lead));
  const submitted={...lead,...qualification,criado_em:now.toISOString(),fingerprint};
  const user_data={ph:[hash(lead.whatsapp)],fn:[hash(lead.nome.split(/\s+/)[0].toLowerCase())],country:[hash('br')],external_id:[hash(lead.event_id)]};
  if(ip)user_data.client_ip_address=ip;if(userAgent)user_data.client_user_agent=userAgent;if(lead.fbp)user_data.fbp=lead.fbp;if(lead.fbc)user_data.fbc=lead.fbc;
  const names=qualification.qualified?['Lead','LeadQualificado']:['Lead'];
  const events=names.map(event_name=>({event_name,event_id:lead.event_id,event_time:Math.floor(now.getTime()/1000),action_source:'website',event_source_url:new URL('/clinica-estetica/',siteUrl).href,user_data,custom_data:{content_name:'Diagnóstico clínica de estética',content_category:'landing-estetica'}}));
  const webhookPayload={event:'landing_estetica_lead',...submitted,...submitted.attribution,utms:submitted.attribution};
  return {submission:submitted,deliveries:[{channel:'n8n',payload:webhookPayload},{channel:'meta',payload:{data:events}}]};
}
