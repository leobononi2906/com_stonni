# STATUS — App Unificado Stonni (Portal + CRM) · com_stonni

> Atualizado: 2026-09-24

## Dev-log 24/09/2026 — Catálogo parou de gastar a cota de Image Transformations do Supabase (3f541cf, 4348fe0) — **no ar desde 24/09 (build do f615a32)**
- **O buraco:** desde 15/09 (`0de5264`, "fotos em alta") a `catFotoUrl` reescrevia toda foto do
  storage para `/storage/v1/render/image/public/…?width=…`. O plano Pro inclui **100 imagens de
  origem distintas por ciclo**; em 24/09 o painel da org mostrava **168/100 (168%)**, tudo no
  projeto Dashboard, com spend cap ligado (risco de restrição = foto quebrando no catálogo e no
  PDF até o ciclo virar em 07/10). Era o **único** uso de `render/image` em todos os apps.
  Diminuir largura/qualidade não resolveria: conta imagem distinta, não tamanho.
- **O que mudou:** `catFotoUrl` (index.html) devolve a foto original (`object/public`); tela e
  PDF do catálogo usam a mesma função. Upload de foto manual (`cfgUploadFotoManual`) passa antes
  por `cfgReduzirFoto`: lado maior ≤ 1600px, JPEG 85%, fundo branco (PNG transparente não vira
  preto); foto já pequena (≤1600px e ≤600 KB), GIF/SVG/HEIC passam intactos. O limite de 5 MB
  passou a valer **depois** de reduzir. `sw.js` → `stonni-v12-20260924`.
- **Medido no preview local:** URL gerada sai `object/public`; imagem 4000×3000 → 1600×1200 JPEG;
  800×600 volta o mesmo arquivo. Lint sem aviso novo. **Não testado com login** (upload real e
  catálogo com dado).
- **Deploy barrado:** a Vercel recusou o build do `4348fe0` — "Deployment rate limited" (teto de
  100 deploys/dia da conta). O push seguinte (`f615a32`, só docs) buildou no mesmo dia e levou
  tudo: **conferido no ar** em `com-stonni.vercel.app` — `index.html` sem `render/image`,
  `sw.js` = `stonni-v12`, `configuracoes.js` com `cfgReduzirFoto`.
- **Ficou de fora:** fotos já no storage e as que vêm do Bling/ERP não são reduzidas (só o
  upload manual passa pela redução); o contador 168 não zera antes de 07/10; desligar o spend
  cap foi descartado porque libera excedente de tudo na org.

## Dev-log 24/09/2026 — Correção do FAB "Sugerir melhoria": z-index:150 não era baixo o suficiente
A correção anterior (mesmo dia, `z-index:9997` → `150`) partiu do que resolvia aqui no
`com_stonni` (drawer com `z-index:200/201`), mas testando ao vivo no `bononi-exped` e no
`bononi-cobranca` (que usam escala Tailwind `z-20`/`z-30`/`z-50` para nav/drawer/painel) o FAB
continuava por cima — `150 > 50`. Baixado de novo, agora para `z-index:10`, valor seguro em
todos os apps que usam este arquivo (abaixo até do menor caso encontrado, `z-20`). `?v=` bumpado
de 8 pra 9 nas duas telas (Portal e CRM).

## Dev-log 24/09/2026 — Service worker registra atualização e recarrega sozinho; tela restaurada no F5
Reclamação geral do grupo: o app só pegava versão nova apertando F5, e o F5 sempre voltava pra
primeira área liberada (Catálogo/Home), mesmo no meio de um pedido ou tela do CRM.
- **Como era:** `sw.js` já existia e era bem feito (network-first), mas `index.html` só
  registrava (`navigator.serviceWorker.register`) sem nunca chamar `reg.update()` nem escutar
  `controllerchange` — o SW instalado nunca avisava nem aplicava versão nova sozinho. A tela
  atual (`paginaAtual`, função `irPara`) vivia só em variável JS, sem persistência nenhuma.
- **Como fica:** registro agora chama `reg.update()` no load, a cada 30 min e ao voltar pra
  aba, e recarrega a página sozinho quando o SW novo assume (`controllerchange`, com guarda
  contra loop). `irPara()` grava `{id, params}` da tela atual em
  `localStorage['com_stonni:ultima-pagina']`; `iniciarApp()` restaura essa tela no lugar da
  primeira área liberada, só se ela ainda estiver liberada pelo Hub para o usuário logado.
- **O que não muda:** nenhuma lógica de negócio, nenhuma tabela — só o registro do SW e a
  persistência de navegação. `sw.js` em si não foi alterado (já estava correto).

## Dev-log 24/09/2026 — `geral-central.js` v8: FAB não cobre mais botão do drawer + título com ícone
Reportado pelo usuário: no drawer "Gerar Catálogo PDF" (Catálogo, Portal), o botão flutuante
"Sugerir melhoria" ficava por cima do botão "Gerar PDF" do rodapé, e o título do drawer aparecia
como tag HTML crua (`<i class="ic ic-sm" data-ic="file-text"></i> Gerar Catálogo PDF`) em vez do
ícone.
- **Como era:** FAB (`ds/geral-central.js`, `.gc-fab-wrap`) com `z-index:9997`, muito acima do
  drawer (`z-index:201`) — ficava sempre por cima de qualquer drawer aberto, tampando o botão
  primário do rodapé (afeta todo drawer do app, não só o de PDF).
- **Como fica:** FAB com `z-index:150` — abaixo do drawer/overlay (200/201) e dos demais modais
  do app (9999+), então some atrás de qualquer drawer/modal aberto. `abrirDrawer()`
  (`index.html`) passou a usar `innerHTML` no título em vez de `textContent`, então títulos com
  ícone (`catalogo.js`, `configuracoes.js`) renderizam o ícone em vez do texto da tag.
