// ============================================================
//  MÓDULO: MEUS PEDIDOS (representante) + GESTÃO (gestor/admin)
// ============================================================

// ── MEUS PEDIDOS ──
async function renderMeusPedidos(el) {
  window._pedidosCache = null; // força reload
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  // Carrega status configuráveis
  if (!window._pedidoStatus) {
    const statusRows = await supa('ped_status', 'ativo=eq.true&order=ordem&select=nome');
    window._pedidoStatus = (statusRows||[]).map(s=>s.nome);
  }

  // Busca por id_representante ou por nome (fallback)
  const filtroRep = USUARIO.id_representante
    ? `id_representante=eq.${USUARIO.id_representante}`
    : `nome_representante=eq.${encodeURIComponent(USUARIO.nome)}`;
  const pedidos = await fetch(
    `${SUPA_URL}/rest/v1/ped_pedidos?${filtroRep}&order=criado_em.desc&select=*`,
    { headers: HEADERS }
  ).then(r=>r.json()).catch(()=>[]);
  _renderListaPedidos(el, Array.isArray(pedidos) ? pedidos : [], false);
}

// ── GESTÃO DE PEDIDOS (gestor/admin) ──
async function renderPedidos(el) {
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  // Carrega status configuráveis
  if (!window._pedidoStatus) {
    const statusRows = await supa('ped_status', 'ativo=eq.true&order=ordem&select=nome');
    window._pedidoStatus = (statusRows||[]).map(s=>s.nome);
  }

  const pedidos = await fetch(
    `${SUPA_URL}/rest/v1/ped_pedidos?order=criado_em.desc&select=*`,
    { headers: HEADERS }
  ).then(r=>r.json()).catch(()=>[]);
  _renderListaPedidos(el, Array.isArray(pedidos) ? pedidos : [], true);
}

function _renderListaPedidos(el, pedidos, isGestor) {
  window._pedidosLista = pedidos;

  // Contagem por status para os botões
  const _cnt = (statuses) => statuses ? pedidos.filter(p=>statuses.includes(p.status)).length : pedidos.length;

  el.innerHTML = `
    <div class="section-header" style="margin-bottom:var(--space-4)">
      <input type="text" id="gped-busca" class="cfg-input" style="width:220px" placeholder="Buscar pedido/cliente..." oninput="gPedFiltrar()">
      <span id="gped-count" style="font-size:var(--fs-100);color:var(--text-muted)"></span>
    </div>
    <div style="display:flex;gap:var(--space-1-5);flex-wrap:wrap;margin-bottom:var(--space-4)">
      <button id="gped-f-todos"      class="btn btn-sm btn-primary" onclick="gPedSetFiltro('')">Todos <span style="opacity:.7">${_cnt(null)}</span></button>
      <button id="gped-f-cotacao"    class="btn btn-sm btn-outline" onclick="gPedSetFiltro('COTACAO')"><i class="ic ic-sm" data-ic="clipboard-list"></i> Cotações <span style="opacity:.7">${_cnt(['COTACAO'])}</span></button>
      <button id="gped-f-enviado"    class="btn btn-sm btn-outline" onclick="gPedSetFiltro('ENVIADO')"><i class="ic ic-sm" data-ic="upload"></i> Enviados <span style="opacity:.7">${_cnt(['ENVIADO'])}</span></button>
      <button id="gped-f-aguardando" class="btn btn-sm btn-outline" onclick="gPedSetFiltro('AGUARDANDO')">⏳ Aguardando <span style="opacity:.7">${_cnt(['AGUARDANDO'])}</span></button>
      <button id="gped-f-aprovado"   class="btn btn-sm btn-outline" onclick="gPedSetFiltro('APROVADO')"><i class="ic ic-sm" data-ic="check-circle"></i> Aprovados <span style="opacity:.7">${_cnt(['APROVADO'])}</span></button>
      <button id="gped-f-faturado"   class="btn btn-sm btn-outline" onclick="gPedSetFiltro('FATURADO')"><i class="ic ic-sm" data-ic="receipt"></i> Faturados <span style="opacity:.7">${_cnt(['FATURADO'])}</span></button>
      <button id="gped-f-cancelado"  class="btn btn-sm btn-outline" onclick="gPedSetFiltro('CANCELADOS')" style="color:var(--red)"><i class="ic ic-sm" data-ic="alert-circle"></i> Cancelados <span style="opacity:.7">${_cnt(['REPROVADO','CANCELADO'])}</span></button>
    </div>

    <!-- Cards KPI (só gestor) -->
    ${isGestor ? `
      <div class="cards-grid cards-grid-4" style="margin-bottom:var(--space-5)">
        ${['COTACAO','ENVIADO','APROVADO','FATURADO'].map(s => {
          const qtd = pedidos.filter(p=>p.status===s).length;
          const cores = {COTACAO:'',ENVIADO:'blue',APROVADO:'green',FATURADO:'a'};
          const icons = {COTACAO:'<i class="ic ic-sm" data-ic="clipboard-list"></i>',ENVIADO:'<i class="ic ic-sm" data-ic="upload"></i>',APROVADO:'<i class="ic ic-sm" data-ic="check-circle"></i>',FATURADO:'<i class="ic ic-sm" data-ic="receipt"></i>'};
          return `<div class="card"><div class="card-label">${icons[s]} ${s}</div><div class="card-value ${cores[s]}">${qtd}</div><div class="card-sub">pedido(s)</div></div>`;
        }).join('')}
      </div>` : ''}

    <div class="table-card">
      <table class="data-table">
        <thead><tr>
          <th>Código</th>
          <th>Cliente</th>
          ${isGestor ? '<th>Representante</th>' : ''}
          <th>Data</th>
          <th class="right">Total</th>
          <th>Prazo</th>
          <th>Status</th>
          <th></th>
        </tr></thead>
        <tbody id="gped-tbody">${_renderLinhasPedidos(pedidos, isGestor)}</tbody>
      </table>
    </div>
  `;

  document.getElementById('gped-count').textContent = `${pedidos.length} pedido(s)`;
  window._gPedIsGestor = isGestor;
}

