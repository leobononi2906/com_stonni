# Design system Stonni interno aplicado ao com_stonni — 15/09/2026

Receituário deste app. O procedimento geral está na skill `aplicar-design-system`; aqui fica o
que é **específico daqui** e o que custou caro descobrir.

O app é dois de uma vez — shell do Portal (`index.html` + `.js` na raiz) e CRM embutido
(`crm/`, iframe same-origin). **Os dois foram migrados**, e os dois têm a mesma ponte em
arquivos diferentes: se mexer num `:root`, mexa no outro.

---

## 1. O que entrou no repo

| Arquivo | O que é | Quem edita |
|---|---|---|
| `ds/stonni-ds.css` | 215 tokens do pacote da skill, concatenados. Sem `@import` — as fontes viram `<link>`. | ninguém à mão: `scripts/gerar-icones.py` é o irmão dele; o DS se regenera copiando do pacote |
| `ds/stonni-icones.css` | 81 ícones Lucide como CSS mask em data URI | gerado por `scripts/gerar-icones.py` |
| `scripts/gerar-icones.py` | lê o `Icon.jsx` do pacote da skill e gera o CSS acima | sim |
| `scripts/migrar-medidas.py` | converte medida literal → token, **por propriedade** | sim |
| `:root` do `index.html` | a ponte do shell — **é aqui que se muda o design deste app** | sim |
| `:root` do `crm/css/styles.css` | a mesma ponte, para o CRM embutido | sim |

## 2. As três colisões de nome (não dão erro nenhum)

O `:root` antigo e o DS têm nomes iguais com sentidos diferentes. Cada uma destas, se resolvida
por instinto, some da tela sem console:

1. **`--text-muted`** — no DS é `neutral-600` (o cinza do meio); aqui sempre foi o mais claro dos
   três. Ficou **redefinido** para `--text-subtle`. Não é auto-referência: é estreitamento.
2. **`--text-secondary` não pode apontar para `var(--text-muted)`.** Dentro do mesmo `:root`, o
   `var()` já enxerga o valor redefinido em (1) — os dois níveis virariam a mesma cor em silêncio.
   Ele puxa `--neutral-600` da rampa base justamente por isso.
3. **`--radius-sm`** — 8px aqui, 4px no DS. Os 141 usos foram migrados para `--radius-lg` (8px no
   DS) e o nome saiu da ponte. Não existe mais `--radius-sm` próprio neste app.

Herdados do DS sem redeclarar: `--shadow-sm/md/lg` e `--sidebar-w` (240 → 248px).

## 3. Onde o literal continua sendo o certo

Nem todo hex é dívida. Estes **têm** de ficar literais — trocar por `var()` quebra calado:

| Onde | Por quê |
|---|---|
| `catalogo-pdf.js`, `pdf-pedido.js`, `pdf-orcamento-file.js` | jsPDF escreve `var(--x)` como texto no papel. Os valores de marca foram alinhados ao DS **como hex** (23 trocas). |
| `<meta name="theme-color">` e `manifest.json` | `<meta>` e JSON não resolvem `var()`. |
| `<input type="color">` (`st-cor`, `st-edit-cor`) | só aceita `#rrggbb`; com `var()` o navegador cai para preto. |
| `ped_status.cor` | o valor vai para o **banco**. |
| `#128C7E` em `catalogo.js` | verde do WhatsApp — marca de terceiro. |

⚠️ **A varredura automática cria estes erros.** Na primeira passada ela converteu o
`theme-color` e os dois `<input type="color">`; a segunda, o `--on-brand-veil` **dentro da própria
definição** (`--on-brand-veil: var(--on-brand-veil)` — a auto-referência do §2). Quem rodar
varredura de literal de novo: **exclua o bloco `:root` e os arquivos da tabela acima**, e confira
`<meta>`, `type="color"` e atributo antes de fechar.

## 4. Ícones: CSS mask, e **sem** MutationObserver

A skill descreve o shim com `MutationObserver` hidratando `[data-ic]`. Aqui não tem, de propósito:
o ícone é um **seletor de atributo** (`.ic[data-ic="x"]{--ic:url(...)}`), que pega elemento
montado por `innerHTML` a qualquer momento. **Não existe hidratação para esquecer de chamar** —
que é o modo de falha conhecido dessa conversão. A cor sai de `currentColor`.

- Forma de uso: `<i class="ic ic-sm" data-ic="search"></i>` — HTML literal, nunca `${ic(...)}`
  dentro de valor entre aspas.
