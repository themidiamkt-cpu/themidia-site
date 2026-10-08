-- Funil /clinica-estetica. Projeto esperado: themidia / wkjnxohfggqwhemalelf.
-- Migração aditiva: mantém etapa, histórico e políticas existentes do CRM.
begin;
do $$ begin
  if to_regclass('public.leads_crm') is null then
    raise exception 'A tabela leads_crm do Master precisa existir antes desta migração.';
  end if;
end $$;

alter table public.leads_crm
  add column if not exists profissionais text,
  add column if not exists ticket_faixa text,
  add column if not exists anuncios_atuais text,
  add column if not exists verba_faixa text,
  add column if not exists atendimento_whatsapp text,
  add column if not exists cidade_outra text,
  add column if not exists status_qualificacao text,
  add column if not exists pontuacao integer,
  add column if not exists origem text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists landing_event_id uuid,
  add column if not exists consentimento_lgpd boolean,
  add column if not exists consentimento_em timestamptz,
  add column if not exists privacy_version text,
  add column if not exists landing_estetica jsonb;

create table if not exists public.landing_estetica_submissions (
  event_id uuid primary key,
  lead_id uuid not null references public.leads_crm(id),
  fingerprint text not null,
  qualified boolean not null,
  status_qualificacao text not null check (status_qualificacao in ('QUALIFICADO','PRIORIDADE ALTA','NUTRIÇÃO')),
  pontuacao integer not null check (pontuacao between 0 and 100),
  whatsapp text not null,
  payload jsonb not null,
  criado_em timestamptz not null default now()
);
create index if not exists landing_estetica_phone_date_idx on public.landing_estetica_submissions (whatsapp,criado_em desc);

create table if not exists public.landing_estetica_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.landing_estetica_submissions(event_id),
  channel text not null check (channel in ('n8n','meta')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','processing','delivered','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  delivered_at timestamptz,
  last_error text,
  unique(event_id,channel)
);
create index if not exists landing_estetica_delivery_pending_idx on public.landing_estetica_deliveries (available_at) where status in ('pending','failed','processing');
alter table public.landing_estetica_submissions enable row level security;
alter table public.landing_estetica_deliveries enable row level security;
revoke all on public.landing_estetica_submissions,public.landing_estetica_deliveries from public,anon,authenticated;
grant all on public.landing_estetica_submissions,public.landing_estetica_deliveries to service_role;

create or replace function public.landing_estetica_submit(p_submission jsonb,p_deliveries jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_event uuid := (p_submission->>'event_id')::uuid;
  v_phone text := p_submission->>'whatsapp';
  v_id uuid;
  v_existing public.landing_estetica_submissions%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('estetica-event-' || v_event::text,0));
  select * into v_existing from public.landing_estetica_submissions where event_id=v_event;
  if found then
    if v_existing.fingerprint <> p_submission->>'fingerprint' then raise exception 'EVENT_ID_CONFLICT'; end if;
    return jsonb_build_object('event_id',v_existing.event_id,'qualified',v_existing.qualified);
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('estetica-phone-' || v_phone,0));
  if exists (select 1 from public.landing_estetica_submissions where whatsapp=v_phone and criado_em>now()-interval '5 minutes') then
    raise exception 'RATE_LIMIT';
  end if;
  select id into v_id from public.leads_crm
    where right(regexp_replace(coalesce(whatsapp,''),'[^0-9]','','g'),11)=right(v_phone,11)
      and coalesce(etapa,'') not in ('fechado','perdido')
    order by created_at desc limit 1 for update;
  if v_id is null then
    begin
      insert into public.leads_crm(nome_empresa,responsavel,whatsapp,instagram,nicho,cidade,origem_lead,etapa)
      values(p_submission->>'clinica',p_submission->>'nome',v_phone,p_submission->>'instagram','Clínica de estética',
        case when p_submission->>'cidade'='Outra' then p_submission->>'cidade_outra' else p_submission->>'cidade' end,
        'landing-estetica','lead_novo') returning id into v_id;
    exception when unique_violation then
      select id into v_id from public.leads_crm where whatsapp=v_phone and coalesce(etapa,'') not in ('fechado','perdido') order by created_at desc limit 1 for update;
      if v_id is null then raise; end if;
    end;
  end if;
  update public.leads_crm set
    profissionais=p_submission->>'profissionais',ticket_faixa=p_submission->>'ticket',anuncios_atuais=p_submission->>'anuncios',
    verba_faixa=p_submission->>'verba',atendimento_whatsapp=p_submission->>'atendimento',cidade_outra=p_submission->>'cidade_outra',
    status_qualificacao=p_submission->>'status_qualificacao',pontuacao=(p_submission->>'pontuacao')::integer,
    origem='landing-estetica',utm_source=p_submission->'attribution'->>'utm_source',utm_medium=p_submission->'attribution'->>'utm_medium',
    utm_campaign=p_submission->'attribution'->>'utm_campaign',utm_content=p_submission->'attribution'->>'utm_content',
    utm_term=p_submission->'attribution'->>'utm_term',fbclid=p_submission->'attribution'->>'fbclid',landing_event_id=v_event,
    consentimento_lgpd=true,consentimento_em=now(),privacy_version=p_submission->>'privacy_version',landing_estetica=p_submission,updated_at=now()
  where id=v_id;
  insert into public.landing_estetica_submissions(event_id,lead_id,fingerprint,qualified,status_qualificacao,pontuacao,whatsapp,payload)
    values(v_event,v_id,p_submission->>'fingerprint',(p_submission->>'qualified')::boolean,p_submission->>'status_qualificacao',(p_submission->>'pontuacao')::integer,v_phone,p_submission);
  insert into public.landing_estetica_deliveries(event_id,channel,payload)
    select v_event,value->>'channel',value->'payload' from jsonb_array_elements(p_deliveries);
  return jsonb_build_object('event_id',v_event,'qualified',(p_submission->>'qualified')::boolean);
end $$;

create or replace function public.landing_estetica_claim_deliveries(p_event_id uuid default null,p_limit integer default 10)
returns setof public.landing_estetica_deliveries language sql security invoker set search_path = '' as $$
  update public.landing_estetica_deliveries d set status='processing',locked_at=now(),attempts=attempts+1
  where d.id in (
    select q.id from public.landing_estetica_deliveries q
    where (p_event_id is null or q.event_id=p_event_id) and q.attempts<12
      and ((q.status in ('pending','failed') and q.available_at<=now()) or (q.status='processing' and q.locked_at<now()-interval '2 minutes'))
    order by q.available_at limit least(greatest(p_limit,1),20) for update skip locked
  ) returning d.*;
$$;

create or replace function public.landing_estetica_finish_delivery(p_id uuid,p_status text,p_error text default null)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if p_status not in ('delivered','failed') then raise exception 'INVALID_DELIVERY_STATUS'; end if;
  update public.landing_estetica_deliveries set status=p_status,
    delivered_at=case when p_status='delivered' then now() else null end,
    last_error=left(p_error,100),locked_at=null,
    available_at=now()+make_interval(secs=>least(3600,(30*power(2,least(attempts,7)))::integer))
  where id=p_id and status='processing';
end $$;

revoke all on function public.landing_estetica_submit(jsonb,jsonb),public.landing_estetica_claim_deliveries(uuid,integer),public.landing_estetica_finish_delivery(uuid,text,text) from public,anon,authenticated;
grant execute on function public.landing_estetica_submit(jsonb,jsonb),public.landing_estetica_claim_deliveries(uuid,integer),public.landing_estetica_finish_delivery(uuid,text,text) to service_role;
commit;