function _renderLinhasPedidos(lista, isGestor) {
  if (!lista.length) return `<tr><td colspan="${isGestor?8:7}"><div class="empty-state"><div class="empty-state-icon"><i class="ic ic-sm" data-ic="clipboard-list"></i></div><h3>Nenhum pedido</h3><p>${isGestor?'Nenhum pedido encontrado.':'Você ainda não fez pedidos.'}</p></div></td></tr>`;

  return lista.map(p => `
    <tr class="clickable" onclick="gPedAbrir(${p.id})">
      <td class="mono" style="font-size:var(--fs-100);font-weight:600">${p.codigo||'—'}</td>
      <td>
        <div style="font-weight:500;font-size:var(--fs-200)">${p.nome_cliente||'—'}</div>
        <div style="font-size:var(--fs-090);color:var(--text-muted)">${fmtCNPJ(p.cnpj_cliente||'')}${p.cidade_cliente?` · ${p.cidade_cliente}/${p.uf_cliente||''}`:''}</div>
      </td>
      ${isGestor ? `<td style="font-size:var(--fs-100);color:var(--text-secondary)">${p.nome_representante||'—'}</td>` : ''}
      <td style="font-size:var(--fs-100)">${fmtData(p.criado_em?.split('T')[0])}</td>
      <td class="right mono" style="font-weight:600">R$ ${(p.valor_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
      <td style="font-size:var(--fs-100)">${p.prazo_pagamento||'—'}</td>
      <td><span class="badge badge-${(p.status||'').toLowerCase()}">${p.status||'—'}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();gPedAbrir(${p.id})">Ver</button></td>
    </tr>
  `).join('');
}

window._gPedFiltroAtivo = '';

window.gPedSetFiltro = function(filtro) {
  window._gPedFiltroAtivo = filtro;
  const mapa = {
    '':'todos', 'COTACAO':'cotacao', 'ENVIADO':'enviado',
    'AGUARDANDO':'aguardando', 'APROVADO':'aprovado',
    'FATURADO':'faturado', 'CANCELADOS':'cancelado'
  };
  Object.entries(mapa).forEach(([f, id]) => {
    const btn = document.getElementById('gped-f-' + id);
    if (!btn) return;
    const ativo = f === filtro;
    btn.className = 'btn btn-sm ' + (ativo ? 'btn-primary' : 'btn-outline');
    if (id === 'cancelado') btn.style.color = ativo ? '' : 'var(--red)';
  });
  gPedFiltrar();
};

