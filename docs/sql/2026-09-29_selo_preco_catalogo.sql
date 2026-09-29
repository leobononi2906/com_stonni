-- aplicada em produção em 2026-09-29
-- Preço do selo (Promoção / Queima de estoque) em ped_catalogo_produtos
-- Cria: selo_preco_original e selo_preco_promo (numeric(12,2), nulas).
-- Não apaga nada; linhas existentes ficam com as duas nulas (o catálogo segue
-- mostrando o preço de tabela / ação comercial como antes).
-- Como voltar: alter table public.ped_catalogo_produtos
--   drop column selo_preco_original, drop column selo_preco_promo;

alter table public.ped_catalogo_produtos
  add column if not exists selo_preco_original numeric(12,2) null,
  add column if not exists selo_preco_promo    numeric(12,2) null;

comment on column public.ped_catalogo_produtos.selo_preco_original is
  'Valor original exibido riscado no catálogo quando o produto tem selo';
comment on column public.ped_catalogo_produtos.selo_preco_promo is
  'Valor com desconto exibido no catálogo quando o produto tem selo';
