# STATUS — App Unificado Stonni (Portal + CRM) · com_stonni

> Atualizado: 2026-09-16

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
- `configuracoes.js` grande — refatoração gradual.

## Dev-log
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