window.gPedFiltrar = function() {
  const busca  = document.getElementById('gped-busca')?.value.toLowerCase()||'';
  const filtro = window._gPedFiltroAtivo || '';
  let lista = window._pedidosLista||[];

  // Filtro por status
  if      (filtro === 'COTACAO')    lista = lista.filter(p => p.status === 'COTACAO');
  else if (filtro === 'ENVIADO')    lista = lista.filter(p => p.status === 'ENVIADO');
  else if (filtro === 'AGUARDANDO') lista = lista.filter(p => p.status === 'AGUARDANDO');
  else if (filtro === 'APROVADO')   lista = lista.filter(p => p.status === 'APROVADO');
  else if (filtro === 'FATURADO')   lista = lista.filter(p => p.status === 'FATURADO');
  else if (filtro === 'CANCELADOS') lista = lista.filter(p => ['REPROVADO','CANCELADO'].includes(p.status));

  // Busca por texto
  if (busca) lista = lista.filter(p =>
    p.codigo?.toLowerCase().includes(busca) ||
    p.nome_cliente?.toLowerCase().includes(busca) ||
    p.cnpj_cliente?.includes(busca)
  );

  document.getElementById('gped-count').textContent = `${lista.length} pedido(s)`;
  document.getElementById('gped-tbody').innerHTML = _renderLinhasPedidos(lista, window._gPedIsGestor);
};

