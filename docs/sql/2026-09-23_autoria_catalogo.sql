-- Adiciona rastreamento de autoria em ped_catalogo_produtos (quem cadastrou / quem alterou
-- por último um produto do catálogo).
--
-- O QUE FAZ:
--   - Adiciona duas colunas novas: criado_por (text), alterado_por (text) — e-mail do usuário.
--   - Reaproveita as colunas já existentes criado_em / atualizado_em (não cria duplicata).
--
-- O QUE NÃO FAZ:
--   - Não faz backfill dos 94 produtos já cadastrados: não há registro de quem os criou, então
--     criado_por/alterado_por ficam NULL nesses até a próxima edição. Não inventamos autor.
--   - Não apaga nem renomeia nenhuma coluna existente.
--   - Não adiciona NOT NULL nem CHECK — front antigo (antes do próximo push) continua gravando
--     sem esses campos sem quebrar.
--
-- aplicada em produção em 2026-09-23

alter table public.ped_catalogo_produtos
  add column if not exists criado_por text,
  add column if not exists alterado_por text;

comment on column public.ped_catalogo_produtos.criado_por is 'E-mail de quem cadastrou o produto (preenchido pelo front a partir da sessão logada; NULL para produtos cadastrados antes desta coluna existir)';
comment on column public.ped_catalogo_produtos.alterado_por is 'E-mail de quem fez a última alteração no produto (preenchido pelo front a partir da sessão logada)';