- **O que não muda:** nenhum dado, nenhuma tabela — é ajuste de CSS/DOM nas duas telas (Portal e
  CRM apontam pro mesmo `ds/geral-central.js`; `?v=` bumpado de 7 pra 8 nas duas). `sw.js`
  `CACHE_VERSION` bumpado pra `v11-20260924`.
- Não testado com dado real local: staging não tem `ped_catalogo_produtos`/`ped_configuracoes`
  (a tela de Catálogo trava em loading), pendência pré-existente e separada desta correção.
  Conferir em produção depois de publicar.

## Dev-log 24/09/2026 — `geral-central.js` v7: aviso aceita HTML simples
Mensagem do aviso (mostrada nas duas telas, Portal e CRM) passa por `escHtmlSimples` em vez de
`esc` puro: escapa tudo e libera só `<b>`, `<strong>`, `<i>`, `<em>`, `<u>`, `<br>` e
`<a href="https://...">` — qualquer outra tag some. Mudança feita no original
`bononi-hub/ds/geral-central.js`, replicada verbatim aqui (as duas telas apontam pro mesmo
arquivo), `?v=` bumpado de 6 pra 7 nas duas.

## Dev-log 23/09/2026 — Botão "Sugerir melhoria" nas duas telas (Portal e CRM)
Rollout do Painel de Desenvolvimento (botão flutuante + avisos/campanha cadastral/expiração de
senha) neste app, na sequência do piloto em `bononi-compras`. com_stonni é o caso especial do
grupo: duas telas HTML independentes, cada uma com seu próprio login — as duas tinham que receber
o hook, senão fica a mesma armadilha das "telas gêmeas" de sempre.
- Copiado `ds/geral-central.js` (cópia verbatim de `bononi-hub/ds/geral-central.js`, sem editar
  conteúdo) para dentro do repo. As duas telas apontam pro MESMO arquivo, cada uma com o caminho
  relativo certo: `index.html` (raiz) referencia `ds/geral-central.js`; `crm/index.html`
  referencia `../ds/geral-central.js`.
- `index.html` (Portal do Representante, `appId: 'stonni'`) não carregava `supabase-js` — o app
  inteiro é feito com `fetch` cru contra a API REST/Auth do Supabase, sem cliente JS. Como
  `GeralCentral.iniciar` espera um `sb` (supabase-js) pra ler sessão e gravar atualização
  cadastral, adicionei a tag `<script src=".../supabase-js@2">` e crio um cliente só pra esse uso
  (`supabase.createClient(SUPA_URL, SUPA_KEY)`), sem tocar no fluxo de login existente — o
  cliente novo lê a MESMA sessão do `localStorage` (`sb-vishxwdxqiygbxmtpfoy-auth-token`) que o
  login manual já grava. Chamada colocada dentro de `iniciarApp()`, logo depois que `USUARIO` é
  preenchido na sidebar.
- `crm/index.html` (CRM Atacado, `appId: 'atacado'`) já tinha `sb`/`SUPA_URL`/`SUPA_KEY` prontos
  (usa supabase-js). Chamada colocada em `iniciarApp()`, logo depois do nome do usuário ser
  escrito na sidebar.
- **Testado local** nas duas telas (`com-stonni`, porta 5292, staging): confirmei
  `window.GeralCentral` definido e o botão "Sugerir melhoria" renderizando e abrindo o modal em
  ambas. Achado que não era do meu código: um service worker (`sw.js`) ativo na sessão do
  navegador estava servindo `ds/geral-central.js` a partir do cache antigo (fallback de SPA,
  devolvendo o `index.html` no lugar do script — `SyntaxError: Unexpected token '<'`); confirmado
  com `curl` direto no servidor (arquivo correto, 16127 bytes) e resolvido no teste
  desregistrando o SW e limpando o cache do navegador — não é um bug do app, é reforço do que já
  está anotado em `pwa-nao-atualiza-no-celular`. Os 404 (`atac_umbler_contatos`,
  `atac_cliente_telefones`, `atac_log_acoes`, `PGRST205`) são pré-existentes: staging não tem as
  tabelas do CRM (ver `staging-sem-tabelas-crm-com-stonni`), nada a ver com este rollout.
- Original em `bononi-hub/ds/geral-central.js`.

## Dev-log 23/09/2026 — responsividade mobile do CRM Atacado (99f871c)
Pedido: auditar se o app (PWA) é 100% responsivo no mobile. O Portal (`index.html`) já tinha
tratamento extenso (`@media max-width:768px/390px`, drawer em tela cheia, `min-height:44px` em
campo/botão, `env(safe-area-inset)`); o CRM Atacado (`crm/`) ficou para trás — nasceu como app
separado (`stonnidist-v2`) e foi embutido depois, com só 2 breakpoints. Achados concretos lendo o
código (não achismo) e corrigidos:
- **Filtros globais do CRM somem no mobile.** `.topbar-filters{display:none}` abaixo de 600px,
  sem alternativa — e pior, na prática o `display:none` nem sempre funcionava, porque
  `gotoTab()` seta `style.display='flex'` inline, e inline vence CSS externo mesmo dentro de
  media query (só perde para `!important`). Corrigido nas duas pontas: `!important` na regra
  mobile, e o MESMO elemento agora vira um painel fixo no rodapé (`.topbar-filters.mobile-open`),
  aberto por um botão "Filtros" novo na topbar — sem duplicar campo/estado.
  - Ao testar ao vivo, achei um bug introduzido por mim mesmo nesse processo: a regra base
    `.btn-filtros-mobile{display:none}` estava DEPOIS do `@media(max-width:600px)` no arquivo —
    regra fora de media query que vem depois no CSS vence a de dentro, mesmo com a media query
    ativa. O botão nunca aparecia. Corrigido reordenando (regra base antes do media query).
  - E descobri testando que o botão novo estourava a largura da topbar em 375px (cortava
    "Atualizar"). Escondi breadcrumb/"última atualização" e apertei padding/fonte da topbar
    abaixo de 600px.
