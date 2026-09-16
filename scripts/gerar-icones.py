# -*- coding: utf-8 -*-
"""Gera ds/stonni-icones.css: os 59 icones do pacote + os extras que este app precisa."""
import io, os, re
from urllib.parse import quote

JSX = r"C:\Users\ecommerce06\Desktop\Aplicações Bononi\.claude\skills\stonni-design-interno\components\core\Icon.jsx"
SAIDA = r"C:\Aplicações da bononi\com_stonni\ds\stonni-icones.css"

src = io.open(JSX, encoding="utf-8").read()
bloco = src[src.index("const PATHS"):]
bloco = bloco[:bloco.index("\n}")]
PACOTE = re.findall(r"'([a-z0-9-]+)'\s*:\s*'([^']+)'", bloco)

# Lucide (ISC) transcritos porque NAO estao no pacote da skill. Se forem
# aceitos, o lugar deles e o Icon.jsx do pacote, nao aqui.
EXTRAS = [
    ("home",          "M3 10.5 12 3l9 7.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 21v-7h6v7"),
    ("shopping-cart", "M8 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM19 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"),
    ("shopping-bag",  "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18M16 10a4 4 0 0 1-8 0"),
    ("target",        "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"),
    ("briefcase",     "M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"),
    ("tag",           "M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42zM7.5 7.5h.01"),
    ("lock",          "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2ZM7 11V7a5 5 0 0 1 10 0v4"),
    ("lightbulb",     "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.5.5.8 1.1.9 1.8h6.2c.1-.7.4-1.3.9-1.8A7 7 0 0 0 12 2Z"),
    ("save",          "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7"),
    ("ban",           "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM4.9 4.9l14.2 14.2"),
    ("receipt",       "M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1ZM8 7h8M8 11h8M8 15h5"),
    ("smartphone",    "M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM12 18h.01"),
    ("circle",        "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"),
    ("trophy",        "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"),
    ("gift",          "M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"),
    ("camera",        "M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"),
    ("paperclip",     "M13.234 20.252 21 12.3a4.5 4.5 0 0 0-6.364-6.364l-9.9 9.9a3 3 0 0 0 4.243 4.243l8.485-8.486a1.5 1.5 0 0 0-2.121-2.121L7.757 17.5"),
    ("book-open",     "M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"),
    ("dollar-sign",   "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"),
    ("bot",           "M12 8V4H8M4 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2ZM2 14h2M20 14h2M15 13v2M9 13v2"),
    ("arrow-up",      "M12 19V5M5 12l7-7 7 7"),
    ("archive",       "M20 9v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9M2 4h20v5H2zM10 13h4"),
]

SVG = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' "
       "stroke='black' stroke-width='1.75' stroke-linecap='round' "
       "stroke-linejoin='round'><path d='%s'/></svg>")

CAB = '''/* ==========================================================
   STONNI - ICONES (Lucide, ISC)
   Gerado por scripts/gerar-icones (ver docs). NAO editar a mao.

   Uso:  <i class="ic ic-md" data-ic="search"></i>

   Por que CSS mask, e sem JS nenhum:
   - a cor sai de currentColor, entao o icone acompanha o texto;
   - o seletor [data-ic] pega elemento montado por innerHTML DEPOIS,
     sem hidratacao. Nao existe MutationObserver para esquecer de
     chamar - que e o modo de falha conhecido dessa conversao;
   - tudo em data URI: PWA offline nao pode depender de CDN.
   ========================================================== */
.ic{
  display:inline-block; flex-shrink:0; vertical-align:-0.125em;
  width:1em; height:1em;
  background-color:currentColor;
  -webkit-mask:var(--ic) center/contain no-repeat;
          mask:var(--ic) center/contain no-repeat;
}
.ic-sm{width:16px;height:16px}
.ic-md{width:18px;height:18px}
.ic-lg{width:20px;height:20px}
.ic-xl{width:24px;height:24px}
'''

linhas = [CAB, "\n/* ---------- do pacote do DS (Icon.jsx) ---------- */"]
for nome, d in PACOTE:
    linhas.append('.ic[data-ic="%s"]{--ic:url("data:image/svg+xml,%s")}' % (nome, quote(SVG % d, safe="")))

linhas.append("""
/* ---------- EXTRAS: nao estao no pacote da skill ----------
   Transcritos do Lucide porque este app precisa deles. Se valerem para
   os outros apps, o lugar certo e o Icon.jsx do pacote - e entao estes
   somem daqui. Nao invente icone novo nesta secao sem essa conversa. */""")
for nome, d in EXTRAS:
    linhas.append('.ic[data-ic="%s"]{--ic:url("data:image/svg+xml,%s")}' % (nome, quote(SVG % d, safe="")))

io.open(SAIDA, "w", encoding="utf-8", newline="\n").write("\n".join(linhas) + "\n")
print("pacote: %d | extras: %d | total: %d" % (len(PACOTE), len(EXTRAS), len(PACOTE) + len(EXTRAS)))
print("gravado: %s (%d bytes)" % (SAIDA, os.path.getsize(SAIDA)))