window.gPedAbrir = async function(id) {
  try {
  const [pedido, itens, logs] = await Promise.all([
    supa('ped_pedidos', `id=eq.${id}&select=*`).then(r=>r?.[0]),
    supa('ped_pedido_itens', `id_pedido=eq.${id}&select=*`),
    supa('ped_pedido_log',   `id_pedido=eq.${id}&order=criado_em.desc&select=*`)
  ]);
  if (!pedido) return;

  const isGestor = window._gPedIsGestor;
  const alertas  = pedido.alertas_financeiros || {};

  // Itens
  const itensHtml = (itens||[]).map(i=>`
    <tr>
      <td><div style="font-weight:500;font-size:var(--fs-200)">${i.nome_produto}</div><div style="font-size:var(--fs-090);color:var(--text-muted)">Ref: ${i.referencia||'—'}</div></td>
      <td class="right mono">${i.quantidade}</td>
      <td class="right mono">R$ ${(i.preco_final||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
      <td class="right mono" style="font-weight:600">R$ ${(i.total_item||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
    </tr>`).join('');

  // Alertas financeiros
  const alertasHtml = [];
  if (alertas.titulos_aberto > 0) alertasHtml.push(`<div class="alert alert-warning"><span class="alert-icon"><i class="ic ic-sm" data-ic="alert-triangle"></i></span>${alertas.titulos_aberto} título(s) em aberto — R$ ${(alertas.valor_aberto||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>`);
  if (alertas.dias_sem_compra > 0) alertasHtml.push(`<div class="alert alert-warning"><span class="alert-icon"><i class="ic ic-sm" data-ic="calendar"></i></span>${alertas.dias_sem_compra} dias sem comprar</div>`);

  // Logs
  const logsHtml = (logs||[]).map(l=>`
    <div style="display:flex;gap:var(--space-2);font-size:var(--fs-100);padding:var(--space-1-5) 0;border-bottom:1px solid var(--border)">
      <span style="color:var(--text-muted);flex-shrink:0">${new Date(l.criado_em).toLocaleString('pt-BR')}</span>
      <span>${l.status_de?`${l.status_de} →`:'→'} <strong>${l.status_para}</strong></span>
      ${l.usuario ? `<span style="color:var(--text-muted)">por ${l.usuario}</span>` : ''}
      ${l.obs ? `<span style="color:var(--text-muted)">(${l.obs})</span>` : ''}
    </div>`).join('') || '<div style="font-size:var(--fs-100);color:var(--text-muted)">Sem histórico</div>';

  // Ações do gestor
  const statusPermiteAcao = ['COTACAO','ENVIADO','AGUARDANDO','APROVADO'].includes(pedido.status);
  // Ações do GESTOR — só Aprovar/Reprovar/Faturar
  const acoesGestorHtml = isGestor && ['ENVIADO','AGUARDANDO','APROVADO'].includes(pedido.status) ? `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4);margin-top:var(--space-4)">
      <div style="font-size:var(--fs-200);font-weight:600;margin-bottom:var(--space-3)"><i class="ic ic-sm" data-ic="settings"></i> Ações do gestor</div>
      <div class="acoes-grid">
        ${['ENVIADO','AGUARDANDO'].includes(pedido.status) ? `
          <button class="btn btn-success" onclick="gPedAprovar(${id})"><i class="ic ic-sm" data-ic="check-circle"></i> Aprovar</button>
          <button class="btn btn-danger"  onclick="gPedReprovar(${id})"><i class="ic ic-sm" data-ic="alert-circle"></i> Reprovar</button>
        ` : ''}
        ${pedido.status === 'APROVADO' ? `
          <button class="btn btn-primary" onclick="gPedFaturarDireto(${id})"><i class="ic ic-sm" data-ic="receipt"></i> Faturar</button>
          <button class="btn btn-danger"   onclick="gPedCancelar(${id})"><i class="ic ic-sm" data-ic="ban"></i> Cancelar</button>
        ` : ''}
        ${['ENVIADO','AGUARDANDO','APROVADO'].includes(pedido.status) ? `
          <button class="btn btn-outline" onclick="gPedVoltarCotacao(${id})">↩️ Voltar p/ Cotação</button>
        ` : ''}
      </div>
    </div>` : '';

  // Ações da COTAÇÃO — visíveis para representante E gestor
  const acoesCotacaoHtml = pedido.status === 'COTACAO' ? `
    <div style="background:var(--indigo-50);border:1px solid var(--indigo-100);border-radius:var(--radius-lg);padding:var(--space-4);margin-top:var(--space-4)">
      <div style="font-size:var(--fs-200);font-weight:600;color:var(--indigo-500);margin-bottom:var(--space-3)"><i class="ic ic-sm" data-ic="clipboard-list"></i> Cotação</div>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <button class="btn btn-warning" onclick="gPedEditarCotacao(${id})"><i class="ic ic-sm" data-ic="pencil"></i> Editar</button>
        <button class="btn btn-outline" onclick="pedGerarPDF(${id})"><i class="ic ic-sm" data-ic="printer"></i> Gerar PDF</button>
        <button class="btn btn-success" onclick="pedEnviarWhatsApp(${id}, this)"><i class="ic ic-sm" data-ic="smartphone"></i> Enviar por WhatsApp</button>
        <button class="btn btn-primary" onclick="gPedConverterCotacao(${id})"><i class="ic ic-sm" data-ic="package"></i> Converter em Pedido</button>
        <button class="btn btn-danger"  onclick="gPedReprovar(${id})"><i class="ic ic-sm" data-ic="alert-circle"></i> Cancelar</button>
      </div>
    </div>` : '';

  // Upload NF/Boleto (gestor, pedido aprovado ou faturado)
  const uploadHtml = isGestor && ['APROVADO','FATURADO'].includes(pedido.status) ? `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-4);margin-top:var(--space-4)">
      <div style="font-size:var(--fs-200);font-weight:600;margin-bottom:var(--space-3)"><i class="ic ic-sm" data-ic="paperclip"></i> Documentos</div>
      <div class="form-field">
        <label>Número da NF</label>
        <input type="text" id="doc-nf-num" class="cfg-input" value="${pedido.nf_numero||''}" placeholder="Ex: 12345" style="max-width:200px">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-3-5);margin-top:var(--space-2-5)">
        <div>
          <div style="font-size:var(--fs-100);font-weight:600;margin-bottom:var(--space-1-5)"><i class="ic ic-sm" data-ic="file-text"></i> Nota Fiscal (PDF)</div>
          ${pedido.nf_url ? `<div style="font-size:var(--fs-090);color:var(--green);margin-bottom:var(--space-1-5)"><i class="ic ic-sm" data-ic="check-circle"></i> Arquivo enviado</div>
            <div style="display:flex;gap:var(--space-1-5)">
              <a href="${pedido.nf_url}" target="_blank" class="btn btn-outline btn-sm">↓ Baixar</a>
              <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red)" onclick="gPedExcluirDoc(${id},'nf')"><i class="ic ic-sm" data-ic="x"></i> Excluir</button>
            </div>` : ''}
          <div style="margin-top:var(--space-2)">
            <input type="file" id="doc-nf-file" accept=".pdf,image/*" style="font-size:var(--fs-100);width:100%"
              onchange="gPedUploadDoc(${id},'nf',this)">
          </div>
        </div>
        <div>
          <div style="font-size:var(--fs-100);font-weight:600;margin-bottom:var(--space-1-5)"><i class="ic ic-sm" data-ic="building"></i> Boleto (PDF)</div>
          ${pedido.boleto_url ? `<div style="font-size:var(--fs-090);color:var(--green);margin-bottom:var(--space-1-5)"><i class="ic ic-sm" data-ic="check-circle"></i> Arquivo enviado</div>
            <div style="display:flex;gap:var(--space-1-5)">
              <a href="${pedido.boleto_url}" target="_blank" class="btn btn-outline btn-sm">↓ Baixar</a>
              <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red)" onclick="gPedExcluirDoc(${id},'boleto')"><i class="ic ic-sm" data-ic="x"></i> Excluir</button>
            </div>` : ''}
          <div style="margin-top:var(--space-2)">
            <input type="file" id="doc-boleto-file" accept=".pdf,image/*" style="font-size:var(--fs-100);width:100%"
              onchange="gPedUploadDoc(${id},'boleto',this)">
          </div>
        </div>
      </div>
      <div id="doc-upload-msg" style="font-size:var(--fs-100);margin-top:var(--space-2-5)"></div>
      <div style="display:flex;gap:var(--space-2-5);margin-top:var(--space-3)">
        <button class="btn btn-primary" onclick="gPedSalvarDocs(${id})"><i class="ic ic-sm" data-ic="save"></i> Salvar número NF</button>
        ${pedido.nf_url||pedido.boleto_url ? `<button class="btn btn-success" onclick="gPedFaturar(${id})"><i class="ic ic-sm" data-ic="receipt"></i> Marcar como Faturado</button>` : ''}
      </div>
    </div>` : '';

  // Download NF/Boleto (representante — só leitura)
  const downloadHtml = !isGestor && (pedido.nf_url || pedido.boleto_url) ? `
    <div style="background:var(--green-bg);border:1px solid var(--green);border-radius:var(--radius-lg);padding:var(--space-4);margin-top:var(--space-4)">
      <div style="font-size:var(--fs-200);font-weight:600;color:var(--green);margin-bottom:var(--space-2-5)"><i class="ic ic-sm" data-ic="paperclip"></i> Documentos disponíveis</div>
      <div style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        ${pedido.nf_url ? `<a href="${pedido.nf_url}" target="_blank" class="btn btn-success"><i class="ic ic-sm" data-ic="receipt"></i> Baixar NF ${pedido.nf_numero?'('+pedido.nf_numero+')':''}</a>` : ''}
        ${pedido.boleto_url ? `<a href="${pedido.boleto_url}" target="_blank" class="btn btn-outline"><i class="ic ic-sm" data-ic="file-text"></i> Baixar Boleto</a>` : ''}
      </div>
    </div>` : '';

  const tabsHtml = `
    <div class="drawer-tabs">
      <div class="drawer-tab active" onclick="gPedTab('itens',this)">Itens</div>
      <div class="drawer-tab" onclick="gPedTab('financeiro',this)">Financeiro</div>
      <div class="drawer-tab" onclick="gPedTab('historico',this)">Histórico</div>
    </div>`;

  // Botões PDF / WhatsApp — visíveis para todos os perfis, qualquer status
  const btnPdfHtml = `
    <div style="display:flex;justify-content:flex-end;gap:var(--space-2);flex-wrap:wrap;margin-bottom:var(--space-3)">
      <button class="btn btn-outline btn-sm" onclick="pedGerarPDF(${id})" style="display:flex;align-items:center;gap:var(--space-1-5)">
        <i class="ic ic-sm" data-ic="printer"></i> Gerar PDF
      </button>
      <button class="btn btn-success btn-sm" onclick="pedEnviarWhatsApp(${id}, this)" style="display:flex;align-items:center;gap:var(--space-1-5)">
        <i class="ic ic-sm" data-ic="smartphone"></i> Enviar por WhatsApp
      </button>
    </div>`;

  const bodyHtml = `
    <div id="gped-tab-itens">
      ${btnPdfHtml}
      ${alertasHtml.join('')}
      <div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table class="data-table" style="margin-bottom:var(--space-4);min-width:380px">
        <thead><tr><th>Produto</th><th class="right">Qtd</th><th class="right">Preço unit.</th><th class="right">Total</th></tr></thead>
        <tbody>${itensHtml}</tbody>
      </table></div>
      <div style="text-align:right;font-size:var(--fs-450);font-weight:700;font-family:var(--font-mono);color:var(--blue-dark)">
        Total: R$ ${(itens||[]).reduce((s,i)=>s+Number(i.preco_final||i.preco_unitario||0)*Number(i.quantidade||1),0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
      </div>
      ${acoesCotacaoHtml}
      ${acoesGestorHtml}
      ${uploadHtml}
      ${downloadHtml}
    </div>
    <div id="gped-tab-financeiro" style="display:none">
      ${[
        ['Subtotal produtos', `R$ ${(pedido.valor_produtos||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`],
        ['Frete', pedido.valor_frete > 0 ? `R$ ${(pedido.valor_frete||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : 'Grátis'],
        ['Total', `R$ ${(pedido.valor_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`],
        ['Prazo pagamento', pedido.prazo_pagamento||'—'],
        ['Frete por conta', pedido.frete_por_conta||'—'],
        ['Transportadora', pedido.transportadora||'—'],
        ['Prazo frete', pedido.prazo_frete_dias ? `${pedido.prazo_frete_dias} dias` : '—'],
      ].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border);font-size:var(--fs-200)"><span style="color:var(--text-muted)">${k}</span><strong>${v}</strong></div>`).join('')}
      ${pedido.obs ? `<div style="margin-top:var(--space-3-5)"><div style="font-size:var(--fs-090);font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:var(--space-1)">Observações</div><div style="font-size:var(--fs-200)">${pedido.obs}</div></div>` : ''}
    </div>
    <div id="gped-tab-historico" style="display:none">${logsHtml}</div>
  `;

  abrirDrawer(
    pedido.codigo || 'Pedido',
    `${(pedido.nome_cliente||'')} · ${(pedido.criado_em ? new Date(pedido.criado_em).toLocaleDateString('pt-BR') : '')}`,
    bodyHtml, '', tabsHtml
  );
  } catch(e) { console.error('gPedAbrir erro:', e.message, e.stack); appLog('erro','Erro ao abrir pedido: '+e.message,{categoria:'pedido',detalhe:e.stack}); alert('Erro: ' + e.message); }
};

window.gPedTab = function(tab, btn) {
  ['itens','financeiro','historico'].forEach(t => {
    const el = document.getElementById(`gped-tab-${t}`);
    if (el) el.style.display = t===tab ? 'block' : 'none';
  });
  document.querySelectorAll('.drawer-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
};

window.gPedAprovar = async function(id) {
  if (!confirm('Aprovar este pedido?')) return;
  appLog('acao', `Pedido #${id} aprovado`, {categoria:'pedido'});
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status:'APROVADO', aprovado_por: USUARIO.nome, aprovado_em: new Date().toISOString() });
  const statusAnterior = (await supa('ped_pedidos', `id=eq.${id}&select=status`))?.[0]?.status || 'ENVIADO';
  await supaInsert('ped_pedido_log', { id_pedido:id, status_de: statusAnterior, status_para:'APROVADO', usuario: USUARIO.nome });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};

