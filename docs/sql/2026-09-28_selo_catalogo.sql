-- Selo do catálogo (Promoção / Queima de estoque) em ped_catalogo_produtos
-- Cria: coluna selo (text, nula) + CHECK dos valores aceitos.
-- Não apaga nada; linhas existentes ficam com selo = null (sem selo).
-- Como voltar: alter table public.ped_catalogo_produtos drop column selo;

alter table public.ped_catalogo_produtos
  add column if not exists selo text null;

alter table public.ped_catalogo_produtos
  drop constraint if exists ped_catalogo_produtos_selo_check;

alter table public.ped_catalogo_produtos
  add constraint ped_catalogo_produtos_selo_check
  check (selo is null or selo in ('promocao','queima_estoque'));

comment on column public.ped_catalogo_produtos.selo is
  'Selo exibido no card do catálogo do Portal do Representante: promocao | queima_estoque | null';
