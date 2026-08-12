# STATUS — App Unificado Stonni (Portal + CRM) · com_stonni

> Atualizado: 2026-08-12

## O que é
**PWA único** do Grupo Bononi que junta, num só app e uma só sidebar:
- **Portal do Representante** (base com_stonni): Catálogo, Pedidos, Materiais + IA.
- **CRM Atacado** (embutido, ex-`stonnidist-v2`): Home, Vendedores, Produtos, CRM, Prospecção.

Rep monta pedido a partir do catálogo; interno usa também o CRM. Acesso liberado pelo **Hub**.

## Onde está
- **Clone real (git):** `C:\CLAUDE\Projetos GitHub\com_stonni\com_stonni` (**ANINHADO** — remote `leobononi2906/com_stonni`, `main`).
  ⚠️ A pasta externa é só stub — editar a de **dentro**.
- **Deploy:** https://com-stonni.vercel.app · push na `main` → Vercel automático. **Push liberado** p/ o Claude (regra `Bash(git push:*)` no settings.local).
- **Alvo futuro:** **servidor interno** (ver seção Migração no `PLANO_UNIFICACAO.md`). App já é path-independent.
- **Supabase:** `vishxwdxqiygbxmtpfoy` (pedidos `ped_`, CRM `atac_`, materiais `prt_`).

## Acesso (100% pelo Hub — `user_metadata.modulos` + `admin`)
- `stonni` → Portal (Catálogo/Pedidos/Materiais). `atacado` → CRM (interno). `admin` → Configurações.
- **Admin vê tudo** (independe de módulo). **Rep (`stonni`) nunca vê o CRM.**
- Parede real = RLS por módulo **desacoplada** (projeto à parte — hoje anon lê tudo; ver PLANO).

## Stack / arquitetura
HTML/JS vanilla, sem build. `index.html` (shell/login/nav dirigido por `construirNav`) + módulos:
`catalogo.js`, `pedidos.js`, `configuracoes.js`, `gestao.js`, `materiais.js`, `wshare.js`, `crm.js`,
`catalogo-pdf.js`, `pdf-pedido.js`. **PWA:** `manifest.json` + `sw.js` (network-first, versionado).
**CRM:** vendorizado em `crm/` (cópia fiel do stonnidist-v2), embutido via **iframe same-origin** com **SSO** (sessão do localStorage). Doc do CRM em [`crm/docs/`](../crm/docs/).

## Feito na unificação (11–12/08/2026)
- **Casca PWA** + porteiro por módulo + **sidebar única** (Portal + seções do CRM agrupadas em DASHBOARD/OPERACIONAL; barra interna do CRM escondida via guard "is-embedded").
- **Materiais + IA** (`materiais.js`, IA via `assist-perguntar` com JWT).
- **Compartilhar no WhatsApp** (`wshare.js`, Web Share API c/ arquivos): Materiais, **fotos do produto** (multi-seleção, **sem legenda**), **catálogos-modelo** (faixa no topo do Catálogo, reusa `prt_materiais` categoria≈Catálogo) + **gerenciador admin** (upload PDF → Storage `prt-materiais`, sem SQL).
- **Configurações** reorganizada por área (Catálogo/Pedido/Bling) + tokens Bling mascarados.
- **SSO** do CRM no iframe (fix: `fazerLogin` persiste sessão no formato supabase-js).
- **Mobile/iOS:** ☰ respeita `safe-area-inset-top` (notch); drawer do Catálogo por transform; **drawer do CRM vira overlay fixo de tela cheia** (o painel de detalhe tinha largura 0 no mobile).

## Pendências / próximos passos
- [ ] **Validar no iPhone** (usuário): drawers abrindo (CRM overlay + Catálogo), SSO, WhatsApp anexando.
- [ ] **RLS** (fechar "anon lê tudo") — projeto de segurança do grupo, à parte; começar pelo mapa de leitura.
- [ ] **Migrar p/ servidor interno** (HTTPS p/ PWA; vendorizar supabase-js/fontes se offline).
- [ ] Reconciliar **Materiais/Configurações do CRM** vs os do Portal (hoje só os do Portal na sidebar).
- [ ] Trazer configs do CRM pra tela de Configurações (opcional).

## Dívidas e armadilhas conhecidas
- **Vendoring do `crm/`**: é cópia; re-sincronizar a cada deploy do `stonnidist-v2` (reaplicar o guard "is-embedded" + o overlay-fixo do drawer). Aposentar o stonnidist-v2 quando o unificado virar produção do CRM.
- **Wrapper + clone aninhado** (`com_stonni\com_stonni`) — editar o de dentro.
- **Preview local não compõe frames** (innerWidth=0) → **não confiar** em teste visual de `transform`/drawer no preview; validar no device real.
- `configuracoes.js` grande — refatoração gradual.

## Dev-log
- 2026-08-12 — Docs atualizadas + doc do CRM trazida p/ `crm/docs/`. Fixes mobile (notch, drawer CRM overlay, fotos sem legenda). Commits `a74bc6c`→`549a81a`.
- 2026-08-11 — Unificação: PWA, sidebar única, Materiais+IA, WhatsApp, catálogos, Config reorg, CRM embutido+SSO. Deploy em com-stonni.vercel.app.
