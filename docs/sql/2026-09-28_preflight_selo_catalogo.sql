-- Pré-voo (só-SELECT) para: coluna selo em ped_catalogo_produtos
-- Não altera nada. Roda em modo leitura (BEGIN; READ ONLY; ROLLBACK).

select 'G-banco' as bloco, current_database() as detalhe, null::bigint as n
union all
select 'G-contagem-produtos', 'ped_catalogo_produtos', count(*) from ped_catalogo_produtos
union all
-- Esperado: nenhuma linha (coluna ainda não existe)
select 'A-coluna-existe: ' || column_name, data_type, null
from information_schema.columns
where table_schema = 'public' and table_name = 'ped_catalogo_produtos' and column_name = 'selo'
union all
-- Esperado: nenhuma linha (constraint ainda não existe)
select 'B-constraint-existe', conname, null
from pg_constraint where conname = 'ped_catalogo_produtos_selo_check';
