-- Regras de Faturamento (Portal do Representante) — 2026-10-08
-- Cria: tabela public.ped_regras_faturamento, só de inserção. Cada publicação
--   do admin é uma linha nova; a vigente é a mais recente (criado_em desc).
--   O histórico (quem publicou e quando) é a própria tabela.
-- Não altera nem apaga nada que já existe.
-- RLS: leitura para authenticated; insert só para admin do Hub
--   (user_metadata.admin = true) e com autor_email = e-mail do token.
--   Sem policy de update/delete + revoke: versão publicada não muda.
-- Como voltar: drop table public.ped_regras_faturamento;

create table if not exists public.ped_regras_faturamento (
  id            bigserial primary key,
  conteudo_html text        not null check (length(btrim(conteudo_html)) > 0),
  autor_email   text        not null default (auth.jwt() ->> 'email'),
  autor_nome    text,
  criado_em     timestamptz not null default now()
);

create index if not exists ped_regras_faturamento_criado_em_idx
  on public.ped_regras_faturamento (criado_em desc);

comment on table public.ped_regras_faturamento is
  'Regras de faturamento do Portal do Representante; uma linha por versão publicada (só insert).';

alter table public.ped_regras_faturamento enable row level security;

drop policy if exists regras_fat_select on public.ped_regras_faturamento;
create policy regras_fat_select on public.ped_regras_faturamento
  for select to authenticated using (true);

drop policy if exists regras_fat_insert_admin on public.ped_regras_faturamento;
create policy regras_fat_insert_admin on public.ped_regras_faturamento
  for insert to authenticated
  with check (
    coalesce((auth.jwt() -> 'user_metadata' ->> 'admin')::boolean, false)
    and autor_email = (auth.jwt() ->> 'email')
  );

revoke all on public.ped_regras_faturamento from anon;
revoke update, delete, truncate on public.ped_regras_faturamento from authenticated, service_role;
grant select, insert on public.ped_regras_faturamento to authenticated;
grant usage on sequence public.ped_regras_faturamento_id_seq to authenticated;
