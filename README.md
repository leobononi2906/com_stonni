# Stonni — App Unificado (Portal + CRM)

PWA único do Grupo Bononi: **Portal do Representante** (catálogo, pedidos, materiais + IA) +
**CRM Atacado** embutido (Home, Vendedores, Produtos, CRM, Prospecção), com uma sidebar só.
Acesso liberado pelo **Hub** (`stonni` = portal, `atacado` = CRM, `admin` = tudo).

## Stack
- HTML/JS vanilla, sem build · PWA (`manifest.json` + `sw.js`)
- Supabase (banco + auth + edge functions) · Vercel (deploy: push `main` → automático)
- CRM vendorizado em `crm/` (cópia do `stonnidist-v2`), embutido via iframe same-origin + SSO

## Estrutura
- `index.html` — shell (login + sidebar + roteador `renderPagina`)
- `catalogo.js` · `pedidos.js` · `configuracoes.js` · `gestao.js` · `materiais.js` · `wshare.js` · `crm.js`
- `catalogo-pdf.js` · `pdf-pedido.js` · `manifest.json` · `sw.js` · `logo.png`
- `crm/` — CRM vendorizado (app completo + `crm/docs/`)

## Documentação
- **`docs/STATUS.md`** — estado atual, o que foi feito, pendências (comece por aqui).
- **`PLANO_UNIFICACAO.md`** — plano/decisões da unificação (fases, RLS, migração p/ servidor interno).
- **`DOCUMENTACAO.md`** — doc técnica do portal (arquitetura, dados, correção de preço app×ERP).
- **`crm/docs/`** — documentação do CRM (cópia do stonnidist-v2).
