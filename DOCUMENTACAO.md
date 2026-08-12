# Stonni — Portal do Representante · Documentação técnica

> **ATUALIZAÇÃO (12/08/2026):** este app virou o **App Unificado (Portal + CRM)**. Esta doc
> cobre a parte de **portal/pedidos/preço** (ainda válida). Para o estado atual da unificação,
> a sidebar única, o CRM embutido, mobile e RLS, ver **`docs/STATUS.md`** e **`PLANO_UNIFICACAO.md`**.
> Doc do CRM em **`crm/docs/`**.
>
> Documento auxiliar gerado em **30/07/2026**. Reúne o que se sabe sobre a arquitetura, o
> modelo de dados e as integrações da aplicação, além do diagnóstico e da correção da
> **divergência de preço** entre o app e o ERP (ver seção 8).

---

## 1. Visão geral

App web de **pedidos para representantes comerciais** da Stonni. Representante monta o
pedido a partir de um catálogo; gestor aprova/fatura. É um SPA **HTML/JS vanilla** (sem
build, sem framework), servido pela Vercel, com **Supabase** como backend (Postgres + Auth +
Storage).

- **Supabase project ref:** `vishxwdxqiygbxmtpfoy`
- **URL:** `https://vishxwdxqiygbxmtpfoy.supabase.co`
- Acesso ao banco: **PostgREST** (`/rest/v1/...`) via os helpers `supa()`, `supaInsert()`,
  `supaPatch()` definidos em `index.html`.

## 2. Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Shell principal: login, navegação, helpers de acesso ao Supabase (`supa`, `supaInsert`, `supaPatch`), `appLog`. Constante `SUPA_URL` e `HEADERS`. |
| `catalogo.js` | Catálogo visto pelo **representante** (cards, filtros por status/tag, disponibilidade). |
| `catalogo-pdf.js` | Geração de PDF do catálogo (com opção de exibir preços). |
| `pedidos.js` | Montagem de pedido, cliente, títulos em aberto, itens, cálculo de preço/IPI/ST. |
| `pdf-pedido.js` | Geração do PDF de um pedido. |
| `gestao.js` | Área do **gestor**: listar/abrir/aprovar/reprovar/faturar pedidos, upload de docs. |
| `configuracoes.js` | Admin: catálogo (CRUD produtos), tabelas de preço, ações comerciais, representantes, gestores, status, tags, logs. **Aqui vive a sincronização com o ERP.** |
| `logo.png` | Logo. |

## 3. Autenticação e perfis

- Login via **Supabase Auth** (`fazerLogin` em `index.html`).
- Dois perfis, resolvidos por tabela após o login (`carregarUsuario`):
  - **Gestor** → `ped_gestores`
  - **Representante** → `ped_representantes` (tem `id_tabela_preco`, `comissao_perc`,
    `id_vendedor_erp`, `regiao`).
- Atividade e erros registrados em `app_logs` (via `window.appLog`).

## 4. Modelo de dados (tabelas usadas pelo app)

**Domínio do portal (prefixo `ped_` / `app_`):**

| Tabela | Uso |
|---|---|
| `ped_catalogo_produtos` | Produtos do catálogo. Campos-chave abaixo (seção 6). |
| `ped_catalogo_tags` | Tags do catálogo. |
| `ped_tabelas_preco` | Tabelas de preço; `markup_global` (%) sobre `preco_aux2`; `desconto_avista_perc`. |
| `ped_tabela_regras` | Regras por tabela (exceções de preço/markup por produto/grupo). |
| `ped_acoes_comerciais` | Ações/promoções comerciais (por produto ou grupo). |
| `ped_representantes` | Representantes. |
| `ped_gestores` | Gestores. |
| `ped_status` | Status configuráveis dos pedidos. |
| `ped_pedidos` | Cabeçalho do pedido. |
| `ped_pedido_itens` | Itens do pedido. |
| `ped_pedido_log` | Histórico/auditoria por pedido. |
| `ped_configuracoes` | Configurações gerais + dados de PDF. |
| `app_logs` | Logs de atividade e erros do sistema (aba Logs). |
| `frt_produtos_dimensoes` | Peso/dimensões p/ cotação de frete (sync com Bling). |

**Domínio ERP / replicação Firebird (somente leitura, alimentado por integração externa):**

| Objeto | Uso |
|---|---|
| `vw_fb_produtos_compras` | **View do Firebird por empresa.** Dados do produto: `referencia`, `nome`, grupo/subgrupo, `preco_aux2` (preço de venda), `estoque_fisico`. Filtrada por `id_empresa`. |
| `comp_produtos_consolidado` | **Estoque consolidado** (projeto Compras): `estoque_total`, `situacao_estoque`, curva ABC, etc. Uma linha por `id_produto`, **somando todas as empresas**. |
| `vw_dim_cliente` | Dados do cliente (nome, etc.). |
| `cob_titulos_com_cliente` | Títulos em aberto do cliente (usado em pedidos.js). |
| `vw_comercial_docs_faturados` | Documentos faturados. |

