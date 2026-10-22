import { isIP } from 'node:net';

const text = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const validInstagram = v => /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_.]{1,30}$/.test(v);
const digits = v => String(v || '').replace(/\D/g, '').replace(/^55/, '');
const validWhatsapp = v => { const d = digits(v); return /^(?:[1-9][1-9])9\d{8}$/.test(d); };
function json(res, status, body) { res.statusCode = status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.setHeader('Cache-Control','no-store'); res.end(JSON.stringify(body)); }
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'Envie os dados em JSON.' });
  const chunks=[]; let size=0;
  try {
    for await (const chunk of req) { size += chunk.length; if (size > 12000) return json(res,413,{error:'Envio muito grande.'}); chunks.push(chunk); }
    const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (text(input.website, 80)) return json(res,400,{error:'Não foi possível validar o envio.'});
    const nome=text(input.nome,100), instagram=text(input.instagram,31).replace(/^@/,'').replace(/\s/g,''), phone=digits(input.whatsapp);
    if (nome.length < 2 || !validInstagram(instagram) || !validWhatsapp(phone)) return json(res,400,{error:'Confira nome, Instagram e WhatsApp.'});
    const webhook=process.env.WEBHOOK_BLACK_CLINICAS_URL;
    if (!webhook) return json(res,503,{error:'O envio está temporariamente indisponível.'});
    const url=new URL(webhook); if(url.protocol!=='https:') return json(res,503,{error:'Integração indisponível.'});
    const allowed=['utm_source','utm_medium','utm_campaign','utm_content','utm_term','fbclid'];
    const payload={event:'lead_guia_black_clinicas',source:'lp_black_clinicas',lead_magnet:'guia_black_friday_clinicas_2026',nome,instagram,instagram_url:`https://www.instagram.com/${instagram}/`,whatsapp:`+55${phone}`,whatsapp_digits:`55${phone}`,submitted_at:new Date().toISOString(),page_url:text(input.page_url,500),...Object.fromEntries(allowed.map(k=>[k,text(input[k],500)||null]))};
    const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(8000)});
    if(!response.ok) return json(res,503,{error:'Não conseguimos registrar sua solicitação agora. Tente novamente.'});
    return json(res,200,{ok:true});
  } catch (err) { return json(res,400,{error:err instanceof SyntaxError?'Dados inválidos.':'Não conseguimos registrar sua solicitação agora. Tente novamente.'}); }
}
