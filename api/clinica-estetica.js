import { createService } from '../lib/clinica-estetica/service.mjs';
import { InputError } from '../lib/clinica-estetica/lead.mjs';
import { isIP } from 'node:net';
function respond(res,status,body){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));}
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return respond(res,405,{error:'Método não permitido.'});}
  if(!(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return respond(res,415,{error:'Envie os dados em JSON.'});
  const origin=req.headers.origin;
  const forwarded=req.headers['x-forwarded-host'];
  const host=String(process.env.VERCEL?forwarded||req.headers.host:req.headers.host||'').split(',')[0].trim();
  // Comparação por origem, nunca por prefixo. Não habilita CORS público.
  if(origin){try{const u=new URL(origin);const allowed=new Set([`https://${host}`,process.env.PUBLIC_SITE_URL&&new URL(process.env.PUBLIC_SITE_URL).origin]);if(!process.env.VERCEL&&['localhost','127.0.0.1'].includes(u.hostname))allowed.add(`http://${host}`);if(!allowed.has(u.origin))return respond(res,403,{error:'Origem não permitida.'});}catch{return respond(res,403,{error:'Origem não permitida.'});}}
  if(Number(req.headers['content-length']||0)>16384)return respond(res,413,{error:'Envio muito grande.'});
  try{
    let input=req.body;
    if(input===undefined){const chunks=[];let size=0;for await(const chunk of req){size+=Buffer.byteLength(chunk);if(size>16384)throw new InputError('Envio muito grande.',413);chunks.push(Buffer.from(chunk));}input=Buffer.concat(chunks).toString('utf8');}
    if(typeof input==='string'||Buffer.isBuffer(input)){if(Buffer.byteLength(input)>16384)throw new InputError('Envio muito grande.',413);input=JSON.parse(input.toString());}
    if(Buffer.byteLength(JSON.stringify(input||{}))>16384)throw new InputError('Envio muito grande.',413);
    const forwardedIp=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'').split(',')[0].trim();
    const ip=process.env.VERCEL&&isIP(forwardedIp)?forwardedIp:'';
    const result=await createService().submit(input,{ip,userAgent:String(req.headers['user-agent']||'').slice(0,500)});
    return respond(res,200,result);
  }catch(err){if(err instanceof InputError)return respond(res,err.status,{error:err.message});if(err instanceof SyntaxError)return respond(res,400,{error:'Dados inválidos.'});console.error('landing_estetica: falha ao receber lead',err.name);return respond(res,503,{error:'Não foi possível concluir agora. Suas respostas foram mantidas. Tente novamente.'});}
}
