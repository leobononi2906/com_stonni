# PLANO — Unificação Portal (com_stonni) + CRM Atacado (stonnidist-v2) em PWA único

> Iniciado em 11/08/2026. Documento vivo — mapa de trabalho da unificação.
> **Regra de ferro durante a construção:** tudo em branch `unificado-pwa`, **NADA em produção**.
> Sem push na `main`, sem criar chave no Hub, sem mexer em RLS até estar provado.

---

## 1. Decisão de arquitetura (registro)

Objetivo: **um PWA único**, mobile-first, com um login só, onde:
- **Representante** vê: Catálogo, Novo Pedido, Meus Pedidos, Materiais/IA — **NÃO vê o CRM**.
- **Vendedor interno** vê: **tudo** (Catálogo, Pedidos, CRM/Info Técnica, Materiais/IA).
- **Admin** vê: tudo + Configurações (preço/tabela/ERP), liberada **só pra admin**.

### 1.1 Exceção consciente ao Padrão Bononi 5.0
O padrão 5.0 diz "NUNCA juntar duas aplicações num sistema só" — a intenção é **anti-monolito
e isolamento de falha**. Aqui juntamos com_stonni + CRM num só app, mas **cumprindo a intenção**:
- Cada área é um `<script>` **separado** (erro de sintaxe num não derruba os outros).
- Toda tela roda em `try/catch` com Error State próprio (falha isolada por área).
- O CRM atual (`stonnidist-v2`) **fica no ar, intocado**, durante toda a construção; só viramos a
  chave quando o módulo CRM aqui dentro estiver testado e idêntico.
- Risco residual assumido: deploy acoplado (um deploy ruim afeta os dois públicos) → mitigado por
  deploy cuidadoso + rollback.

Aprovado por Leo em 11/08/2026 (Opção A).

---

## 2. Base técnica (o que já existe e reusamos)

- **Tronco = com_stonni** (`C:\CLAUDE\Projetos GitHub\com_stonni\com_stonni`).
  Casca já pronta: login, auth via sessão Supabase compartilhada com o Hub
  (`localStorage: sb-vishxwdxqiygbxmtpfoy-auth-token`), nav por perfil, router `renderPagina(id)`,
  drawer global, responsivo mobile. Módulos: `catalogo.js`, `pedidos.js`, `gestao.js`,
  `configuracoes.js`, `catalogo-pdf.js`, `pdf-pedido.js`.
- **Supabase compartilhado** `vishxwdxqiygbxmtpfoy` — os dois apps já leem o mesmo banco.
- **Hub = porteiro**. Módulos em `user_metadata.modulos` (array). Chaves reais em uso:
  `stonni` (portal rep), `atacado` (CRM), + outras (frete, varejo, compras, etc.). Admin = `user_metadata.admin`.

### 2.1 O gancho da parede
A parede "rep não vê CRM" = **exigir o módulo `atacado`**. O rep tem `stonni`, não tem `atacado`.
No front: só monta a aba CRM se `USUARIO.modulos.includes('atacado')`.
No banco (fase 3): RLS nas `atac_*` exigindo `auth.jwt()->'user_metadata'->'modulos' ? 'atacado'`.

---

## 3. Estado de segurança HOJE (levantado 11/08/2026) — ATENÇÃO

- RLS **desligada** nas tabelas centrais do CRM (`atac_card`, `atac_cliente_vendedor`,
  `atac_clientes`, `atac_crm_notas`) e em `ped_pedidos`/`ped_pedido_itens`.
- Onde há policy, é `using (true)` inclusive para `anon` → **a chave anon lê tudo**.
- Consequência: esconder o CRM só no JS **não basta** num app que o rep carrega. A parede real
  (RLS por módulo `atacado`) tem que existir **antes** de o rep ter acesso ao app unificado.
- Por isso a fase 3 (RLS) é a mais sensível e vem **por último**, testada em branch/conta-rep.

---

## 4. Fases

### Fase 0 — Sandbox invisível  ⏳ EM ANDAMENTO
- [x] Branch local `unificado-pwa` (sem push).
- [x] Este plano.
- [x] Casca PWA (manifest + service worker versionado + registro + meta tags). — commit d257e34
- [x] Porteiro: carregar `USUARIO.modulos` e `USUARIO.admin` do metadata. — commit d257e34
- [x] Aba **Info Técnica (CRM)** no nav, gated por `atacado`; módulo `crm.js` isolado (stub). — commit d257e34
- [ ] (quando for expor) chave de módulo nova no Hub p/ o app de teste, liberada só p/ admin — **requer OK explícito**.

