# STATUS — Portal Representante Stonni (com_stonni)

> Atualizado: 2026-08-11

## O que é
App de **pedidos para representantes comerciais** (marca Stonni): o representante monta o pedido a partir do catálogo; o gestor aprova/fatura. Gera PDF de pedido e de catálogo (com/sem preço).

## Onde está
- **Clone real (git):** `C:\CLAUDE\Projetos GitHub\com_stonni\com_stonni` (**ANINHADO** — remote `leobononi2906/com_stonni`, branch `main`).
  ⚠️ A pasta externa `com_stonni\` é só README stub sem git — **editar lá = editar nada**.
- **Deploy:** https://com-stonni.vercel.app (chave de acesso no Hub = `stonni`) · push na `main` → Vercel automático.
- **Supabase:** `vishxwdxqiygbxmtpfoy` (prefixo de pedidos **`ped_`**, não `com_`).
- **Docs existentes:** `DOCUMENTACAO.md` (15,7KB, 30/07/2026) — arquitetura + modelo de dados + **correção da divergência de preço app×ERP (seção 8)**. Leitura obrigatória antes de mexer em preço.

## Stack
HTML/JS vanilla, sem build. `index.html` (42KB, shell/login/nav data-driven) + módulos JS: `configuracoes.js` (**123KB**, o maior), `pedidos.js` (56KB), `catalogo.js` (28KB), `gestao.js` (25KB), `pdf-pedido.js`, `catalogo-pdf.js`.

## Perfis / navegação (menu por perfil no `index.html`)
- **Parceiro/Portal:** Catálogo · Novo Pedido · Meus Pedidos.
- **Gestão:** + Pedidos · Configurações.
- **Admin:** idem Gestão.

## Dados
- **Próprias `ped_`:** `ped_pedidos`, `ped_pedido_itens`, `ped_configuracoes`, `ped_tabela_regras`, `ped_acoes_comerciais`, `ped_catalogo_produtos`.
- **Cliente:** `com_cliente` (único com prefixo `com_`).
- **Compartilhadas:** `vw_dim_cliente`, `vw_comercial_docs_faturados`, `vw_fb_produtos_compras`, `frt_produtos_dimensoes`, `app_logs`.
- **Edge functions:** `bling-proxy` (fotos/medidas do Bling), `admin-users`, `cotar-frete-index` (frete).

## Preço (cuidado)
O preço do catálogo vem do **ERP** (empresa 8, sincronizado via pg_cron). A seção 8 do `DOCUMENTACAO.md` documenta a correção da divergência app×ERP — não reintroduzir.

## Pendências / próximos passos
- [ ] Sem STATUS anterior — este é o primeiro. Backlog a levantar com o Leo.

## Dívidas e armadilhas conhecidas
- **Wrapper + clone aninhado** (`com_stonni\com_stonni`) — editar o de dentro.
- **13 usos de `confirm()` nativo** espalhados nos JS (dívida de UX; quebra no Safari iOS — padrão Bononi manda modal próprio).
- `configuracoes.js` com 123KB — candidato a refatoração gradual.
- Nome do app (`com_`) ≠ prefixo das tabelas de pedido (`ped_`).

## Dev-log
- 2026-07-14 (commit `5e92eb0`) — Opção de exibir preços no catálogo PDF.