window.gPedReprovar = async function(id) {
  const motivo = prompt('Motivo da reprovação (obrigatório):');
  if (!motivo?.trim()) return;
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status:'REPROVADO', motivo_reprovacao: motivo });
  await supaInsert('ped_pedido_log', { id_pedido:id, status_de:'ENVIADO', status_para:'REPROVADO', usuario: USUARIO.nome, obs: motivo });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};

window.gPedSalvarDocs = async function(id) {
  await supaPatch('ped_pedidos', `id=eq.${id}`, {
    nf_numero:  document.getElementById('doc-nf-num')?.value.trim()||null,
    nf_url:     document.getElementById('doc-nf-url')?.value.trim()||null,
    boleto_url: document.getElementById('doc-boleto-url')?.value.trim()||null,
  });
  alert('Documentos salvos!');
};


window.gPedEditarCotacao = async function(id) {
  fecharDrawer();
  // Guarda o id da cotação para o pedidos.js carregar
  window._editandoCotacaoId = id;
  irPara('novo-pedido');
};


window.gPedCancelar = async function(id) {
  if (!confirm('Cancelar este pedido? Esta ação não pode ser desfeita.')) return;
  appLog('acao', `Pedido #${id} cancelado (era APROVADO)`, {categoria:'pedido'});
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status: 'CANCELADO' });
  await supaInsert('ped_pedido_log', { id_pedido: id, status_de: 'APROVADO', status_para: 'CANCELADO', usuario: USUARIO.nome });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};