> **Empresas (Firebird):** 1, 2, 3 e **8 = Bononi SC**. A Stonni vende a partir da
> **empresa 8**. `comp_produtos_consolidado.estoque_total` = soma das 4 empresas.

## 5. Integrações externas

- **ERP Firebird → Supabase:** replicação para as views `vw_fb_*` e a tabela
  `comp_produtos_consolidado`. É a fonte de **preço** (`preco_aux2`) e **estoque**.
- **Bling:** sincronização de **fotos** e **medidas** dos produtos (`cfgSincronizarBling`,
  `cfgSincronizarTodos`), casando pelo SKU (`referencia`). `frt_produtos_dimensoes` guarda as
  dimensões para frete.
- **Frete:** cotação usando peso/dimensões (logs via `appLog`).

## 6. Catálogo: campos e sincronização

`ped_catalogo_produtos` (colunas relevantes):

- `id` — PK interna do app.
- `id_produto_erp` — **código do produto no ERP** (chave de ligação com `vw_fb_*` e
  `comp_produtos_consolidado`). Ex.: 17468.
- `referencia`, `nome`, `grupo`/`subgrupo`, `fotos[]`, `foto_miniatura`, `tags[]`.
- `preco_base` — **preço de venda base** (deveria = `preco_aux2` da empresa 8). `numeric`.
- `ipi_perc`, `st_sp`, `st_pr` — impostos.
- `peso_kg`, `altura_cm`, `largura_cm`, `comprimento_cm`.
- **Estoque / disponibilidade:**
  - `estoque_manual` — quando preenchido, **prevalece** sobre o ERP.
  - `esgotado` — flag **automática** (sync marca `true` quando estoque efetivo < 5).
  - `esgotado_manual` — "FORA DE LINHA" definido na mão; o sync **nunca** toca aqui.
- `ativo`, `sync_fotos`, `sync_medidas`, `criado_em`, `atualizado_em`.

### 6.1 Sincronização de ESTOQUE (já existente)

Em `cfgCarregarCatalogo()` (`configuracoes.js:681`), toda vez que a aba **Catálogo** das
configurações é aberta:

1. Carrega `ped_catalogo_produtos` + `comp_produtos_consolidado` (`estoque_total`).
2. Estoque efetivo = `estoque_manual` se preenchido, senão `estoque_total` do ERP.
3. Se `estoque_efetivo < 5`, marca `esgotado = true` (só a flag automática).
4. `esgotado_manual` é preservado.

> **Importante:** o cálculo usa `comp_produtos_consolidado.estoque_total`, que **soma todas
> as empresas**. Já o cadastro de novo produto (`cfgBuscarERP`, `configuracoes.js:908`) lê
> `estoque_fisico` **só da empresa 8**. Essa é uma diferença de fonte conhecida (estoque
> consolidado vs SC), considerada **correta** pela operação: mostra-se o total das empresas.

> **Atualização (30/07/2026):** essa mesma regra agora também roda **server-side via pg_cron**
> (`frt_sync_estoque_catalogo`, seção 9.5), de hora em hora, para manter o flag `esgotado`
> atualizado mesmo sem ninguém abrir a tela. O sync no cliente continua existindo (redundante,
> sem problema). As travas manuais (`estoque_manual`, `esgotado_manual`) são preservadas.

### 6.2 Sincronização de PREÇO (implementada em 30/07/2026 — ver seção 8)

Antes **não existia**. `preco_base` era gravado **uma única vez**, no cadastro
(`cfgBuscarERP` → `Number(preco_aux2).toFixed(2)`), e depois só mudava editando na mão. Isso
causava divergência quando o preço no ERP mudava. Agora há uma rotina server-side (pg_cron).

## 7. Preço final ao representante

`preco_base` (empresa 8) é a base. Sobre ela incidem:

- `ped_tabelas_preco.markup_global` (%) — cada representante tem uma tabela
  (`id_tabela_preco`).
- `ped_tabela_regras` — exceções por produto/grupo.
- `ped_acoes_comerciais` — promoções (preço fixo ou desconto).
- IPI (`ipi_perc`) e ST (`st_sp`/`st_pr`) — **IPI é removido quando há ST ativo (SP ou PR)**.
- Desconto à vista (`desconto_avista_perc`).

Ou seja: **`preco_base` errado contamina todas as tabelas e todos os representantes.**

## 8. Divergência de preço — diagnóstico e correção (30/07/2026)

### Sintoma
Item **17468** ("AR CONDIC. CLEAN 12V. PAREDE") aparecia no app a **R$ 3.099**, mas no ERP
(Firebird, Bononi SC) o `preco_aux2` era **R$ 2.852,14**.

