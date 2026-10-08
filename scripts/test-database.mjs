import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { buildSubmission } from '../lib/clinica-estetica/lead.mjs';
// Banco PostgreSQL descartável em memória. Nunca usa credenciais remotas.
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table public.leads_crm(id uuid primary key default gen_random_uuid(),nome_empresa text not null,responsavel text,whatsapp text,instagram text,nicho text,cidade text,origem_lead text,etapa text not null default 'lead_novo',created_at timestamptz default now(),updated_at timestamptz default now());
 create unique index leads_crm_open_whatsapp_unique_idx on public.leads_crm(whatsapp) where whatsapp is not null and coalesce(etapa,'') not in ('fechado','perdido');grant all on public.leads_crm to service_role;`);
 const migration=await readFile('supabase/migrations/20261008194752_landing_estetica.sql','utf8');await db.exec(migration);await db.exec(migration);
 const lead={nome:'Teste Local',whatsapp:'19987654321',clinica:'Clínica Teste Local',instagram:'@teste.local',cidade:'Campinas',profissionais:'2-4',ticket:'400-800',anuncios:'sim',verba:'1500-3000',atendimento:'recepcionista',consentimento:true,privacy_version:'2026-10-08',event_id:randomUUID(),attribution:{utm_source:'instagram'}};
 const built=buildSubmission(lead);
 await db.exec('set role service_role');
 const submit=async(data=built)=>{const r=await db.query('select public.landing_estetica_submit($1::jsonb,$2::jsonb) as result',[JSON.stringify(data.submission),JSON.stringify(data.deliveries)]);return r.rows[0].result;};
 const first=await submit();assert.equal(first.qualified,true);assert.equal(first.event_id,lead.event_id);
 await submit();assert.equal((await db.query('select count(*)::integer n from public.leads_crm')).rows[0].n,1);assert.equal((await db.query('select count(*)::integer n from public.landing_estetica_deliveries')).rows[0].n,2);
 const stored=(await db.query('select * from public.leads_crm')).rows[0];assert.equal(stored.status_qualificacao,'PRIORIDADE ALTA');assert.equal(stored.utm_source,'instagram');assert.equal(stored.landing_estetica.clinica,lead.clinica);assert.equal(stored.consentimento_lgpd,true);
 await assert.rejects(()=>submit(buildSubmission({...lead,clinica:'Outra clínica'})),/EVENT_ID_CONFLICT/);
 await assert.rejects(()=>submit(buildSubmission({...lead,event_id:randomUUID()})),/RATE_LIMIT/);
 // Simula novo pedido após intervalo. Mantém negociação existente e associa a mesma clínica.
 await db.exec("update public.landing_estetica_submissions set criado_em=now()-interval '10 minutes';update public.leads_crm set etapa='proposta_enviada';");
 const next=buildSubmission({...lead,event_id:randomUUID(),profissionais:'solo'});await submit(next);assert.equal((await db.query('select count(*)::integer n from public.leads_crm')).rows[0].n,1);assert.equal((await db.query('select etapa from public.leads_crm')).rows[0].etapa,'proposta_enviada');
 let claim=await db.query('select * from public.landing_estetica_claim_deliveries($1::uuid,10)',[lead.event_id]);assert.equal(claim.rows.length,2);assert.equal((await db.query('select * from public.landing_estetica_claim_deliveries($1::uuid,10)',[lead.event_id])).rows.length,0);
 const job=claim.rows[0];await db.query("select public.landing_estetica_finish_delivery($1::uuid,'failed','test_failure')",[job.id]);assert.equal((await db.query('select status from public.landing_estetica_deliveries where id=$1',[job.id])).rows[0].status,'failed');
 await db.query("update public.landing_estetica_deliveries set available_at=now()-interval '1 second' where id=$1",[job.id]);claim=await db.query('select * from public.landing_estetica_claim_deliveries($1::uuid,10)',[lead.event_id]);assert.equal(claim.rows.length,1);assert.equal(claim.rows[0].attempts,2);
 await db.query("select public.landing_estetica_finish_delivery($1::uuid,'delivered',null)",[job.id]);assert.equal((await db.query('select * from public.landing_estetica_claim_deliveries($1::uuid,10)',[lead.event_id])).rows.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select * from public.landing_estetica_submissions'),/permission denied/);await assert.rejects(()=>submit(),/permission denied/);
 await db.exec('reset role;set role authenticated');await assert.rejects(()=>db.query('select * from public.landing_estetica_deliveries'),/permission denied/);
 console.log('PostgreSQL local: migração reaplicável, gravação, score, UTMs, deduplicação, proteção de etapa, limite por telefone, fila, retry e permissões verificados.');
}finally{await db.close();}
