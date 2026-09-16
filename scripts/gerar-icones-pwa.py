# -*- coding: utf-8 -*-
"""Gera os icones quadrados do PWA a partir do simbolo da marca.

Por que existe: o manifest declarava `logo.png` como 192x192 e 512x512, mas
esse arquivo e um JPEG 1999x538 renomeado para .png — sem canal alfa e com o
fundo preto embutido. O Android esticava.

Aqui o simbolo branco (`logo-mark-white.png`) entra centralizado num quadrado
indigo da marca, com folga de 18% em volta: icone de app nao encosta na borda,
e o recorte redondo do launcher come o canto.
"""
import os
from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARCA = os.path.join(RAIZ, "logo-mark-white.png")
FUNDO = (22, 16, 61, 255)   # --indigo-900 #16103D, o mesmo da sidebar
FOLGA = 0.18                # margem proporcional em cada lado

for lado in (192, 512):
    fundo = Image.new("RGBA", (lado, lado), FUNDO)
    marca = Image.open(MARCA).convert("RGBA")

    util = int(lado * (1 - 2 * FOLGA))
    escala = min(util / marca.width, util / marca.height)
    novo = (max(1, int(marca.width * escala)), max(1, int(marca.height * escala)))
    marca = marca.resize(novo, Image.LANCZOS)

    fundo.alpha_composite(marca, ((lado - novo[0]) // 2, (lado - novo[1]) // 2))
    saida = os.path.join(RAIZ, "icon-%d.png" % lado)
    fundo.save(saida, "PNG", optimize=True)
    print("%-14s %dx%d  %d bytes" % (os.path.basename(saida), lado, lado, os.path.getsize(saida)))
