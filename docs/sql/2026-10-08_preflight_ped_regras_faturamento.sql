-- Pré-voo (só SELECT) de 2026-10-08_ped_regras_faturamento.sql
-- Esperado: tabela_existe = false (nome livre).
select to_regclass('public.ped_regras_faturamento') is not null as tabela_existe;
