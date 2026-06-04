// ============================================================
//  MÓDULO: NOVO PEDIDO
//  Fluxo: CNPJ → alertas → carrinho → frete → envio
// ============================================================

let _pedidoAtual = {
  cliente: null,
  alertas: null,
  itens: [],
  frete: null,
  prazo: null,
  obs: ''
};

async function renderNovoPedido(el, params = {}) {
  // Carrega configs necessárias
  const [configs, tabelas] = await Promise.all([
    supa('ped_configuracoes', 'select=chave,valor'),
    supa('ped_tabelas_preco', `id=eq.${USUARIO.id_tabela_preco||1}&select=*`)
  ]);

  window._pedConfig = Object.fromEntries((configs||[]).map(c=>[c.chave,c.valor]));
  window._pedTabela = tabelas?.[0] || { markup_global: 0 };
  const prazos = JSON.parse(window._pedConfig.prazos_pagamento || '["28 DDL","35 DDL","42 DDL"]');

  // Reseta pedido atual
  _pedidoAtual = { cliente: null, alertas: null, itens: [], frete: null, prazo: prazos[0], obs: '' };

  el.innerHTML = `
    <div style="max-width:900px">
      <!-- ETAPA 1: CLIENTE -->
      <div class="ped-etapa" id="etapa-cliente">
        <div class="ped-etapa-header">
          <span class="ped-etapa-num">1</span>
          <span class="ped-etapa-titulo">Identificar cliente</span>
        </div>
        <div class="card" style="margin-top:12px">
          <div style="display:flex;gap:10px;align-items:flex-end">
            <div class="form-field" style="flex:1;margin:0">
              <label>CNPJ do cliente</label>
              <input type="text" id="ped-cnpj" class="ped-input" placeholder="00.000.000/0000-00"
                     oninput="pedMascaraCNPJ(this)" onkeydown="if(event.key==='Enter') pedBuscarCliente()">
            </div>
            <button class="btn btn-primary" onclick="pedBuscarCliente()">🔍 Buscar</button>
          </div>
          <div id="ped-cliente-resultado" style="margin-top:14px"></div>
        </div>
      </div>

      <!-- ETAPA 2: CARRINHO -->
      <div class="ped-etapa" id="etapa-carrinho" style="display:none">
        <div class="ped-etapa-header">
          <span class="ped-etapa-num">2</span>
          <span class="ped-etapa-titulo">Montar pedido</span>
          <button class="btn btn-outline btn-sm" style="margin-left:auto" onclick="pedAdicionarProduto()">+ Produto</button>
        </div>
        <div id="ped-carrinho-body" style="margin-top:12px"></div>

        <!-- Condições comerciais -->
        <div class="card" style="margin-top:14px">
          <div style="font-size:13px;font-weight:600;margin-bottom:12px">Condições comerciais</div>
          <div class="form-row form-row-2">
            <div class="form-field">
              <label>Prazo de pagamento</label>
              <select id="ped-prazo" class="ped-input" onchange="_pedidoAtual.prazo=this.value">
                ${prazos.map(p=>`<option value="${p}">${p}</option>`).join('')}
              </select>
            </div>
            <div class="form-field">
              <label>Frete por conta</label>
              <select id="ped-frete-conta" class="ped-input">
                <option value="CIF">CIF (nossa conta)</option>
                <option value="FOB">FOB (conta do cliente)</option>
              </select>
            </div>
          </div>
          <div class="form-field">
            <label>Observações</label>
            <textarea id="ped-obs" class="ped-input" rows="2" placeholder="Informações adicionais..." oninput="_pedidoAtual.obs=this.value"></textarea>
          </div>
        </div>

        <!-- Totais + frete -->
        <div class="card" id="ped-totais-card" style="margin-top:14px;display:none">
          <div style="font-size:13px;font-weight:600;margin-bottom:12px">Resumo do pedido</div>
          <div id="ped-totais-body"></div>
          <button class="btn btn-outline" id="btn-cotar-frete" onclick="pedCotarFrete()" style="margin-top:12px;width:100%">
            🚚 Cotar frete em tempo real
          </button>
          <div id="ped-frete-resultado" style="margin-top:12px"></div>
        </div>

        <div style="margin-top:16px;display:flex;justify-content:flex-end">
          <button class="btn btn-primary btn-lg" onclick="pedEnviar()">📤 Enviar pedido</button>
        </div>
      </div>
    </div>
  `;

  // Se veio de "Adicionar ao pedido" do catálogo
  if (params.adicionarProduto) {
    // Aguarda o usuário informar o cliente antes de adicionar
    window._pedProdutoParaAdicionar = params.adicionarProduto;
  }
}

