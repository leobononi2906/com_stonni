# Revisão — autoria em ped_catalogo_produtos

## 1. Por que agora
`com-stonni.vercel.app` não mostra quem cadastrou um produto no catálogo nem quem alterou preço/
foto/data — porque a tabela nunca gravou essa informação. Confirmado por grep no código
(`configuracoes.js`: insert em ~1101 e todos os `supaPatch` de produto não gravam usuário).

## 2. Resultado do pré-voo (contra produção, só-leitura)
- Banco confirmado: `postgres` em `vishxwdxqiygbxmtpfoy` (produção). 94 linhas em
  `ped_catalogo_produtos` hoje.
- **Achado que mudou o plano original:** a tabela **já tem** `criado_em` e `atualizado_em`
  (`timestamptz`) — não existiam colunas `criado_por`/`alterado_por`. A migration foi ajustada
  para reaproveitar as duas colunas de data já existentes e criar só as duas de autoria.
- Nenhum trigger na tabela hoje — `atualizado_em` é mantido manualmente pelo front (linha 1382
  de `configuracoes.js`, só no patch principal de edição; os patches de foto/tag/esgotado
  isolados não o atualizam hoje — fora do escopo desta migration, é ajuste de código à parte).

## 3. ⚠ O que muda no app que já está no ar, no instante em que a migration entra
Nada quebra. São duas colunas novas, nullable, sem `NOT NULL` e sem `CHECK`. O front atual
(antes do próximo push) continua funcionando exatamente igual, só que `criado_por`/`alterado_por`
ficam sempre `NULL` até eu alterar `configuracoes.js` para gravá-los.

## 4. O que é escrito nos dados de produção
Nada além do `ALTER TABLE` (adicionar 2 colunas). Nenhum backfill: os 94 produtos já cadastrados
ficam com `criado_por`/`alterado_por` = `NULL` — não existe registro de quem os criou, e inventar
um autor seria pior que deixar em branco.

## 5. O que não volta atrás sozinho
Nada irreversível. Para desfazer:
```sql
alter table public.ped_catalogo_produtos
  drop column if exists criado_por,
  drop column if exists alterado_por;
```
(Descartaria só o que for gravado nessas colunas depois da aplicação — os 94 produtos atuais
não têm nada nelas mesmo.)

## 6. Não apaga dado — auditado termo por termo
`grep -inE 'drop|delete|truncate|cascade'` no arquivo: **nenhuma ocorrência**.

## 7. Ordem para aplicar
1. Migration (este arquivo) — sobe a coluna antes do front, senão o "e-mail de quem alterou"
   não teria onde ir.
2. Depois, alteração em `configuracoes.js`: `cfgSalvarProduto` (insert, ~linha 1101) grava
   `criado_por: USUARIO?.email`; `cfgAtualizarProduto` e os demais `supaPatch` de produto (fotos,
   preço, tags, esgotado — linhas 1119 a 1399) passam a gravar `alterado_por: USUARIO?.email` e
   `alterado_em: new Date().toISOString()` junto do resto do patch.
3. Depois, exibir na tela de Catálogo/Configurações (ex.: "Cadastrado por X em DD/MM" / "Última
   alteração por Y em DD/MM", como já é feito no CRM em `crm/js/drawer.js`).
4. Push (`publicar-e-conferir`), lembrando de bumpar o cache-buster e o `CACHE` do service worker
   (é PWA).

## 8. Comando
```
python "C:/Users/ecommerce06/Desktop/Aplicações Bononi/.claude/skills/consultar-banco/scripts/sql.py" prod docs/sql/2026-09-23_autoria_catalogo.sql --escrever --producao
```

## 9. Recomendação
Aplicar. Baixo risco: 2 colunas nullable, sem trigger, sem constraint, sem backfill. O trabalho
de verdade (gravar e exibir a autoria) fica para depois, no código — a migration só abre espaço
pra isso.
