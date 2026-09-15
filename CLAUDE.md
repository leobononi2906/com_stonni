# Comercial Stonni / CRM Atacado (com_stonni) — guia do projeto

> **Estado atual, pendências e dev-log: `docs/STATUS.md`.** Visão geral em `DOCUMENTACAO.md` e
> `PLANO_UNIFICACAO.md`. Este arquivo é só o que é estável.
> Contexto do grupo e regras de banco: skill `bononi-contexto`. Publicar:
> `publicar-e-conferir`. Registrar: `registrar-status`.

## O que é

**PWA único** que junta, numa só sidebar:

- **Portal do Representante** (base `com_stonni`): catálogo, pedidos, materiais + IA.
- **CRM Atacado** (embutido, ex-`stonnidist-v2`): home, vendedores, produtos, CRM, promoções.

## Onde está

- **Clone nesta máquina (`ecommerce06`):** `C:\Aplicações da bononi\com_stonni`.
  Na máquina do Leo é aninhado (`com_stonni\com_stonni`) e a externa é stub.
- **Remote:** `leobononi2906/com_stonni`, branch `main`. Push na `main` = produção.
- **Deploy:** https://com-stonni.vercel.app
- **Supabase:** `vishxwdxqiygbxmtpfoy` — prefixos `ped_`, `atac_`, `app_` (+ `prt_`, `frt_`).
- **Alvo futuro:** servidor interno — ver a seção Migração do `PLANO_UNIFICACAO.md`.

## Stack

HTML + JS puro, sem build: `index.html` + `catalogo.js`, `crm.js`, `gestao.js`, `materiais.js`,
`configuracoes.js`, `catalogo-pdf.js` + pasta `crm/`. PWA com `manifest.json` e service worker.

## Armadilhas deste repo

- **São dois apps morando no mesmo lugar.** Mexer numa função compartilhada atinge o representante
  **e** o CRM do atacado, que têm públicos diferentes. Confira os dois antes de publicar.
- **Push está liberado para o Claude neste repo** (regra `Bash(git push:*)` no `settings.local`).
  Isso muda quem aperta o botão, não a regra: **commit e push só quando ele pedir**.
- **É PWA**: deploy no ar não é app atualizado no celular. Ao mudar o shell, suba o `CACHE` do
  service worker; sem isso o aparelho segue na versão velha sem erro nenhum.
- **Geração de PDF do catálogo** (`catalogo-pdf.js`) é a parte que mais quebra calada — mudança de
  fonte, cor ou imagem pode sair do papel sem nenhum erro no console. Gere um PDF de verdade
  depois de mexer.
- Função chamada por `onclick` precisa estar exposta em `window.*`.