- **Agenda do CRM** (`crm/js/agenda.js`): coluna do calendário `width:240px` fixo ao lado do
  painel do dia, sem nenhum `@media` no arquivo — em 375px sobrava ~135px pro painel do dia.
  Agora empilha (calendário em cima, painel do dia embaixo) abaixo de 900px.
- **Aba Produtos** (`.lin-trow`, `crm/css/styles.css`): grid de 6 colunas com pixels fixos
  (`1fr 44px 60px 60px 64px 56px`) sem versão mobile. Ganhou wrapper `.lin-tablewrap` com scroll
  horizontal em vez de espremer os números.
- **Campos de busca/filtro com largura fixa em px** (Configurações → Catálogo/Logs, Gestão de
  Pedidos): 100% da linha abaixo de 768px, via seletor por id no `index.html`.
- Reforço de toque/iOS no CRM (`min-height:44px`, `font-size:16px` em campo pra não disparar
  zoom do Safari), espelhando o padrão que o Portal já tinha.
- Bump `CACHE_VERSION` do `sw.js` (v9→v10) e `?v=20260923a` no `crm/css/styles.css` (não tinha
  cache-buster nenhum antes).
- **Conferido**: local (staging) com login real (`gustavo12cristina@...`) — painel de filtros e
  Agenda empilhada funcionando em 375px. Produtos/campos fixos só confirmados por leitura de
  código: o banco de teste não tem as tabelas `atac_crm_*`/`atac_umbler_contatos`/
  `atac_cliente_telefones` (404 PGRST205), então essas telas não renderizam dado nenhum lá.
  Publicado (99f871c) e conferido no ar: `agenda-calendario`, `mobile-open` e `sw.js` v10
  encontrados no bundle servido por `com-stonni.vercel.app`.

## Dev-log 23/09/2026 — hotfix: coluna errada quebrava salvar produto (101e403)
Ao conferir a autoria no navegador com login real (Gustavo Pelissari Oenning, admin), editando
**INVERSOR VOLTAGEM 12V. P/ 110W**: o drawer mostrou certo "Sem registro de autoria" (produto
cadastrado antes da migration), mas ao clicar **Salvar**, o console acusou
`PGRST204 — Could not find the 'alterado_em' column`. O commit anterior (eb2dfb7) gravava
`alterado_em` no PATCH, só que a coluna reaproveitada da migration se chama `atualizado_em` — eu
mesmo escrevi a revisão dizendo "reaproveita atualizado_em" e depois usei outro nome no código.
PostgREST recusa o PATCH **inteiro** quando uma coluna não existe (não só o campo errado), então
**toda edição de produto em Configurações → Catálogo vinha falhando com 400 silenciosamente desde
a publicação** — editar dados, fotos (auto/manual), definir capa, tags, esgotado e sincronizar
Bling, todos os 9 pontos que toquei. Corrigido: `alterado_em` → `atualizado_em` nos 9 pontos +
na exibição do drawer. Reconferido no navegador com o mesmo produto: Salvar funcionou (sem erro
no console), e reabrindo o drawer passou a mostrar "Última alteração por gustavo12cristina@..."
com data/hora.

## Dev-log 23/09/2026 — autoria em produto do catálogo (quem cadastrou / quem alterou)
Pedido: conferir se com-stonni.vercel.app mostra quem subiu um produto ou quem alterou a data.
Não mostrava — e a causa era mais funda que a tela: `ped_catalogo_produtos` não gravava nenhuma
informação de autor, só existia isso no CRM (`atac_crm_notas.criado_por`).
- **Migration em produção** (`vishxwdxqiygbxmtpfoy`, aplicada e conferida 23/09/2026):
  `docs/sql/2026-09-23_autoria_catalogo.sql` — adiciona `criado_por text` e `alterado_por text`
  em `ped_catalogo_produtos`. Reaproveita `criado_em`/`atualizado_em`, que **já existiam** (o
  pré-voo pegou isso antes de eu duplicar coluna). Pré-voo/ensaio/revisão em `docs/sql/` do mesmo
  dia. Sem backfill: os 94 produtos já cadastrados ficam com autoria `NULL` — não há como saber
  quem os criou, e inventar autor seria pior que deixar em branco.
- **`configuracoes.js`**: `cfgSalvarProduto` grava `criado_por: USUARIO?.email` no insert. Todo
  `supaPatch` de edição de produto (`cfgAtualizarProduto`, tags, fotos automáticas/manuais,
  definir capa, remover foto, sincronizar Bling, toggle esgotado) passou a gravar
  `alterado_por`/`alterado_em` — 9 pontos de patch no arquivo, todos cobertos (o único patch que
  **não** ganhou `alterado_por` foi o auto-sync com Bling logo após o cadastro, dentro do próprio
  `cfgSalvarProduto`: é parte do cadastro, não uma edição posterior).
- **Exibição**: `cfgEditarProduto` (drawer de edição) agora mostra "Cadastrado por X em DD/MM"
  e/ou "Última alteração por Y em DD/MM" no topo do formulário; produto sem histórico mostra
  "Sem registro de autoria (produto cadastrado antes deste controle existir)".
- **Não verificado no navegador**: a tela exige login (sessão `USUARIO` vinda do Hub) e o dev
  server local desta sessão não tem como logar sem credencial real — validei só sintaxe
  (`node --check`) e a leitura do fluxo de código. Pedir para alguém abrir um produto em
  Configurações → Catálogo e conferir a linha de autoria antes de considerar fechado.

## Dev-log 18/09/2026 — visual convergido com o stonni-assistencia
Os dois apps já usavam o mesmo pacote `stonni-design-interno` (`ds/stonni-ds.css` idêntico
byte a byte), mas a **ponte** de cada `index.html` traduzia dois tokens de forma diferente —
por isso pareciam sistemas distintos lado a lado. Convergido para o padrão do stonni-assistencia
(que já batia com o pacote — Card.prompt.md pede raio 8px, Sidebar.prompt.md pede símbolo, não
wordmark completo):
- `.card`/`.table-card`: `--radius: var(--radius-xl)` (12px) → `var(--radius-lg)` (8px).
- Item de menu ativo: `--blue-light` era `var(--cyan-500)` (mesmo tom no texto e no traço) →
  virou `var(--cyan-300)` no texto (contraste sobre o índigo da lateral) com `var(--cyan-500)`
  direto no traço lateral de 3px — mesmo critério do assistencia.