### Fase 1 — Front + PWA
- [x] CRM (Info Técnica) **embutido via iframe same-origin** — vendorizado em `crm/` (cópia fiel do stonnidist-v2). Gated por `atacado`; SSO pela sessão do localStorage. Smoke test OK. **Decisão**: embed em vez de reescrever 5k linhas (Padrão 5.0: não refazer o que funciona). Nativizar telas específicas fica como opção futura, não obrigatório.
  - ⚠️ **Dívida de vendoring**: `crm/` é uma CÓPIA. Enquanto o `stonnidist-v2` receber deploys, re-sincronizar (`cp` de index.html/js/css). No futuro, quando o unificado virar a produção do CRM, aposentar o `stonnidist-v2`.
- [x] Materiais + IA como módulo compartilhado (`materiais.js`). — commit 876af8e (smoke test: 14 itens, filtro, modal IA OK)
- [ ] "Catálogo + Info por WhatsApp" (ação no módulo Catálogo).
- [ ] Testar logado com conta admin lendo produção (vê tudo, sem mexer em RLS).
- [ ] Comparar lado a lado com o CRM ao vivo até bater igual.

### Fase 2 — Reconciliar acesso (decisão pendente)
Hoje o com_stonni resolve perfil por `ped_gestores`/`ped_representantes`; o Hub usa `modulos`.
**Decisão a tomar:** vendedor interno "vê tudo" entra como qual perfil? Opções:
(a) dar módulo `atacado` + tratar nav por módulos; (b) cadastrá-lo como gestor no portal.
→ resolver antes de portar o CRM de vez.

### Fase 3 — A parede (sensível, por último)
- [ ] RLS nas `atac_*` e `ped_pedidos` exigindo `atacado`/dono, validada em conta-rep de teste.
- [ ] Remover leitura `anon` ampla das `atac_*` (conferir que todo usuário do CRM loga).
- [ ] Rollback pronto antes de tocar produção. **Requer OK explícito.**

### Fase 4 — Virar a chave
- [ ] Só quando 1–3 provados. Deploy cuidadoso; CRM antigo permanece como fallback até validação.

---

## 6. Migração p/ SERVIDOR INTERNO (diretriz Leo 11/08)

O app unificado será hospedado num **servidor interno** (não Vercel público). Já foi
construído pensando nisso — checklist do que garante a migração:

- **Path-independent** ✅ — todos os caminhos são **relativos** (`./crm/index.html`,
  `manifest.json`, `sw.js`, `css/`, `js/`). Roda em qualquer subpath (`http://intranet/stonni/`)
  sem alteração. Nunca introduzir `src="/..."` absoluto.
- **Same-origin preservado** ✅ — `crm/` é servido pelo mesmo host do portal → SSO por
  `localStorage` continua funcionando no interno.
- **PWA precisa de HTTPS** ⚠️ — service worker e "instalar app" só rodam em **contexto seguro**
  (HTTPS ou localhost). Em HTTP puro o SW **não registra** — mas o app **degrada sozinho**
  (registro em try/catch + guard `'serviceWorker' in navigator`): funciona normal, só sem
  offline/instalação. Ideal: o servidor interno com HTTPS (certificado interno serve).
- **Dependências de CDN (só quebram se o servidor for offline/air-gapped)**:
  1. `supabase-js` — `cdn.jsdelivr.net/.../supabase-js@2` (usado pelo CRM em `crm/index.html`). **Crítico**: sem ele o CRM não sobe.
  2. Google Fonts (DM Sans/Mono) — portal e CRM. **Cosmético**: cai pra fonte do sistema.
  → Se o interno tiver internet: nada a fazer. Se for **offline**: vendorizar esses arquivos
  localmente (`vendor/supabase.js` + fontes self-hosted) e apontar os `<script>`/`<link>` pra eles.
- **Config que permanece**: `SUPA_URL`/`SUPA_KEY` (Supabase é nuvem, não migra) e a chave
  `sb-vishxwdxqiygbxmtpfoy-auth-token` do localStorage. Independem do host.

> Deploy hoje: branch `unificado-pwa` local. O com_stonni original é Vercel (`main`=prod), mas o
> **alvo do unificado é o servidor interno** — reavaliar pipeline de deploy quando for subir.

## 5. Pendências / decisões em aberto
- **Info Técnica** = apenas o novo rótulo do CRM (confirmado por Leo 11/08). Sem feature nova.
- Ícones PWA definitivos (hoje usa `logo.png`).
- Fase 2 (modelo de acesso do vendedor interno) — decisão pendente.
- Offline: catálogo cacheável para o rep em campo (fase 1); pedido offline (fila+sync) fica p/ fase futura.