### Causa raiz
`preco_base` **não sincronizava**. Era um *snapshot* do `preco_aux2` no momento do cadastro
(produto cadastrado em 10/06/2026). O preço no ERP baixou depois, mas o app manteve o valor
antigo — diferente do estoque, que sincroniza a cada abertura do catálogo.

Levantamento mostrou **27 produtos** divergentes (não só o 17468), alguns bem relevantes:

| id_produto_erp | Produto | App (antigo) | ERP SC (correto) |
|---|---|---|---|
| 17330 | COMPRESSOR GELADEIRA C/MÓDULO | 1.070,62 | 549,84 |
| 17422 | GERADOR INVERTER 1500W 12V | 2.403,45 | 1.999,00 |
| 17421 | GERADOR INVERTER 1800W 24V | 2.399,00 | 1.999,00 |
| 17858 | AR G3 NIGHT POWER 12V TRUCK | 4.200,27 | 3.874,90 |
| **17468** | **AR CLEAN 12V PAREDE** | **3.099,00** | **2.852,14** |
| … | (mais 22 produtos) | | |

### Correção aplicada
Todos os 27 produtos tiveram `preco_base` alinhado ao `preco_aux2` da empresa 8
(arredondado a 2 casas). Registrado no log com `origem = 'correcao_inicial'`.

## 9. Rotina de sincronização de preço (objetos criados no Supabase)

Tudo em `public`, decidido como **fonte de verdade = ERP** (sem edição manual).

### 9.1 Tabela de auditoria — `ped_catalogo_preco_log`
Histórico de toda mudança de preço feita pela rotina.

| Coluna | Tipo | |
|---|---|---|
| `id` | bigint identity | PK |
| `id_catalogo` | integer | FK lógica → `ped_catalogo_produtos.id` |
| `id_produto_erp` | integer | código no ERP |
| `preco_anterior` | numeric | preço antes |
| `preco_novo` | numeric | preço depois |
| `origem` | text | `correcao_inicial`, `sync_cron`, etc. |
| `criado_em` | timestamptz | default now() |

### 9.2 Função — `frt_sync_precos_catalogo(p_origem text default 'sync_cron')`
`security definer`, `search_path = public`. Faz um `UPDATE ... FROM` casando
`ped_catalogo_produtos.id_produto_erp = vw_fb_produtos_compras.id_produto` **com
`id_empresa = 8`**, atualiza `preco_base = round(preco_aux2, 2)` **apenas onde diverge**,
grava cada alteração em `ped_catalogo_preco_log` e retorna a quantidade de produtos
alterados. É **idempotente** (rodar de novo sem mudanças no ERP retorna 0).

Rodar manualmente:
```sql
select public.frt_sync_precos_catalogo();      -- origem 'sync_cron'
```

### 9.3 Agendamento — pg_cron
Job **`sync-precos-catalogo-stonni`** (pg_cron 1.6.4), schedule **`5 * * * *`** — roda todo
minuto 5 de cada hora (horário UTC).

```sql
-- inspecionar
select jobid, jobname, schedule, active from cron.job
 where jobname = 'sync-precos-catalogo-stonni';

-- ver últimas execuções
select * from cron.job_run_details
 where jobid = (select jobid from cron.job where jobname='sync-precos-catalogo-stonni')
 order by start_time desc limit 20;

-- histórico de mudanças de preço
select * from public.ped_catalogo_preco_log order by criado_em desc limit 50;
```

### 9.4 Sincronização de ESTOQUE server-side (30/07/2026)
Mesmo padrão do preço, replicando exatamente a regra do cliente (seção 6.1). **Preserva as
travas manuais** (`estoque_manual` prevalece; `esgotado_manual` nunca é tocado).

- **Tabela** `ped_catalogo_estoque_log` — histórico de mudança do flag `esgotado`
  (`estoque_efetivo`, `esgotado_anterior`, `esgotado_novo`, `origem`, `criado_em`).
- **Função** `frt_sync_estoque_catalogo(p_origem text default 'sync_cron')` — recalcula
  `esgotado` a partir de `coalesce(estoque_manual, comp_produtos_consolidado.estoque_total)`
  (esgota se `< 5`), atualiza só onde muda, loga e retorna a quantidade alterada. Idempotente.
- **Cron** `sync-estoque-catalogo-stonni`, schedule **`10 * * * *`** (minuto 10, desencontrado
  do preço no minuto 5).

```sql
select public.frt_sync_estoque_catalogo();                 -- rodar manual
select * from public.ped_catalogo_estoque_log order by criado_em desc limit 50;
```

> Nota: o sync client-side em `cfgCarregarCatalogo` **não foi removido** — passou a ser
> redundante e inofensivo. Se quiser, pode ser retirado no futuro.