- Sidebar, topbar mobile e tela de login: trocado o wordmark completo (`logo-stonni-white.png`
  / `logo-stonni-ink.png`, 130–180px) pelo símbolo `logo-mark-64.png` (cópia idêntica do
  `stonni-mark-64.png` do assistencia) + nome por extenso ao lado/abaixo — as classes
  `.sidebar-logo-inner/-mark/-text` já existiam no CSS sem uso, só não estavam no markup.
- Cartão de login: raio `--radius-2xl` (16px) → `--radius-xl` (12px), `max-width` 400px → 360px.
- `logo-stonni-white.png`/`logo-stonni-ink.png` **continuam em uso** nos PDFs gerados
  (`catalogo-pdf.js`, `pdf-pedido.js`, `pdf-orcamento-file.js`, `configuracoes.js`) — não mexi
  ali, é wordmark de documento impresso, não tela.
- `sw.js`: `CACHE_VERSION` de `stonni-v8-20260917` para `stonni-v9-20260918`, `APP_SHELL`
  trocou as duas entradas de wordmark por `logo-mark-64.png?v=20260918`.
- Auditoria (`auditar-tokens.py --marca stonni-interno`): sem ponte auto-referente, sem
  `hsl(var())` remanescente, sem hotlink de logo/favicon.
- **Não mexi no stonni-assistencia** — ele já era a referência correta.

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
- **A porta é a mesma lista** (`MODULOS_DESTE_APP` no `index.html`): quem não tem `stonni`, `atacado`
  nem `admin` é recusado no login, não entra para ver sidebar vazia. Área nova aqui = módulo novo
  nessa lista, senão a porta e o nav voltam a discordar (foi o que aconteceu — ver dev-log 16/09).
- Parede real = RLS por módulo **desacoplada** (projeto à parte — hoje anon lê tudo; ver PLANO).

## Stack / arquitetura
HTML/JS vanilla, sem build. `index.html` (shell/login/nav dirigido por `construirNav`) + módulos:
`catalogo.js`, `pedidos.js`, `configuracoes.js`, `gestao.js`, `materiais.js`, `wshare.js`, `crm.js`,
`catalogo-pdf.js`, `pdf-pedido.js`, `pdf-orcamento-file.js`. Libs vendorizadas em `vendor/`
(`jspdf` + `jspdf.plugin.autotable`). **PWA:** `manifest.json` + `sw.js` (network-first, versionado).
**CRM:** vendorizado em `crm/` (cópia fiel do stonnidist-v2), embutido via **iframe same-origin** com **SSO** (sessão do localStorage). Doc do CRM em [`crm/docs/`](../crm/docs/).

## Feito (13–14/08/2026)
- **Enviar orçamento por WhatsApp como PDF real** (pedido/cotação): botão **📲 Enviar por WhatsApp** ao lado do "Gerar PDF". `pdf-orcamento-file.js` (`pedGerarPDFFile`) monta o PDF com **jsPDF + autotable vendorizados** (`vendor/`, sem CDN em runtime) e anexa via Web Share API (mobile) ou baixa + abre WhatsApp Web (desktop). `window.pedCalcularTotais` (em `pdf-pedido.js`) virou **fonte única** dos números → PDF impresso e enviado são idênticos. `waShare` passou a aceitar `File`/`Blob` direto.
- **Auth: renova token e repete em 401** (`renovarToken()` + retry nos helpers `supa/supaInsert/supaPatch`). Antes o token só era renovado no load da página; após ~1h expirava e **toda** chamada voltava vazia em silêncio (sintoma: Materiais mostrando "Nenhum" com 16 itens no banco). Policy/grants estavam OK — o bug era 100% do app.
- **CRM: descartar cliente some da tela na aba Carteira** — `descartarCliente` agora recarrega carteira+prospecção e re-renderiza (antes só atualizava a prospecção local). Corrigido também no repo fonte `stonnidist-v2`.

## Feito na unificação (11–12/08/2026)
- **Casca PWA** + porteiro por módulo + **sidebar única** (Portal + seções do CRM agrupadas em DASHBOARD/OPERACIONAL; barra interna do CRM escondida via guard "is-embedded").
- **Materiais + IA** (`materiais.js`, IA via `assist-perguntar` com JWT).
- **Compartilhar no WhatsApp** (`wshare.js`, Web Share API c/ arquivos): Materiais, **fotos do produto** (multi-seleção, **sem legenda**), **catálogos-modelo** (faixa no topo do Catálogo, reusa `prt_materiais` categoria≈Catálogo) + **gerenciador admin** (upload PDF → Storage `prt-materiais`, sem SQL).
- **Configurações** reorganizada por área (Catálogo/Pedido/Bling) + tokens Bling mascarados.
- **SSO** do CRM no iframe (fix: `fazerLogin` persiste sessão no formato supabase-js).
- **Mobile/iOS:** ☰ respeita `safe-area-inset-top` (notch); drawer do Catálogo por transform; **drawer do CRM vira overlay fixo de tela cheia** (o painel de detalhe tinha largura 0 no mobile).

## Documentação
| Arquivo | Conteúdo | Leia antes de |
|---|---|---|
| `docs/2026-09-15-design-system.md` | Receituário do DS Stonni interno neste app: as 3 colisões de nome do `:root`, onde o hex literal continua sendo o certo (PDF, `<meta>`, `type="color"`, banco), ícones por CSS mask sem observer, e meio-degrau de medida. | mexer em cor, fonte, raio, espaçamento ou ícone — **e antes de rodar qualquer varredura de literal**, que já criou 4 regressões silenciosas aqui |
| `PLANO_UNIFICACAO.md` | Plano/decisões da unificação (fases, RLS, migração p/ servidor interno). | mexer na arquitetura dos dois apps |
| `DOCUMENTACAO.md` | Doc técnica do portal (dados, correção de preço app×ERP). | mexer em pedido/preço |
| `crm/docs/` | Doc do CRM (cópia do stonnidist-v2). | mexer no `crm/` |