// ── Máscara CNPJ ──
window.pedMascaraCNPJ = function(input) {
  let v = input.value.replace(/\D/g,'').slice(0,14);
  v = v.replace(/(\d{2})(\d)/,'$1.$2');
  v = v.replace(/(\d{3})(\d)/,'$1.$2');
  v = v.replace(/(\d{3})(\d)/,'$1/$2');
  v = v.replace(/(\d{4})(\d)/,'$1-$2');
  input.value = v;
};

// ── Busca cliente ──
window.pedBuscarCliente = async function() {
  const cnpjRaw = (document.getElementById('ped-cnpj').value||'').replace(/\D/g,'');
  if (cnpjRaw.length < 14) { alert('CNPJ inválido'); return; }

  const res = document.getElementById('ped-cliente-resultado');
  res.innerHTML = '<div style="color:var(--text-muted);font-size:13px">🔍 Buscando cliente...</div>';

  // CNPJ no ERP vem formatado ex: "49.724.128/0001-97"
  const cnpjFmt = cnpjRaw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  const clientes = await supa('vw_dim_cliente', `cnpj=eq.${cnpjFmt}&select=*`).catch(()=>null);
  const cliente = Array.isArray(clientes) ? clientes[0] : null;

  // Busca alertas financeiros em paralelo (só se encontrou o cliente)
  // cob_titulos_com_cliente: id_contato = id_cliente do ERP
  const [titulos, ultimaCompra] = await Promise.all([
    cliente?.id_cliente
      ? supa('cob_titulos_com_cliente', `id_contato=eq.${cliente.id_cliente}&select=saldo_real,dt_vencimento`).catch(()=>[])
      : Promise.resolve([]),
    cliente?.id_cliente
      ? supa('vw_comercial_docs_faturados', `id_cliente=eq.${cliente.id_cliente}&order=data_faturamento.desc&select=data_faturamento`).catch(()=>[])
      : Promise.resolve([])
  ]);

  const totalAberto = (titulos||[]).filter(t => (t.saldo_real||0) > 0).reduce((s,t)=>s+parseFloat(t.saldo_real||0),0);
  const qtdAberto   = (titulos||[]).filter(t => (t.saldo_real||0) > 0).length;
  const diasSemCompra = ultimaCompra?.[0]?.data_faturamento
    ? Math.floor((new Date()-new Date(ultimaCompra[0].data_faturamento))/(1000*60*60*24))
    : null;

  const limiteAlertaDias = parseInt(window._pedConfig?.alerta_dias_sem_compra||90);
  const alertas = { titulos_aberto: qtdAberto, valor_aberto: totalAberto, dias_sem_compra: diasSemCompra };

  _pedidoAtual.alertas = alertas;
  _pedidoAtual.cliente = {
    cnpj: cnpjRaw,
    id_cliente_erp: cliente?.id_cliente || null,
    nome: cliente?.nome_cliente || 'Cliente não cadastrado',
    cidade: cliente?.cidade || '',
    uf: cliente?.uf || '',
    cep: (cliente?.cep||'').replace(/\D/g,'')
  };

  // Monta alertas HTML
  const alertasHtml = [];
  if (qtdAberto > 0) alertasHtml.push(`<div class="alert alert-warning"><span class="alert-icon">⚠️</span><div><strong>${qtdAberto} título(s) em aberto</strong> — Total: R$ ${totalAberto.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div></div>`);
  if (diasSemCompra !== null && diasSemCompra > limiteAlertaDias) alertasHtml.push(`<div class="alert alert-warning"><span class="alert-icon">📅</span><div><strong>${diasSemCompra} dias sem comprar</strong></div></div>`);

  res.innerHTML = `
    <div class="ped-cliente-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-size:15px;font-weight:700">${_pedidoAtual.cliente.nome}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">
            CNPJ: ${fmtCNPJ(cnpjRaw)}
            ${_pedidoAtual.cliente.cidade ? ` · ${_pedidoAtual.cliente.cidade}/${_pedidoAtual.cliente.uf}` : ''}
          </div>
        </div>
        <button class="btn btn-outline btn-sm" onclick="pedLimparCliente()">Trocar</button>
      </div>
      ${alertasHtml.length ? `<div style="margin-top:12px">${alertasHtml.join('')}<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-top:8px"><input type="checkbox" id="ped-ciente" style="accent-color:var(--blue-dark)"> Estou ciente das pendências e desejo continuar</label></div>` : ''}
      ${!alertasHtml.length ? `<div class="alert alert-success" style="margin-top:10px"><span class="alert-icon">✅</span>Cliente sem pendências financeiras.</div>` : ''}
      ${!_pedidoAtual.cliente.cep ? `
        <div style="margin-top:12px;padding:12px;background:var(--yellow-bg,#fffbea);border:1px solid var(--yellow,#f59e0b);border-radius:var(--radius-sm)">
          <div style="font-size:12px;font-weight:600;color:var(--yellow,#b45309);margin-bottom:6px">⚠️ CEP não encontrado no cadastro — informe para cotar frete</div>
          <div style="display:flex;gap:8px">
            <input type="text" id="ped-cep-manual" class="ped-input" placeholder="00000-000" maxlength="9"
              oninput="this.value=this.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9)"
              style="max-width:140px">
            <button class="btn btn-outline btn-sm" onclick="pedSalvarCepManual()">Confirmar CEP</button>
          </div>
        </div>` : `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">📍 CEP: ${_pedidoAtual.cliente.cep.replace(/(\d{5})(\d{3})/,'$1-$2')} · ${_pedidoAtual.cliente.cidade}/${_pedidoAtual.cliente.uf}</div>`}
    </div>
    <div style="margin-top:14px;text-align:right">
      <button class="btn btn-primary" onclick="pedConfirmarCliente()">Continuar →</button>
    </div>
  `;
};

window.pedLimparCliente = function() {
  _pedidoAtual.cliente = null;
  document.getElementById('ped-cnpj').value = '';
  document.getElementById('ped-cliente-resultado').innerHTML = '';
};

window.pedSalvarCepManual = function() {
  const cep = (document.getElementById('ped-cep-manual')?.value||'').replace(/\D/g,'');
  if (cep.length !== 8) { alert('CEP inválido'); return; }
  if (_pedidoAtual.cliente) {
    _pedidoAtual.cliente.cep = cep;
    // Atualiza display
    const aviso = document.querySelector('#ped-cliente-resultado .ped-cep-aviso');
    if (aviso) aviso.innerHTML = `<div style="font-size:12px;color:var(--text-muted);margin-top:8px">📍 CEP: ${cep.replace(/(\d{5})(\d{3})/,'$1-$2')} (informado manualmente)</div>`;
  }
};

window.pedConfirmarCliente = function() {
  const temAlerta = _pedidoAtual.alertas?.titulos_aberto > 0 || (_pedidoAtual.alertas?.dias_sem_compra > parseInt(window._pedConfig?.alerta_dias_sem_compra||90));
  if (temAlerta) {
    const ciente = document.getElementById('ped-ciente');
    if (!ciente?.checked) { alert('Confirme que está ciente das pendências para continuar.'); return; }
    _pedidoAtual.alertas.representante_ciente = true;
  }
  document.getElementById('etapa-carrinho').style.display = 'block';
  document.getElementById('etapa-carrinho').scrollIntoView({ behavior: 'smooth' });
  pedRenderCarrinho();

  // Adiciona produto que veio do catálogo
  if (window._pedProdutoParaAdicionar) {
    setTimeout(() => { pedAdicionarProdutoId(window._pedProdutoParaAdicionar); window._pedProdutoParaAdicionar = null; }, 300);
  }
};

// ── Carrinho ──
window.pedRenderCarrinho = function() {
  const body = document.getElementById('ped-carrinho-body');
  const totaisCard = document.getElementById('ped-totais-card');
  if (!body) return;

  if (!_pedidoAtual.itens.length) {
    body.innerHTML = `<div class="card"><div class="empty-state" style="padding:30px"><div class="empty-state-icon">🛒</div><h3>Carrinho vazio</h3><p>Clique em "+ Produto" para adicionar itens.</p></div></div>`;
    if (totaisCard) totaisCard.style.display = 'none';
    return;
  }

  const acoes   = window._catAcoes || [];
  const tabela  = window._pedTabela || { markup_global: 0 };
  const hoje    = new Date().toISOString().split('T')[0];

  const linhas = _pedidoAtual.itens.map((item, idx) => {
    const total = item.preco_final * item.quantidade;
    return `
      <tr>
        <td>
          <div style="font-weight:500;font-size:13px">${item.nome}</div>
          <div style="font-size:11px;color:var(--text-muted)">Ref: ${item.referencia||'—'}</div>
          ${item.desconto_perc > 0 ? `<div style="font-size:11px;color:var(--green)">Desconto: ${item.desconto_perc}%</div>` : ''}
        </td>
        <td class="mono" style="text-align:right">R$ ${item.preco_unitario.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="ped-qty-btn" onclick="pedAlterarQtd(${idx},-1)">−</button>
            <span class="mono" style="min-width:28px;text-align:center;font-weight:600">${item.quantidade}</span>
            <button class="ped-qty-btn" onclick="pedAlterarQtd(${idx},1)">+</button>
          </div>
        </td>
        <td class="mono right" style="font-weight:600;color:var(--blue-dark)">R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td><button class="btn btn-sm" style="background:var(--red-bg);color:var(--red)" onclick="pedRemoverItem(${idx})">✕</button></td>
      </tr>`;
  }).join('');

  body.innerHTML = `
    <div class="table-card">
      <table class="data-table">
        <thead><tr><th>Produto</th><th class="right">Preço unit.</th><th>Qtd</th><th class="right">Total</th><th></th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;

  // Totais
  pedAtualizarTotais();
  if (totaisCard) totaisCard.style.display = 'block';
};

window.pedAtualizarTotais = function() {
  const subtotal = _pedidoAtual.itens.reduce((s,i)=>s+(i.preco_final*i.quantidade),0);
  const valorMinimo = parseFloat(window._pedConfig?.pedido_valor_minimo||0);
  const freteGratis = parseFloat(window._pedConfig?.frete_gratis_acima||0);
  const freteVal = _pedidoAtual.frete?.valor_escolhido || 0;
  const total = subtotal + freteVal;

  document.getElementById('ped-totais-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px">
      <div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--text-secondary)">Subtotal produtos</span><span class="mono font-weight:600">R$ ${subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></div>
      ${freteVal > 0 ? `<div style="display:flex;justify-content:space-between;font-size:13px"><span style="color:var(--text-secondary)">Frete (${_pedidoAtual.frete?.transportadora||''})</span><span class="mono">R$ ${freteVal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span></div>` : ''}
      ${freteGratis > 0 && subtotal >= freteGratis ? `<div class="alert alert-success" style="padding:8px 12px"><span class="alert-icon">🎉</span>Frete grátis acima de R$ ${freteGratis.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;border-top:1px solid var(--border);padding-top:8px;margin-top:4px">
        <span>Total</span>
        <span class="mono" style="color:var(--blue-dark)">R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
      </div>
      ${subtotal < valorMinimo ? `<div class="alert alert-warning" style="padding:8px 12px"><span class="alert-icon">⚠️</span>Pedido mínimo: R$ ${valorMinimo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>` : ''}
    </div>
  `;
};

window.pedAlterarQtd = function(idx, delta) {
  _pedidoAtual.itens[idx].quantidade = Math.max(1, _pedidoAtual.itens[idx].quantidade + delta);
  pedRenderCarrinho();
};
window.pedRemoverItem = function(idx) {
  _pedidoAtual.itens.splice(idx, 1);
  pedRenderCarrinho();
};

// ── Adicionar produto ──
window.pedAdicionarProduto = async function() {
  const produtos = window._catProdutos || await supa('ped_catalogo_produtos','ativo=eq.true&esgotado=eq.false&order=nome&select=*');
  window._catProdutos = produtos;

  abrirDrawer('Adicionar Produto', 'Selecione o produto para adicionar ao pedido', `
    <input type="text" id="ped-prod-busca" class="cfg-input" placeholder="Buscar produto..." oninput="pedFiltrarProdutos()" style="margin-bottom:14px">
    <div id="ped-prod-lista" style="max-height:400px;overflow-y:auto"></div>
  `, '');
  pedFiltrarProdutos();
};

window.pedFiltrarProdutos = function() {
  const busca = document.getElementById('ped-prod-busca')?.value.toLowerCase()||'';
  const lista = (window._catProdutos||[]).filter(p =>
    !p.esgotado && p.ativo &&
    (!busca || p.nome?.toLowerCase().includes(busca) || p.referencia?.toLowerCase().includes(busca))
  );
  const el = document.getElementById('ped-prod-lista');
  if (!el) return;
  el.innerHTML = lista.slice(0,50).map(p => {
    const { preco } = catPrecoFinal(p);
    return `
      <div class="ped-prod-item" onclick="pedAdicionarProdutoId(${p.id})">
        <div style="flex:1">
          <div style="font-weight:500;font-size:13px">${p.nome}</div>
          <div style="font-size:11px;color:var(--text-muted)">Ref: ${p.referencia||'—'} · ${p.grupo||'—'}</div>
        </div>
        <div class="mono" style="font-weight:600;color:var(--blue-dark);font-size:13px;flex-shrink:0">
          R$ ${preco.toLocaleString('pt-BR',{minimumFractionDigits:2})}
        </div>
      </div>`;
  }).join('') || '<div class="empty-state"><p>Nenhum produto encontrado</p></div>';
};

window.pedAdicionarProdutoId = function(id) {
  const p = (window._catProdutos||[]).find(p=>p.id===id);
  if (!p) return;
  const { preco, acaoAtiva } = catPrecoFinal(p);

  // Verifica se já está no carrinho
  const existente = _pedidoAtual.itens.find(i=>i.id_produto===id);
  if (existente) { existente.quantidade++; }
  else {
    _pedidoAtual.itens.push({
      id_produto: p.id, id_produto_erp: p.id_produto_erp,
      referencia: p.referencia, nome: p.nome,
      preco_unitario: p.preco_base,
      desconto_perc: acaoAtiva?.tipo==='desconto' ? acaoAtiva.valor : 0,
      preco_final: preco, quantidade: 1,
      regras_aplicadas: acaoAtiva ? [acaoAtiva.nome] : [],
      // Dimensões para cálculo de frete
      peso_kg: p.peso_kg || null,
      altura_cm: p.altura_cm || null,
      largura_cm: p.largura_cm || null,
      comprimento_cm: p.comprimento_cm || null,
    });
  }
  fecharDrawer();
  pedRenderCarrinho();
};

// ── Cotação de frete ──
window.pedCotarFrete = async function() {
  const cep = _pedidoAtual.cliente?.cep;
  if (!cep) { alert('CEP do cliente não disponível. Verifique o cadastro.'); return; }

  const btn = document.getElementById('btn-cotar-frete');
  btn.textContent = '⏳ Cotando...'; btn.disabled = true;

  const subtotal = _pedidoAtual.itens.reduce((s,i)=>s+(i.preco_final*i.quantidade),0);

  // Monta pacotes com dimensões reais do produto (cadastradas no catálogo via Bling)
  const pacotes = _pedidoAtual.itens.map(i => ({
    quantidade: i.quantidade,
    peso_kg:        parseFloat(i.peso_kg)        || 5,
    altura_cm:      parseFloat(i.altura_cm)      || 30,
    largura_cm:     parseFloat(i.largura_cm)     || 30,
    comprimento_cm: parseFloat(i.comprimento_cm) || 30,
  }));

  // id_local: empresa 8 (SC) = local 2, demais = local 1 (PR)
  const idLocal = parseInt(window._pedConfig?.empresa_padrao_pedido||7) === 8 ? 2 : 1;

  const payload = {
    id_local: idLocal,
    cep_destino: cep.replace(/\D/g,''),
    cnpj_destinatario: _pedidoAtual.cliente.cnpj,
    valor_nf: subtotal,
    pacotes,
  };

  try {
    const r = await fetch(`${SUPA_URL}/functions/v1/cotar-frete-index`, {
      method: 'POST', headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    const resultados = data?.resultados || [];

    const freteGratis = parseFloat(window._pedConfig?.frete_gratis_acima||0);
    const isGratis = freteGratis > 0 && subtotal >= freteGratis;

    document.getElementById('ped-frete-resultado').innerHTML = resultados.length ? `
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Escolha a transportadora</div>
      ${resultados.map((r,i) => `
        <label class="ped-frete-opcao ${i===0?'selected':''}">
          <input type="radio" name="ped-frete-radio" value="${i}" ${i===0?'checked':''} onchange="pedSelecionarFrete(${i},'${r.transportadora}',${r.valor_frete},${r.prazo_dias})" style="accent-color:var(--blue-dark)">
          <span style="flex:1">
            <strong>${r.transportadora}</strong>
            <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${r.prazo_dias} dia(s)</span>
          </span>
          <span class="mono" style="font-weight:600;color:${isGratis?'var(--green)':'var(--blue-dark)'}">
            ${isGratis ? 'GRÁTIS' : `R$ \${r.valor_frete.toLocaleString('pt-BR',{minimumFractionDigits:2})}`}
          </span>
        </label>`).join('')}
      <!-- Redespacho SP -->
      <div style="margin-top:12px;padding:12px 14px;background:var(--blue-pale);border:1.5px solid var(--blue-mid);border-radius:var(--radius-sm)">
        <label style="display:flex;align-items:center;gap:10px;cursor:pointer">
          <input type="checkbox" id="ped-redespacho-sp" style="accent-color:var(--blue-dark);width:16px;height:16px"
            onchange="pedToggleRedespachSP(this.checked)">
          <span style="flex:1">
            <strong style="font-size:13px">🚚 Redespacho via SP</strong>
            <span style="font-size:11px;color:var(--text-muted);margin-left:8px">Disponível para clientes com benefício de redespacho</span>
          </span>
          <span class="mono" style="font-weight:700;color:var(--green);font-size:13px">GRÁTIS</span>
        </label>
      </div>
    ` : '<div class="alert alert-warning"><span class="alert-icon">⚠️</span>Não foi possível cotar o frete. Informe manualmente.</div>';

    // Seleciona o primeiro automaticamente
    if (resultados.length) {
      const isGratis = freteGratis > 0 && subtotal >= freteGratis;
      pedSelecionarFrete(0, resultados[0].transportadora, isGratis ? 0 : resultados[0].valor_frete, resultados[0].prazo_dias);
    }
  } catch(e) {
    document.getElementById('ped-frete-resultado').innerHTML = '<div class="alert alert-warning"><span class="alert-icon">⚠️</span>Erro ao cotar frete. Verifique a conexão.</div>';
  }

  btn.textContent = '🚚 Recotar frete'; btn.disabled = false;
};

window.pedToggleRedespachSP = function(checked) {
  if (checked) {
    // Desmarca transportadoras e usa redespacho grátis
    document.querySelectorAll('input[name="ped-frete-radio"]').forEach(r => { r.checked = false; });
    document.querySelectorAll('.ped-frete-opcao').forEach(el => el.classList.remove('selected'));
    _pedidoAtual.frete = { transportadora: 'Redespacho SP', valor_escolhido: 0, prazo_frete_dias: null };
    pedAtualizarTotais();
  } else {
    _pedidoAtual.frete = null;
    pedAtualizarTotais();
  }
};

window.pedSelecionarFrete = function(idx, transportadora, valor, prazo) {
  _pedidoAtual.frete = { transportadora, valor_escolhido: valor, prazo_frete_dias: prazo };
  document.querySelectorAll('.ped-frete-opcao').forEach((el,i) => el.classList.toggle('selected', i===idx));
  pedAtualizarTotais();
};

// ── Enviar pedido ──
window.pedEnviar = async function() {
  if (!_pedidoAtual.cliente) { alert('Informe o cliente.'); return; }
  if (!_pedidoAtual.itens.length) { alert('Adicione pelo menos um produto.'); return; }

  const valorMinimo = parseFloat(window._pedConfig?.pedido_valor_minimo||0);
  const subtotal = _pedidoAtual.itens.reduce((s,i)=>s+(i.preco_final*i.quantidade),0);
  if (subtotal < valorMinimo) { alert(`Valor mínimo do pedido: R$ ${valorMinimo.toLocaleString('pt-BR',{minimumFractionDigits:2})}`); return; }

  if (!confirm('Confirmar envio do pedido?')) return;

  const freteVal = _pedidoAtual.frete?.valor_escolhido || 0;
  const total = subtotal + freteVal;
  const ano = new Date().getFullYear();

  // Gera código sequencial
  const ultPed = await supa('ped_pedidos', `order=id.desc&select=codigo&limit=1`);
  const ultNum = parseInt(ultPed?.[0]?.codigo?.split('-')?.[2]||'0') + 1;
  const codigo = `PED-${ano}-${String(ultNum).padStart(5,'0')}`;

  const pedido = {
    codigo,
    id_representante:   USUARIO.id_representante || null,
    nome_representante: USUARIO.nome,
    cnpj_cliente:       _pedidoAtual.cliente.cnpj,
    id_cliente_erp:     _pedidoAtual.cliente.id_cliente_erp,
    nome_cliente:       _pedidoAtual.cliente.nome,
    cidade_cliente:     _pedidoAtual.cliente.cidade,
    uf_cliente:         _pedidoAtual.cliente.uf,
    cep_cliente:        _pedidoAtual.cliente.cep,
    alertas_financeiros: _pedidoAtual.alertas || {},
    representante_ciente: _pedidoAtual.alertas?.representante_ciente || false,
    id_tabela_preco:    USUARIO.id_tabela_preco || 1,
    prazo_pagamento:    document.getElementById('ped-prazo')?.value || _pedidoAtual.prazo,
    frete_por_conta:    document.getElementById('ped-frete-conta')?.value || 'CIF',
    transportadora:     _pedidoAtual.frete?.transportadora || null,
    valor_frete:        freteVal,
    prazo_frete_dias:   _pedidoAtual.frete?.prazo_frete_dias || null,
    obs:                _pedidoAtual.obs,
    valor_produtos:     subtotal,
    valor_desconto:     0,
    valor_total:        total,
    status:             'ENVIADO'
  };

  const inserted = await supaInsert('ped_pedidos', pedido);
  const idPedido = inserted?.[0]?.id;

  if (!idPedido) { alert('Erro ao salvar pedido. Tente novamente.'); return; }

  // Salva itens
  for (const item of _pedidoAtual.itens) {
    await supaInsert('ped_pedido_itens', {
      id_pedido: idPedido, id_produto: item.id_produto, id_produto_erp: item.id_produto_erp,
      referencia: item.referencia, nome_produto: item.nome,
      quantidade: item.quantidade, preco_unitario: item.preco_unitario,
      desconto_perc: item.desconto_perc, preco_final: item.preco_final,
      total_item: item.preco_final * item.quantidade,
      regras_aplicadas: item.regras_aplicadas || []
    });
  }

  // Log
  await supaInsert('ped_pedido_log', { id_pedido: idPedido, status_de: 'RASCUNHO', status_para: 'ENVIADO', usuario: USUARIO.nome });

  // Sucesso
  const el = document.getElementById('page-content');
  el.innerHTML = `
    <div style="max-width:500px;margin:60px auto;text-align:center">
      <div style="font-size:64px;margin-bottom:16px">✅</div>
      <h2 style="font-size:22px;font-weight:700;color:var(--blue-dark);margin-bottom:8px">Pedido enviado!</h2>
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:4px">Código: <strong class="mono">${codigo}</strong></p>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:24px">Aguarde a aprovação do gestor.</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn btn-outline" onclick="irPara('catalogo')">Ver catálogo</button>
        <button class="btn btn-primary" onclick="irPara('meus-pedidos')">Meus pedidos</button>
      </div>
    </div>`;
};

// CSS
(function(){
  if(document.getElementById('css-pedido')) return;
  const s = document.createElement('style');
  s.id = 'css-pedido';
  s.textContent = `
    .ped-etapa { margin-bottom:24px; }
    .ped-etapa-header { display:flex; align-items:center; gap:12px; }
    .ped-etapa-num { width:28px; height:28px; border-radius:50%; background:var(--blue-dark); color:#fff; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .ped-etapa-titulo { font-size:15px; font-weight:600; }
    .ped-input { width:100%; height:38px; padding:0 12px; border:1.5px solid var(--border); border-radius:var(--radius-sm); font-family:'DM Sans',sans-serif; font-size:13px; color:var(--text-primary); background:var(--surface2); outline:none; transition:border-color .15s; }
    .ped-input:focus { border-color:var(--blue-mid); background:#fff; }
    textarea.ped-input { height:auto; padding:10px 12px; resize:vertical; }
    .ped-cliente-card { background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius-sm); padding:14px 16px; }
    .ped-qty-btn { width:28px; height:28px; border-radius:6px; border:1px solid var(--border); background:var(--surface); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1; }
    .ped-qty-btn:hover { background:var(--blue-pale); border-color:var(--blue-mid); }
    .ped-prod-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border:1px solid var(--border); border-radius:var(--radius-sm); margin-bottom:6px; cursor:pointer; transition:all .15s; }
    .ped-prod-item:hover { border-color:var(--blue-mid); background:var(--blue-pale); }
    .ped-frete-opcao { display:flex; align-items:center; gap:10px; padding:10px 14px; border:1.5px solid var(--border); border-radius:var(--radius-sm); margin-bottom:6px; cursor:pointer; transition:all .15s; font-size:13px; }
    .ped-frete-opcao.selected { border-color:var(--blue-dark); background:var(--blue-pale); }
  `;
  document.head.appendChild(s);
})();
