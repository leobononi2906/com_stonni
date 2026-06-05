// ============================================================
//  pdf-pedido.js — Geração de PDF do Pedido Stonni
//  Chamada: pedGerarPDF(idPedido)
//  Funciona com window.print() + @media print — sem lib externa
// ============================================================

window.pedGerarPDF = async function(idPedido) {
  // Busca pedido + itens + configs em paralelo
  const [pedidos, itens, configs] = await Promise.all([
    supa('ped_pedidos', `id=eq.${idPedido}&select=*`),
    supa('ped_pedido_itens', `id_pedido=eq.${idPedido}&select=*&order=id.asc`),
    supa('ped_configuracoes', 'select=chave,valor')
  ]);

  const ped = pedidos?.[0];
  if (!ped) { alert('Pedido não encontrado.'); return; }

  const cfg = Object.fromEntries((configs || []).map(c => [c.chave, c.valor]));

  // Configs do PDF com fallbacks
  const titulo      = cfg.pdf_titulo          || 'PEDIDO';
  const empNome     = cfg.pdf_empresa_nome     || 'Stonni';
  const empCNPJ     = cfg.pdf_empresa_cnpj     || '';
  const empEndereco = cfg.pdf_empresa_endereco || '';
  const empTel      = cfg.pdf_empresa_telefone || '';
  const logoUrl     = cfg.pdf_logo_url         || 'logo.png';
  const rodape      = cfg.pdf_rodape           || '';

  // Formatadores
  const fmtDataBR = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const fmtVal    = v => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtCNPJ   = v => {
    const n = (v || '').replace(/\D/g, '');
    if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return v || '—';
  };

  // Totais do banco (fonte de verdade)
  const valorProdutos = Number(ped.valor_produtos || 0);
  const valorIPI      = Number(ped.valor_ipi || 0);
  const valorFrete    = Number(ped.valor_frete || 0);
  // valor_total salvo no banco = valor_produtos + valor_frete (sem IPI no campo valor_total)
  // Calculamos o total real somando os 3 componentes
  const valorTotal = valorProdutos + valorIPI + valorFrete;

  // Monta linhas de itens
  // total_item no banco = preco_final * quantidade (SEM IPI)
  // valor_ipi = IPI separado do item
  // Última coluna: total_item + valor_ipi (total real do item com IPI)
  const linhasItens = (itens || []).map((it, i) => {
    const ipi          = Number(it.ipi_perc || 0);
    const totalItem    = Number(it.total_item || (it.preco_final * it.quantidade));
    const valorIpiItem = Number(it.valor_ipi || 0);
    const totalComIpi  = totalItem + valorIpiItem;
    return `
      <tr class="${i % 2 === 0 ? 'par' : ''}">
        <td class="ref">${it.referencia || '—'}</td>
        <td class="nome">${it.nome_produto || '—'}</td>
        <td class="centro">${it.quantidade}</td>
        <td class="centro mono">R$ ${fmtVal(it.preco_final)}</td>
        <td class="centro">${ipi > 0 ? ipi + '%' : '—'}</td>
        <td class="centro mono">${valorIpiItem > 0 ? 'R$ ' + fmtVal(valorIpiItem) : '—'}</td>
        <td class="direita mono"><strong>R$ ${fmtVal(totalComIpi)}</strong></td>
      </tr>`;
  }).join('');

  // Linhas de totais
  const linhasFrete = valorFrete > 0
    ? `<tr><td colspan="2">Frete (${ped.transportadora || 'A definir'})${ped.prazo_frete_dias ? ' · ' + ped.prazo_frete_dias + ' dia(s)' : ''}</td><td class="mono direita">R$ ${fmtVal(valorFrete)}</td></tr>`
    : `<tr><td colspan="2">Frete</td><td class="mono direita verde"><strong>GRÁTIS</strong></td></tr>`;

  const linhasIPI = valorIPI > 0
    ? `<tr><td colspan="2">IPI total</td><td class="mono direita">R$ ${fmtVal(valorIPI)}</td></tr>`
    : '';

  // Dados da empresa (só campos preenchidos)
  const dadosEmpresa = [
    empCNPJ     ? `CNPJ: ${empCNPJ}` : '',
    empEndereco || '',
    empTel      ? `Tel: ${empTel}` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const dataDoc = fmtDataBR((ped.created_at || ped.criado_em || '').substring(0, 10));

  // ── HTML completo ──────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${titulo} ${ped.codigo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }

  /* ── LAYOUT ── */
  .pagina { width: 210mm; min-height: 297mm; padding: 14mm 14mm 18mm; margin: 0 auto; }

  /* ── HEADER ── */
  .header { display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #1A3A8F; padding-bottom: 12px; margin-bottom: 14px; }
  .header-logo img { max-height: 52px; max-width: 160px; object-fit: contain; }
  .header-empresa { font-size: 10px; color: #555; text-align: right; line-height: 1.6; }
  .header-empresa strong { font-size: 13px; color: #1A3A8F; display: block; margin-bottom: 2px; }
  .doc-titulo { background: #1A3A8F; color: #fff; font-size: 18px; font-weight: 700;
    letter-spacing: 2px; padding: 6px 16px; border-radius: 4px; margin-bottom: 4px; text-align: center; }
  .doc-codigo { font-size: 11px; color: #666; text-align: center; }

  /* ── SEÇÕES ── */
  .secao { margin-bottom: 14px; }
  .secao-titulo { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
    color: #1A3A8F; border-bottom: 1px solid #dde3f0; padding-bottom: 4px; margin-bottom: 8px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .campo { margin-bottom: 6px; }
  .campo label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 1px; }
  .campo span { font-size: 11px; font-weight: 500; }

  /* ── TABELA ITENS ── */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead tr { background: #1A3A8F; color: #fff; }
  thead th { padding: 6px 8px; text-align: left; font-weight: 600; font-size: 9px;
    text-transform: uppercase; letter-spacing: 0.5px; }
  tbody tr { border-bottom: 1px solid #eef0f5; }
  tbody tr.par { background: #f8f9fc; }
  tbody td { padding: 6px 8px; vertical-align: middle; }
  .ref { width: 72px; color: #666; font-size: 9px; }
  .centro { text-align: center; }
  .direita { text-align: right; }
  .mono { font-family: 'Courier New', monospace; }

  /* ── TOTAIS ── */
  .totais-wrap { display: flex; justify-content: flex-end; margin-top: 10px; }
  .totais table { width: 300px; }
  .totais td { padding: 4px 8px; }
  .totais tr.total-final td { border-top: 2px solid #1A3A8F; padding-top: 8px;
    font-size: 13px; font-weight: 700; color: #1A3A8F; }
  .verde { color: #22a06b; font-weight: 700; }

  /* ── CONDIÇÕES ── */
  .condicoes { background: #f0f3f8; border-radius: 6px; padding: 10px 14px; }
  .badge { display: inline-block; background: #1A3A8F; color: #fff; font-size: 9px;
    font-weight: 700; padding: 2px 8px; border-radius: 20px; letter-spacing: 0.5px; }

  /* ── RODAPÉ ── */
  .rodape { margin-top: 18px; padding-top: 10px; border-top: 1px solid #dde3f0;
    font-size: 9px; color: #999; text-align: center; line-height: 1.6; }

  /* ── PRINT ── */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .pagina { padding: 10mm 12mm 14mm; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 0; }
  }

  /* ── BARRA DE AÇÕES (só na tela) ── */
  @media screen {
    .barra-acoes {
      position: fixed; top: 0; left: 0; right: 0; background: #1A3A8F; color: #fff;
      padding: 10px 20px; display: flex; align-items: center; gap: 12px;
      z-index: 999; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .barra-acoes strong { font-size: 14px; flex: 1; }
    .btn-pdf {
      background: #fff; color: #1A3A8F; border: none; padding: 7px 18px;
      border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer;
    }
    .btn-pdf:hover { background: #e8edfa; }
    .btn-fechar {
      background: transparent; color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.3); padding: 7px 14px;
      border-radius: 6px; font-size: 12px; cursor: pointer;
    }
    .btn-fechar:hover { color: #fff; }
    body { padding-top: 52px; }
  }
</style>
</head>
<body>

<!-- Barra de ações (some ao imprimir) -->
<div class="barra-acoes no-print">
  <strong>${titulo} ${ped.codigo}</strong>
  <button class="btn-pdf" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
  <button class="btn-fechar" onclick="window.close()">✕ Fechar</button>
</div>

<div class="pagina">

  <!-- HEADER -->
  <div class="header">
    <div class="header-logo">
      <img src="${logoUrl}" alt="${empNome}" onerror="this.style.display='none'">
    </div>
    <div style="text-align:center;flex:1;padding:0 16px">
      <div class="doc-titulo">${titulo}</div>
      <div class="doc-codigo">${ped.codigo} &nbsp;·&nbsp; ${dataDoc}</div>
    </div>
    <div class="header-empresa">
      <strong>${empNome}</strong>
      ${dadosEmpresa}
    </div>
  </div>

  <!-- CLIENTE -->
  <div class="secao">
    <div class="secao-titulo">Dados do Cliente</div>
    <div class="grid-3">
      <div class="campo"><label>Razão Social</label><span>${ped.nome_cliente || '—'}</span></div>
      <div class="campo"><label>CNPJ</label><span>${fmtCNPJ(ped.cnpj_cliente)}</span></div>
      <div class="campo"><label>Cidade / UF</label><span>${ped.cidade_cliente || '—'}${ped.uf_cliente ? ' / ' + ped.uf_cliente : ''}</span></div>
    </div>
  </div>

  <!-- ITENS -->
  <div class="secao">
    <div class="secao-titulo">Itens do Pedido</div>
    <table>
      <thead>
        <tr>
          <th>Ref.</th>
          <th>Produto</th>
          <th style="text-align:center">Qtd</th>
          <th style="text-align:center">Preço Unit.</th>
          <th style="text-align:center">IPI %</th>
          <th style="text-align:center">Vl. IPI</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${linhasItens}
      </tbody>
    </table>

    <!-- TOTAIS -->
    <div class="totais-wrap">
      <div class="totais">
        <table>
          <tr>
            <td>Subtotal produtos</td>
            <td class="mono direita">R$ ${fmtVal(valorProdutos)}</td>
          </tr>
          ${linhasIPI}
          ${linhasFrete}
          <tr class="total-final">
            <td>TOTAL</td>
            <td class="mono direita">R$ ${fmtVal(valorTotal)}</td>
          </tr>
        </table>
      </div>
    </div>
  </div>

  <!-- CONDIÇÕES COMERCIAIS -->
  <div class="secao">
    <div class="secao-titulo">Condições Comerciais</div>
    <div class="condicoes">
      <div class="grid-3">
        <div class="campo">
          <label>Prazo de Pagamento</label>
          <span><span class="badge">${ped.prazo_pagamento || '—'}</span></span>
        </div>
        <div class="campo">
          <label>Frete por Conta</label>
          <span><span class="badge">${ped.frete_por_conta || 'CIF'}</span></span>
        </div>
        <div class="campo">
          <label>Transportadora</label>
          <span>${ped.transportadora || 'A definir'}${ped.prazo_frete_dias ? ' · ' + ped.prazo_frete_dias + ' dia(s)' : ''}</span>
        </div>
      </div>
      ${ped.obs ? `<div class="campo" style="margin-top:8px"><label>Observações</label><span>${ped.obs}</span></div>` : ''}
    </div>
  </div>

  <!-- REPRESENTANTE -->
  <div class="secao">
    <div class="secao-titulo">Representante</div>
    <div class="grid-2">
      <div class="campo"><label>Nome</label><span>${ped.nome_representante || '—'}</span></div>
      <div class="campo"><label>Data do Pedido</label><span>${dataDoc}</span></div>
    </div>
  </div>

  <!-- RODAPÉ -->
  ${rodape ? `<div class="rodape">${rodape}</div>` : `<div class="rodape">Este documento é um pedido comercial e não tem valor fiscal.</div>`}

</div><!-- /pagina -->
</body>
</html>`;

  // Abre em nova janela
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) {
    alert('Bloqueador de pop-up ativo. Libere pop-ups para este site e tente novamente.');
    return;
  }
  win.document.write(html);
  win.document.close();
};