## Pendências / próximos passos
- [ ] **Testar com login a mudança de fotos do catálogo** (no ar desde 24/09): subir uma foto
  manual grande e conferir que foi reduzida; abrir catálogo e PDF com fotos reais. Card no Trello.
- [ ] **Validar autoria de produto no device real** (login de verdade): abrir um produto em
  Configurações → Catálogo, editar algo e conferir se aparece "Cadastrado por"/"Última alteração
  por" no drawer — feito em código dia 23/09/2026, não testado no navegador (sem sessão).
- [ ] **Gerar um PDF de catálogo e um de pedido** antes de publicar o DS — as cores de marca dos 3 geradores mudaram, e geração de PDF quebra calada.
- [ ] **Altura de controle** (132 pontos, 28/34/36/38/42/44/52/56/72px) ainda literal: a escala do DS é 32/40/48 e nenhuma casa. Encaixar mexe no tamanho de todo botão e campo — decisão de design.
- [ ] Devolver ao pacote da skill os **22 ícones Lucide** transcritos na seção EXTRAS do `ds/stonni-icones.css`, se valerem para os outros apps.
- [ ] **Validar no iPhone** (usuário): drawers abrindo (CRM overlay + Catálogo), SSO, WhatsApp anexando.
- [ ] **RLS** (fechar "anon lê tudo") — projeto de segurança do grupo, à parte; começar pelo mapa de leitura.
- [ ] **Migrar p/ servidor interno** (HTTPS p/ PWA; vendorizar supabase-js/fontes se offline).
- [ ] Reconciliar **Materiais/Configurações do CRM** vs os do Portal (hoje só os do Portal na sidebar).
- [ ] Trazer configs do CRM pra tela de Configurações (opcional).

## Dívidas e armadilhas conhecidas
- **Vendoring do `crm/`**: é cópia; re-sincronizar a cada deploy do `stonnidist-v2` (reaplicar o guard "is-embedded" + o overlay-fixo do drawer). Aposentar o stonnidist-v2 quando o unificado virar produção do CRM.
- **Wrapper + clone aninhado** (`com_stonni\com_stonni`) — editar o de dentro.
- **Preview local não compõe frames** (innerWidth=0) → **não confiar** em teste visual de `transform`/drawer no preview; validar no device real.
- **O `sw.js` transforma request falho em HTML, e isso mata script em silêncio.** O fallback é
  `caches.match(req) || caches.match('./index.html')` para **todo** GET do mesmo domínio — inclusive
  `.js` e `.css`. Quando a rede falha num sub-recurso, o navegador recebe `<!DOCTYPE html>` no lugar
  do script e estoura `Unexpected token '<'`; aquele arquivo simplesmente não carrega. Visto em
  16/09 com `ds/geral-acesso.js?v=2` no preview local — com o SW desregistrado, o mesmo arquivo volta
  como `text/javascript` normalmente. O fallback para `index.html` só faz sentido em
  `req.mode === 'navigate'`. **Mesmo padrão em `bononi-vendas` e `controle-stonni`**; o `bononi-exped`
  não tem. Mexer no `sw.js` exige bumpar `CACHE_VERSION` e só chega em quem já instalou o PWA quando
  o SW novo ativar.
- **Não usar `/storage/v1/render/image` (Image Transformations).** O Pro inclui só 100 imagens
  distintas por ciclo e o catálogo sozinho passou disso em 9 dias. Tamanho se controla no upload
  (`cfgReduzirFoto`).
- `configuracoes.js` grande — refatoração gradual.

## Dev-log
- 2026-09-17 — **`ds/stonni-ds.css` estava desatualizado em relação ao canônico do `stonni-assistencia`** (referência do design system Stonni interno): faltava o bloco `tokens/base.css` (reset, `body`, `h1..h6`, `a`, `code`, `hr`, `::selection`, `small`, `[hidden]`, `prefers-reduced-motion`), e a ordem dos blocos era diferente. Nenhum token mudou de nome ou valor. Substituído por cópia verbatim do canônico. Ponte de variáveis (`index.html` e `crm/css/styles.css`) conferida token a token: nenhuma colisão, nada precisou mudar. Cache-buster de `stonni-ds.css` subiu de `?v=20260915` para `?v=20260917` em `index.html` e `crm/index.html`, e o `CACHE_VERSION` do `sw.js` foi de `stonni-v7-20260916` para `stonni-v8-20260917` — sem isso o service worker continuaria servindo o CSS velho por cache. Auditoria (`auditar-tokens.py`): zero padrões que falham calados introduzidos pela troca; os 12 tokens indefinidos em `geral-acesso.js` e o hex/medida literal remanescentes são pré-existentes e documentados, fora de escopo desta sincronização.
- 2026-09-16 — **`temAcessoStonni()` fazia `return true`: a porta deste app estava escancarada.** A função se chamava "verifica acesso ao módulo `atacado`" e o comentário dizia que *"a restrição real é feita pelo `ped_gestores`/`ped_representantes` em `carregarUsuario`"*. **Não era.** `carregarUsuario` não tem caminho de recusa — quem não é gestor nem representante cai no `iniciarApp()` igual. Como o Supabase Auth é compartilhado pelos 22 apps do grupo, **as 53 contas entravam aqui**: compras, expedição, varejo, RH, financeiro e os 12 parceiros da rede autorizada. Não era vazamento de tela — sem módulo o nav sai vazio ("Sem áreas liberadas") — mas era token entregue a quem não tem o que fazer aqui, e uma mensagem de erro (`Sem acesso a este sistema`) que **nunca podia disparar**.
  - **A porta agora é a soma das áreas de dentro**, e sai da mesma lista que elas: `MODULOS_DESTE_APP = ['stonni','atacado']` + `admin`. `temPortal()` e `ehInterno()` passaram a chamar a mesma função da porta (`liberaAlgumaArea`), então porta e nav **não têm como discordar** — era esse o buraco, não a linha `return true` em si.
  - **Medido em produção antes de mexer, porque trancar porta errada tira gente do trabalho:** dos 53, **20 passam e 33 são barrados**. Dos 33, **nenhum** é gestor ou representante, e **nenhum** tem ato registrado no app (conferido em `taco_logs`, `atac_log_acoes`, `atac_crm_notas`, `atac_card` e `ped_pedido_log`). Os 4 gestores ativos e os 4 representantes com conta passam todos. `rodrigodeonideal@gmail.com` está em `ped_representantes` mas **não tem conta no Auth** — não entrava antes nem agora.
  - **Conferido rodando a função de verdade** (recortada do `index.html`, não redigitada) contra os 53 metadados de produção: 20 × 33, igual ao SQL, e `porta != nav` em **nenhuma** conta. Mais 11 casos de borda, incluindo os três que quebram implementação ingênua: `meta` nulo, `meta` sem a chave `modulos` (é o formato dos 12 parceiros e de 1 admin) e `modulos` vindo como string em vez de array.
  - **Sessão válida sem área agora diz o motivo.** Quem vem do Hub logado e não tem chave daqui via um formulário de login em branco; agora vê `Sem acesso a este sistema. Contate o administrador.`
