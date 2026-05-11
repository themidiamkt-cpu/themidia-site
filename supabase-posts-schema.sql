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

delete from public.posts
where slug in (
  'como-reduzir-custo-por-lead',
  'google-ads-negocios-locais',
  'roas-vs-roi'
);

insert into public.posts (slug, title, category, excerpt, content, published_at)
values
  (
    'negocio-local-invisivel-digital',
    'Por que negócio local invisível no digital perde clientes todos os dias',
    'SEO local',
    'Seu negócio é bom mas os clientes não chegam? Descubra por que negócios locais invisíveis no digital perdem vendas todos os dias e como resolver isso.',
    'Existe um problema silencioso que afeta a maioria dos negócios locais. O negócio é bom. O dono é dedicado. O produto tem qualidade. Mas o movimento está abaixo do potencial. O motivo quase sempre é o mesmo: invisibilidade digital. Neste artigo vamos explicar o que isso significa, por que acontece e como resolver.

O mito do boca a boca como estratégia de crescimento

Indicação é importante. Ela mostra que o cliente confia na empresa e recomenda o serviço para outras pessoas. Mas depender apenas disso limita o crescimento.

Boca a boca fideliza, não escala
O boca a boca ajuda a manter reputação, mas não garante volume previsível de novos contatos todos os dias. Para crescer, o negócio precisa aparecer para quem ainda não conhece a marca.

O cliente novo não te conhece ainda
Quem nunca ouviu falar da sua empresa dificilmente vai procurar diretamente pelo seu nome. Esse cliente pesquisa no Google, vê anúncios, compara opções e escolhe quem aparece com clareza e confiança.

O que significa aparecer no digital de verdade

Aparecer no digital não é apenas ter uma conta no Instagram ou um site parado. É estar presente nos canais certos, com mensagem clara, para o público certo.

Diferença entre presença orgânica e presença paga
A presença orgânica acontece quando sua empresa aparece por conteúdo, SEO, Google Meu Negócio e autoridade construída ao longo do tempo. A presença paga acontece quando você investe em anúncios para alcançar pessoas com intenção de compra ou interesse no seu serviço.

Por que só ter Instagram não é suficiente
O Instagram ajuda na percepção da marca, mas nem sempre entrega seu conteúdo para quem está pronto para comprar. Um negócio local precisa combinar presença social, busca no Google, anúncios e páginas bem estruturadas.

Como o tráfego pago resolve o problema da invisibilidade

O tráfego pago coloca sua empresa na frente de pessoas que podem comprar, pedir orçamento, visitar o local ou chamar no WhatsApp.

Aparecer pra quem já quer o que você vende
Campanhas bem configuradas permitem alcançar pessoas pesquisando por soluções parecidas ou demonstrando interesse real no que sua empresa oferece.

Controle de raio, público e horário
Para negócios locais, esse controle é decisivo. É possível anunciar apenas em Campinas, Hortolândia e região, escolher perfis de público e concentrar verba nos horários de maior chance de conversão.

Quais negócios locais mais se beneficiam do tráfego pago

Qualquer negócio que depende de fluxo, agenda ou pedidos pode se beneficiar quando existe estratégia.

Restaurantes e bares
Anúncios ajudam a divulgar promoções, delivery, eventos, reservas e diferenciais para pessoas próximas ao estabelecimento.

Clínicas e estéticas
Campanhas podem gerar pedidos de avaliação, agendamentos e conversas qualificadas pelo WhatsApp.

Lojas e e-commerces locais
O tráfego pago ajuda a divulgar produtos, ofertas e catálogos para clientes próximos ou para compradores com maior chance de conversão.

Quanto custa ser invisível no digital?

A invisibilidade custa vendas que nunca chegam ao caixa. Custa oportunidades que vão para concorrentes. Custa agenda vazia, baixo movimento e dependência de indicações imprevisíveis.

Quando um cliente procura por negócio local marketing digital Campinas, tráfego pago para pequenos negócios Campinas ou anúncios Meta Ads negócio local Hortolândia, ele está demonstrando intenção. Se sua empresa não aparece, outra aparece no seu lugar.

Por onde começar se você nunca anunciou

O primeiro passo é entender o objetivo: mais mensagens, mais ligações, mais visitas, mais orçamentos ou mais vendas.

Depois disso, é preciso organizar a oferta, preparar uma página ou canal de atendimento, instalar rastreamento e criar campanhas com segmentação local. Começar pequeno, medir tudo e ajustar com consistência costuma ser o caminho mais inteligente.

Conclusão

Um negócio local pode ser excelente e ainda assim perder clientes todos os dias por não aparecer no digital.

Marketing digital para negócios locais não é sobre postar por postar. É sobre ser encontrado, gerar confiança e transformar atenção em oportunidade real.

Quer entender como o tráfego pago pode mudar os resultados do seu negócio? Faz seu diagnóstico gratuito com a The Mídia. Chama no WhatsApp agora.',
    '2026-05-30'
  ),
  (
    'como-atrair-mais-clientes-pelo-google',
    'Como atrair mais clientes pelo Google sem depender apenas de indicação',
    'SEO',
    'Entenda como aparecer para clientes que já pesquisam pelos serviços e produtos que sua empresa oferece.',
    'Todo empresário quer a mesma coisa: mais clientes entrando em contato todos os dias.

O problema é que muitas empresas ainda dependem apenas de indicação ou redes sociais para gerar vendas.

Enquanto isso, milhares de pessoas pesquisam no Google diariamente procurando exatamente pelos serviços e produtos que essas empresas oferecem.

O cliente já está procurando pela sua solução

Hoje, antes de comprar, as pessoas pesquisam:

“melhor clínica estética em Campinas”
“advogado trabalhista perto de mim”
“empresa de marketing para ecommerce”
“quanto custa gestor de tráfego”

Ou seja: existe demanda.

A questão é simples:
sua empresa aparece ou não aparece nessas pesquisas?

Por que algumas empresas aparecem primeiro no Google?

O Google prioriza empresas que demonstram:

relevância
autoridade
confiança
conteúdo útil
site bem estruturado

Não basta apenas ter um site bonito.

É necessário trabalhar SEO.

O que é SEO?

SEO é o conjunto de estratégias que ajudam seu site a aparecer organicamente no Google sem depender apenas de anúncios.

Quando bem feito, o SEO transforma o site em uma máquina de geração de oportunidades.

Como empresas conseguem mais visitas pelo Google?

Produzindo conteúdo estratégico
O Google prioriza sites que respondem dúvidas reais das pessoas.

Utilizando palavras-chave
Seu site precisa conter os termos que os clientes pesquisam.

Melhorando velocidade e experiência
Sites lentos perdem posicionamento.

Criando autoridade
Quanto mais confiança o site transmite, maior a chance de aparecer bem.

O maior erro das empresas

Muita gente cria um site e acredita que os clientes vão aparecer automaticamente.

Mas sem conteúdo, otimização e estratégia, o site praticamente fica invisível.

SEO é investimento de longo prazo

Diferente de anúncios, o SEO continua gerando tráfego mesmo sem investimento diário em mídia.

Por isso, empresas que aparecem no Google de forma orgânica costumam ter aquisição de clientes mais previsível e sustentável.

Conclusão

Se as pessoas pesquisam pelo que sua empresa vende e você não aparece no Google, existe uma grande chance de estar perdendo clientes para concorrentes todos os dias.

SEO deixou de ser diferencial.
Hoje ele faz parte do crescimento de empresas que querem gerar oportunidades continuamente.',
    '2026-05-09'
  ),
  (
    'por-que-sua-empresa-nao-aparece-no-google',
    'Por que sua empresa não aparece no Google? Veja os principais motivos',
    'SEO',
    'Veja os problemas mais comuns que impedem uma empresa de aparecer bem nas buscas do Google.',
    'Muitos empresários fazem a mesma pergunta:
“Por que meu concorrente aparece no Google e minha empresa não?”

Na maioria das vezes, o problema não está no serviço prestado.

O problema está na estrutura digital da empresa.

O Google precisa entender seu negócio

O Google analisa milhares de fatores antes de mostrar um site nos resultados.

Se o seu site não deixa claro:

o que sua empresa faz
onde atua
para quem vende
quais problemas resolve

o Google dificilmente vai posicionar sua empresa bem.

Principais motivos que impedem empresas de aparecer no Google

Falta de conteúdo
Sites com poucas informações têm menos relevância.

Ausência de palavras-chave
Se o site não usa os termos que os clientes pesquisam, o Google não consegue relacionar sua empresa às buscas.

Site lento
Velocidade impacta diretamente posicionamento.

Estrutura ruim
Menus confusos, páginas quebradas e experiência ruim prejudicam SEO.

Pouca autoridade
Sites novos ou sem presença digital forte têm mais dificuldade para competir.

O comportamento do consumidor mudou

Hoje, antes de contratar uma empresa, o cliente pesquisa.

Ele compara:

reputação
avaliações
conteúdo
profissionalismo
autoridade

Empresas que aparecem no Google passam mais confiança.

SEO não acontece da noite para o dia

Esse é um dos pontos mais importantes.

SEO é construção.

Quanto mais conteúdo estratégico e autoridade sua empresa desenvolve, maiores são as chances de crescer organicamente.

O que ajuda uma empresa a crescer no Google?

Algumas ações fazem bastante diferença:

produção de blog
otimização do site
páginas estratégicas
SEO local
palavras-chave corretas
velocidade do site
Google Meu Negócio

Conclusão

Não aparecer no Google hoje significa perder oportunidades diariamente.

Empresas que investem em SEO conseguem aumentar visibilidade, gerar mais contatos e construir autoridade no mercado de forma contínua.',
    '2026-05-16'
  ),
  (
    'site-bonito-nao-traz-clientes',
    'Site bonito não traz clientes: o que realmente faz uma empresa crescer no Google',
    'SEO',
    'Design ajuda, mas conteúdo, estrutura e SEO fazem o site ser encontrado por quem já quer comprar.',
    'Muitas empresas investem em um site moderno, visual bonito e design sofisticado.

Mas depois de alguns meses percebem um problema:
o site não gera clientes.

Isso acontece porque um site sozinho não garante tráfego.

O Google não posiciona apenas design

Ter um site bonito ajuda na percepção da marca.

Mas o Google prioriza principalmente:

conteúdo relevante
experiência do usuário
velocidade
estrutura
autoridade
SEO

Ou seja: aparência sem estratégia não resolve.

O que realmente faz um site gerar clientes?

Conteúdo estratégico
Empresas que produzem artigos respondendo dúvidas reais têm mais chances de aparecer nas buscas.

SEO local
Principalmente para empresas físicas, aparecer em pesquisas regionais faz muita diferença.

Palavras-chave certas
Seu site precisa conversar com aquilo que as pessoas pesquisam.

Estrutura otimizada
Páginas organizadas facilitam o entendimento do Google.

Como o comportamento do cliente mudou?

Hoje o consumidor pesquisa antes de comprar.

Mesmo quando recebe indicação, ele costuma:

entrar no site
pesquisar no Google
analisar avaliações
comparar empresas

O site virou parte da decisão de compra.

Empresas invisíveis perdem mercado

Se o concorrente aparece no Google e sua empresa não, a tendência é que ele receba mais oportunidades.

E isso acontece todos os dias.

O erro mais comum

Muitas empresas criam o site e abandonam depois.

Sem atualização, sem conteúdo e sem SEO, o Google entende que aquele site tem pouca relevância.

O que empresas que crescem fazem diferente?

Normalmente elas:

alimentam o blog
trabalham SEO continuamente
melhoram velocidade
criam páginas estratégicas
produzem conteúdo útil
fortalecem autoridade online

Conclusão

Um site bonito ajuda.

Mas um site estruturado para SEO ajuda a empresa ser encontrada por pessoas que já estão procurando pelo que ela vende.

E isso muda completamente o potencial de crescimento do negócio.',
    '2026-05-23'
  )
on conflict (slug) do update
set
  title = excluded.title,
  category = excluded.category,
  excerpt = excluded.excerpt,
  content = excluded.content,
  published_at = excluded.published_at;
