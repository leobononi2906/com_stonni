-- Pré-voo (só-SELECT) para: adicionar rastreamento de autoria em ped_catalogo_produtos
-- Não altera nada. Roda em modo leitura (BEGIN; READ ONLY; ROLLBACK).

-- G. Impressão digital do banco
select 'G-banco' as bloco, current_database() as detalhe, null::bigint as n
union all
select 'G-contagem-produtos', 'ped_catalogo_produtos', count(*) from ped_catalogo_produtos

union all

-- A. Colunas já existentes na tabela alvo (esperado: NÃO existir criado_por/alterado_por/
-- criado_em/alterado_em ainda; e conferir se já existe algum created_at/updated_at nativo)
select 'A-coluna-existe: ' || column_name, data_type, null
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ped_catalogo_produtos'
  and column_name in ('criado_por','alterado_por','criado_em','alterado_em',
                       'created_at','updated_at','created_by','updated_by','user_id')

union all

-- A2. Todas as colunas da tabela, para conferência geral do schema atual
select 'A2-schema-atual: ' || column_name, data_type, ordinal_position::bigint
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ped_catalogo_produtos'

union all

-- F. Confirma que a tabela não tem trigger/policy que dependa do shape atual de colunas
-- (grep por trigger existente na tabela)
select 'F-trigger: ' || trigger_name, event_manipulation, null
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table = 'ped_catalogo_produtos'

order by 1;
