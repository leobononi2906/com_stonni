// ============================================================
//  pdf-orcamento-file.js — Gera o PDF do orçamento como ARQUIVO (jsPDF)
//  para anexar no WhatsApp (Web Share API). Layout espelha o pdf-pedido.js,
//  mas produz um File real (vetorial, leve) em vez de tela de impressão.
//  Chamada: const file = await pedGerarPDFFile(idPedido)  →  File | null
//  Usa os mesmos números do PDF de impressão via window.pedCalcularTotais.
// ============================================================
(function () {
  'use strict';

  const AZUL = [26, 58, 143];      // #1A3A8F
  const CINZA = [90, 106, 133];    // texto secundário
  const ESCURO = [26, 26, 46];
  const VERDE = [34, 160, 107];

  const fmtVal = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const fmtDataBR = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
  function fmtCNPJ(v) {
    const n = (v || '').replace(/\D/g, '');
    if (n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return v || '—';
  }
  function sanitize(s) {
    return String(s || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // tira acentos (C-cedilha, til) sem dropar a letra
      .replace(/[^\w.\- ]+/g, '').trim().replace(/\s+/g, '-');
  }

  // Carrega uma imagem (logo) como dataURL + dimensões naturais. null se falhar.
  async function carregarImagem(url) {
    try {
      const r = await fetch(url, { mode: 'cors' });
      if (!r.ok) return null;
      const blob = await r.blob();
      const fmt = { 'image/png': 'PNG', 'image/jpeg': 'JPEG', 'image/jpg': 'JPEG' }[blob.type];
      if (!fmt) return null; // jsPDF só embute PNG/JPEG com segurança
      const dataUrl = await new Promise((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob);
      });
      const dim = await new Promise((res) => {
        const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = () => res(null); im.src = dataUrl;
      });
      if (!dim) return null;
      return { dataUrl, fmt, w: dim.w, h: dim.h };
    } catch (e) { return null; }
  }

  window.pedGerarPDFFile = async function (idPedido) {
    if (!window.jspdf || !window.jspdf.jsPDF) { alert('Gerador de PDF não carregado (jsPDF). Recarregue o app.'); return null; }

    const [pedidos, itens, configs] = await Promise.all([
      supa('ped_pedidos', `id=eq.${idPedido}&select=*`),
      supa('ped_pedido_itens', `id_pedido=eq.${idPedido}&select=*&order=id.asc`),
      supa('ped_configuracoes', 'select=chave,valor')
    ]);
    const ped = pedidos && pedidos[0];
    if (!ped) { alert('Pedido não encontrado.'); return null; }

    const cfg = Object.fromEntries((configs || []).map(c => [c.chave, c.valor]));
    const titulo = cfg.pdf_titulo || 'ORÇAMENTO';
    const empNome = cfg.pdf_empresa_nome || 'Stonni';
    const empCNPJ = cfg.pdf_empresa_cnpj || '';
    const empEndereco = cfg.pdf_empresa_endereco || '';
    const empTel = cfg.pdf_empresa_telefone || '';
    const logoUrl = cfg.pdf_logo_url || 'logo.png';
    const rodape = cfg.pdf_rodape || 'Este documento é uma proposta comercial e não tem valor fiscal.';

    const c = window.pedCalcularTotais(ped, itens);
    const dataDoc = fmtDataBR((ped.created_at || ped.criado_em || '').substring(0, 10));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const PW = doc.internal.pageSize.getWidth();   // 210
    const ML = 14, MR = PW - 14;                    // margens
    let y = 14;

    // ── HEADER: logo (esq) + empresa (dir) ──
    const logo = await carregarImagem(logoUrl);
    if (logo) {
      const maxW = 42, maxH = 16;
      let w = maxW, h = (logo.h / logo.w) * w;
      if (h > maxH) { h = maxH; w = (logo.w / logo.h) * h; }
      try { doc.addImage(logo.dataUrl, logo.fmt, ML, y, w, h); } catch (e) {}
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...AZUL);
    doc.text(empNome, MR, y + 3, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...CINZA);
    const empLinhas = [empCNPJ ? 'CNPJ: ' + empCNPJ : '', empEndereco, empTel ? 'Tel: ' + empTel : ''].filter(Boolean);
    empLinhas.forEach((t, i) => doc.text(t, MR, y + 8 + i * 4, { align: 'right' }));

    y += 22;

    // ── FAIXA DO TÍTULO ──
    doc.setFillColor(...AZUL); doc.roundedRect(ML, y, MR - ML, 12, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255, 255, 255);
    doc.text(titulo.toUpperCase(), PW / 2, y + 7, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text(`${ped.codigo || ''}   ·   ${dataDoc}`, PW / 2, y + 11, { align: 'center' });
    y += 18;

    // ── DADOS DO CLIENTE ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...AZUL);
    doc.text('DADOS DO CLIENTE', ML, y);
    doc.setDrawColor(221, 227, 240); doc.line(ML, y + 1.5, MR, y + 1.5);
    y += 6;
    const campos = [
      ['Razão Social', ped.nome_cliente || '—'],
      ['CNPJ', fmtCNPJ(ped.cnpj_cliente)],
      ['Cidade / UF', (ped.cidade_cliente || '—') + (ped.uf_cliente ? ' / ' + ped.uf_cliente : '')],
    ];
    const colW = (MR - ML) / 3;
    campos.forEach((f, i) => {
      const x = ML + i * colW;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...CINZA);
      doc.text(f[0].toUpperCase(), x, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ESCURO);
      doc.text(String(f[1]), x, y + 4.5, { maxWidth: colW - 4 });
    });
    y += 12;

    // ── TABELA DE ITENS (autotable) ──
    const body = c.perItem.map(p => [
      p.referencia,
      p.nome,
      String(p.qtd),
      fmtVal(p.precoTabela),
      p.descExibido > 0 ? p.descExibido.toFixed(p.descExibido % 1 === 0 ? 0 : 1) + '%' : '—',
      (p.ipi > 0 && !c.stEstado) ? p.ipi + '%' : '—',
      p.valorIpiItem > 0 ? fmtVal(p.valorIpiItem) : '—',
      fmtVal(p.totalComIpi),
    ]);
    doc.autoTable({
      startY: y,
      head: [['Ref.', 'Produto', 'Qtd', 'Preço Unit.', 'Desc.', 'IPI %', 'Vl. IPI', 'Total']],
      body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.6, lineColor: [238, 240, 245], textColor: ESCURO },
      headStyles: { fillColor: AZUL, textColor: 255, fontSize: 7.5, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 252] },
      columnStyles: {
        0: { cellWidth: 20, fontSize: 7, textColor: CINZA },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 11, halign: 'center' },
        3: { cellWidth: 23, halign: 'right' },
        4: { cellWidth: 13, halign: 'center' },
        5: { cellWidth: 13, halign: 'center' },
        6: { cellWidth: 19, halign: 'right' },
        7: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: ML, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 5;

    // ── TOTAIS (bloco à direita) ──
    const linhasTot = [];
    linhasTot.push(['Subtotal produtos', fmtVal(c.valorProdutos), false]);
    if (c.valorDesconto > 0.01) linhasTot.push(['Desconto', '- ' + fmtVal(c.valorDesconto), 'verde']);
    if (c.valorIPI > 0.01) linhasTot.push(['IPI total', fmtVal(c.valorIPI), false]);
    if (c.valorST > 0.01) linhasTot.push([`ST (${c.stEstado})`, '+ ' + fmtVal(c.valorST), false]);
    linhasTot.push(['Frete' + (c.valorFrete > 0 ? ` (${ped.transportadora || 'A definir'})` : ''),
      c.valorFrete > 0 ? fmtVal(c.valorFrete) : 'GRÁTIS', c.valorFrete > 0 ? false : 'verde']);

    const xLabel = 120, xVal = MR;
    doc.setFontSize(9);
    linhasTot.forEach(row => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...(row[2] === 'verde' ? VERDE : CINZA));
      doc.text(row[0], xLabel, y);
      doc.setFont('helvetica', row[2] === 'verde' ? 'bold' : 'normal');
      doc.text(row[1], xVal, y, { align: 'right' });
      y += 5;
    });
    // Linha do TOTAL
    y += 1;
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.4); doc.line(xLabel, y, xVal, y); doc.setLineWidth(0.2);
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...AZUL);
    doc.text('TOTAL', xLabel, y);
    doc.text(fmtVal(c.valorTotal), xVal, y, { align: 'right' });
    y += 10;

    // ── CONDIÇÕES COMERCIAIS ──
    if (y > 250) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...AZUL);
    doc.text('CONDIÇÕES COMERCIAIS', ML, y);
    doc.setDrawColor(221, 227, 240); doc.line(ML, y + 1.5, MR, y + 1.5);
    y += 6;
    const cond = [
      ['Prazo de Pagamento', ped.prazo_pagamento || '—'],
      ['Frete por Conta', ped.frete_por_conta || 'CIF'],
      ['Transportadora', (ped.transportadora || 'A definir') + (ped.prazo_frete_dias ? ' · ' + ped.prazo_frete_dias + ' dia(s)' : '')],
    ];
    cond.forEach((f, i) => {
      const x = ML + i * colW;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...CINZA);
      doc.text(f[0].toUpperCase(), x, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ESCURO);
      doc.text(String(f[1]), x, y + 4.5, { maxWidth: colW - 4 });
    });
    y += 12;
    if (ped.obs) {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...CINZA);
      doc.text('OBSERVAÇÕES', ML, y);
      doc.setFontSize(8.5); doc.setTextColor(...ESCURO);
      const linhas = doc.splitTextToSize(String(ped.obs), MR - ML);
      doc.text(linhas, ML, y + 4);
      y += 4 + linhas.length * 4 + 4;
    }

    // ── REPRESENTANTE ──
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...AZUL);
    doc.text('REPRESENTANTE', ML, y);
    doc.setDrawColor(221, 227, 240); doc.line(ML, y + 1.5, MR, y + 1.5);
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ESCURO);
    doc.text(ped.nome_representante || '—', ML, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...CINZA);
    doc.text('Data: ' + dataDoc, ML + colW, y);

    // ── RODAPÉ ──
    doc.setFontSize(7.5); doc.setTextColor(150, 150, 150); doc.setFont('helvetica', 'normal');
    const rlinhas = doc.splitTextToSize(rodape, MR - ML);
    doc.text(rlinhas, PW / 2, 288, { align: 'center' });

    const filename = `${sanitize(titulo) || 'Orcamento'}-${sanitize(ped.codigo) || idPedido}.pdf`;
    const blob = doc.output('blob');
    return new File([blob], filename, { type: 'application/pdf' });
  };

  // Handler do botão: gera o PDF e envia pelo WhatsApp.
  // Mobile → share sheet com o arquivo anexado. Desktop/sem suporte → baixa o
  // PDF e abre o WhatsApp Web (o representante arrasta o arquivo pra conversa).
  window.pedEnviarWhatsApp = async function (idPedido, btn) {
    let old;
    try {
      if (btn) { old = btn.innerHTML; btn.disabled = true; btn.innerHTML = '⏳ Gerando...'; }
      const file = await window.pedGerarPDFFile(idPedido);
      if (!file) return;

      const podeAnexar = navigator.canShare && navigator.canShare({ files: [file] });
      if (podeAnexar) {
        await window.waShare({ arquivos: [file], texto: 'Segue o orçamento em anexo. Qualquer dúvida, estou à disposição!' });
      } else {
        // Sem Web Share de arquivos (desktop): baixa e abre o WhatsApp Web.
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url; a.download = file.name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        window.open('https://web.whatsapp.com/', '_blank');
        alert('Seu navegador não anexa arquivos direto no WhatsApp.\nBaixei o PDF do orçamento — arraste-o para a conversa que abri.');
      }
    } catch (e) {
      console.error('pedEnviarWhatsApp', e);
      alert('Não foi possível gerar o orçamento. Tente novamente.');
    } finally {
      if (btn) { btn.disabled = false; if (old) btn.innerHTML = old; }
    }
  };
})();
