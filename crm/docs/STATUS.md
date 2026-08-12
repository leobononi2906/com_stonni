# STATUS — CRM Atacado (stonnidist-v2)

> Atualizado: 2026-08-11

## O que é
CRM de distribuição/atacado (marca Stonni): carteira por vendedor, ranking de esforço, análise de tendência de clientes/produtos, atendimento via Umbler e aba de Materiais + IA. É um app que o **Leo revisa pessoalmente antes de produção** (dado de esforço do vendedor é sensível).

## Onde está
- **Clone real (git):** `C:\CLAUDE\Projetos GitHub\stonnidist-v2` (remote `leobononi2906/stonnidist-v2`, branch `main`). ⚠️ `stonnidist` (v1, sem "-v2") é a versão **antiga/lixo** — candidato a arquivar; não confundir.
- **Deploy:** https://stonnicrn.vercel.app (chave de acesso no Hub = **`atacado`**) · push na `main` → Vercel automático.
- **Supabase:** `vishxwdxqiygbxmtpfoy` (tabelas/views `atac_*`).
- **Código:** modular — `index.html` + `js/` (`data.js`, `ui.js`, `vendedores.js`, `materiais.js`…). Padrão de aba: nav `si-x`, página `pg-x.pg`, entry em `PAGINAS`, `renderX()` via `gotoTab`.

## Conceitos que NÃO podem ser violados
- **A unidade operacional é o CARD, não o cliente.** Um card (`atac_card_membro`) agrupa 2–3 cadastros duplicados do ERP. Classificar comprou/falou/parada por `id_cliente` do dono sozinho dá **falso negativo** (a compra pode cair no cadastro irmão). Sempre agregar no nível do card.
- **Faturamento difere por aba por ESCOPO, não por fonte:** Home = todos os docs DISTRIBUICAO do período; Vendedores = só distribuidor ativo (+ linha "Inativos/outros" reconcilia); Produtos = janela global 30d/12M ancorada na última nota. Doc-nível == item-nível na view.
- **Nome de cliente** vem de fora da view de itens (só tem `id_cliente`): resolver por `atac_clientes` → fallback `vw_dim_cliente` (tem todos), senão mostra "Cliente #id".
- **Comparativos de tendência** = Últimos 30D vs média mensal dos 3M anteriores, ancorado na última data faturada (evita falso −100% de mês parcial). O dado-rei é o **Δ R$** (impacto), não a %: filtrar → ordenar por Δ R$ → cortar Top N.

## Ranking de Vendedores (6 colunas)
Vendedor · Vendeu (fat+tkt) · Carteira trabalhada (cobertura%+nº) · **Atendimentos** (volume total incl. leads) · Saúde da carteira · Ritmo. **Falados/Cobertura** só conta Umbler quando o atendente é ele (`_umblerAttrib()`); **Atendimentos** conta todos incl. leads fora da carteira. **Representantes** (`DISTRIBUICAO REPRESENTANTES`) ficam em seção própria, fora das médias da equipe. Coluna "Prospecção" virou **"Em aberto"** (falou sem comprar).

### Atribuição Umbler → vendedor (`_umblerAttrib`, 3 sinais nesta ordem)
1. `id_atendente_umbler` == `atac_umbler_vendedor.id_membro_umbler` (código×código, mais confiável).
2. `nome_atendente` (UPPER, sem acento) == nome do vendedor.
3. **TAG** — a caixa geral "ATACADO" não preenche atendente; marca por tag `"<APELIDO> STONNI/ATACADO"`. Sem ler a tag, ~77 contatos/mês somem do ranking. Sem identificação → ignora (não usar `usuario_umbler`).

## Automações
- **Recaptura de venda ativa:** cron `atac-recapturar-venda` (jobid 50, 06:20) re-atribui cliente do balcão ao vendedor da última venda quando entra venda nova **após** a liberação/inativação do vínculo (guarda `ultima_compra > liberado_em`). Resolve as "vendas perdidas" que ficavam presas em Prospecção. Par com `atac-vencer-prospeccao` (06:10, faz o inverso).

## Estado atual (produção)
CRM completo em uso. Aba **Materiais** (07/08, commit e12e48b): grade por tipo + filtro por linha + visor YouTube/imagem + modal "Perguntar à IA" (edge `assist-perguntar`, JWT). Base compartilhada `prt_materiais` — sem backend novo.

## Pendências / próximos passos
- [ ] Arquivar o repo/pasta antigo `stonnidist` (v1).
- [ ] Possível extrair `perguntar-ia-widget.js` standalone p/ plugar em ecommerce/compras.

## Dívidas e armadilhas conhecidas
- "Prospecção" ainda tem 3 sentidos (status do cliente, balcão de garimpo, métrica "Em aberto") — cuidado de linguagem.
- Vínculo manual LIBERADO ou apontando p/ vendedor INATIVO bloqueia `dono_por_venda` — daí a necessidade do cron de recaptura.
- Safari iOS: usar `fetch()` direto (não `sb.rpc()`); nunca `confirm()`/`prompt()` nativos.

## Dev-log
- 2026-08-07 — Aba Materiais + IA (commit e12e48b).
- 2026-08-06 — Ranking simplificado 11→6 colunas; representantes em seção própria; "Prospecção"→"Em aberto".
- 2026-08-04 — Cron de recaptura de venda ativa (jobid 50); 7 casos retroativos aplicados pelo Leo.
- 2026-07-26/27 — Card-level em toda classificação; atribuição Umbler por 3 sinais; reconciliação de faturamento por aba; comparativo Δ R$.
