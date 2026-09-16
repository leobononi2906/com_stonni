// ============================================================
//  catalogo-pdf.js — Gerador de Catálogo PDF Stonni
//  Chamada: catGerarPDF({ titulo, exibirPreco, tagsFiltro, subgruposFiltro })
//
//  ATENCAO: a janela aberta aqui e um documento AUTONOMO
//  (window.open('', '_blank') + document.write). Ela NAO carrega o
//  ds/stonni-ds.css nem o ds/stonni-icones.css, e caminho relativo nao
//  resolve porque a origem e about:blank. Por isso, aqui dentro:
//    - cor e medida vao em literal, nunca em var(--token);
//    - imagem entra embutida em data URI, nunca como src relativo;
//    - icone e texto, porque o CSS de mascara nao esta disponivel.
// ============================================================

// Le um arquivo do app e devolve data URI. Se falhar (offline, 404), devolve
// null — quem chama tem de ter um caminho alternativo, senao a capa quebra.
async function catArquivoEmDataUri(arquivo) {
  try {
    const r = await fetch(new URL(arquivo, location.href).href);
    if (!r.ok) return null;
    const blob = await r.blob();
    return await new Promise(resolve => {
      const fr = new FileReader();
      fr.onload  = () => resolve(fr.result);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch (e) { return null; }
}

window.catGerarPDF = async function(opcoes = {}) {
  const {
    titulo       = 'CATÁLOGO PRODUTOS 2026',
    subtitulo    = '@STONNI.OFICIAL',
    exibirPreco  = true,
    tagsFiltro   = [],    // [] = todos
    subgruposFiltro = [], // [] = todos
    capaUrl      = ''
  } = opcoes;

  // Sempre busca produtos frescos do banco para garantir campo tags atualizado
  let produtos = await supa('ped_catalogo_produtos', 'ativo=eq.true&order=subgrupo,nome&select=*') || [];

  // Aplica filtros
  if (tagsFiltro.length > 0) {
    produtos = produtos.filter(p => {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      return tagsFiltro.some(t => tags.includes(t));
    });
  }
  if (subgruposFiltro.length > 0) {
    produtos = produtos.filter(p => subgruposFiltro.includes(String(p.id_subgrupo)));
  }

  if (!produtos.length) {
    alert('Nenhum produto encontrado com os filtros selecionados.');
    return;
  }

  // Agrupa por subgrupo
  const grupos = {};
  for (const p of produtos) {
    const chave = p.subgrupo || p.grupo || 'OUTROS';
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(p);
  }

  // Formata preço
  const fmtVal = v => {
    const n = Number(v || 0);
    if (n === Math.floor(n)) return n.toLocaleString('pt-BR');
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Gera cards HTML
  const gerarCard = (p) => {
    const foto = catFotoUrl(p, 1300, 88);
    const ipi  = parseFloat(p.ipi_perc) || 0;
    const preco = p.preco_base || 0;

    return `
      <div class="card">
        <div class="card-foto">
          ${foto
            ? `<img src="${foto}" alt="${p.nome}" onerror="this.parentElement.innerHTML='<div class=\\'sem-foto\\'>SEM FOTO</div>'">`
            : `<div class="sem-foto">SEM FOTO</div>`}
        </div>
        <div class="card-body">
          <div class="card-ref">Ref. ${p.referencia || '—'}</div>
          <div class="card-nome">${p.nome || '—'}</div>
          ${exibirPreco ? `
            <div class="card-preco">R$ ${fmtVal(preco)}</div>
            ${ipi > 0 ? `<div class="card-ipi">+ ${ipi}% IPI</div>` : ''}
          ` : ''}
        </div>
      </div>`;
  };

  // Gera seções por subgrupo
  const secoes = Object.entries(grupos).sort(([a],[b]) => a.localeCompare(b)).map(([nome, prods]) => `
    <div class="secao">
      <div class="secao-header">
        <div class="secao-linha"></div>
        <div class="secao-titulo">${nome}</div>
        <div class="secao-linha"></div>
      </div>
      <div class="grid">
        ${prods.map(gerarCard).join('')}
      </div>
    </div>
  `).join('');

  // Capa — a logo e o lockup da marca, embutido. A capa e escura, entao vai a
  // versao branca. Se o arquivo nao vier (offline), cai no nome em texto: capa
  // sem logo e ruim, capa com <img> quebrada e pior.
  const logoCapa = await catArquivoEmDataUri('logo-stonni-white.png');
  const capaHtml = capaUrl
    ? `<div class="capa-img"><img src="${capaUrl}" alt="Capa"></div>`
    : `
      <div class="capa-gerada">
        ${logoCapa
          ? `<img class="capa-logo-img" src="${logoCapa}" alt="Stonni">`
          : `<div class="capa-logo">stonni</div>`}
        <div class="capa-nome">STONNI</div>
        <div class="capa-titulo-txt">${titulo}</div>
        <div class="capa-sub">${subtitulo}</div>
      </div>`;

  // HTML completo
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#fff; color:#161C22; }

  /* ── CAPA ── */
  .capa-img { width:210mm; height:297mm; page-break-after:always; overflow:hidden; }
  .capa-img img { width:100%; height:100%; object-fit:cover; }
  .capa-gerada {
    width:210mm; height:297mm; page-break-after:always;
    /* Indigo escuro, e nao o gradiente da marca: o simbolo do lockup branco
       e AZUL (#196DBB), so a palavra e branca. Medido, o simbolo no centro da
       capa rende 1,74 no degrade antigo, 1,03 no gradiente da marca (o azul
       some no azul) e 2,98 aqui — e a palavra sai de 3,04 para 15,7. */
    background: linear-gradient(180deg, #16103D 0%, #2A1F74 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:24px;
  }
  .capa-logo-img { width:300px; max-width:60%; height:auto; display:block; }
  .capa-logo { color:#fff; font-size:28px; font-weight:800; letter-spacing:2px; } /* fallback sem rede */
  .capa-nome { color:rgba(255,255,255,0.15); font-size:96px; font-weight:900; letter-spacing:-2px; line-height:1; }
  .capa-titulo-txt { color:#fff; font-size:36px; font-weight:900; text-align:center; text-transform:uppercase; }
  .capa-sub { color:#fff; font-size:14px; letter-spacing:3px; border:1px solid rgba(255,255,255,0.5); padding:6px 20px; border-radius:20px; }

  /* ── CONTEÚDO ── */
  .conteudo { padding:14mm 12mm; }

  /* ── SEÇÃO ── */
  .secao { margin-bottom:24px; }
  .secao-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
  .secao-linha { flex:1; height:2px; background:#145EA8; }
  .secao-titulo {
    font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:2px;
    color:#145EA8; white-space:nowrap; padding:4px 12px;
    border:2px solid #145EA8; border-radius:20px;
  }

  /* ── GRID 3 COLUNAS ── */
  .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }

  /* ── CARD ── */
  .card { border:1px solid #e0e5f0; border-radius:8px; overflow:hidden; background:#fff; break-inside:avoid; }
  .card-foto { width:100%; aspect-ratio:4/3; overflow:hidden; background:#f5f6fa; display:flex; align-items:center; justify-content:center; }
  .card-foto img { width:100%; height:100%; object-fit:contain; padding:4px; }
  .sem-foto { width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size:10px; color:#aaa; letter-spacing:1px; }
  .card-body { padding:8px; }
  .card-ref { font-size:9px; color:#888; text-transform:uppercase; letter-spacing:.5px; margin-bottom:2px; }
  .card-nome { font-size:10px; font-weight:600; color:#161C22; line-height:1.3; margin-bottom:4px; min-height:26px; }
  .card-preco { font-size:12px; font-weight:800; color:#145EA8; font-family:'Courier New',monospace; }
  .card-ipi { font-size:9px; color:#888; margin-top:1px; }

  /* ── PRINT ── */
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .no-print { display:none !important; }
    @page { size:A4 portrait; margin:0; }
    .secao { break-inside:avoid-page; }
  }

  /* ── BARRA AÇÕES ── */
  @media screen {
    .barra-acoes {
      position:fixed; top:0; left:0; right:0; background:#145EA8; color:#fff;
      padding:10px 20px; display:flex; align-items:center; gap:12px; z-index:999;
      box-shadow:0 2px 8px rgba(0,0,0,.2);
    }
    .barra-acoes strong { flex:1; font-size:14px; }
    .btn-imprimir { background:#fff; color:#145EA8; border:none; padding:7px 18px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; }
    .btn-imprimir:hover { background:#e8edfa; }
    .btn-fechar { background:transparent; color:rgba(255,255,255,.7); border:1px solid rgba(255,255,255,.3); padding:7px 14px; border-radius:6px; font-size:12px; cursor:pointer; }
    body { padding-top:52px; }
  }
</style>
</head>
<body>

<div class="barra-acoes no-print">
  <strong>${titulo} — ${produtos.length} produto(s)</strong>
  <button class="btn-imprimir" onclick="window.print()">Imprimir / Salvar PDF</button>
  <button class="btn-fechar" onclick="window.close()">Fechar</button>
</div>

${capaHtml}

<div class="conteudo">
  ${secoes}
</div>

</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Libere pop-ups para este site e tente novamente.'); return; }
  win.document.write(html);
  win.document.close();
};