- Tamanhos: `ic-sm` 16 · `ic-md` 18 · `ic-lg` 20 · `ic-xl` 24. Onde o slot já tinha tamanho
  próprio (nav, alerta, estado vazio), o contexto manda — ver o bloco "TAMANHO DE ICONE POR
  CONTEXTO" no `index.html`.
- **22 dos 81 ícones não estão no pacote da skill** — foram transcritos do Lucide na seção EXTRAS
  do `stonni-icones.css` (home, shopping-cart, target, briefcase, tag, lock, lightbulb, save,
  ban, receipt, smartphone, circle, trophy, gift, camera, paperclip, book-open, dollar-sign, bot,
  arrow-up, archive, shopping-bag). **Se valerem para os outros apps, o lugar deles é o `Icon.jsx`
  do pacote** — e então somem daqui.
- Tudo em data URI porque é PWA: shim por CDN some justo para quem está sem sinal.

### Onde o emoji virou texto, não ícone

442 emoji saíram. 408 viraram ícone; **34 foram simplesmente removidos**, porque ali uma tag
apareceria crua: `.textContent`, `alert()`, valor de atributo (`title=`) e — principalmente —
rótulo de `<option>`, que às vezes é gravado no banco. Nesses lugares ficou só o texto.

Os geradores de PDF e o `sw.js` ficaram **fora** da conversão.

## 5. Medida: por propriedade, e o que é meio-degrau

`12px` é `--space-3` em `padding`, `--fs-100` em `font-size` e `--radius-xl` em `border-radius`.
Find-replace por **valor** funciona hoje e quebra calado quando a escala mudar — por isso
`scripts/migrar-medidas.py` mapeia por propriedade.

O app nasceu numa grade mais fina que a do DS (2px contra 4px), e a escala de corpo do DS começa
em 12px. Arredondar os ~490 pontos fora da escala para o degrau vizinho mudaria a densidade do
app inteiro de uma vez — **isso é redesenho, não migração**. Então eles viraram token próprio no
`:root` (`--space-0-5/1-5/2-5/3-5/4-5`, `--fs-075/090/450/550/650`, `--radius-10/14`): a medida
fica centralizada e a tela não mudou nada.

Ao redesenhar a densidade, aponte cada meio-degrau para o degrau vizinho do DS e apague a linha.

**Resultado:** 2.389 → **404** medidas literais. O que sobrou é micro-ajuste de 1/3/5/7/9px e
altura de controle (132) — decisão caso a caso, não varredura.

## 6. Como conferir

```bash
python "C:/Users/ecommerce06/Desktop/Aplicações Bononi/.claude/skills/aplicar-design-system/scripts/auditar-tokens.py" "C:/Aplicações da bononi/com_stonni" "C:/Aplicações da bononi/com_stonni/ds/stonni-ds.css"
```

⚠️ O script **quebra no fim** nesta máquina (`UnicodeEncodeError`: o console é cp1252 e ele
imprime emoji). Rode com `PYTHONIOENCODING=utf-8` na frente — senão o veredito das cinco
checagens não sai, e o exit code vira 1 por causa do traceback, não por achado.

Estado em 15/09/2026: **as cinco checagens de falha silenciosa passam**; 139 hex crus, quase todos
nos geradores de PDF (ver §3).

## 7. O que ficou de fora

- **Altura de controle** (132 pontos: 28/34/36/38/42/44/52/56/72px) não virou `--control-h-*`.
  A escala do DS é 32/40/48 e nenhuma dessas casa; encaixar mexeria no tamanho de todo botão e
  todo campo — decisão de design, não de migração.
- **O PDF não foi gerado para conferência.** As cores de marca foram trocadas nos três geradores,
  mas geração de PDF quebra calada: **gere um catálogo e um pedido de verdade antes de publicar.**
- **`crm/index.html` mantém `backdrop-filter`** no `.modal-ov`. Não foi mexido, mas é a armadilha
  conhecida de conter `position:fixed`.
- **Não foi publicado.** Ao publicar, é PWA: o `CACHE_VERSION` do `sw.js` já subiu para
  `stonni-v5-20260915` e o CSS do DS entrou no `APP_SHELL` **com a mesma query string do `<link>`**
  (`?v=20260915`) — `caches.match` casa a URL inteira, e divergir pinta o app sem estilo nenhum no
  arranque offline.
