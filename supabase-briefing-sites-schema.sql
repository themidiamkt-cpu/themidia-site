create table if not exists public.user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz default now(),
  primary key (user_id, role)
);

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_roles.user_id = check_user_id
      and user_roles.role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

create table if not exists public.briefing_sites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  nome_empresa text not null,
  segmento text not null,
  descricao_empresa text not null,
  diferencial text not null,
  cliente_ideal text not null,
  regiao_atendimento text not null,
  objetivo_site text not null,
  acao_principal text not null,
  servicos_destaque text not null,
  servico_estrategico text,
  cases text,
  referencias text,
  estilo_visual text,
  observacoes_design text,
  whatsapp text not null,
  email text not null,
  endereco text not null,
  integracoes jsonb default '[]'::jsonb,
  observacoes_finais text,
  arquivos jsonb default '{}'::jsonb,
  status text not null default 'Novo',
  constraint briefing_sites_status_check check (
    status in ('Novo', 'Em análise', 'Em desenvolvimento', 'Aguardando cliente', 'Concluído')
  )
);

alter table public.briefing_sites enable row level security;

drop policy if exists "public can create briefing sites" on public.briefing_sites;
drop policy if exists "admins can read briefing sites" on public.briefing_sites;
drop policy if exists "admins can update briefing sites" on public.briefing_sites;
drop policy if exists "admins can delete briefing sites" on public.briefing_sites;

create policy "public can create briefing sites"
on public.briefing_sites for insert
to anon, authenticated
with check (true);

create policy "admins can read briefing sites"
on public.briefing_sites for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "admins can update briefing sites"
on public.briefing_sites for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admins can delete briefing sites"
on public.briefing_sites for delete
to authenticated
using (public.is_admin(auth.uid()));

insert into storage.buckets (id, name, public)
values ('briefing-site-files', 'briefing-site-files', false)
on conflict (id) do nothing;

drop policy if exists "public can upload briefing site files" on storage.objects;
drop policy if exists "admins can read briefing site files" on storage.objects;
drop policy if exists "admins can update briefing site files" on storage.objects;
drop policy if exists "admins can delete briefing site files" on storage.objects;

create policy "public can upload briefing site files"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'briefing-site-files');

create policy "admins can read briefing site files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'briefing-site-files'
  and public.is_admin(auth.uid())
);

create policy "admins can update briefing site files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'briefing-site-files'
  and public.is_admin(auth.uid())
)
with check (
  bucket_id = 'briefing-site-files'
  and public.is_admin(auth.uid())
);

create policy "admins can delete briefing site files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'briefing-site-files'
  and public.is_admin(auth.uid())
);