- 2026-09-16 — **Configurações ganhou a aba "Acessos", só leitura.** Mostra quem tem o módulo `atacado` — que é a chave que este app confere de verdade, não a `stonni` do cartão no Hub —, a hierarquia de cada um e o que ela autoriza aqui. **Quem MUDA acesso muda no Hub**, num lugar só. Quem PODE ver é a RPC `geral_quem_tem_acesso` que decide pelo JWT: admin global ou admin do Comercial. Painel desenhado por `ds/geral-acesso.js`, cópia verbatim de `bononi-hub/ds/` — mudou lá, recopiar aqui e subir o `?v=`. A v2 do módulo resolve cada cor com fallback, porque 11 tokens que ele usava não existem no `stonni-ds.css` e token inexistente apaga o fundo sem dar erro. Se a RPC recusar ou a migration `0003` não estiver no banco, a aba explica em vez de mostrar painel quebrado.
- 2026-09-16 — **`.vercelignore`: era o repo com mais coisa aberta.** Respondiam **200** em `com-stonni.vercel.app`: `docs/`, **`crm/docs/STATUS.md`**, **`crm/docs/_HANDOFF.md`**, `DOCUMENTACAO.md`, `PLANO_UNIFICACAO.md` e `scripts/gerar-icones.py`. O `crm/docs/` é o que passa mais fácil despercebido — é uma pasta de doc **dentro** de uma pasta que o app precisa. A Vercel serve o repo INTEIRO, não só o que o app carrega — descoberto ao fechar a mesma coisa no Hub e no Compras. **Não era vazamento de credencial:** a chave anon já sai no `index.html` por design, e uma varredura nos 12 sites do grupo confirmou que `.env`, `.env.local`, `.git/config` e `package.json` **não** estavam expostos em lugar nenhum. O que ficava aberto era schema e notas internas. Fechado com `.vercelignore`. **O que ficou de fora da lista, e por quê:** os `.js` da raiz, `ds/`, `manifest.json`, `sw.js` e os `.png` são o app; **`vendor/`** é o jspdf, carregado por script tag; e **`crm/`** entra num iframe (`src="./crm/index.html"`) — por isso a lista exclui `crm/docs/` e **não** `crm/`. `scripts/` é ferramenta Python (gerar ícone, migrar medida), não roda no navegador, então saiu. **Este app é PWA:** o `sw.js` pré-cacheia `./index.html`, `./manifest.json`, `./icon-192.png` e `./icon-512.png` — nenhum está na lista. **Isto não apaga nada do git** — só deixa de mandar para o deploy.
- 2026-09-16 — **A capa do catálogo passou a usar o lockup da marca, e o fundo teve de mudar junto.** Antes era um logo tipográfico com emoji (`✳ stonni`).
  - **A logo entra embutida em data URI**, não como `<img src>` relativo: aquela janela é documento autônomo (`window.open('','_blank')` + `document.write`), a origem é `about:blank` e caminho relativo não resolve. Se o `fetch` falhar, cai no nome em texto — capa com `<img>` quebrada é pior que capa sem logo.
  - **Não dava para arrumar a logo sem arrumar o fundo.** O símbolo do `logo-stonni-white.png` **não é branco: é azul `#196DBB`** (só a palavra é branca), e o degradê claro da capa deixava ele em **1,58** de contraste. Medidos os candidatos no centro da capa, onde a logo fica: degradê antigo **1,74**; **gradiente da marca 1,03** — o pior de todos, o azul some no azul; índigo escuro (`#16103D` → `#2A1F74`) **2,98**, com a palavra saindo de 3,04 para **15,7**. Ficou o índigo.
  - Os dois emoji da barra de ação (🖨/✕) viraram texto: aquele documento não carrega o `ds/stonni-icones.css`, então ícone de máscara não existe ali.
  - O cabeçalho do arquivo agora diz por extenso que ali dentro é literal e data URI, nunca `var()` nem caminho relativo.
- 2026-09-16 — **Publicado** (`387a740`, merge de `232f7c0` com `9567b14`). Conferido **no ar**, não só no push: `index.html` 49.814 → 57.619 bytes; `ds/stonni-ds.css?v=20260915` e `ds/stonni-icones.css?v=20260915` servindo 200; as duas logos 200; `logo.png` respondendo **404**, o que prova que a remoção chegou; `manifest.json` com os três ícones novos e `theme_color` `#145EA8`; `sw.js` publicado em `stonni-v6-20260916` com o `APP_SHELL` completo. `npx oxlint` antes do push: **zero variável indefinida** (o resto são avisos de função chamada por `onclick`, que o linter não enxerga).
  - **No celular, deploy no ar ainda não é app atualizado.** É PWA: quem está com o app aberto só vê a mudança quando o service worker `v6` ativar. "Continua igual" nesse caso não é bug de código — é fechar todas as abas e reabrir.
