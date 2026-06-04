// ============================================================
//  MÓDULO: MEUS PEDIDOS (representante) + GESTÃO (gestor/admin)
// ============================================================

// ── MEUS PEDIDOS ──
async function renderMeusPedidos(el) {
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const pedidos = await supa('ped_pedidos',
    `id_representante=eq.${USUARIO.id_representante}&order=criado_em.desc&select=*`
  );
  _renderListaPedidos(el, pedidos||[], false);
}

// ── GESTÃO DE PEDIDOS (gestor/admin) ──
async function renderPedidos(el) {
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const pedidos = await supa('ped_pedidos', 'order=criado_em.desc&select=*');
  _renderListaPedidos(el, pedidos||[], true);
}

function _renderListaPedidos(el, pedidos, isGestor) {
  window._pedidosLista = pedidos;

  const statusOpts = ['','ENVIADO','APROVADO','REPROVADO','FATURADO','CANCELADO'];

  el.innerHTML = `
    <div class="section-header" style="margin-bottom:16px">
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <input type="text" id="gped-busca" class="cfg-input" style="width:220px" placeholder="Buscar pedido/cliente..." oninput="gPedFiltrar()">
        <select id="gped-status" class="cfg-input" style="width:140px" onchange="gPedFiltrar()">
          ${statusOpts.map(s=>`<option value="${s}">${s||'Todos os status'}</option>`).join('')}
        </select>
      </div>
      <span id="gped-count" style="font-size:12px;color:var(--text-muted)"></span>
    </div>

    <!-- Cards KPI (só gestor) -->
    ${isGestor ? `
      <div class="cards-grid cards-grid-4" style="margin-bottom:20px">
        ${['ENVIADO','APROVADO','FATURADO','REPROVADO'].map(s => {
          const qtd = pedidos.filter(p=>p.status===s).length;
          const cores = {ENVIADO:'blue',APROVADO:'green',FATURADO:'a',REPROVADO:'red'};
          const icons = {ENVIADO:'📤',APROVADO:'✅',FATURADO:'🧾',REPROVADO:'❌'};
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
  if (!lista.length) return `<tr><td colspan="${isGestor?8:7}"><div class="empty-state"><div class="empty-state-icon">📋</div><h3>Nenhum pedido</h3><p>${isGestor?'Nenhum pedido encontrado.':'Você ainda não fez pedidos.'}</p></div></td></tr>`;

  return lista.map(p => `
    <tr class="clickable" onclick="gPedAbrir(${p.id})">
      <td class="mono" style="font-size:12px;font-weight:600">${p.codigo||'—'}</td>
      <td>
        <div style="font-weight:500;font-size:13px">${p.nome_cliente||'—'}</div>
        <div style="font-size:11px;color:var(--text-muted)">${fmtCNPJ(p.cnpj_cliente||'')}${p.cidade_cliente?` · ${p.cidade_cliente}/${p.uf_cliente||''}`:''}</div>
      </td>
      ${isGestor ? `<td style="font-size:12px;color:var(--text-secondary)">${p.nome_representante||'—'}</td>` : ''}
      <td style="font-size:12px">${fmtData(p.criado_em?.split('T')[0])}</td>
      <td class="right mono" style="font-weight:600">R$ ${(p.valor_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
      <td style="font-size:12px">${p.prazo_pagamento||'—'}</td>
      <td><span class="badge badge-${(p.status||'').toLowerCase()}">${p.status||'—'}</span></td>
      <td><button class="btn btn-outline btn-sm" onclick="event.stopPropagation();gPedAbrir(${p.id})">Ver</button></td>
    </tr>
  `).join('');
}

window.gPedFiltrar = function() {
  const busca  = document.getElementById('gped-busca')?.value.toLowerCase()||'';
  const status = document.getElementById('gped-status')?.value||'';
  let lista = window._pedidosLista||[];
  if (busca)  lista = lista.filter(p=>p.codigo?.toLowerCase().includes(busca)||p.nome_cliente?.toLowerCase().includes(busca)||p.cnpj_cliente?.includes(busca));
  if (status) lista = lista.filter(p=>p.status===status);
  document.getElementById('gped-count').textContent = `${lista.length} pedido(s)`;
  document.getElementById('gped-tbody').innerHTML = _renderLinhasPedidos(lista, window._gPedIsGestor);
};

window.gPedAbrir = async function(id) {
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
      <td><div style="font-weight:500;font-size:13px">${i.nome_produto}</div><div style="font-size:11px;color:var(--text-muted)">Ref: ${i.referencia||'—'}</div></td>
      <td class="right mono">${i.quantidade}</td>
      <td class="right mono">R$ ${(i.preco_final||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
      <td class="right mono" style="font-weight:600">R$ ${(i.total_item||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
    </tr>`).join('');

  // Alertas financeiros
  const alertasHtml = [];
  if (alertas.titulos_aberto > 0) alertasHtml.push(`<div class="alert alert-warning"><span class="alert-icon">⚠️</span>${alertas.titulos_aberto} título(s) em aberto — R$ ${(alertas.valor_aberto||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>`);
  if (alertas.dias_sem_compra > 0) alertasHtml.push(`<div class="alert alert-warning"><span class="alert-icon">📅</span>${alertas.dias_sem_compra} dias sem comprar</div>`);

  // Logs
  const logsHtml = (logs||[]).map(l=>`
    <div style="display:flex;gap:8px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="color:var(--text-muted);flex-shrink:0">${new Date(l.criado_em).toLocaleString('pt-BR')}</span>
      <span>${l.status_de?`${l.status_de} →`:'→'} <strong>${l.status_para}</strong></span>
      ${l.usuario ? `<span style="color:var(--text-muted)">por ${l.usuario}</span>` : ''}
      ${l.obs ? `<span style="color:var(--text-muted)">(${l.obs})</span>` : ''}
    </div>`).join('') || '<div style="font-size:12px;color:var(--text-muted)">Sem histórico</div>';

  // Ações do gestor
  const acoesGestorHtml = isGestor && pedido.status === 'ENVIADO' ? `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-top:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">⚙️ Ações do gestor</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-success" onclick="gPedAprovar(${id})">✅ Aprovar pedido</button>
        <button class="btn btn-danger" onclick="gPedReprovar(${id})">❌ Reprovar pedido</button>
      </div>
    </div>` : '';

  // Upload NF/Boleto (gestor, pedido aprovado ou faturado)
  const uploadHtml = isGestor && ['APROVADO','FATURADO'].includes(pedido.status) ? `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;margin-top:16px">
      <div style="font-size:13px;font-weight:600;margin-bottom:12px">📎 Documentos</div>
      <div class="form-row form-row-2">
        <div class="form-field">
          <label>Número da NF</label>
          <input type="text" id="doc-nf-num" class="cfg-input" value="${pedido.nf_numero||''}" placeholder="Ex: 12345">
        </div>
        <div class="form-field">
          <label>URL da NF</label>
          <input type="text" id="doc-nf-url" class="cfg-input" value="${pedido.nf_url||''}" placeholder="https://...">
        </div>
      </div>
      <div class="form-field">
        <label>URL do Boleto</label>
        <input type="text" id="doc-boleto-url" class="cfg-input" value="${pedido.boleto_url||''}" placeholder="https://...">
      </div>
      <div style="display:flex;gap:10px;margin-top:8px">
        <button class="btn btn-primary" onclick="gPedSalvarDocs(${id})">💾 Salvar documentos</button>
        ${pedido.nf_url||pedido.boleto_url ? `<button class="btn btn-success" onclick="gPedFaturar(${id})">🧾 Marcar como Faturado</button>` : ''}
      </div>
    </div>` : '';

  // Download NF/Boleto (representante)
  const downloadHtml = !isGestor && (pedido.nf_url || pedido.boleto_url) ? `
    <div style="background:var(--green-bg);border:1px solid var(--green);border-radius:var(--radius-sm);padding:16px;margin-top:16px">
      <div style="font-size:13px;font-weight:600;color:var(--green);margin-bottom:10px">📎 Documentos disponíveis</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${pedido.nf_url ? `<a href="${pedido.nf_url}" target="_blank" class="btn btn-success">🧾 Baixar NF ${pedido.nf_numero?`(${pedido.nf_numero})`:''}</a>` : ''}
        ${pedido.boleto_url ? `<a href="${pedido.boleto_url}" target="_blank" class="btn btn-outline">📄 Baixar Boleto</a>` : ''}
      </div>
    </div>` : '';

  const tabsHtml = `
    <div class="drawer-tabs">
      <div class="drawer-tab active" onclick="gPedTab('itens',this)">Itens</div>
      <div class="drawer-tab" onclick="gPedTab('financeiro',this)">Financeiro</div>
      <div class="drawer-tab" onclick="gPedTab('historico',this)">Histórico</div>
    </div>`;

  const bodyHtml = `
    <div id="gped-tab-itens">
      ${alertasHtml.join('')}
      <table class="data-table" style="margin-bottom:16px">
        <thead><tr><th>Produto</th><th class="right">Qtd</th><th class="right">Preço unit.</th><th class="right">Total</th></tr></thead>
        <tbody>${itensHtml}</tbody>
      </table>
      <div style="text-align:right;font-size:16px;font-weight:700;font-family:'DM Mono',monospace;color:var(--blue-dark)">
        Total: R$ ${(pedido.valor_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
      </div>
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
      ].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px"><span style="color:var(--text-muted)">${k}</span><strong>${v}</strong></div>`).join('')}
      ${pedido.obs ? `<div style="margin-top:14px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px">Observações</div><div style="font-size:13px">${pedido.obs}</div></div>` : ''}
    </div>
    <div id="gped-tab-historico" style="display:none">${logsHtml}</div>
  `;

  abrirDrawer(
    pedido.codigo || 'Pedido',
    `${pedido.nome_cliente} · ${new Date(pedido.criado_em).toLocaleDateString('pt-BR')}`,
    bodyHtml, '', tabsHtml
  );
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
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status:'APROVADO', aprovado_por: USUARIO.nome, aprovado_em: new Date().toISOString() });
  await supaInsert('ped_pedido_log', { id_pedido:id, status_de:'ENVIADO', status_para:'APROVADO', usuario: USUARIO.nome });
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

window.gPedFaturar = async function(id) {
  await gPedSalvarDocs(id);
  await supaPatch('ped_pedidos', `id=eq.${id}`, { status:'FATURADO' });
  await supaInsert('ped_pedido_log', { id_pedido:id, status_de:'APROVADO', status_para:'FATURADO', usuario: USUARIO.nome });
  fecharDrawer();
  renderPedidos(document.getElementById('page-content'));
};
