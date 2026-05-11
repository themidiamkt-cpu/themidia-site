create table if not exists public.user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role text not null,
  created_at timestamptz default now(),
  primary key (user_id, role)
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  category text,
  excerpt text,
  content text not null,
  published_at date default current_date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists posts_set_updated_at on public.posts;
create trigger posts_set_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

alter table posts enable row level security;

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

alter table public.user_roles enable row level security;

drop policy if exists "admins can read user roles" on public.user_roles;
drop policy if exists "admins can insert user roles" on public.user_roles;
drop policy if exists "admins can update user roles" on public.user_roles;
drop policy if exists "admins can delete user roles" on public.user_roles;

create policy "admins can read user roles"
on public.user_roles for select
to authenticated
using (public.is_admin(auth.uid()));

create policy "admins can insert user roles"
on public.user_roles for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "admins can update user roles"
on public.user_roles for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admins can delete user roles"
on public.user_roles for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "public can read posts" on posts;
create policy "public can read posts"
on posts for select
using (true);

drop policy if exists "authenticated can insert own posts" on posts;
drop policy if exists "authenticated can update own posts" on posts;
drop policy if exists "authenticated can delete own posts" on posts;
drop policy if exists "admins can insert posts" on posts;
drop policy if exists "admins can update posts" on posts;
drop policy if exists "admins can delete posts" on posts;

create policy "admins can insert posts"
on posts for insert
to authenticated
with check (public.is_admin(auth.uid()));

create policy "admins can update posts"
on posts for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "admins can delete posts"
on posts for delete
to authenticated
using (public.is_admin(auth.uid()));

insert into public.posts (slug, title, category, excerpt, content, published_at)
values
  (
    'como-reduzir-custo-por-lead',
    'Como reduzir o custo por lead no Meta Ads sem perder volume',
    'Meta Ads',
    'Um checklist para revisar campanha, criativo, oferta, segmentação e página de destino antes de aumentar investimento.',
    'Antes de mexer no orçamento, olhe para a oferta, o criativo e a qualidade da página de destino. Na maioria das campanhas, o custo por lead cai quando a mensagem fica mais clara e o caminho de conversão fica mais simples.

1. Revise a promessa do anúncio
O criativo precisa mostrar para quem é a oferta, qual problema resolve e qual próximo passo o cliente deve tomar.

2. Separe volume de qualidade
Lead barato que não compra pode sair caro. Acompanhe CPL junto com taxa de atendimento, comparecimento e venda.

3. Teste uma variável por vez
Troque título, imagem, público ou oferta em ciclos separados para entender o que realmente move o resultado.',
    '2026-05-09'
  ),
  (
    'google-ads-negocios-locais',
    'Google Ads para negócios locais em Campinas e região',
    'Google Ads',
    'Como estruturar campanhas para captar clientes próximos, separar intenção de busca e medir ligações, rotas e conversas.',
    'Negócios locais precisam capturar intenção perto da operação. O segredo é combinar palavras-chave com localização, extensões e mensuração correta de ligações, rotas e WhatsApp.

Comece pela intenção
Separe buscas de compra, comparação e pesquisa genérica. Cada grupo pede anúncio, página e orçamento próprios.

Meça o contato certo
Configure conversões para ligações, formulários, cliques no WhatsApp e rotas. Sem isso, a campanha otimiza para sinais fracos.

Ajuste por região
Campinas, Hortolândia e cidades próximas podem ter custos e comportamentos diferentes. Analise por localidade antes de escalar.',
    '2026-05-16'
  ),
  (
    'roas-vs-roi',
    'ROAS vs ROI: qual métrica importa para o seu negócio?',
    'Estratégia',
    'Entenda quando olhar receita de anúncio, quando olhar lucro real e como isso muda a decisão de escalar uma campanha.',
    'ROAS mostra quanto de receita voltou para cada real investido em mídia. ROI mostra lucro depois dos custos. Os dois ajudam, mas respondem perguntas diferentes.

Quando olhar ROAS
Use ROAS para comparar campanhas, canais e criativos quando a margem é conhecida e estável.

Quando olhar ROI
Use ROI para decidir se a operação como um todo está ganhando dinheiro depois de mídia, produto, equipe e impostos.

Como tomar decisão
Escalar campanha só pelo ROAS pode mascarar prejuízo. O ideal é acompanhar ROAS, margem e lucro líquido juntos.',
    '2026-05-23'
  )
on conflict (slug) do update
set
  title = excluded.title,
  category = excluded.category,
  excerpt = excluded.excerpt,
  content = excluded.content,
  published_at = excluded.published_at;
