-- 2026-10-06_ped_configuracoes_fecha_bling.sql
-- aplicada em produção em 2026-10-06 (conferida: anon lê 0 linhas bling_*, PATCH do anon barrado com 401)
--
-- Por quê: ped_configuracoes guarda as credenciais do Bling (bling_access_token,
-- bling_refresh_token, bling_api_token, ...) e estava SEM RLS, com SELECT/INSERT/UPDATE/DELETE
-- liberados para a chave anon (que está no fonte de todo app). Qualquer pessoa com a chave
-- pública podia ler ou reescrever essas credenciais.
--
-- O que faz:
--   1. Liga a RLS em ped_configuracoes.
--   2. Linhas com chave 'bling_%' ficam só com o service_role (Edge Functions e crons ignoram RLS):
--      nenhuma policy as alcança, então anon e authenticated não leem nem gravam.
--   3. Linhas das demais chaves (título do catálogo, prazos, frete grátis, dados do PDF...):
--        - leitura continua aberta para anon e authenticated (o app lê antes e depois do login);
--        - escrita só para quem tem o módulo 'stonni' ou 'atacado' (ou é admin global) no JWT —
--          a mesma regra com que o Comercial Stonni deixa a pessoa entrar.
--   4. Tira do anon qualquer permissão de escrita e as permissões estruturais
--      (truncate/references/trigger) do anon e do authenticated.
--
-- O que NÃO faz: não apaga dado, não troca nem gira as credenciais do Bling (isso é no painel do
-- Bling, depois), não mexe em outras tabelas.
--
-- Efeito visível: a tela Configurações do Comercial Stonni deixa de listar as chaves bling_*
-- (e o bling-sync, que usa service_role, continua funcionando).
--
-- Como volta: bloco REVERTER no fim.

create or replace function public.ped_config_pode_editar()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'admin', '') = 'true'
      or coalesce((auth.jwt() -> 'user_metadata' -> 'modulos') ? 'stonni', false)
      or coalesce((auth.jwt() -> 'user_metadata' -> 'modulos') ? 'atacado', false);
$function$;

revoke all on function public.ped_config_pode_editar() from public, anon;
grant execute on function public.ped_config_pode_editar() to authenticated, service_role;

alter table public.ped_configuracoes enable row level security;

drop policy if exists ped_cfg_le_publicas on public.ped_configuracoes;
drop policy if exists ped_cfg_escreve_modulo on public.ped_configuracoes;

create policy ped_cfg_le_publicas on public.ped_configuracoes
  for select to anon, authenticated
  using (left(chave, 6) <> 'bling_');

create policy ped_cfg_escreve_modulo on public.ped_configuracoes
  for all to authenticated
  using (left(chave, 6) <> 'bling_' and public.ped_config_pode_editar())
  with check (left(chave, 6) <> 'bling_' and public.ped_config_pode_editar());

revoke insert, update, delete, truncate, references, trigger on public.ped_configuracoes from anon;
revoke truncate, references, trigger on public.ped_configuracoes from authenticated;

-- REVERTER (cola e roda):
--   drop policy ped_cfg_le_publicas on public.ped_configuracoes;
--   drop policy ped_cfg_escreve_modulo on public.ped_configuracoes;
--   alter table public.ped_configuracoes disable row level security;
--   grant all on public.ped_configuracoes to anon, authenticated;
--   drop function public.ped_config_pode_editar();