### 9.5 Decisões de projeto
- **Preço 100% automático**, ERP manda. **Não há** proteção de "preço manual" (ao contrário
  do estoque, que tem `estoque_manual`). Se no futuro for preciso travar um preço na mão,
  criar um campo `preco_manual` (espelho de `estoque_manual`) e ajustar a função para
  ignorar produtos com esse campo preenchido.
- Frequência horária é suficiente para preço de venda; barata. Ajustável no `cron.schedule`.
- Fonte de preço = **empresa 8 (Bononi SC)**, a mesma do cadastro — mantém consistência
  entre cadastro e sync.

## 10. Edge Function `bling-proxy` — integração Bling (fotos/medidas)

Função Deno em `functions/v1/bling-proxy` (`verify_jwt: false`). Ações via querystring
`?acao=...&sku=...`:

| Ação | O que faz |
|---|---|
| `produto` | Busca bruta no Bling por `codigo` (SKU). |
| `fotos` | Retorna URLs das fotos direto do Bling (sem cache). |
| `fotos-cache` | Baixa as fotos do Bling, **apaga as antigas no Storage** (`catalogo/{sku}/`) e re-sobe com path novo (timestamp) p/ furar o CDN. Retorna URLs do Storage. |
| `dimensoes` | Retorna peso + dimensões do produto no Bling. |
| `listar` | Lista produtos ativos (paginado). |

**Contra o Bling é tudo leitura (GET).** Nunca apaga/edita nada no Bling. O único `delete`
é em **Storage próprio** (bucket `pedidos-docs`), e só roda **depois** de confirmar que o
Bling devolveu fotos novas — não há risco de zerar fotos.

O front (`configuracoes.js:1078`, `cfgSincronizarBling`) chama `fotos-cache` e `dimensoes`
**em paralelo** e grava o resultado em `ped_catalogo_produtos` (e dimensões também em
`frt_produtos_dimensoes`). Medida só é gravada `if (rDim?.peso_kg)` — **se o Bling estiver
sem peso/dimensões, nada é gravado** (não é bug do sync; é dado ausente no Bling).

### 10.1 Correção do race de token (31/07/2026)
**Problema:** cada sync renovava o token OAuth do Bling **duas vezes em paralelo** (foto +
medida). O `refresh_token` do Bling é **de uso único/rotativo** → as duas chamadas disputavam
o mesmo token, causando falhas intermitentes ("às vezes a foto não vem").

**Correção (na própria Edge Function, sem mexer no front):**
- **Cache do access token** em `ped_configuracoes`: chaves `bling_access_token` +
  `bling_access_token_exp` (epoch ms). O token do Bling dura ~6h; enquanto válido, **não
  renova** — foto e medida usam o mesmo token cacheado. Isso elimina o race no caso comum.
- **Lock distribuído** para a renovação (raro, ~1x a cada 6h): chave `bling_refresh_lock`
  (mutex via `UPDATE ... WHERE valor < now`, com TTL de 20s que auto-expira). Garante que
  **só uma** invocação troca o `refresh_token` por vez, com fallback best-effort no timeout.
- Deployado como **version 20**. Validado: chamadas paralelas retornam 200 e o token é
  renovado só quando expira.

> Chaves de apoio criadas em `ped_configuracoes`: `bling_access_token`,
> `bling_access_token_exp`, `bling_refresh_lock`. Não editar na mão — são geridas pela função.

## 11. Pontos de atenção / dívidas técnicas

- **Estoque:** além do sync client-side (que continua), agora há pg_cron
  (`sync-estoque-catalogo-stonni`, seção 9.4) mantendo `esgotado` atualizado de hora em hora.
  O sync no cliente ficou redundante — pode ser removido do JS quando for conveniente.
- **Fonte de estoque divergente por design:** catálogo usa consolidado (todas as empresas);
  cadastro usa empresa 8. Documentado e aceito, mas convém ter isso claro.
- **Sem `preco_manual`:** qualquer ajuste manual de preço será sobrescrito pela rotina na
  próxima hora. É o comportamento desejado hoje; rever se mudar.
- **Deploy:** app estático na Vercel; `main` = produção. Alterações em JS/HTML vão ao ar no
  push. Os objetos de banco desta seção **já estão aplicados** direto no Supabase de produção.

---

## Anexo — trechos de código relevantes

- Sync de estoque + regra de esgotado: `configuracoes.js:681`–`699`.
- Cadastro de produto lê ERP (empresa 8, `preco_aux2`/`estoque_fisico`): `configuracoes.js:902`–`930`.
- Preço base gravado no cadastro (snapshot): `configuracoes.js:926`.
- Edição manual de preço: `configuracoes.js:1019`.
- Preço final por tabela (markup sobre `preco_base`): `configuracoes.js:1719`–`1720`.