- 2026-09-16 — **Revisão tela a tela do redesign, com o login do banco de teste.** Um bug achado e corrigido; o resto passou.
  - **A lupa do Catálogo estava no meio da página, não dentro do campo.** `.cat-search-wrap` nunca teve `position:relative`, então o `<span position:absolute>` da lupa resolvia no `.main` (que é `fixed`) e ia parar no centro vertical da tela. **Bug antigo** — a lupa-emoji caía no mesmo lugar; só ficou visível quando virou ícone nítido. Corrigido em `catalogo.js` com a regra que faltava.
  - **Os dois PDFs foram gerados e conferidos no papel.** O do orçamento (jsPDF) sai com a logo transparente — 2 objetos de imagem no arquivo, o par RGB+máscara — e faixa/títulos no azul novo. O do catálogo (rota de impressão, documento autônomo) **não usa nenhum `var()`**, como tem de ser, e os hex são os novos (`#145ea8`, `#161c22`).
  - **Varredura automática nas telas** (Catálogo, Novo Pedido, Pedidos, Materiais, Configurações + CRM embutido): nenhuma tag crua como texto, nenhum ícone sem desenho, nenhum ícone escapando do pai, sem scroll horizontal, sem erro de JS.
  - **O banco de TESTE não tem nenhuma tabela deste app** — só `prt_*` e `app_logs`, que são compartilhadas. Materiais é a única tela do Portal que renderiza com dado real lá; o resto foi conferido simulando a camada de dados **no navegador**, sem tocar no código. Isso valida render, ícone e token — **não** valida cálculo nem consulta.
  - **Fica em aberto:** a capa do PDF do catálogo usa um logo **tipográfico com emoji** (`✳ stonni`) em vez do lockup da marca, e os botões da barra de ação daquela janela ainda têm 🖨/✕. Como é documento autônomo, a imagem precisaria de URL absoluta ou data URI. E `fmtVal` não fixa `maximumFractionDigits`, então total com fração de centavo imprime 3 casas (`R$ 14.845,761`) — os dois são anteriores ao redesign.
- 2026-09-16 — **A logo era um JPEG renomeado para `.png`, e por isso aparecia como um retângulo preto.** Trocada nos 3 pontos da tela e nos ícones do PWA.
  - **O buraco:** `logo.png` (1999×538) começa com `ffd8ffe0 JFIF` — é JPEG, formato **sem canal alfa**. O fundo preto estava embutido no arquivo, então a logo virava um bloco preto sobre o card branco do login e sobre a sidebar. O código compensava com `border-radius` no `<img>`, que só arredondava as quinas do bloco.
  - **São duas imagens, não uma**, porque o app usa a logo sobre fundo claro e sobre fundo escuro: `logo-stonni-ink.png` no login (card branco) e `logo-stonni-white.png` na sidebar e na topbar mobile. PNG com transparência de verdade, 300×93, do `ds/assets/` do site oficial — **o pacote da skill `stonni-design-interno` só tem o símbolo, não o lockup**.
  - **O `manifest.json` declarava o mesmo JPEG como 192×192 e 512×512** — mentira de 1999×538, que o Android esticaria. Agora são `icon-192.png` e `icon-512.png` de verdade (símbolo branco centralizado em quadrado índigo, 18% de folga), gerados por `scripts/gerar-icones-pwa.py`. O 512 também entrou como `maskable`: com essa folga o símbolo cabe na zona segura do recorte redondo.
  - `sw.js` foi para `stonni-v6-20260916`, com as duas logos e os dois ícones no `APP_SHELL`.
  - **`logo.png` apagado** (a pedido, no mesmo dia). A varredura antes de apagar achou o que a conferência estreita tinha deixado passar: **os dois geradores de PDF caíam nele** (`cfg.pdf_logo_url || 'logo.png'`), e a falha seria **muda** — no pedido o `<img>` tem `onerror` que esconde, no orçamento o `carregarImagem` devolve `null`. Os dois passaram a apontar para `logo-stonni-ink.png` (é papel branco, então a versão em tinta), **e tratam `'logo.png'` gravado em `pdf_logo_url` como "usar o padrão novo"** — senão quem tem esse valor no banco sairia com PDF sem logo. O campo de admin em Configurações também foi repontado.
  - **Descoberto no caminho:** o `serve-staging.py` só manda `no-store` para `.html` e `.js`. `manifest.json` e `.png` voltam do cache do navegador, e a conferência local mente — foi preciso `fetch(..., {cache:'reload'})` para ver o arquivo novo.
