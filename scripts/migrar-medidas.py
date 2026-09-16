# -*- coding: utf-8 -*-
"""Levanta/converte medida literal -> token do DS Stonni, POR PROPRIEDADE.

O mesmo 12px e --space-3 em padding, --fs-100 em font-size e --radius-xl
em border-radius. Converter por VALOR funciona hoje e quebra calado
quando a escala mudar — por isso o mapa aqui e por propriedade.

Escala Stonni (do pacote, nao a da Bononi):
  space   4 8 12 16 20 24 32 40 48 64        -> --space-1..16
  fs      12 13 14 15 17 20 24 30 38 48      -> --fs-100..1000
  radius  3 4 6 8 12 16                      -> --radius-xs..2xl
  control 32 40 48                           -> --control-h-sm/md/lg

Rode com --aplicar para gravar; sem isso, so relata (inclusive o que
NAO cai na escala, que e decisao humana).
"""
import io, os, re, sys, collections

RAIZ = r"C:\Aplicações da bononi\com_stonni"
APLICAR = "--aplicar" in sys.argv
ALVOS = [a for a in sys.argv[1:] if not a.startswith("--")]

SPACE = {4: "--space-1", 8: "--space-2", 12: "--space-3", 16: "--space-4", 20: "--space-5",
         24: "--space-6", 32: "--space-8", 40: "--space-10", 48: "--space-12", 64: "--space-16",
         # meio-degrau: token do app, nao do DS (ver :root do index.html)
         2: "--space-0-5", 6: "--space-1-5", 10: "--space-2-5",
         14: "--space-3-5", 18: "--space-4-5"}
FS = {12: "--fs-100", 13: "--fs-200", 14: "--fs-300", 15: "--fs-400", 17: "--fs-500",
      20: "--fs-600", 24: "--fs-700", 30: "--fs-800", 38: "--fs-900", 48: "--fs-1000",
      10: "--fs-075", 11: "--fs-090", 16: "--fs-450", 18: "--fs-550", 22: "--fs-650"}
RADIUS = {3: "--radius-xs", 4: "--radius-sm", 6: "--radius-md", 8: "--radius-lg",
          12: "--radius-xl", 16: "--radius-2xl",
          10: "--radius-10", 14: "--radius-14",
          # raio maior que a altura do elemento e pilula; o DS tem token
          20: "--radius-pill", 999: "--radius-pill"}
ALTURA = {32: "--control-h-sm", 40: "--control-h-md", 48: "--control-h-lg"}

PROPS = {
    "padding": SPACE, "padding-top": SPACE, "padding-bottom": SPACE,
    "padding-left": SPACE, "padding-right": SPACE, "padding-block": SPACE,
    "padding-inline": SPACE,
    "margin": SPACE, "margin-top": SPACE, "margin-bottom": SPACE,
    "margin-left": SPACE, "margin-right": SPACE,
    "gap": SPACE, "row-gap": SPACE, "column-gap": SPACE,
    "font-size": FS,
    "border-radius": RADIUS,
    "height": ALTURA, "min-height": ALTURA,
}

# `prop : valores;`  — pega tanto CSS quanto style= inline
DECL = re.compile(r"(?<![\w-])([a-z-]+)\s*:\s*([^;{}\"'`\n]{1,80}?)(?=[;}\"'`\n])")
PX = re.compile(r"(?<![\w.-])(\d{1,3})px\b")

fora_escala = collections.Counter()
trocado = collections.Counter()
por_prop = collections.Counter()


def processa(txt, rel):
    def na_decl(m):
        prop, valor = m.group(1), m.group(2)
        mapa = PROPS.get(prop)
        if not mapa:
            return m.group(0)

        def na_px(p):
            n = int(p.group(1))
            if n in mapa:
                trocado[rel] += 1
                por_prop[prop] += 1
                return "var(%s)" % mapa[n]
            fora_escala["%s:%dpx" % (prop, n)] += 1
            return p.group(0)

        return "%s:%s" % (prop, PX.sub(na_px, valor)) if PX.search(valor) else m.group(0)

    return DECL.sub(na_decl, txt)


for rel in ALVOS:
    caminho = os.path.join(RAIZ, rel.replace("/", os.sep))
    txt = io.open(caminho, encoding="utf-8", newline="").read()
    novo = processa(txt, rel)
    if APLICAR and novo != txt:
        io.open(caminho, "w", encoding="utf-8", newline="").write(novo)

print("=== TROCADO (%d) ===" % sum(trocado.values()))
for k, v in trocado.most_common():
    print("  %4d  %s" % (v, k))
print("\n=== por propriedade ===")
for k, v in por_prop.most_common():
    print("  %4d  %s" % (v, k))
print("\n=== FORA DA ESCALA (%d ocorrencias, %d valores) — decisao humana ===" %
      (sum(fora_escala.values()), len(fora_escala)))
for k, v in fora_escala.most_common(30):
    print("  %4d  %s" % (v, k))
print("\nMODO:", "APLICADO" if APLICAR else "SIMULACAO")
