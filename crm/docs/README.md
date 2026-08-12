# Documentação do CRM (Atacado) — cópia vendorizada

> Estes documentos são a documentação do **CRM Atacado** (repo original `stonnidist-v2`),
> trazida pra cá porque o CRM foi **vendorizado** dentro do app unificado (pasta `crm/`).

O app unificado (com_stonni) embute o CRM via **iframe same-origin** (`crm/index.html`).
A pasta `crm/` é uma **cópia fiel** do `stonnidist-v2` — ver a "dívida de vendoring" no
[`../../PLANO_UNIFICACAO.md`](../../PLANO_UNIFICACAO.md).

## Arquivos
- **STATUS.md** — status/estado do CRM (o de referência do repo original).
- **_HANDOFF.md** — handoff técnico do CRM.
- **_PROGRESSO.md** — histórico de progresso do CRM.
- **README-crm.md** — README original do repo do CRM.

## Importante
- **Fonte de verdade do CRM** continua sendo o repo `stonnidist-v2` (produção do CRM em
  `stonnidist-v2.vercel.app`, intocado). Mudanças no CRM devem ser feitas lá e **re-sincronizadas**
  pra esta cópia (`cp` de index.html/js/css) até o unificado aposentar o `stonnidist-v2`.
- **Só edição feita aqui** na cópia: o guard de "embutido" (esconde a barra interna do CRM) em
  `crm/index.html` + o drawer vira overlay fixo no mobile em `crm/css/styles.css`. Reaplicar se
  re-sincronizar.