- 2026-09-15 — **O app inteiro passou a puxar cor, fonte e medida de um arquivo só.** Design system Stonni interno aplicado ao shell **e** ao CRM embutido. Receita completa e as armadilhas em `docs/2026-09-15-design-system.md` — **leia antes de rodar varredura de literal aqui.**
  - **O buraco:** cor e medida estavam escritas à mão em ~2.700 pontos entre `index.html`, os `.js` da raiz e todo o `crm/`. Mudar um tom da marca era caçar hex arquivo por arquivo, e foi assim que o app ficou com azul-marinho antigo em lugares que ninguém lembrava.
  - **A alavanca foram dois `:root`** (shell e `crm/css/styles.css`), com os nomes antigos apontando para os tokens do DS. É isso que faz os 1.299 `style=` inline herdarem a paleta sem serem reescritos.
  - **Medido:** hex cru 360 → 139 (os que sobraram são quase todos jsPDF, onde `var()` não resolve); medida literal **2.389 → 404**; 442 emoji removidos, 408 viraram ícone Lucide. As cinco checagens de falha silenciosa do `auditar-tokens.py` passam.
  - **Três colisões de nome** entre o `:root` antigo e o DS (`--text-muted`, `--text-secondary`, `--radius-sm`) — todas do tipo que descarta a declaração sem nada no console. Estão comentadas por extenso no `:root` do `index.html`.
  - **A varredura automática criou 4 regressões silenciosas**, todas pegas antes de fechar: `theme-color` e dois `<input type="color">` com `var()` (caem para preto), e um `--on-brand-veil: var(--on-brand-veil)` auto-referente. A nota diz o que excluir da próxima varredura.
  - **Ícone sem JS nenhum:** CSS mask + seletor `[data-ic]`, que pega elemento montado por `innerHTML` depois. Sem `MutationObserver`, logo sem hidratação para esquecer de chamar.
  - **Sidebar foi para o índigo do DS** (`#16103D`). Antes da troca ela tinha ficado na mesma cor do botão primário, e o item ativo em ciano caía para **2.42** de contraste; agora dá **6.59**.
  - **Não foi publicado.** `sw.js` já está em `stonni-v5-20260915` com o CSS do DS no `APP_SHELL`, com a mesma query string do `<link>`.
  - **Ficou de fora de propósito:** altura de controle (não casa com a escala 32/40/48 do DS) e o arredondamento dos ~490 meio-degraus de medida — os dois são redesenho de densidade, não migração, e mudariam a tela inteira de uma vez.
- 2026-09-08 — **Foto de produto virou três camadas resolvidas por prioridade, em vez de um campo só** (`ad19e92`, `eedaa67`). O problema: a foto manual, subida enquanto o produto não existe no Bling, **sumia no sync** — ela morava no mesmo `fotos[]` que a sincronização sobrescreve.
  - **Backend:** `ped_catalogo_produtos` ganhou `fotos_erp`/`foto_erp_miniatura` e `fotos_manual`/`foto_manual_miniatura`, mais colunas **geradas** `origem_foto`, `fotos_exibir` e `foto_exibir_miniatura`, que resolvem por prioridade **Bling > ERP > Manual**. O app lê `fotos_exibir` (hoje = Bling), com fallback para `p.fotos`.
  - **Na tela:** o editor mostra "Automáticas (Bling > ERP)" e "Foto manual" **separadas**, com selo da fonte que está aparecendo. Upload manual grava em `fotos_manual` e não some mais no sync.
  - Migradas 3 fotos manuais antigas que estavam no campo `fotos` para `fotos_manual`.
- 2026-09-01 — **Desconto e promoção passaram a sair sozinhos, não só entrar** (`bbadf30`). Bug com consequência comercial: `aplicarRegrasDesconto` **semeava do desconto anterior**, então desconto de grupo ou de valor do pedido **ficava preso** em outros itens depois que o pedido deixava de qualificar — o representante fechava com desconto que a regra não dava mais.
  - O motor agora **recalcula do zero** a cada mudança, e as promoções foram para dentro dele: não somem ao mudar quantidade e saem sozinhas quando expiram ou deixam de casar.
  - **Preço editado à mão é preservado** — regra e promoção não se aplicam por cima dele.
  - O recálculo passou a rodar em **todos** os gestos: adicionar (novo **e** incremento de item existente, que antes não reaplicava), +/− e remover.
- 2026-09-01 — **Preços e Ações: preço fixo por quantidade, e o fim do jargão na config** (`d046483`, `a92a58c`, `8e9be35`, `3fe7231`). Regra nova de **preço fixo por produto + quantidade**, tipos mais claros, e tudo referido **por nome** em vez de id — busca por nome, grupo por nome.
  - Abas reorganizadas: Equipe saiu (foi para o Hub), "PDF do Pedido" virou aba própria, e Tabelas & Preços / Ações & Promoções ganharam descrição que deixa claro que **preço permanente ≠ promoção temporária** — era a confusão recorrente de quem configurava.
  - Junto: subgrupo no `qtd_grupo` e salvamento à prova de falha.
- 2026-09-01 — **Catálogo: foto manual e trava de duplicado** (`7e6ce49`, `2d6aa3e`). Botão "Adicionar foto manual" no editar produto (bucket `catalogo-fotos`, até 5 MB) e × para apagar cada foto, removendo do storage quando é manual; políticas de insert/update/delete para `authenticated`. E inserir produto **já existente ficou travado** por `id_produto_erp` — duplicata no catálogo vira preço divergente para o mesmo item.
- 2026-09-01 — **Materiais: as linhas de produto saíram do código e vieram do banco** (`6c142a1`). O widget (portal e CRM) lê `prt_linhas_produto` com fallback, em vez da lista fixa — alinhado com a **Assistência, que é a fonte da verdade** dessas linhas. Rótulo "Ar-Condicionado" corrigido.
- 2026-09-01 — **CRM embutido: itens de distribuição com margem pelo preço de compra** (`fbb8d45`). Mesma base de custo que o e-commerce adotou no mesmo dia, para os dois não mostrarem margem diferente do mesmo item.
- 2026-08-14 — Orçamento por WhatsApp como **PDF real** (jsPDF+autotable vendorizados; `pedGerarPDFFile`/`pedEnviarWhatsApp`; `pedCalcularTotais` como fonte única). SW v4. Commit `61c8929`.
- 2026-08-13 — Fix auth: `renovarToken()` + retry 401 nos helpers `supa*` (conserta telas vazias após ~1h; era o caso do Materiais). SW v3. Commit `2cc6a68`.
- 2026-08-13 — Fix CRM: descartar cliente some na aba Carteira (com_stonni `e052271` + fonte `stonnidist-v2` `f3f7758`).
- 2026-08-12 — Docs atualizadas + doc do CRM trazida p/ `crm/docs/`. Fixes mobile (notch, drawer CRM overlay, fotos sem legenda). Commits `a74bc6c`→`549a81a`.
- 2026-08-11 — Unificação: PWA, sidebar única, Materiais+IA, WhatsApp, catálogos, Config reorg, CRM embutido+SSO. Deploy em com-stonni.vercel.app.