window.gPedVoltarCotacao = async function(id) {
  if (!confirm('Voltar este pedido para Cotação? O representante poderá editá-lo novamente.')) return;
  appLog('acao', `Pedido #${id} voltou para Cotação`, {categoria:'pedido'});
  const pedRes = await supa('ped_pedidos', `id=eq.${id}&select=status`);
  const statusAtual = pedRes?.[0]?.status || 'ENVIADO';
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status: 'COTACAO' });
  await supaInsert('ped_pedido_log', { id_pedido: id, status_de: statusAtual, status_para: 'COTACAO', usuario: USUARIO.nome });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};

window.gPedConverterCotacao = async function(id) {
  if (!confirm('Converter esta cotação em pedido?')) return;
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status: 'ENVIADO' });
  await supaInsert('ped_pedido_log', { id_pedido:id, status_de:'COTACAO', status_para:'ENVIADO', usuario: USUARIO.nome });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};

window.gPedFaturarDireto = async function(id) {
  if (!confirm('Marcar este pedido como Faturado?')) return;
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status: 'FATURADO' });
  await supaInsert('ped_pedido_log', { id_pedido:id, status_de:'APROVADO', status_para:'FATURADO', usuario: USUARIO.nome });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};

window.gPedFaturar = async function(id) {
  await gPedSalvarDocs(id);
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status:'FATURADO' });
  await supaInsert('ped_pedido_log', { id_pedido:id, status_de:'APROVADO', status_para:'FATURADO', usuario: USUARIO.nome });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};

