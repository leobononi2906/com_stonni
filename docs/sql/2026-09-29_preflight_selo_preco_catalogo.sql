-- Pré-voo (só-SELECT) para: colunas de preço do selo em ped_catalogo_produtos
select 'G-banco' as bloco, current_database() as detalhe, null::bigint as n
union all
select 'G-produtos-com-selo', 'ped_catalogo_produtos', count(*) from ped_catalogo_produtos where selo is not null
union all
-- Esperado: nenhuma linha (colunas ainda não existem)
select 'A-coluna-existe: ' || column_name, data_type, null
from information_schema.columns
where table_schema = 'public' and table_name = 'ped_catalogo_produtos'
  and column_name in ('selo_preco_original','selo_preco_promo');
