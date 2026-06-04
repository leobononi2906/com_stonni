// ============================================================
//  MÓDULO: CONFIGURAÇÕES
//  Abas: Geral | Tabelas de Preço | Ações Comerciais | Catálogo | Representantes
// ============================================================

const BLING_PROXY = `${SUPA_URL}/functions/v1/bling-proxy`;

async function renderConfiguracoes(el) {
  el.innerHTML = `
    <div class="cfg-wrap">
      <div class="cfg-tabs">
        <button class="cfg-tab active" onclick="cfgAba('geral',this)">⚙️ Geral</button>
        <button class="cfg-tab" onclick="cfgAba('precos',this)">💲 Tabelas de Preço</button>
        <button class="cfg-tab" onclick="cfgAba('acoes',this)">🎯 Ações Comerciais</button>
        <button class="cfg-tab" onclick="cfgAba('catalogo',this)">🛍️ Catálogo</button>
        <button class="cfg-tab" onclick="cfgAba('representantes',this)">👥 Representantes</button>
      </div>
      <div id="cfg-body"></div>
    </div>
  `;
  cfgAba('geral', el.querySelector('.cfg-tab'));
}

function cfgAba(aba, btn) {
  document.querySelectorAll('.cfg-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const body = document.getElementById('cfg-body');
  body.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  switch(aba) {
    case 'geral':           cfgCarregarGeral(body); break;
    case 'precos':          cfgCarregarPrecos(body); break;
    case 'acoes':           cfgCarregarAcoes(body); break;
    case 'catalogo':        cfgCarregarCatalogo(body); break;
    case 'representantes':  cfgCarregarRepresentantes(body); break;
  }
}

// ============================================================
//  ABA 1 — GERAL
// ============================================================
async function cfgCarregarGeral(el) {
  const configs = await supa('ped_configuracoes', 'order=chave');
  const visiveis = (configs || []).filter(c =>
    !['bling_refresh_token','bling_api_token'].includes(c.chave)
  );

  el.innerHTML = `
    <div class="cfg-section">
      <div class="section-header">
        <span class="section-title">Configurações Gerais</span>
        <button class="btn btn-primary" onclick="cfgSalvarGeral()">💾 Salvar alterações</button>
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th style="width:220px">Configuração</th>
            <th>Descrição</th>
            <th style="width:280px">Valor</th>
          </tr></thead>
          <tbody>
            ${visiveis.map(c => `
              <tr>
                <td><code style="font-size:11px;color:var(--blue-mid)">${c.chave}</code></td>
                <td style="color:var(--text-secondary);font-size:12px">${c.descricao || '—'}</td>
                <td>${cfgInputPorTipo(c)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div id="cfg-geral-msg" style="margin-top:12px;font-size:13px;"></div>
    </div>
  `;
}

function cfgInputPorTipo(c) {
  const id = `cfg_${c.chave}`;
  if (c.tipo === 'boolean') {
    const checked = c.valor === 'true' ? 'checked' : '';
    return `<label style="display:flex;align-items:center;gap:8px;cursor:pointer">
      <input type="checkbox" id="${id}" ${checked} style="width:16px;height:16px;accent-color:var(--blue-dark)">
      <span style="font-size:12px;color:var(--text-secondary)">${c.valor === 'true' ? 'Ativado' : 'Desativado'}</span>
    </label>`;
  }
  if (c.tipo === 'number') return `<input type="number" id="${id}" value="${c.valor}" class="cfg-input" step="0.01">`;
  if (c.tipo === 'select' && c.opcoes) return `<input type="text" id="${id}" value='${c.valor}' class="cfg-input" placeholder='["28 DDL","35 DDL"]'>`;
  return `<input type="text" id="${id}" value="${c.valor || ''}" class="cfg-input">`;
}

async function cfgSalvarGeral() {
  const msg = document.getElementById('cfg-geral-msg');
  msg.textContent = 'Salvando...'; msg.style.color = 'var(--text-muted)';
  const configs = await supa('ped_configuracoes', 'order=chave');
  const visiveis = (configs || []).filter(c => !['bling_refresh_token','bling_api_token'].includes(c.chave));
  let erros = 0;
  for (const c of visiveis) {
    const el = document.getElementById(`cfg_${c.chave}`);
    if (!el) continue;
    const valor = c.tipo === 'boolean' ? (el.checked ? 'true' : 'false') : el.value.trim();
    await fetch(`${SUPA_URL}/rest/v1/ped_configuracoes?chave=eq.${c.chave}`, {
      method: 'PATCH', headers: { ...HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ valor, atualizado_em: new Date().toISOString() })
    }).catch(() => erros++);
  }
  msg.textContent = erros === 0 ? '✅ Configurações salvas!' : `⚠️ ${erros} erro(s) ao salvar.`;
  msg.style.color = erros === 0 ? 'var(--green)' : 'var(--red)';
  setTimeout(() => msg.textContent = '', 4000);
}

// ============================================================
//  ABA 2 — TABELAS DE PREÇO
// ============================================================
async function cfgCarregarPrecos(el) {
  const [tabelas, regras] = await Promise.all([
    supa('ped_tabelas_preco', 'order=id'),
    supa('ped_tabela_regras', 'order=id_tabela,tipo,id')
  ]);

  let tabelaSel = tabelas?.[0]?.id || null;

  function renderListaTabelas() {
    return (tabelas || []).map(t => `
      <div class="preco-tab-item ${t.id === tabelaSel ? 'active' : ''}" onclick="cfgSelTab(${t.id},this)">
        <div style="font-weight:600;font-size:13px">${t.nome}</div>
        <div style="font-size:11px;margin-top:2px">
          <span style="color:${t.ativa ? 'var(--green)' : 'var(--text-muted)'}">
            ${t.ativa ? '● Ativa' : '○ Inativa'}
          </span>
          ${t.markup_global != null && t.markup_global !== 0
            ? `<span style="color:${t.markup_global > 0 ? 'var(--orange)' : 'var(--blue-mid)'};margin-left:6px">
                ${t.markup_global > 0 ? '+' : ''}${t.markup_global}%
               </span>`
            : '<span style="color:var(--text-muted);margin-left:6px">padrão</span>'}
        </div>
      </div>
    `).join('') + `
      <button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="cfgNovaTabela()">+ Nova tabela</button>
    `;
  }

  function renderRegrasTabela(idTabela) {
    const t = (tabelas || []).find(t => t.id === idTabela);
    if (!t) return '<div class="empty-state"><p>Selecione uma tabela</p></div>';
    const r = (regras || []).filter(r => r.id_tabela === idTabela);

    return `
      <!-- Configuração da tabela -->
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-card-header">
          <span class="table-card-title">⚙️ ${t.nome}</span>
          <button class="btn btn-outline btn-sm" onclick="cfgEditarTabela(${t.id})">Editar tabela</button>
        </div>
        <div style="padding:16px 20px;display:flex;gap:24px;align-items:center;flex-wrap:wrap">
          <div>
            <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);font-weight:600;margin-bottom:4px">Markup global</div>
            <div style="font-size:22px;font-weight:700;font-family:'DM Mono',monospace;color:${(t.markup_global||0) === 0 ? 'var(--text-muted)' : (t.markup_global > 0 ? 'var(--orange)' : 'var(--blue-mid)')}">
              ${(t.markup_global||0) > 0 ? '+' : ''}${t.markup_global || 0}%
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">sobre preco_aux2 Bononi SC</div>
          </div>
          <div style="flex:1;min-width:200px">
            <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">
              ${(t.markup_global||0) === 0
                ? 'Preço igual à tabela base (preco_aux2)'
                : `Preço = preco_aux2 ${(t.markup_global||0) > 0 ? '+' : ''}${t.markup_global}%`}
              <br>
              <span style="color:var(--text-muted)">Regras de desconto aplicadas <strong>sobre</strong> esse preço</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Regras de desconto -->
      <div class="section-header" style="margin-bottom:14px">
        <span class="section-title">Regras de desconto</span>
        <button class="btn btn-primary btn-sm" onclick="cfgNovaRegra(${idTabela})">+ Adicionar regra</button>
      </div>
      ${r.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>Nenhuma regra de desconto</h3>
          <p>Adicione regras por quantidade, valor do pedido ou grupo.</p>
        </div>
      ` : `
        <div class="table-card">
          <table class="data-table">
            <thead><tr>
              <th>Tipo</th><th>Condição</th><th>Desconto</th><th>Descrição</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              ${r.map(rg => `
                <tr>
                  <td><span class="badge badge-b">${cfgTipoLabel(rg.tipo)}</span></td>
                  <td style="font-size:12px;color:var(--text-secondary)">${cfgCondicaoLabel(rg)}</td>
                  <td class="mono" style="color:var(--green);font-weight:600">${rg.desconto_perc}%</td>
                  <td style="font-size:12px">${rg.descricao || '—'}</td>
                  <td><span class="badge ${rg.ativa ? 'badge-aprovado' : 'badge-cancelado'}">${rg.ativa ? 'Ativa' : 'Inativa'}</span></td>
                  <td>
                    <button class="btn btn-outline btn-sm" onclick="cfgEditarRegra(${rg.id})">Editar</button>
                    <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);margin-left:4px" onclick="cfgExcluirRegra(${rg.id})">✕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  }

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:start">
      <div>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;letter-spacing:0.5px">Tabelas</div>
        <div id="preco-tabs-list">${renderListaTabelas()}</div>
      </div>
      <div id="preco-regras-area">
        ${tabelaSel ? renderRegrasTabela(tabelaSel) : '<div class="empty-state"><p>Selecione uma tabela</p></div>'}
      </div>
    </div>
  `;

  window.cfgSelTab = (id, el) => {
    tabelaSel = id;
    document.querySelectorAll('.preco-tab-item').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('preco-regras-area').innerHTML = renderRegrasTabela(id);
  };
}

function cfgTipoLabel(tipo) {
  return { quantidade: 'Qtd. Produto', valor_pedido: 'Valor Pedido', grupo: 'Grupo', global: 'Global' }[tipo] || tipo;
}
function cfgCondicaoLabel(rg) {
  if (rg.tipo === 'quantidade')   return `≥ ${rg.qtd_minima} peças do mesmo produto`;
  if (rg.tipo === 'valor_pedido') return `Pedido ≥ R$ ${(rg.valor_minimo||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;
  if (rg.tipo === 'grupo')        return `Grupo ID ${rg.id_grupo}${rg.id_subgrupo ? ` / Sub ${rg.id_subgrupo}` : ''}`;
  if (rg.tipo === 'global')       return 'Todos os produtos';
  return '—';
}

function cfgFormTabela(t = {}) {
  return `
    <div class="form-field"><label>Nome da tabela</label><input type="text" id="tb-nome" class="cfg-input" value="${t.nome||''}" placeholder="Ex: TABELA SP, TABELA NORDESTE"></div>
    <div class="form-field"><label>Descrição</label><input type="text" id="tb-desc" class="cfg-input" value="${t.descricao||''}" placeholder="Opcional"></div>
    <div class="form-field">
      <label>Markup global sobre preco_aux2 (%)</label>
      <input type="number" id="tb-markup" class="cfg-input" value="${t.markup_global||0}" step="0.1"
             placeholder="Ex: 5 = +5% | -3 = -3% | 0 = preço base">
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
        Positivo = acréscimo · Negativo = desconto · Zero = igual à tabela base
      </div>
    </div>
    <div class="form-field">
      <label>Status</label>
      <select id="tb-ativa" class="cfg-input">
        <option value="true" ${t.ativa !== false ? 'selected':''}>Ativa</option>
        <option value="false" ${t.ativa === false ? 'selected':''}>Inativa</option>
      </select>
    </div>
  `;
}

async function cfgNovaTabela() {
  abrirDrawer('Nova Tabela de Preço', 'Crie uma tabela derivada da tabela base', cfgFormTabela(), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgSalvarNovaTabela()">Criar tabela</button>
  `);
}
async function cfgSalvarNovaTabela() {
  const nome = document.getElementById('tb-nome').value.trim();
  if (!nome) { alert('Nome obrigatório'); return; }
  await supaInsert('ped_tabelas_preco', {
    nome, descricao: document.getElementById('tb-desc').value.trim(),
    markup_global: parseFloat(document.getElementById('tb-markup').value) || 0,
    ativa: document.getElementById('tb-ativa').value === 'true'
  });
  fecharDrawer(); cfgAba('precos', null);
}

window.cfgEditarTabela = async function(id) {
  const res = await supa('ped_tabelas_preco', `id=eq.${id}`);
  const t = res?.[0]; if (!t) return;
  abrirDrawer('Editar Tabela', t.nome, cfgFormTabela(t), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgAtualizarTabela(${id})">Salvar</button>
  `);
};
window.cfgAtualizarTabela = async function(id) {
  await supaPatch('ped_tabelas_preco', `id=eq.${id}`, {
    nome: document.getElementById('tb-nome').value.trim(),
    descricao: document.getElementById('tb-desc').value.trim(),
    markup_global: parseFloat(document.getElementById('tb-markup').value) || 0,
    ativa: document.getElementById('tb-ativa').value === 'true'
  });
  fecharDrawer(); cfgAba('precos', null);
};

function cfgNovaRegra(idTabela) {
  abrirDrawer('Nova Regra de Desconto', 'Aplicada sobre o preço já calculado da tabela', `
    <div class="form-field">
      <label>Tipo de regra</label>
      <select id="rg-tipo" class="cfg-input" onchange="cfgAtualizarCamposRegra()">
        <option value="quantidade">Por quantidade do produto</option>
        <option value="valor_pedido">Por valor total do pedido</option>
        <option value="grupo">Por grupo/subgrupo</option>
        <option value="global">Global (todos os produtos)</option>
      </select>
    </div>
    <div id="rg-campos-dinamicos"></div>
    <div class="form-field"><label>Desconto (%)</label><input type="number" id="rg-desconto" class="cfg-input" min="0" max="100" step="0.1" placeholder="Ex: 5"></div>
    <div class="form-field"><label>Descrição (exibida ao representante)</label><input type="text" id="rg-desc" class="cfg-input" placeholder="Ex: Desconto por volume"></div>
    <input type="hidden" id="rg-id-tabela" value="${idTabela}">
  `, `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgSalvarRegra()">Salvar regra</button>
  `);
  cfgAtualizarCamposRegra();
}

window.cfgAtualizarCamposRegra = function() {
  const tipo = document.getElementById('rg-tipo')?.value;
  const el = document.getElementById('rg-campos-dinamicos');
  if (!el) return;
  if (tipo === 'quantidade')   el.innerHTML = `<div class="form-field"><label>Quantidade mínima (peças do mesmo produto)</label><input type="number" id="rg-qtd" class="cfg-input" min="1" placeholder="Ex: 10"></div>`;
  else if (tipo === 'valor_pedido') el.innerHTML = `<div class="form-field"><label>Valor mínimo do pedido (R$)</label><input type="number" id="rg-valor" class="cfg-input" min="0" step="0.01" placeholder="Ex: 3000"></div>`;
  else if (tipo === 'grupo')   el.innerHTML = `<div class="form-row form-row-2"><div class="form-field"><label>ID grupo</label><input type="number" id="rg-grupo" class="cfg-input" placeholder="ID no ERP"></div><div class="form-field"><label>ID subgrupo (opcional)</label><input type="number" id="rg-subgrupo" class="cfg-input"></div></div>`;
  else el.innerHTML = `<div class="alert alert-info"><span class="alert-icon">ℹ️</span>Aplica em todos os produtos de todas as ordens.</div>`;
};

async function cfgSalvarRegra() {
  const tipo = document.getElementById('rg-tipo').value;
  const desconto = parseFloat(document.getElementById('rg-desconto').value);
  if (!desconto || desconto <= 0) { alert('Informe o percentual de desconto'); return; }
  const body = {
    id_tabela: parseInt(document.getElementById('rg-id-tabela').value),
    tipo, desconto_perc: desconto,
    descricao: document.getElementById('rg-desc').value.trim(), ativa: true
  };
  if (tipo === 'quantidade')   body.qtd_minima  = parseFloat(document.getElementById('rg-qtd')?.value) || null;
  if (tipo === 'valor_pedido') body.valor_minimo = parseFloat(document.getElementById('rg-valor')?.value) || null;
  if (tipo === 'grupo') { body.id_grupo = parseInt(document.getElementById('rg-grupo')?.value)||null; body.id_subgrupo = parseInt(document.getElementById('rg-subgrupo')?.value)||null; }
  await supaInsert('ped_tabela_regras', body);
  fecharDrawer(); cfgAba('precos', null);
}

window.cfgEditarRegra = async function(id) {
  const res = await supa('ped_tabela_regras', `id=eq.${id}`);
  const rg = res?.[0]; if (!rg) return;
  abrirDrawer('Editar Regra', cfgTipoLabel(rg.tipo), `
    <div class="form-field"><label>Tipo</label><input type="text" class="cfg-input" value="${cfgTipoLabel(rg.tipo)}" disabled style="opacity:.6"></div>
    ${rg.tipo==='quantidade'   ? `<div class="form-field"><label>Quantidade mínima</label><input type="number" id="rg-edit-qtd" class="cfg-input" value="${rg.qtd_minima||''}"></div>` : ''}
    ${rg.tipo==='valor_pedido' ? `<div class="form-field"><label>Valor mínimo (R$)</label><input type="number" id="rg-edit-valor" class="cfg-input" value="${rg.valor_minimo||''}"></div>` : ''}
    ${rg.tipo==='grupo' ? `<div class="form-row form-row-2"><div class="form-field"><label>ID grupo</label><input type="number" id="rg-edit-grupo" class="cfg-input" value="${rg.id_grupo||''}"></div><div class="form-field"><label>ID subgrupo</label><input type="number" id="rg-edit-subgrupo" class="cfg-input" value="${rg.id_subgrupo||''}"></div></div>` : ''}
    <div class="form-field"><label>Desconto (%)</label><input type="number" id="rg-edit-desconto" class="cfg-input" value="${rg.desconto_perc}" step="0.1"></div>
    <div class="form-field"><label>Descrição</label><input type="text" id="rg-edit-desc" class="cfg-input" value="${rg.descricao||''}"></div>
    <div class="form-field"><label>Status</label><select id="rg-edit-ativa" class="cfg-input"><option value="true" ${rg.ativa?'selected':''}>Ativa</option><option value="false" ${!rg.ativa?'selected':''}>Inativa</option></select></div>
  `, `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgAtualizarRegra(${id},'${rg.tipo}')">Salvar</button>
  `);
};
window.cfgAtualizarRegra = async function(id, tipo) {
  const body = { desconto_perc: parseFloat(document.getElementById('rg-edit-desconto').value), descricao: document.getElementById('rg-edit-desc').value.trim(), ativa: document.getElementById('rg-edit-ativa').value==='true' };
  if (tipo==='quantidade')   body.qtd_minima  = parseFloat(document.getElementById('rg-edit-qtd')?.value)||null;
  if (tipo==='valor_pedido') body.valor_minimo = parseFloat(document.getElementById('rg-edit-valor')?.value)||null;
  if (tipo==='grupo') { body.id_grupo=parseInt(document.getElementById('rg-edit-grupo')?.value)||null; body.id_subgrupo=parseInt(document.getElementById('rg-edit-subgrupo')?.value)||null; }
  await supaPatch('ped_tabela_regras', `id=eq.${id}`, body);
  fecharDrawer(); cfgAba('precos', null);
};
window.cfgExcluirRegra = async function(id) {
  if (!confirm('Excluir esta regra?')) return;
  await fetch(`${SUPA_URL}/rest/v1/ped_tabela_regras?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  cfgAba('precos', null);
};

// ============================================================
//  ABA 3 — AÇÕES COMERCIAIS
// ============================================================
async function cfgCarregarAcoes(el) {
  const acoes = await supa('ped_acoes_comerciais', 'order=criado_em.desc');
  const hoje = new Date().toISOString().split('T')[0];

  function statusAcao(a) {
    if (!a.ativa) return { label: 'Inativa', classe: 'badge-cancelado' };
    if (a.data_fim && a.data_fim < hoje) return { label: 'Expirada', classe: 'badge-cancelado' };
    if (a.data_inicio && a.data_inicio > hoje) return { label: 'Agendada', classe: 'badge-enviado' };
    return { label: 'Ativa', classe: 'badge-aprovado' };
  }

  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">${(acoes||[]).length} ação(ões) cadastrada(s)</span>
      <button class="btn btn-primary" onclick="cfgNovaAcao()">+ Nova ação</button>
    </div>
    <div class="table-card" style="margin-top:14px">
      <table class="data-table">
        <thead><tr>
          <th>Nome</th><th>Tipo</th><th>Escopo</th><th>Valor</th><th>Validade</th><th>Status</th><th></th>
        </tr></thead>
        <tbody>
          ${!(acoes||[]).length ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🎯</div><h3>Nenhuma ação</h3><p>Crie descontos temporários ou preços fixos por produto ou grupo.</p></div></td></tr>` :
          (acoes||[]).map(a => {
            const s = statusAcao(a);
            const escopoLabel = a.escopo === 'produto'
              ? `Produto ID ${a.id_produto}`
              : `Grupo ID ${a.id_grupo}${a.id_subgrupo ? ` / Sub ${a.id_subgrupo}` : ''}`;
            const valorLabel = a.tipo === 'desconto'
              ? `<span style="color:var(--green);font-weight:600">-${a.valor}%</span>`
              : `<span style="color:var(--blue-mid);font-weight:600">R$ ${a.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>`;
            const validade = a.data_fim
              ? `${a.data_inicio ? fmtData(a.data_inicio)+' → ' : ''}${fmtData(a.data_fim)}`
              : (a.data_inicio ? `A partir de ${fmtData(a.data_inicio)}` : 'Sem prazo');
            return `
              <tr>
                <td><strong>${a.nome}</strong>${a.obs ? `<div style="font-size:11px;color:var(--text-muted)">${a.obs}</div>` : ''}</td>
                <td><span class="badge ${a.tipo==='desconto' ? 'badge-aprovado' : 'badge-b'}">${a.tipo==='desconto' ? 'Desconto' : 'Preço Fixo'}</span></td>
                <td style="font-size:12px;color:var(--text-secondary)">${escopoLabel}</td>
                <td class="mono">${valorLabel}</td>
                <td style="font-size:12px;color:var(--text-muted)">${validade}</td>
                <td><span class="badge ${s.classe}">${s.label}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="cfgEditarAcao(${a.id})">Editar</button>
                  <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);margin-left:4px" onclick="cfgExcluirAcao(${a.id})">✕</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function cfgFormAcao(a = {}) {
  return `
    <div class="form-field"><label>Nome da ação</label><input type="text" id="ac-nome" class="cfg-input" value="${a.nome||''}" placeholder="Ex: Black Friday, Promoção Geladeiras Mai/26"></div>
    <div class="form-row form-row-2">
      <div class="form-field">
        <label>Tipo</label>
        <select id="ac-tipo" class="cfg-input" onchange="cfgAtualizarCamposAcao()">
          <option value="desconto" ${a.tipo==='desconto'||!a.tipo?'selected':''}>Desconto (%)</option>
          <option value="preco_fixo" ${a.tipo==='preco_fixo'?'selected':''}>Preço fixo (R$)</option>
        </select>
      </div>
      <div class="form-field">
        <label id="ac-valor-label">Valor</label>
        <input type="number" id="ac-valor" class="cfg-input" value="${a.valor||''}" min="0" step="0.01" placeholder="Ex: 10">
      </div>
    </div>
    <div class="form-field">
      <label>Escopo</label>
      <select id="ac-escopo" class="cfg-input" onchange="cfgAtualizarCamposAcao()">
        <option value="produto" ${a.escopo==='produto'?'selected':''}>Produto específico</option>
        <option value="grupo" ${a.escopo==='grupo'?'selected':''}>Grupo / Subgrupo</option>
      </select>
    </div>
    <div id="ac-campos-escopo"></div>
    <div class="form-row form-row-2">
      <div class="form-field"><label>Data início (opcional)</label><input type="date" id="ac-inicio" class="cfg-input" value="${a.data_inicio||''}"></div>
      <div class="form-field"><label>Data fim (opcional)</label><input type="date" id="ac-fim" class="cfg-input" value="${a.data_fim||''}"></div>
    </div>
    <div class="form-field"><label>Observação</label><input type="text" id="ac-obs" class="cfg-input" value="${a.obs||''}" placeholder="Opcional"></div>
    <div class="form-field">
      <label>Status</label>
      <select id="ac-ativa" class="cfg-input">
        <option value="true" ${a.ativa!==false?'selected':''}>Ativa</option>
        <option value="false" ${a.ativa===false?'selected':''}>Inativa</option>
      </select>
    </div>
    <input type="hidden" id="ac-id-produto" value="${a.id_produto||''}">
    <input type="hidden" id="ac-id-grupo" value="${a.id_grupo||''}">
    <input type="hidden" id="ac-id-subgrupo" value="${a.id_subgrupo||''}">
  `;
}

window.cfgAtualizarCamposAcao = function() {
  const tipo   = document.getElementById('ac-tipo')?.value;
  const escopo = document.getElementById('ac-escopo')?.value;
  const label  = document.getElementById('ac-valor-label');
  const campos = document.getElementById('ac-campos-escopo');
  if (label) label.textContent = tipo === 'desconto' ? 'Desconto (%)' : 'Preço fixo (R$)';
  if (!campos) return;
  if (escopo === 'produto') {
    campos.innerHTML = `
      <div class="form-field">
        <label>ID do produto no ERP</label>
        <input type="number" id="ac-produto-id" class="cfg-input" value="${document.getElementById('ac-id-produto')?.value||''}" placeholder="Ex: 18744">
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px">O mesmo código usado no catálogo</div>
      </div>`;
  } else {
    campos.innerHTML = `
      <div class="form-row form-row-2">
        <div class="form-field"><label>ID do grupo</label><input type="number" id="ac-grupo-id" class="cfg-input" value="${document.getElementById('ac-id-grupo')?.value||''}" placeholder="ID no ERP"></div>
        <div class="form-field"><label>ID do subgrupo (opcional)</label><input type="number" id="ac-subgrupo-id" class="cfg-input" value="${document.getElementById('ac-id-subgrupo')?.value||''}"></div>
      </div>`;
  }
};

window.cfgNovaAcao = function() {
  abrirDrawer('Nova Ação Comercial', 'Desconto temporário ou preço fixo por produto ou grupo', cfgFormAcao(), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgSalvarAcao()">Criar ação</button>
  `);
  cfgAtualizarCamposAcao();
};

async function cfgSalvarAcao() {
  const nome  = document.getElementById('ac-nome').value.trim();
  const valor = parseFloat(document.getElementById('ac-valor').value);
  const escopo = document.getElementById('ac-escopo').value;
  if (!nome)         { alert('Nome obrigatório'); return; }
  if (!valor || valor <= 0) { alert('Informe o valor'); return; }

  const body = {
    nome, valor,
    tipo:        document.getElementById('ac-tipo').value,
    escopo,
    data_inicio: document.getElementById('ac-inicio').value || null,
    data_fim:    document.getElementById('ac-fim').value || null,
    obs:         document.getElementById('ac-obs').value.trim(),
    ativa:       document.getElementById('ac-ativa').value === 'true',
    id_produto:  escopo==='produto' ? (parseInt(document.getElementById('ac-produto-id')?.value)||null) : null,
    id_grupo:    escopo==='grupo'   ? (parseInt(document.getElementById('ac-grupo-id')?.value)||null) : null,
    id_subgrupo: escopo==='grupo'   ? (parseInt(document.getElementById('ac-subgrupo-id')?.value)||null) : null,
  };
  await supaInsert('ped_acoes_comerciais', body);
  fecharDrawer(); cfgAba('acoes', null);
}

window.cfgEditarAcao = async function(id) {
  const res = await supa('ped_acoes_comerciais', `id=eq.${id}`);
  const a = res?.[0]; if (!a) return;
  abrirDrawer('Editar Ação', a.nome, cfgFormAcao(a), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgAtualizarAcao(${id})">Salvar</button>
  `);
  cfgAtualizarCamposAcao();
};
window.cfgAtualizarAcao = async function(id) {
  const escopo = document.getElementById('ac-escopo').value;
  await supaPatch('ped_acoes_comerciais', `id=eq.${id}`, {
    nome:        document.getElementById('ac-nome').value.trim(),
    tipo:        document.getElementById('ac-tipo').value,
    valor:       parseFloat(document.getElementById('ac-valor').value),
    escopo,
    data_inicio: document.getElementById('ac-inicio').value || null,
    data_fim:    document.getElementById('ac-fim').value || null,
    obs:         document.getElementById('ac-obs').value.trim(),
    ativa:       document.getElementById('ac-ativa').value === 'true',
    id_produto:  escopo==='produto' ? (parseInt(document.getElementById('ac-produto-id')?.value)||null) : null,
    id_grupo:    escopo==='grupo'   ? (parseInt(document.getElementById('ac-grupo-id')?.value)||null) : null,
    id_subgrupo: escopo==='grupo'   ? (parseInt(document.getElementById('ac-subgrupo-id')?.value)||null) : null,
  });
  fecharDrawer(); cfgAba('acoes', null);
};
window.cfgExcluirAcao = async function(id) {
  if (!confirm('Excluir esta ação?')) return;
  await fetch(`${SUPA_URL}/rest/v1/ped_acoes_comerciais?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
  cfgAba('acoes', null);
};

// ============================================================
//  ABA 4 — CATÁLOGO
// ============================================================
async function cfgCarregarCatalogo(el) {
  const [produtos, estoques] = await Promise.all([
    supa('ped_catalogo_produtos', 'order=nome&select=*'),
    supa('comp_produtos_consolidado', 'select=id_produto,estoque_total,situacao_estoque')
  ]);
  // Sincroniza esgotado com estoque real (<=1 = indisponível)
  const estoqueMap = Object.fromEntries((estoques||[]).map(e=>[e.id_produto, e.estoque_total]));
  const updates = [];
  for (const p of (produtos||[])) {
    const est = estoqueMap[p.id_produto_erp];
    const deveEsgotar = est != null && est <= 1;
    if (deveEsgotar !== p.esgotado) {
      updates.push(fetch(`${SUPA_URL}/rest/v1/ped_catalogo_produtos?id=eq.${p.id}`, {
        method: 'PATCH', headers: { ...HEADERS, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ esgotado: deveEsgotar })
      }).catch(()=>{}));
      p.esgotado = deveEsgotar;
      p.estoque_total = est;
    } else {
      p.estoque_total = est;
    }
  }
  if (updates.length) await Promise.all(updates);
  window._cfgProdutos = produtos || [];

  el.innerHTML = `
    <div class="section-header">
      <div style="display:flex;gap:10px;align-items:center">
        <input type="text" id="cat-busca" placeholder="Buscar produto..." class="cfg-input" style="width:260px" oninput="cfgFiltrarCatalogo()">
        <select id="cat-filtro-status" class="cfg-input" style="width:140px" onchange="cfgFiltrarCatalogo()">
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="esgotado">Esgotados</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="cfgAdicionarProduto()">+ Adicionar produto</button>
    </div>
    <div class="table-card" style="margin-top:14px">
      <div class="table-card-header">
        <span class="table-card-title">Produtos no catálogo</span>
        <span style="font-size:12px;color:var(--text-muted)">${(produtos||[]).length} produto(s)</span>
      </div>
      <table class="data-table">
        <thead><tr>
          <th style="width:80px">Foto</th><th>Produto</th><th>Referência</th>
          <th>Grupo</th><th class="right">Preço Base</th><th>Estoque</th><th>Status</th><th style="width:120px"></th>
        </tr></thead>
        <tbody id="cat-tbody">${cfgRenderLinhasProduto(produtos||[])}</tbody>
      </table>
    </div>
  `;
}

function cfgRenderLinhasProduto(lista) {
  if (!lista.length) return `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🛍️</div><h3>Catálogo vazio</h3><p>Adicione produtos pelo SKU do ERP.</p></div></td></tr>`;
  return lista.map(p => {
    const foto = p.fotos?.[0] || null;
    const status = !p.ativo ? 'inativo' : p.esgotado ? 'esgotado' : 'disponivel';
    const badgeMap = { inativo:'badge-cancelado', esgotado:'badge-esgotado', disponivel:'badge-disponivel' };
    const labelMap = { inativo:'Inativo', esgotado:'Esgotado', disponivel:'Disponível' };
    return `
      <tr>
        <td>${foto
          ? `<img src="${foto}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`
          : `<div style="width:52px;height:52px;background:var(--surface2);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:20px;border:1px solid var(--border)">📦</div>`}
        </td>
        <td>
          <div style="font-weight:500;font-size:13px">${p.nome}</div>
          ${p.aplicacao ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">📍 ${p.aplicacao}</div>` : ''}
        </td>
        <td class="mono" style="font-size:12px">${p.referencia||'—'}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${p.grupo||'—'}</td>
        <td class="right mono" style="font-weight:600">R$ ${(p.preco_base||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
        <td style="font-size:12px;color:var(--text-muted)">${p.estoque_total != null ? `${p.estoque_total} un.` : '—'}</td>
        <td><span class="badge ${badgeMap[status]}">${labelMap[status]}</span></td>
        <td><button class="btn btn-outline btn-sm" onclick="cfgEditarProduto(${p.id})">Editar</button></td>
      </tr>`;
  }).join('');
}

window.cfgFiltrarCatalogo = function() {
  const busca  = document.getElementById('cat-busca').value.toLowerCase();
  const filtro = document.getElementById('cat-filtro-status').value;
  let lista = window._cfgProdutos || [];
  if (busca)  lista = lista.filter(p => p.nome?.toLowerCase().includes(busca) || p.referencia?.toLowerCase().includes(busca) || p.aplicacao?.toLowerCase().includes(busca));
  if (filtro === 'ativo')    lista = lista.filter(p => p.ativo && !p.esgotado);
  if (filtro === 'esgotado') lista = lista.filter(p => p.esgotado);
  if (filtro === 'inativo')  lista = lista.filter(p => !p.ativo);
  document.getElementById('cat-tbody').innerHTML = cfgRenderLinhasProduto(lista);
};

window.cfgAdicionarProduto = function() {
  abrirDrawer('Adicionar Produto ao Catálogo', 'Digite o SKU do ERP para buscar os dados', `
    <div class="alert alert-info">
      <span class="alert-icon">ℹ️</span>
      Digite o código do produto no ERP. Os dados e preço (preco_aux2 Bononi SC) virão automaticamente. As fotos do Bling serão buscadas após salvar.
    </div>
    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:20px">
      <div class="form-field" style="flex:1;margin:0">
        <label>SKU / Código ERP</label>
        <input type="text" id="np-sku" class="cfg-input" placeholder="Ex: 18744" onkeydown="if(event.key==='Enter') cfgBuscarERP()">
      </div>
      <button class="btn btn-primary" onclick="cfgBuscarERP()" style="flex-shrink:0">🔍 Buscar</button>
    </div>
    <div id="np-erp-resultado"></div>
    <div id="np-form-produto" style="display:none">
      <div class="form-row form-row-2">
        <div class="form-field"><label>Nome do produto</label><input type="text" id="np-nome" class="cfg-input"></div>
        <div class="form-field"><label>Referência (SKU)</label><input type="text" id="np-ref" class="cfg-input"></div>
      </div>
      <div class="form-field"><label>Aplicação (veículos/modelos)</label><input type="text" id="np-aplicacao" class="cfg-input" placeholder="Ex: Scania R440, Volvo FH 2020"></div>
      <div class="form-row form-row-2">
        <div class="form-field"><label>Grupo</label><input type="text" id="np-grupo" class="cfg-input" readonly style="opacity:.7"></div>
        <div class="form-field"><label>Subgrupo</label><input type="text" id="np-subgrupo" class="cfg-input" readonly style="opacity:.7"></div>
      </div>
      <div class="form-row form-row-2">
        <div class="form-field"><label>Preço base — preco_aux2 Bononi SC (R$)</label><input type="number" id="np-preco" class="cfg-input" min="0" step="0.01"></div>
        <div class="form-field"><label>Estoque Bononi SC</label><input type="text" id="np-estoque" class="cfg-input" readonly style="opacity:.7"></div>
      </div>
      <div class="form-field"><label>Descrição</label><textarea id="np-desc" class="cfg-input" rows="2"></textarea></div>
      <input type="hidden" id="np-id-grupo">
      <input type="hidden" id="np-id-subgrupo">
      <div style="display:flex;gap:16px;margin-top:8px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" id="np-ativo" checked style="accent-color:var(--blue-dark)"> Ativo no catálogo</label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" id="np-esgotado" style="accent-color:var(--red)"> Esgotado</label>
      </div>
      <div class="alert alert-info" style="margin-top:14px"><span class="alert-icon">📷</span>As fotos serão buscadas no Bling após salvar.</div>
    </div>
  `, `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" id="np-btn-salvar" style="display:none" onclick="cfgSalvarProduto()">Salvar e buscar fotos</button>
  `);
};

window.cfgBuscarERP = async function() {
  const sku = document.getElementById('np-sku').value.trim();
  if (!sku) { alert('Digite o SKU primeiro'); return; }
  const res = document.getElementById('np-erp-resultado');
  res.innerHTML = '<div style="color:var(--text-muted);font-size:13px">🔍 Buscando no ERP...</div>';

  const rows = await supa('vw_fb_produtos_compras',
    `id_produto=eq.${parseInt(sku)}&id_empresa=eq.8&select=id_produto,referencia,nome,complemento,id_grupo,grupo,id_subgrupo,subgrupo,preco_aux2,estoque_fisico`
  );
  const p = rows?.[0];

  if (!p) {
    res.innerHTML = `<div class="alert alert-warning"><span class="alert-icon">⚠️</span>Produto <strong>${sku}</strong> não encontrado na Bononi SC. Preencha manualmente.</div>`;
    document.getElementById('np-ref').value = sku;
    document.getElementById('np-form-produto').style.display = 'block';
    document.getElementById('np-btn-salvar').style.display = 'inline-flex';
    return;
  }

  document.getElementById('np-nome').value        = p.nome?.trim() || '';
  document.getElementById('np-ref').value         = p.referencia?.trim() || sku;
  document.getElementById('np-grupo').value       = p.grupo || '';
  document.getElementById('np-subgrupo').value    = p.subgrupo || '';
  document.getElementById('np-id-grupo').value    = p.id_grupo || '';
  document.getElementById('np-id-subgrupo').value = p.id_subgrupo || '';
  document.getElementById('np-preco').value       = p.preco_aux2 > 0 ? Number(p.preco_aux2).toFixed(2) : '';
  document.getElementById('np-estoque').value     = `${p.estoque_fisico ?? 0} un.`;
  document.getElementById('np-desc').value        = p.complemento?.trim() || '';
  if ((p.estoque_fisico ?? 0) <= 0) document.getElementById('np-esgotado').checked = true;

  res.innerHTML = `<div class="alert alert-success"><span class="alert-icon">✅</span><div><strong>${p.nome?.trim()}</strong><br><span style="font-size:12px">Preço atacado: <strong>R$ ${Number(p.preco_aux2||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong> · Estoque SC: <strong>${p.estoque_fisico??0} un.</strong></span></div></div>`;
  document.getElementById('np-form-produto').style.display = 'block';
  document.getElementById('np-btn-salvar').style.display = 'inline-flex';
};

window.cfgSalvarProduto = async function() {
  const nome = document.getElementById('np-nome').value.trim();
  const sku  = document.getElementById('np-sku').value.trim();
  if (!nome) { alert('Nome obrigatório'); return; }
  if (!sku)  { alert('SKU obrigatório'); return; }
  const btn = document.getElementById('np-btn-salvar');
  btn.textContent = 'Salvando...'; btn.disabled = true;
  const referencia = document.getElementById('np-ref').value.trim() || sku;
  const body = {
    id_produto_erp: parseInt(sku), referencia, nome,
    descricao:   document.getElementById('np-desc').value.trim(),
    aplicacao:   document.getElementById('np-aplicacao').value.trim(),
    id_grupo:    parseInt(document.getElementById('np-id-grupo').value) || null,
    grupo:       document.getElementById('np-grupo').value.trim(),
    id_subgrupo: parseInt(document.getElementById('np-id-subgrupo').value) || null,
    subgrupo:    document.getElementById('np-subgrupo').value.trim(),
    preco_base:  parseFloat(document.getElementById('np-preco').value) || 0,
    ativo:       document.getElementById('np-ativo').checked,
    esgotado:    document.getElementById('np-esgotado').checked,
    fotos: [], especificacoes: {}
  };
  const inserted = await supaInsert('ped_catalogo_produtos', body);
  const idNovo = inserted?.[0]?.id;
  btn.textContent = 'Sincronizando com Bling...';
  try {
    const skuLimpo = String(parseInt(referencia));
    const [rFotos, rDim] = await Promise.all([
      fetch(`${BLING_PROXY}?acao=fotos&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({})),
      fetch(`${BLING_PROXY}?acao=dimensoes&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({}))
    ]);
    const patch = {};
    if ((rFotos?.fotos||[]).length > 0) patch.fotos = rFotos.fotos;
    if (rDim?.peso_kg)        patch.peso_kg        = rDim.peso_kg;
    if (rDim?.altura_cm)      patch.altura_cm      = rDim.altura_cm;
    if (rDim?.largura_cm)     patch.largura_cm     = rDim.largura_cm;
    if (rDim?.comprimento_cm) patch.comprimento_cm = rDim.comprimento_cm;
    if (Object.keys(patch).length > 0 && idNovo) {
      await supaPatch('ped_catalogo_produtos', `id=eq.${idNovo}`, patch);
      // Sincroniza também em frt_produtos_dimensoes
      if (rDim?.peso_kg) {
        await fetch(`${SUPA_URL}/rest/v1/frt_produtos_dimensoes`, {
          method: 'POST',
          headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({
            id_produto: parseInt(sku), descricao: nome, referencia,
            peso_kg: rDim.peso_kg, altura_cm: rDim.altura_cm,
            largura_cm: rDim.largura_cm, comprimento_cm: rDim.comprimento_cm, ativo: true
          })
        }).catch(()=>{});
      }
    }
  } catch(e) { console.warn('Bling sync:', e); }
  fecharDrawer(); cfgAba('catalogo', null);
};

window.cfgEditarProduto = async function(id) {
  const res = await supa('ped_catalogo_produtos', `id=eq.${id}`);
  const p = res?.[0]; if (!p) return;
  const fotos = p.fotos || [];
  abrirDrawer('Editar Produto', p.nome, `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      ${fotos.slice(0,4).map(f => `<img src="${f}" style="width:72px;height:72px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`).join('')}
      ${!fotos.length ? '<div style="font-size:12px;color:var(--text-muted)">Sem fotos</div>' : ''}
    </div>
    <button class="btn btn-outline btn-sm" onclick="cfgSincronizarBling(${id},'${p.referencia}')" style="margin-bottom:4px">🔄 Sincronizar com Bling</button>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Atualiza fotos + peso + dimensões automaticamente</div>
    <div style="display:flex;gap:16px;margin-bottom:12px">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
        <input type="checkbox" id="ep-sync-fotos" ${p.sync_fotos!==false?'checked':''} style="accent-color:var(--blue-dark)"> Sincronizar fotos
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
        <input type="checkbox" id="ep-sync-medidas" ${p.sync_medidas!==false?'checked':''} style="accent-color:var(--blue-dark)"> Sincronizar medidas
      </label>
    </div>
    <div id="ep-reload-msg" style="font-size:12px;margin-bottom:12px"></div>
    <div class="form-row form-row-2">
      <div class="form-field"><label>Nome</label><input type="text" id="ep-nome" class="cfg-input" value="${p.nome||''}"></div>
      <div class="form-field"><label>Referência</label><input type="text" id="ep-ref" class="cfg-input" value="${p.referencia||''}"></div>
    </div>
    <div class="form-field"><label>Aplicação</label><input type="text" id="ep-aplicacao" class="cfg-input" value="${p.aplicacao||''}"></div>
    <div class="form-row form-row-2">
      <div class="form-field"><label>Grupo</label><input type="text" id="ep-grupo" class="cfg-input" value="${p.grupo||''}"></div>
      <div class="form-field"><label>Subgrupo</label><input type="text" id="ep-subgrupo" class="cfg-input" value="${p.subgrupo||''}"></div>
    </div>
    <div class="form-field"><label>Preço base (R$)</label><input type="number" id="ep-preco" class="cfg-input" value="${p.preco_base||0}" step="0.01"></div>
    <div class="form-field"><label>Descrição</label><textarea id="ep-desc" class="cfg-input" rows="2">${p.descricao||''}</textarea></div>
    <!-- Dimensões para frete (sincronizadas do Bling) -->
    <div style="margin-top:14px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">📦 Dimensões para frete</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-field" style="margin:0">
          <label>Peso (kg)</label>
          <input type="number" id="ep-peso" class="cfg-input" value="${p.peso_kg||''}" step="0.001" placeholder="Ex: 19">
        </div>
        <div class="form-field" style="margin:0">
          <label>Altura (cm)</label>
          <input type="number" id="ep-altura" class="cfg-input" value="${p.altura_cm||''}" step="0.1" placeholder="Ex: 55">
        </div>
        <div class="form-field" style="margin:0">
          <label>Largura (cm)</label>
          <input type="number" id="ep-largura" class="cfg-input" value="${p.largura_cm||''}" step="0.1" placeholder="Ex: 34">
        </div>
        <div class="form-field" style="margin:0">
          <label>Comprimento (cm)</label>
          <input type="number" id="ep-comprimento" class="cfg-input" value="${p.comprimento_cm||''}" step="0.1" placeholder="Ex: 53">
        </div>
      </div>
    </div>
    <div style="display:flex;gap:16px;margin-top:12px">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" id="ep-ativo" ${p.ativo?'checked':''} style="accent-color:var(--blue-dark)"> Ativo</label>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" id="ep-esgotado" ${p.esgotado?'checked':''} style="accent-color:var(--red)"> Esgotado</label>
    </div>
  `, `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgAtualizarProduto(${id})">Salvar</button>
  `);
};

window.cfgSincronizarBling = async function(id, sku) {
  const msg = document.getElementById('ep-reload-msg');
  msg.textContent = '🔍 Sincronizando com Bling...'; msg.style.color = 'var(--text-muted)';
  const syncFotos   = document.getElementById('ep-sync-fotos')?.checked !== false;
  const syncMedidas = document.getElementById('ep-sync-medidas')?.checked !== false;
  try {
    const skuLimpo = String(parseInt(sku));
    const [rFotos, rDim] = await Promise.all([
      syncFotos   ? fetch(`${BLING_PROXY}?acao=fotos&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({})) : Promise.resolve({}),
      syncMedidas ? fetch(`${BLING_PROXY}?acao=dimensoes&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({})) : Promise.resolve({})
    ]);
    const patch = {};
    const fotos = rFotos?.fotos || [];
    if (fotos.length > 0) patch.fotos = fotos;
    if (rDim?.peso_kg)        { patch.peso_kg = rDim.peso_kg;               document.getElementById('ep-peso')?.setAttribute('value', rDim.peso_kg); document.getElementById('ep-peso').value = rDim.peso_kg; }
    if (rDim?.altura_cm)      { patch.altura_cm = rDim.altura_cm;           document.getElementById('ep-altura').value = rDim.altura_cm; }
    if (rDim?.largura_cm)     { patch.largura_cm = rDim.largura_cm;         document.getElementById('ep-largura').value = rDim.largura_cm; }
    if (rDim?.comprimento_cm) { patch.comprimento_cm = rDim.comprimento_cm; document.getElementById('ep-comprimento').value = rDim.comprimento_cm; }
    if (Object.keys(patch).length > 0) await supaPatch('ped_catalogo_produtos', `id=eq.${id}`, patch);
    // Sincroniza frt_produtos_dimensoes
    if (rDim?.peso_kg) {
      const prodRes = await supa('ped_catalogo_produtos', `id=eq.${id}&select=id_produto_erp,nome,referencia`);
      const prod = prodRes?.[0];
      if (prod) {
        await fetch(`${SUPA_URL}/rest/v1/frt_produtos_dimensoes`, {
          method: 'POST',
          headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({
            id_produto: prod.id_produto_erp, descricao: prod.nome, referencia: prod.referencia,
            peso_kg: rDim.peso_kg, altura_cm: rDim.altura_cm,
            largura_cm: rDim.largura_cm, comprimento_cm: rDim.comprimento_cm, ativo: true
          })
        }).catch(()=>{});
      }
    }
    const msgs = [];
    if (fotos.length) msgs.push(`${fotos.length} foto(s)`);
    if (rDim?.peso_kg) msgs.push(`dimensões (${rDim.peso_kg}kg, ${rDim.altura_cm}x${rDim.largura_cm}x${rDim.comprimento_cm}cm)`);
    msg.textContent = msgs.length ? `✅ Sincronizado: ${msgs.join(' · ')}` : '⚠️ Sem dados no Bling para este produto.';
    msg.style.color = msgs.length ? 'var(--green)' : 'var(--orange)';
  } catch(e) { msg.textContent = '❌ Erro ao sincronizar com Bling.'; msg.style.color = 'var(--red)'; }
};

window.cfgAtualizarProduto = async function(id) {
  const patch = {
    sync_fotos:     document.getElementById('ep-sync-fotos')?.checked !== false,
    sync_medidas:   document.getElementById('ep-sync-medidas')?.checked !== false,
    nome:           document.getElementById('ep-nome').value.trim(),
    referencia:     document.getElementById('ep-ref').value.trim(),
    aplicacao:      document.getElementById('ep-aplicacao').value.trim(),
    grupo:          document.getElementById('ep-grupo').value.trim(),
    subgrupo:       document.getElementById('ep-subgrupo').value.trim(),
    preco_base:     parseFloat(document.getElementById('ep-preco').value) || 0,
    descricao:      document.getElementById('ep-desc').value.trim(),
    ativo:          document.getElementById('ep-ativo').checked,
    esgotado:       document.getElementById('ep-esgotado').checked,
    atualizado_em:  new Date().toISOString()
  };
  // Dimensões (se preenchidas)
  const peso = parseFloat(document.getElementById('ep-peso')?.value);
  const altura = parseFloat(document.getElementById('ep-altura')?.value);
  const largura = parseFloat(document.getElementById('ep-largura')?.value);
  const comprimento = parseFloat(document.getElementById('ep-comprimento')?.value);
  if (peso)        patch.peso_kg        = peso;
  if (altura)      patch.altura_cm      = altura;
  if (largura)     patch.largura_cm     = largura;
  if (comprimento) patch.comprimento_cm = comprimento;
  await supaPatch('ped_catalogo_produtos', `id=eq.${id}`, patch);
  fecharDrawer(); cfgAba('catalogo', null);
};

// ============================================================
//  ABA 5 — REPRESENTANTES + GESTORES
// ============================================================
async function cfgCarregarRepresentantes(el) {
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
  const [reps, gestores, tabelas] = await Promise.all([
    supa('ped_representantes', 'order=nome&select=*'),
    supa('ped_gestores', 'order=nome&select=*'),
    supa('ped_tabelas_preco', 'order=nome&select=id,nome,markup_global')
  ]);
  window._cfgTabelas = tabelas || [];

  el.innerHTML = `
    <!-- GESTORES -->
    <div class="cfg-section">
      <div class="section-header" style="margin-bottom:14px">
        <span class="section-title">🔐 Gestores (${(gestores||[]).length})</span>
        <button class="btn btn-primary" onclick="cfgNovoGestor()">+ Novo gestor</button>
      </div>
      <div class="alert alert-info" style="margin-bottom:12px">
        <span class="alert-icon">ℹ️</span>
        Crie o usuário no <strong>Supabase Auth</strong> primeiro com <code>{"perfil": "gestor"}</code> no User Metadata, depois cadastre aqui definindo as permissões.
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th>Nome</th><th>E-mail</th><th>Perfil</th>
            <th>Aprovar</th><th>Reprovar</th><th>Faturar</th><th>Catálogo</th><th>Config</th>
            <th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${!(gestores||[]).length
              ? `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">🔐</div><h3>Nenhum gestor</h3><p>Cadastre o primeiro gestor.</p></div></td></tr>`
              : cfgRenderLinhasGestor(gestores)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- REPRESENTANTES -->
    <div class="cfg-section" style="margin-top:28px">
      <div class="section-header" style="margin-bottom:14px">
        <span class="section-title">👥 Representantes (${(reps||[]).length})</span>
        <button class="btn btn-primary" onclick="cfgNovoRepresentante()">+ Novo representante</button>
      </div>
      <div class="alert alert-info" style="margin-bottom:12px">
        <span class="alert-icon">ℹ️</span>
        Crie o usuário no <strong>Supabase Auth</strong> com <code>{"perfil": "representante"}</code> no User Metadata, depois cadastre aqui com tabela de preço e região.
      </div>
      <div class="table-card">
        <table class="data-table">
          <thead><tr>
            <th>Nome</th><th>E-mail</th><th>Região</th><th>Tabela de preço</th><th>Comissão</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>
            ${!(reps||[]).length
              ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">👥</div><h3>Nenhum representante</h3><p>Cadastre o primeiro representante.</p></div></td></tr>`
              : cfgRenderLinhasRep(reps, tabelas)}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ── Formulário Gestor ──
function cfgFormGestor(g) {
  g = g || {};
  var chk = function(val) { return val !== false ? 'checked' : ''; };
  var sel = function(val, match) { return val === match ? 'selected' : ''; };
  return '<div class="form-row form-row-2">' +
    '<div class="form-field"><label>Nome completo</label><input type="text" id="gs-nome" class="cfg-input" value="' + (g.nome||'') + '"></div>' +
    '<div class="form-field"><label>E-mail (igual ao Supabase Auth)</label><input type="email" id="gs-email" class="cfg-input" value="' + (g.email||'') + '"></div>' +
    '</div>' +
    '<div class="form-field"><label>Perfil</label><select id="gs-perfil" class="cfg-input">' +
    '<option value="gestor" ' + sel(g.perfil,'gestor') + '>Gestor</option>' +
    '<option value="admin" ' + sel(g.perfil,'admin') + '>Admin</option>' +
    '</select></div>' +
    '<div style="margin-top:14px;padding:14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm)">' +
    '<div style="font-size:12px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:12px">Permissões</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-aprovar" ' + chk(g.pode_aprovar) + ' style="accent-color:var(--blue-dark)"> Aprovar pedidos</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-reprovar" ' + chk(g.pode_reprovar) + ' style="accent-color:var(--blue-dark)"> Reprovar pedidos</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-faturar" ' + chk(g.pode_faturar) + ' style="accent-color:var(--blue-dark)"> Faturar pedidos (NF/boleto)</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-catalogo" ' + chk(g.pode_catalogo) + ' style="accent-color:var(--blue-dark)"> Gerenciar catálogo</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-config" ' + (g.pode_config===true?'checked':'') + ' style="accent-color:var(--blue-dark)"> Acessar configurações</label>' +
    '</div></div>' +
    '<div class="form-field" style="margin-top:12px"><label>Status</label><select id="gs-ativo" class="cfg-input">' +
    '<option value="true" ' + (g.ativo!==false?'selected':'') + '>Ativo</option>' +
    '<option value="false" ' + (g.ativo===false?'selected':'') + '>Inativo</option>' +
    '</select></div>';
}

window.cfgNovoGestor = function() {
  var footer = '<button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="cfgSalvarGestor()">Cadastrar</button>';
  abrirDrawer('Novo Gestor', 'Defina nome, e-mail e permissões', cfgFormGestor(), footer);
};

window.cfgSalvarGestor = async function() {
  const nome  = document.getElementById('gs-nome').value.trim();
  const email = document.getElementById('gs-email').value.trim();
  if (!nome || !email) { alert('Nome e e-mail obrigatórios'); return; }
  await supaInsert('ped_gestores', {
    nome, email,
    perfil:        document.getElementById('gs-perfil').value,
    pode_aprovar:  document.getElementById('gs-aprovar').checked,
    pode_reprovar: document.getElementById('gs-reprovar').checked,
    pode_faturar:  document.getElementById('gs-faturar').checked,
    pode_catalogo: document.getElementById('gs-catalogo').checked,
    pode_config:   document.getElementById('gs-config').checked,
    ativo:         document.getElementById('gs-ativo').value === 'true'
  });
  fecharDrawer(); cfgAba('representantes', null);
};

window.cfgEditarGestor = async function(id) {
  const res = await supa('ped_gestores', 'id=eq.'+id);
  const g = res?.[0]; if (!g) return;
  var footer = '<button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="cfgAtualizarGestor('+id+')">Salvar</button>';
  abrirDrawer('Editar Gestor', g.nome, cfgFormGestor(g), footer);
};

window.cfgAtualizarGestor = async function(id) {
  await supaPatch('ped_gestores', 'id=eq.'+id, {
    nome:          document.getElementById('gs-nome').value.trim(),
    email:         document.getElementById('gs-email').value.trim(),
    perfil:        document.getElementById('gs-perfil').value,
    pode_aprovar:  document.getElementById('gs-aprovar').checked,
    pode_reprovar: document.getElementById('gs-reprovar').checked,
    pode_faturar:  document.getElementById('gs-faturar').checked,
    pode_catalogo: document.getElementById('gs-catalogo').checked,
    pode_config:   document.getElementById('gs-config').checked,
    ativo:         document.getElementById('gs-ativo').value === 'true'
  });
  fecharDrawer(); cfgAba('representantes', null);
};


function cfgFormRepresentante(r = {}) {
  const tabelas = window._cfgTabelas || [];
  return `
    <div class="alert alert-info" style="margin-bottom:16px">
      <span class="alert-icon">ℹ️</span>
      Crie o usuário no <strong>Supabase Auth</strong> primeiro, depois cadastre aqui com o mesmo e-mail.
    </div>
    <div class="form-row form-row-2">
      <div class="form-field"><label>Nome completo</label><input type="text" id="rp-nome" class="cfg-input" value="${r.nome||''}"></div>
      <div class="form-field"><label>E-mail</label><input type="email" id="rp-email" class="cfg-input" value="${r.email||''}"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-field"><label>Região</label><input type="text" id="rp-regiao" class="cfg-input" value="${r.regiao||''}" placeholder="Ex: SP, SUL"></div>
      <div class="form-field"><label>Comissão (%)</label><input type="number" id="rp-comissao" class="cfg-input" value="${r.comissao_perc||0}" step="0.1"></div>
    </div>
    <div class="form-row form-row-2">
      <div class="form-field">
        <label>Tabela de preço</label>
        <select id="rp-tabela" class="cfg-input">
          ${tabelas.map(t => {
            const markup = t.markup_global;
            const tag = markup!=null&&markup!==0 ? ` (${markup>0?'+':''}${markup}%)` : ' (base)';
            return `<option value="${t.id}" ${r.id_tabela_preco===t.id?'selected':''}>${t.nome}${tag}</option>`;
          }).join('')}
        </select>
      </div>
      <div class="form-field"><label>ID vendedor no ERP</label><input type="number" id="rp-erp" class="cfg-input" value="${r.id_vendedor_erp||''}" placeholder="Opcional"></div>
    </div>
    <div class="form-field">
      <label>Status</label>
      <select id="rp-ativo" class="cfg-input">
        <option value="true" ${r.ativo!==false?'selected':''}>Ativo</option>
        <option value="false" ${r.ativo===false?'selected':''}>Inativo</option>
      </select>
    </div>
  `;
}

window.cfgNovoRepresentante = function() {
  abrirDrawer('Novo Representante', 'Cadastro de representante comercial', cfgFormRepresentante(), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgSalvarRepresentante()">Cadastrar</button>
  `);
};
async function cfgSalvarRepresentante() {
  const nome = document.getElementById('rp-nome').value.trim();
  if (!nome) { alert('Nome obrigatório'); return; }
  await supaInsert('ped_representantes', {
    nome, email: document.getElementById('rp-email').value.trim(),
    regiao: document.getElementById('rp-regiao').value.trim(),
    comissao_perc: parseFloat(document.getElementById('rp-comissao').value)||0,
    id_tabela_preco: parseInt(document.getElementById('rp-tabela').value)||1,
    id_vendedor_erp: parseInt(document.getElementById('rp-erp').value)||null,
    ativo: document.getElementById('rp-ativo').value==='true'
  });
  fecharDrawer(); cfgAba('representantes', null);
}
window.cfgEditarRepresentante = async function(id) {
  const res = await supa('ped_representantes', `id=eq.${id}`);
  const r = res?.[0]; if (!r) return;
  abrirDrawer('Editar Representante', r.nome, cfgFormRepresentante(r), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgAtualizarRepresentante(${id})">Salvar</button>
  `);
};
window.cfgAtualizarRepresentante = async function(id) {
  await supaPatch('ped_representantes', `id=eq.${id}`, {
    nome: document.getElementById('rp-nome').value.trim(),
    email: document.getElementById('rp-email').value.trim(),
    regiao: document.getElementById('rp-regiao').value.trim(),
    comissao_perc: parseFloat(document.getElementById('rp-comissao').value)||0,
    id_tabela_preco: parseInt(document.getElementById('rp-tabela').value)||1,
    id_vendedor_erp: parseInt(document.getElementById('rp-erp').value)||null,
    ativo: document.getElementById('rp-ativo').value==='true'
  });
  fecharDrawer(); cfgAba('representantes', null);
};


function cfgRenderLinhasRep(reps, tabelas) {
  return (reps||[]).map(function(r) {
    const t = (tabelas||[]).find(function(t) { return t.id === r.id_tabela_preco; });
    const markup = t ? t.markup_global : null;
    const markupStr = (markup != null && markup !== 0)
      ? ' <span style="font-size:10px;color:' + (markup>0?'var(--orange)':'var(--blue-mid)') + '">(' + (markup>0?'+':'') + markup + '%)</span>'
      : '';
    const statusBadge = r.ativo ? 'badge-aprovado' : 'badge-cancelado';
    const statusLabel = r.ativo ? 'Ativo' : 'Inativo';
    return '<tr>' +
      '<td><strong>' + (r.nome||'') + '</strong></td>' +
      '<td style="font-size:12px;color:var(--text-secondary)">' + (r.email||'—') + '</td>' +
      '<td style="font-size:12px">' + (r.regiao||'—') + '</td>' +
      '<td style="font-size:12px">' + (t ? t.nome : 'Padrão') + markupStr + '</td>' +
      '<td class="mono" style="font-size:12px">' + (r.comissao_perc||0) + '%</td>' +
      '<td><span class="badge ' + statusBadge + '">' + statusLabel + '</span></td>' +
      '<td><button class="btn btn-outline btn-sm" onclick="cfgEditarRepresentante(' + r.id + ')">Editar</button></td>' +
      '</tr>';
  }).join('');
}


function cfgRenderLinhasGestor(gestores) {
  return (gestores||[]).map(function(g) {
    var perfBadge = g.perfil === 'admin' ? 'badge-faturado' : 'badge-aprovado';
    var statusBadge = g.ativo ? 'badge-aprovado' : 'badge-cancelado';
    var statusLabel = g.ativo ? 'Ativo' : 'Inativo';
    var chk = function(v) { return v ? '✅' : '—'; };
    return '<tr>' +
      '<td><strong>' + g.nome + '</strong></td>' +
      '<td style="font-size:12px;color:var(--text-secondary)">' + g.email + '</td>' +
      '<td><span class="badge ' + perfBadge + '">' + g.perfil.toUpperCase() + '</span></td>' +
      '<td style="text-align:center">' + chk(g.pode_aprovar) + '</td>' +
      '<td style="text-align:center">' + chk(g.pode_reprovar) + '</td>' +
      '<td style="text-align:center">' + chk(g.pode_faturar) + '</td>' +
      '<td style="text-align:center">' + chk(g.pode_catalogo) + '</td>' +
      '<td style="text-align:center">' + chk(g.pode_config) + '</td>' +
      '<td><span class="badge ' + statusBadge + '">' + statusLabel + '</span></td>' +
      '<td><button class="btn btn-outline btn-sm" onclick="cfgEditarGestor(' + g.id + ')">Editar</button></td>' +
      '</tr>';
  }).join('');
}

// ============================================================
//  CSS DO MÓDULO
// ============================================================
(function injetarCssConfiguracoes() {
  if (document.getElementById('css-configuracoes')) return;
  const style = document.createElement('style');
  style.id = 'css-configuracoes';
  style.textContent = `
    .cfg-wrap { max-width: 1100px; }
    .cfg-tabs { display: flex; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; }
    .cfg-tab { padding: 8px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
    .cfg-tab.active { background: var(--blue-dark); border-color: var(--blue-dark); color: #fff; }
    .cfg-tab:hover:not(.active) { background: var(--surface2); }
    .cfg-input { width: 100%; height: 38px; padding: 0 12px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text-primary); background: var(--surface2); outline: none; transition: border-color 0.15s; }
    .cfg-input:focus { border-color: var(--blue-mid); background: #fff; }
    textarea.cfg-input { height: auto; padding: 10px 12px; resize: vertical; }
    .cfg-section { margin-bottom: 24px; }
    .preco-tab-item { padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); cursor: pointer; margin-bottom: 6px; transition: all 0.15s; }
    .preco-tab-item:hover { border-color: var(--blue-mid); }
    .preco-tab-item.active { border-color: var(--blue-dark); background: var(--blue-pale); }
  `;
  document.head.appendChild(style);
})();