// ── Upload de documentos no Storage ──
window.gPedUploadDoc = async function(idPedido, tipo, input) {
  const file = input.files?.[0];
  if (!file) return;
  const msg = document.getElementById('doc-upload-msg');
  msg.textContent = `⏳ Enviando ${tipo === 'nf' ? 'NF' : 'Boleto'}...`;
  msg.style.color = 'var(--text-muted)';

  const ext = file.name.split('.').pop();
  const path = `pedidos/${idPedido}/${tipo}.${ext}`;

  try {
    // Upload no Storage
    const formData = new FormData();
    formData.append('', file);
    const upRes = await fetch(
      `${SUPA_URL}/storage/v1/object/pedidos-docs/${path}`,
      { method: 'POST', headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` }, body: file }
    );
    if (!upRes.ok) {
      // Tenta UPSERT se já existe
      const upRes2 = await fetch(
        `${SUPA_URL}/storage/v1/object/pedidos-docs/${path}`,
        { method: 'PUT', headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'x-upsert': 'true' }, body: file }
      );
      if (!upRes2.ok) throw new Error('Falha no upload');
    }

    // Gera URL assinada (1 ano)
    const signRes = await fetch(
      `${SUPA_URL}/storage/v1/object/sign/pedidos-docs/${path}`,
      { method: 'POST', headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: 31536000 }) }
    );
    const signData = await signRes.json();
    const url = `${SUPA_URL}/storage/v1${signData.signedURL}`;

    // Salva URL no pedido
    const campo = tipo === 'nf' ? 'nf_url' : 'boleto_url';
    await supaPatch('ped_pedidos', `id=eq.${idPedido}`, { [campo]: url });

    msg.textContent = `${tipo === 'nf' ? 'NF' : 'Boleto'} enviado com sucesso!`;
    msg.style.color = 'var(--green)';
    setTimeout(() => gPedAbrir(idPedido), 1000);
  } catch(e) {
    msg.textContent = `Erro ao enviar: ${e.message}`;
    msg.style.color = 'var(--red)';
  }
};

window.gPedExcluirDoc = async function(idPedido, tipo) {
  if (!confirm(`Excluir o arquivo de ${tipo === 'nf' ? 'NF' : 'Boleto'}?`)) return;
  const campo = tipo === 'nf' ? 'nf_url' : 'boleto_url';
  await supaPatch('ped_pedidos', `id=eq.${idPedido}`, { [campo]: null });
  gPedAbrir(idPedido);
};
