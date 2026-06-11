
// Formata preço: sem decimais se termina em .00, com 2 casas se tem centavos
function fmtPreco(v) {
  const n = Number(v) || 0;
  if (n === Math.floor(n)) return 'R$ ' + n.toLocaleString('pt-BR');
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ============================================================
//  MÓDULO: CONFIGURAÇÕES
//  Abas: Geral | Tabelas de Preço | Ações Comerciais | Catálogo | Representantes
//  v2 — Mobile responsive + Seção PDF configurável
// ============================================================

const BLING_PROXY = `${SUPA_URL}/functions/v1/bling-proxy`;

async function renderConfiguracoes(el) {
  el.innerHTML = `
    <div class="cfg-wrap">
      <div class="cfg-tabs-scroll">
        <div class="cfg-tabs">
          <button class="cfg-tab active" onclick="cfgAba('geral',this)">⚙️ Geral</button>
          <button class="cfg-tab" onclick="cfgAba('precos',this)">💲 Preços</button>
          <button class="cfg-tab" onclick="cfgAba('acoes',this)">🎯 Ações</button>
          <button class="cfg-tab" onclick="cfgAba('catalogo',this)">🛍️ Catálogo</button>
          <button class="cfg-tab" onclick="cfgAba('representantes',this)">👥 Equipe</button>
        </div>
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
    case 'status':           cfgCarregarStatus(body); break;
  }
}

// ============================================================
//  ABA 1 — GERAL + PDF
// ============================================================
async function cfgCarregarGeral(el) {
  const configs = await supa('ped_configuracoes', 'order=chave');
  const PDF_CHAVES = ['pdf_titulo','pdf_empresa_nome','pdf_empresa_cnpj','pdf_empresa_endereco','pdf_empresa_telefone','pdf_logo_url','pdf_rodape'];
  const SKIP = ['bling_refresh_token','bling_api_token', ...PDF_CHAVES];
  const visiveis = (configs || []).filter(c => !SKIP.includes(c.chave));
  const cfgPDF = Object.fromEntries((configs || []).filter(c => PDF_CHAVES.includes(c.chave)).map(c => [c.chave, c.valor]));

  el.innerHTML = `
    <div class="cfg-section">
      <div class="section-header">
        <span class="section-title">Configurações Gerais</span>
        <button class="btn btn-primary" onclick="cfgSalvarGeral()">💾 Salvar</button>
      </div>
      <!-- desktop tabela -->
      <div class="table-card hide-mobile">
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
      <!-- mobile cards -->
      <div class="show-mobile cfg-cards-geral">
        ${visiveis.map(c => `
          <div class="cfg-card-item">
            <div class="cfg-card-label">${c.descricao || c.chave}</div>
            <div>${cfgInputPorTipo(c)}</div>
          </div>
        `).join('')}
      </div>
      <div id="cfg-geral-msg" style="margin-top:12px;font-size:13px;"></div>
    </div>

    <!-- SEÇÃO PDF -->
    <div class="cfg-section" style="margin-top:28px">
      <div class="section-header">
        <span class="section-title">📄 PDF / Documento</span>
        <button class="btn btn-primary" onclick="cfgSalvarPDF()">💾 Salvar</button>
      </div>
      <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
        Personaliza o PDF gerado nos pedidos. Gestores podem alterar sem precisar de programação.
      </div>
      <div class="cfg-grid-2">
        <div class="form-field">
          <label>Título do documento</label>
          <input type="text" id="cfg-pdf-titulo" class="cfg-input" placeholder="Ex: PEDIDO, ORÇAMENTO, PROPOSTA" value="${cfgPDF['pdf_titulo'] || 'PEDIDO'}">
        </div>
        <div class="form-field">
          <label>Nome da empresa</label>
          <input type="text" id="cfg-pdf-empresa-nome" class="cfg-input" placeholder="Ex: Stonni — Bononi Acessórios" value="${cfgPDF['pdf_empresa_nome'] || ''}">
        </div>
      </div>
      <div class="cfg-grid-2">
        <div class="form-field">
          <label>CNPJ da empresa</label>
          <input type="text" id="cfg-pdf-empresa-cnpj" class="cfg-input" placeholder="00.000.000/0000-00" value="${cfgPDF['pdf_empresa_cnpj'] || ''}">
        </div>
        <div class="form-field">
          <label>Telefone</label>
          <input type="text" id="cfg-pdf-empresa-telefone" class="cfg-input" placeholder="(00) 00000-0000" value="${cfgPDF['pdf_empresa_telefone'] || ''}">
        </div>
      </div>
      <div class="form-field">
        <label>Endereço</label>
        <input type="text" id="cfg-pdf-empresa-endereco" class="cfg-input" placeholder="Rua, número, cidade — UF" value="${cfgPDF['pdf_empresa_endereco'] || ''}">
      </div>
      <div class="form-field">
        <label>URL do logo</label>
        <input type="text" id="cfg-pdf-logo-url" class="cfg-input" placeholder="logo.png ou https://..." value="${cfgPDF['pdf_logo_url'] || 'logo.png'}">
        <span style="font-size:11px;color:var(--text-muted)">Use "logo.png" para o logo padrão do portal, ou cole uma URL externa.</span>
      </div>
      <div class="form-field">
        <label>Texto do rodapé</label>
        <textarea id="cfg-pdf-rodape" class="cfg-input" rows="2" placeholder="Ex: Este documento não tem valor fiscal...">${cfgPDF['pdf_rodape'] || ''}</textarea>
      </div>
      <div id="cfg-pdf-status" style="font-size:12px;color:var(--green);margin-top:8px;display:none">✅ Configurações de PDF salvas!</div>
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
  const PDF_CHAVES = ['pdf_titulo','pdf_empresa_nome','pdf_empresa_cnpj','pdf_empresa_endereco','pdf_empresa_telefone','pdf_logo_url','pdf_rodape'];
  const SKIP = ['bling_refresh_token','bling_api_token', ...PDF_CHAVES];
  const configs = await supa('ped_configuracoes', 'order=chave');
  const visiveis = (configs || []).filter(c => !SKIP.includes(c.chave));
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

window.cfgSalvarPDF = async function() {
  const campos = {
    'pdf_titulo':            document.getElementById('cfg-pdf-titulo')?.value.trim(),
    'pdf_empresa_nome':      document.getElementById('cfg-pdf-empresa-nome')?.value.trim(),
    'pdf_empresa_cnpj':      document.getElementById('cfg-pdf-empresa-cnpj')?.value.trim(),
    'pdf_empresa_telefone':  document.getElementById('cfg-pdf-empresa-telefone')?.value.trim(),
    'pdf_empresa_endereco':  document.getElementById('cfg-pdf-empresa-endereco')?.value.trim(),
    'pdf_logo_url':          document.getElementById('cfg-pdf-logo-url')?.value.trim(),
    'pdf_rodape':            document.getElementById('cfg-pdf-rodape')?.value.trim(),
  };
  for (const [chave, valor] of Object.entries(campos)) {
    await fetch(`${SUPA_URL}/rest/v1/ped_configuracoes?chave=eq.${chave}`, {
      method: 'PATCH', headers: { ...HEADERS, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ valor, atualizado_em: new Date().toISOString() })
    }).catch(()=>{});
  }
  const status = document.getElementById('cfg-pdf-status');
  if (status) { status.style.display = 'block'; setTimeout(() => { status.style.display = 'none'; }, 3000); }
};

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
          <span style="color:${t.ativa ? 'var(--green)' : 'var(--text-muted)'}">${t.ativa ? '● Ativa' : '○ Inativa'}</span>
          ${t.markup_global != null && t.markup_global !== 0
            ? `<span style="color:${t.markup_global > 0 ? 'var(--orange)' : 'var(--blue-mid)'};margin-left:6px">${t.markup_global > 0 ? '+' : ''}${t.markup_global}%</span>`
            : '<span style="color:var(--text-muted);margin-left:6px">padrão</span>'}
        </div>
      </div>
    `).join('') + `<button class="btn btn-outline btn-sm" style="margin-top:8px;width:100%" onclick="cfgNovaTabela()">+ Nova tabela</button>`;
  }

  function renderRegrasTabela(idTabela) {
    const t = (tabelas || []).find(t => t.id === idTabela);
    if (!t) return '<div class="empty-state"><p>Selecione uma tabela</p></div>';
    const r = (regras || []).filter(r => r.id_tabela === idTabela);
    return `
      <div class="table-card" style="margin-bottom:16px">
        <div class="table-card-header">
          <span class="table-card-title">⚙️ ${t.nome}</span>
          <button class="btn btn-outline btn-sm" onclick="cfgEditarTabela(${t.id})">Editar tabela</button>
        </div>
        <div style="padding:16px 20px;display:flex;gap:24px;align-items:center;flex-wrap:wrap">
          <div>
            <div style="font-size:11px;text-transform:uppercase;color:var(--text-muted);font-weight:600;margin-bottom:4px">Markup global</div>
            <div style="font-size:22px;font-weight:700;font-family:'DM Mono',monospace;color:${(t.markup_global||0) === 0 ? 'var(--text-muted)' : (t.markup_global > 0 ? 'var(--orange)' : 'var(--blue-mid)')}">${(t.markup_global||0) > 0 ? '+' : ''}${t.markup_global || 0}%</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">sobre preco_aux2 Bononi SC</div>
          </div>
          <div style="flex:1;min-width:160px">
            <div style="font-size:12px;color:var(--text-secondary);line-height:1.6">
              ${(t.markup_global||0) === 0 ? 'Preço igual à tabela base (preco_aux2)' : `Preço = preco_aux2 ${(t.markup_global||0) > 0 ? '+' : ''}${t.markup_global}%`}
              <br><span style="color:var(--text-muted)">Regras de desconto aplicadas <strong>sobre</strong> esse preço</span>
            </div>
          </div>
        </div>
      </div>
      <div class="section-header" style="margin-bottom:14px">
        <span class="section-title">Regras de desconto</span>
        <button class="btn btn-primary btn-sm" onclick="cfgNovaRegra(${idTabela})">+ Adicionar regra</button>
      </div>
      ${r.length === 0 ? `<div class="empty-state"><div class="empty-state-icon">📋</div><h3>Nenhuma regra de desconto</h3><p>Adicione regras por quantidade, valor do pedido ou grupo.</p></div>` : `
        <div class="table-card">
          <table class="data-table hide-mobile">
            <thead><tr><th>Tipo</th><th>Condição</th><th>Desconto</th><th>Descrição</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${r.map(rg => `<tr>
                <td><span class="badge badge-b">${cfgTipoLabel(rg.tipo)}</span></td>
                <td style="font-size:12px;color:var(--text-secondary)">${cfgCondicaoLabel(rg)}</td>
                <td class="mono" style="color:var(--green);font-weight:600">${rg.desconto_perc}%</td>
                <td style="font-size:12px">${rg.descricao || '—'}</td>
                <td><span class="badge ${rg.ativa ? 'badge-aprovado' : 'badge-cancelado'}">${rg.ativa ? 'Ativa' : 'Inativa'}</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="cfgEditarRegra(${rg.id})">Editar</button>
                  <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);margin-left:4px" onclick="cfgExcluirRegra(${rg.id})">✕</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="show-mobile" style="padding:8px">
            ${r.map(rg => `
              <div class="cfg-card-row">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                  <span class="badge badge-b">${cfgTipoLabel(rg.tipo)}</span>
                  <span class="mono" style="color:var(--green);font-weight:600">${rg.desconto_perc}%</span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px">${cfgCondicaoLabel(rg)}</div>
                ${rg.descricao ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${rg.descricao}</div>` : ''}
                <div style="display:flex;gap:8px;align-items:center">
                  <span class="badge ${rg.ativa ? 'badge-aprovado' : 'badge-cancelado'}">${rg.ativa ? 'Ativa' : 'Inativa'}</span>
                  <button class="btn btn-outline btn-sm" onclick="cfgEditarRegra(${rg.id})">Editar</button>
                  <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red)" onclick="cfgExcluirRegra(${rg.id})">✕</button>
                </div>
              </div>`).join('')}
          </div>
        </div>`}
    `;
  }

  el.innerHTML = `
    <div class="precos-layout">
      <div class="precos-sidebar">
        <div class="hide-mobile" style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;letter-spacing:0.5px">Tabelas</div>
        <div id="preco-tabs-list">${renderListaTabelas()}</div>
      </div>
      <div id="preco-regras-area" class="precos-content">
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
  if (rg.tipo === 'qtd_grupo')    return `≥ ${rg.qtd_minima} peças do grupo ${rg.nome_grupo || '—'}`;
  if (rg.tipo === 'global')       return 'Todos os produtos';
  return '—';
}

function cfgFormTabela(t = {}) {
  return `
    <div class="form-field"><label>Nome da tabela</label><input type="text" id="tb-nome" class="cfg-input" value="${t.nome||''}" placeholder="Ex: TABELA SP, TABELA NORDESTE"></div>
    <div class="form-field"><label>Descrição</label><input type="text" id="tb-desc" class="cfg-input" value="${t.descricao||''}" placeholder="Opcional"></div>
    <div class="form-field">
      <label>Markup global sobre preco_aux2 (%)</label>
      <input type="number" id="tb-markup" class="cfg-input" value="${t.markup_global||0}" step="0.1" placeholder="Ex: 5 = +5% | -3 = -3% | 0 = preço base">
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Positivo = acréscimo · Negativo = desconto · Zero = igual à tabela base</div>
    </div>
    <div class="form-field">
      <label>Desconto à vista (%)</label>
      <input type="number" id="tb-avista" class="cfg-input" value="${t.desconto_avista_perc||0}" step="0.1" min="0" max="100" placeholder="Ex: 3">
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Aplicado automaticamente quando representante seleciona prazo À VISTA</div>
    </div>
    <div class="form-field">
      <label>Status</label>
      <select id="tb-ativa" class="cfg-input">
        <option value="true" ${t.ativa !== false ? 'selected':''}>Ativa</option>
        <option value="false" ${t.ativa === false ? 'selected':''}>Inativa</option>
      </select>
    </div>`;
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
  await supaInsert('ped_tabelas_preco', { nome, descricao: document.getElementById('tb-desc').value.trim(), markup_global: parseFloat(document.getElementById('tb-markup').value) || 0, ativa: document.getElementById('tb-ativa').value === 'true' });
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
  await supaPatch('ped_tabelas_preco', `id=eq.${id}`, { nome: document.getElementById('tb-nome').value.trim(), descricao: document.getElementById('tb-desc').value.trim(), markup_global: parseFloat(document.getElementById('tb-markup').value) || 0, desconto_avista_perc: parseFloat(document.getElementById('tb-avista')?.value) || 0, ativa: document.getElementById('tb-ativa').value === 'true' });
  fecharDrawer(); cfgAba('precos', null);
};

function cfgNovaRegra(idTabela) {
  abrirDrawer('Nova Regra de Desconto', 'Aplicada sobre o preço já calculado da tabela', `
    <div class="form-field">
      <label>Tipo de regra</label>
      <select id="rg-tipo" class="cfg-input" onchange="cfgAtualizarCamposRegra()">
        <option value="quantidade">Por quantidade do produto</option>
        <option value="qtd_grupo">Por quantidade do grupo/subgrupo</option>
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
  else if (tipo === 'qtd_grupo')   el.innerHTML = `<div class="cfg-grid-2"><div class="form-field"><label>Grupo do produto</label><select id="rg-nome-grupo" class="cfg-input"><option value="">Selecione...</option><option value="AUTO VIDROS">AUTO VIDROS</option>
<option value="STONNI AR CONDICIONADO">STONNI AR CONDICIONADO</option>
<option value="STONNI DIVERSOS">STONNI DIVERSOS</option>
<option value="STONNI GELADEIRAS">STONNI GELADEIRAS</option></select></div><div class="form-field"><label>Quantidade mínima (peças do grupo)</label><input type="number" id="rg-qtd-grupo" class="cfg-input" min="1" placeholder="Ex: 3"></div></div>`;
  else if (tipo === 'grupo')   el.innerHTML = `<div class="cfg-grid-2"><div class="form-field"><label>ID grupo</label><input type="number" id="rg-grupo" class="cfg-input" placeholder="ID no ERP"></div><div class="form-field"><label>ID subgrupo (opcional)</label><input type="number" id="rg-subgrupo" class="cfg-input"></div></div>`;
  else el.innerHTML = `<div class="alert alert-info"><span class="alert-icon">ℹ️</span>Aplica em todos os produtos de todas as ordens.</div>`;
};

async function cfgSalvarRegra() {
  const tipo = document.getElementById('rg-tipo').value;
  const desconto = parseFloat(document.getElementById('rg-desconto').value);
  if (!desconto || desconto <= 0) { alert('Informe o percentual de desconto'); return; }
  const idTabela = parseInt(document.getElementById('rg-id-tabela').value);
  if (!idTabela || isNaN(idTabela)) { alert('Erro: tabela não identificada. Feche e tente novamente.'); return; }
  const body = { id_tabela: idTabela, tipo, desconto_perc: desconto, descricao: document.getElementById('rg-desc').value.trim(), ativa: true };
  if (tipo === 'quantidade')   body.qtd_minima  = parseFloat(document.getElementById('rg-qtd')?.value) || null;
  if (tipo === 'valor_pedido') body.valor_minimo = parseFloat(document.getElementById('rg-valor')?.value) || null;
  if (tipo === 'grupo') { body.id_grupo = parseInt(document.getElementById('rg-grupo')?.value)||null; body.id_subgrupo = parseInt(document.getElementById('rg-subgrupo')?.value)||null; }
  if (tipo === 'qtd_grupo') { body.nome_grupo = document.getElementById('rg-nome-grupo')?.value||null; body.qtd_minima = parseFloat(document.getElementById('rg-qtd-grupo')?.value)||null; }
  const res = await supaInsert('ped_tabela_regras', body);
  if (res?.code || res?.error) { alert('Erro ao salvar: ' + (res.message || res.error || JSON.stringify(res))); return; }
  fecharDrawer(); cfgAba('precos', null);
}
window.cfgEditarRegra = async function(id) {
  const res = await supa('ped_tabela_regras', `id=eq.${id}`);
  const rg = res?.[0]; if (!rg) return;
  abrirDrawer('Editar Regra', cfgTipoLabel(rg.tipo), `
    <div class="form-field"><label>Tipo</label><input type="text" class="cfg-input" value="${cfgTipoLabel(rg.tipo)}" disabled style="opacity:.6"></div>
    ${rg.tipo==='quantidade'   ? `<div class="form-field"><label>Quantidade mínima</label><input type="number" id="rg-edit-qtd" class="cfg-input" value="${rg.qtd_minima||''}"></div>` : ''}
    ${rg.tipo==='valor_pedido' ? `<div class="form-field"><label>Valor mínimo (R$)</label><input type="number" id="rg-edit-valor" class="cfg-input" value="${rg.valor_minimo||''}"></div>` : ''}
    ${rg.tipo==='grupo' ? `<div class="cfg-grid-2"><div class="form-field"><label>ID grupo</label><input type="number" id="rg-edit-grupo" class="cfg-input" value="${rg.id_grupo||''}"></div><div class="form-field"><label>ID subgrupo</label><input type="number" id="rg-edit-subgrupo" class="cfg-input" value="${rg.id_subgrupo||''}"></div></div>` : ''}
    ${rg.tipo==='qtd_grupo' ? `<div class="cfg-grid-2"><div class="form-field"><label>Grupo</label><input type="text" id="rg-edit-nome-grupo" class="cfg-input" value="${rg.nome_grupo||''}"></div><div class="form-field"><label>Quantidade mínima</label><input type="number" id="rg-edit-qtd-grupo" class="cfg-input" value="${rg.qtd_minima||''}"></div></div>` : ''}
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
  if (tipo==='qtd_grupo') { body.nome_grupo = document.getElementById('rg-edit-nome-grupo')?.value||null; body.qtd_minima = parseFloat(document.getElementById('rg-edit-qtd-grupo')?.value)||null; }
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

  const linhasDesktop = !(acoes||[]).length
    ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🎯</div><h3>Nenhuma ação</h3><p>Crie descontos temporários ou preços fixos por produto ou grupo.</p></div></td></tr>`
    : (acoes||[]).map(a => {
        const s = statusAcao(a);
        const escopoLabel = a.escopo === 'produto' ? `Produto ID ${a.id_produto}` : `Grupo ID ${a.id_grupo}${a.id_subgrupo ? ` / Sub ${a.id_subgrupo}` : ''}`;
        const valorLabel = a.tipo === 'desconto' ? `<span style="color:var(--green);font-weight:600">-${a.valor}%</span>` : `<span style="color:var(--blue-mid);font-weight:600">R$ ${a.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>`;
        const validade = a.data_fim ? `${a.data_inicio ? fmtData(a.data_inicio)+' → ' : ''}${fmtData(a.data_fim)}` : (a.data_inicio ? `A partir de ${fmtData(a.data_inicio)}` : 'Sem prazo');
        return `<tr>
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
        </tr>`;
      }).join('');

  const cardsMobile = !(acoes||[]).length
    ? `<div class="empty-state"><div class="empty-state-icon">🎯</div><h3>Nenhuma ação</h3><p>Crie descontos temporários ou preços fixos.</p></div>`
    : (acoes||[]).map(a => {
        const s = statusAcao(a);
        const validade = a.data_fim ? `${a.data_inicio ? fmtData(a.data_inicio)+' → ' : ''}${fmtData(a.data_fim)}` : 'Sem prazo';
        return `<div class="cfg-card-row">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <strong style="font-size:13px">${a.nome}</strong>
            <span class="badge ${s.classe}">${s.label}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <span class="badge ${a.tipo==='desconto' ? 'badge-aprovado' : 'badge-b'}">${a.tipo==='desconto' ? 'Desconto' : 'Preço Fixo'}</span>
            <span class="mono" style="font-size:12px;font-weight:600;color:${a.tipo==='desconto'?'var(--green)':'var(--blue-mid)'}">${a.tipo==='desconto' ? '-'+a.valor+'%' : 'R$ '+a.valor.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">📅 ${validade}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline btn-sm" onclick="cfgEditarAcao(${a.id})" style="flex:1">Editar</button>
            <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red)" onclick="cfgExcluirAcao(${a.id})">✕</button>
          </div>
        </div>`;
      }).join('');

  el.innerHTML = `
    <div class="section-header">
      <span class="section-title">${(acoes||[]).length} ação(ões) cadastrada(s)</span>
      <button class="btn btn-primary" onclick="cfgNovaAcao()">+ Nova ação</button>
    </div>
    <div id="sync-todos-progress" style="display:none;margin-top:10px"></div>
    <div class="table-card hide-mobile" style="margin-top:14px">
      <table class="data-table">
        <thead><tr><th>Nome</th><th>Tipo</th><th>Escopo</th><th>Valor</th><th>Validade</th><th>Status</th><th></th></tr></thead>
        <tbody>${linhasDesktop}</tbody>
      </table>
    </div>
    <div class="show-mobile" style="margin-top:14px">${cardsMobile}</div>
  `;
}

function cfgFormAcao(a = {}) {
  return `
    <div class="form-field"><label>Nome da ação</label><input type="text" id="ac-nome" class="cfg-input" value="${a.nome||''}" placeholder="Ex: Black Friday, Promoção Geladeiras Mai/26"></div>
    <div class="cfg-grid-2">
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
    <div class="cfg-grid-2">
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
    campos.innerHTML = `<div class="form-field"><label>ID do produto no ERP</label><input type="number" id="ac-produto-id" class="cfg-input" value="${document.getElementById('ac-id-produto')?.value||''}" placeholder="Ex: 18744"><div style="font-size:11px;color:var(--text-muted);margin-top:4px">O mesmo código usado no catálogo</div></div>`;
  } else {
    campos.innerHTML = `<div class="cfg-grid-2"><div class="form-field"><label>ID do grupo</label><input type="number" id="ac-grupo-id" class="cfg-input" value="${document.getElementById('ac-id-grupo')?.value||''}" placeholder="ID no ERP"></div><div class="form-field"><label>ID do subgrupo (opcional)</label><input type="number" id="ac-subgrupo-id" class="cfg-input" value="${document.getElementById('ac-id-subgrupo')?.value||''}"></div></div>`;
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
  if (!nome)             { alert('Nome obrigatório'); return; }
  if (!valor || valor <= 0) { alert('Informe o valor'); return; }
  const body = { nome, valor, tipo: document.getElementById('ac-tipo').value, escopo, data_inicio: document.getElementById('ac-inicio').value || null, data_fim: document.getElementById('ac-fim').value || null, obs: document.getElementById('ac-obs').value.trim(), ativa: document.getElementById('ac-ativa').value === 'true', id_produto: escopo==='produto' ? (parseInt(document.getElementById('ac-produto-id')?.value)||null) : null, id_grupo: escopo==='grupo' ? (parseInt(document.getElementById('ac-grupo-id')?.value)||null) : null, id_subgrupo: escopo==='grupo' ? (parseInt(document.getElementById('ac-subgrupo-id')?.value)||null) : null };
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
  await supaPatch('ped_acoes_comerciais', `id=eq.${id}`, { nome: document.getElementById('ac-nome').value.trim(), tipo: document.getElementById('ac-tipo').value, valor: parseFloat(document.getElementById('ac-valor').value), escopo, data_inicio: document.getElementById('ac-inicio').value || null, data_fim: document.getElementById('ac-fim').value || null, obs: document.getElementById('ac-obs').value.trim(), ativa: document.getElementById('ac-ativa').value === 'true', id_produto: escopo==='produto' ? (parseInt(document.getElementById('ac-produto-id')?.value)||null) : null, id_grupo: escopo==='grupo' ? (parseInt(document.getElementById('ac-grupo-id')?.value)||null) : null, id_subgrupo: escopo==='grupo' ? (parseInt(document.getElementById('ac-subgrupo-id')?.value)||null) : null });
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

// ============================================================
//  GESTÃO DE TAGS DO CATÁLOGO
// ============================================================
window.cfgAbrirTags = async function() {
  const tags = await supa('ped_catalogo_tags', 'order=nome&select=*') || [];
  window._cfgTags = tags.filter(t=>t.ativo);

  const listaHtml = tags.length
    ? tags.map(t=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--surface2);border-radius:6px;border:1px solid var(--border);margin-bottom:6px">
          <span style="flex:1;font-size:13px;font-weight:500">${t.nome}</span>
          <span class="badge ${t.ativo?'badge-aprovado':'badge-cancelado'}" style="font-size:10px">${t.ativo?'Ativa':'Inativa'}</span>
          <button class="btn btn-outline btn-sm" onclick="cfgEditarTag(${t.id})">Editar</button>
          <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red)" onclick="cfgExcluirTag(${t.id})">✕</button>
        </div>`).join('')
    : '<div style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Nenhuma tag ainda.</div>';

  abrirDrawer('🏷️ Tags do Catálogo', 'Classifique produtos com tags personalizadas',
    `${listaHtml}
     <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-top:8px">
       <div style="font-size:13px;font-weight:600;margin-bottom:10px">Nova tag</div>
       <div style="display:flex;gap:10px">
         <input type="text" id="tag-nova-nome" class="cfg-input" placeholder="Ex: Motor Home" style="flex:1">
         <button class="btn btn-primary" onclick="cfgSalvarTag()">+ Adicionar</button>
       </div>
     </div>`,
    `<button class="btn btn-outline" onclick="fecharDrawer()">Fechar</button>`
  );
};

window.cfgSalvarTag = async function() {
  const nome = document.getElementById('tag-nova-nome')?.value.trim();
  if (!nome) return;
  await supaInsert('ped_catalogo_tags', { nome, ativo: true });
  cfgAbrirTags();
};

window.cfgEditarTag = async function(id) {
  const res = await supa('ped_catalogo_tags', `id=eq.${id}&select=nome`);
  const nomeAtual = res?.[0]?.nome || '';
  const novoNome = prompt('Nome da tag:', nomeAtual);
  if (!novoNome?.trim()) return;
  await supaPatch('ped_catalogo_tags', `id=eq.${id}`, { nome: novoNome.trim() });
  cfgAbrirTags();
};

window.cfgExcluirTag = async function(id) {
  if (!confirm('Excluir esta tag?')) return;
  await supaPatch('ped_catalogo_tags', `id=eq.${id}`, { ativo: false });
  cfgAbrirTags();
};

async function cfgCarregarCatalogo(el) {
  const tagsAll = await supa('ped_catalogo_tags', 'ativo=eq.true&order=nome&select=*');
  window._cfgTags = tagsAll || [];
  const [produtos, estoques] = await Promise.all([
    supa('ped_catalogo_produtos', 'order=nome&select=*'),
    supa('comp_produtos_consolidado', 'select=id_produto,estoque_total,situacao_estoque')
  ]);
  const estoqueMap = Object.fromEntries((estoques||[]).map(e=>[e.id_produto, e.estoque_total]));
  const updates = [];
  for (const p of (produtos||[])) {
    const est = estoqueMap[p.id_produto_erp];
    const deveEsgotar = est != null && est <= 1;
    if (deveEsgotar !== p.esgotado) {
      updates.push(fetch(`${SUPA_URL}/rest/v1/ped_catalogo_produtos?id=eq.${p.id}`, { method: 'PATCH', headers: { ...HEADERS, 'Prefer': 'return=minimal' }, body: JSON.stringify({ esgotado: deveEsgotar }) }).catch(()=>{}));
      p.esgotado = deveEsgotar;
    }
    p.estoque_total = est;
  }
  if (updates.length) await Promise.all(updates);
  window._cfgProdutos = produtos || [];

  el.innerHTML = `
    <div class="section-header" style="flex-wrap:wrap;gap:10px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex:1;min-width:0">
        <input type="text" id="cat-busca" placeholder="Buscar produto..." class="cfg-input" style="flex:1;min-width:120px;max-width:240px" oninput="cfgFiltrarCatalogo()">
        <select id="cat-filtro-status" class="cfg-input" style="width:130px;flex-shrink:0" onchange="cfgFiltrarCatalogo()">
          <option value="">Todos</option>
          <option value="ativo">Ativos</option>
          <option value="esgotado">Esgotados</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>
      <button class="btn btn-outline" onclick="cfgSincronizarTodos()" style="flex-shrink:0" id="btn-sync-todos">🔄 Sincronizar todos</button>
      <button class="btn btn-outline" onclick="cfgAbrirTags()" style="flex-shrink:0">🏷️ Tags</button>
      <button class="btn btn-primary" onclick="cfgAdicionarProduto()" style="flex-shrink:0">+ Produto</button>
    </div>
    <div id="sync-todos-progress" style="display:none;margin-top:10px"></div>
    <div class="table-card hide-mobile" style="margin-top:14px">
      <div class="table-card-header">
        <span class="table-card-title">Produtos no catálogo</span>
        <span style="font-size:12px;color:var(--text-muted)">${(produtos||[]).length} produto(s)</span>
      </div>
      <table class="data-table">
        <thead><tr>
          <th style="width:64px">Foto</th><th>Produto</th><th>Referência</th>
          <th>Grupo</th><th class="right">Preço</th><th>Estoque</th><th style="text-align:center;width:70px">Medidas</th><th>Status</th><th style="width:80px"></th>
        </tr></thead>
        <tbody id="cat-tbody">${cfgRenderLinhasProduto(produtos||[])}</tbody>
      </table>
    </div>
    <div class="show-mobile" style="margin-top:14px" id="cat-cards">${cfgRenderCardsProduto(produtos||[])}</div>
  `;
}

function cfgRenderLinhasProduto(lista) {
  if (!lista.length) return `<tr><td colspan="9"><div class="empty-state"><div class="empty-state-icon">🛍️</div><h3>Catálogo vazio</h3><p>Adicione produtos pelo SKU do ERP.</p></div></td></tr>`;
  return lista.map(p => {
    const foto = p.fotos?.[0] || null;
    const status = !p.ativo ? 'inativo' : p.esgotado ? 'esgotado' : 'disponivel';
    const badgeMap = { inativo:'badge-cancelado', esgotado:'badge-esgotado', disponivel:'badge-disponivel' };
    const labelMap = { inativo:'Inativo', esgotado:'Esgotado', disponivel:'Disponível' };
    return `<tr>
      <td>${foto ? `<img src="${foto}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">` : `<div style="width:52px;height:52px;background:var(--surface2);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:20px;border:1px solid var(--border)">📦</div>`}</td>
      <td><div style="font-weight:500;font-size:13px">${p.nome}</div>${p.aplicacao ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">📍 ${p.aplicacao}</div>` : ''}</td>
      <td class="mono" style="font-size:12px">${p.referencia||'—'}</td>
      <td style="font-size:12px;color:var(--text-secondary)">${p.grupo||'—'}</td>
      <td class="right mono" style="font-weight:600">R$ ${(p.preco_base||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
      <td style="font-size:12px;color:var(--text-muted)">${p.estoque_total != null ? `${p.estoque_total} un.` : '—'}</td>
      <td style="text-align:center">${p.peso_kg ? `<span title="Peso: ${p.peso_kg}kg · ${p.largura_cm||'?'}×${p.altura_cm||'?'}×${p.comprimento_cm||'?'}cm" style="font-size:16px;cursor:default">✅</span>` : `<span title="Medidas não cadastradas" style="font-size:16px;cursor:default;opacity:.35">⬜</span>`}</td>
      <td><span class="badge ${badgeMap[status]}">${labelMap[status]}</span></td>
      <td style="display:flex;gap:6px"><button class="btn btn-outline btn-sm" onclick="cfgEditarProduto(${p.id})">Editar</button><button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red)" onclick="cfgExcluirProduto(${p.id})}')" title="Excluir produto">✕</button></td>
    </tr>`;
  }).join('');
}

function cfgRenderCardsProduto(lista) {
  if (!lista.length) return `<div class="empty-state"><div class="empty-state-icon">🛍️</div><h3>Catálogo vazio</h3><p>Adicione produtos pelo SKU do ERP.</p></div>`;
  return lista.map(p => {
    const foto = p.fotos?.[0] || null;
    const status = !p.ativo ? 'inativo' : p.esgotado ? 'esgotado' : 'disponivel';
    const badgeMap = { inativo:'badge-cancelado', esgotado:'badge-esgotado', disponivel:'badge-disponivel' };
    const labelMap = { inativo:'Inativo', esgotado:'Esgotado', disponivel:'Disponível' };
    return `<div class="cfg-card-row" style="display:flex;gap:12px;align-items:flex-start">
      ${foto ? `<img src="${foto}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--border);flex-shrink:0">` : `<div style="width:56px;height:56px;background:var(--surface2);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:22px;border:1px solid var(--border);flex-shrink:0">📦</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px;margin-bottom:2px">${p.nome}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Ref: ${p.referencia||'—'} · ${p.grupo||'—'}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="mono" style="font-weight:700;color:var(--blue-dark);font-size:13px">R$ ${(p.preco_base||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
          <span class="badge ${badgeMap[status]}">${labelMap[status]}</span>
          ${p.estoque_total != null ? `<span style="font-size:11px;color:var(--text-muted)">${p.estoque_total} un.</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0"><button class="btn btn-outline btn-sm" onclick="cfgEditarProduto(${p.id})">Editar</button><button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red)" onclick="cfgExcluirProduto(${p.id})}')" title="Excluir">✕</button></div>
    </div>`;
  }).join('');
}

window.cfgExcluirProduto = async function(id) {
  const p = (window._cfgProdutos || []).find(x => x.id === id);
  const nome = p?.nome || 'este produto';
  if (!confirm(`Excluir "${nome}" do catálogo?\n\nEsta ação não pode ser desfeita.`)) return;
  await fetch(`${SUPA_URL}/rest/v1/ped_catalogo_produtos?id=eq.${id}`, {
    method: 'DELETE', headers: HEADERS
  });
  fecharDrawer();
  cfgAba('catalogo', null);
};


window.cfgFiltrarCatalogo = function() {
  const busca  = document.getElementById('cat-busca').value.toLowerCase();
  const filtro = document.getElementById('cat-filtro-status').value;
  let lista = window._cfgProdutos || [];
  if (busca)  lista = lista.filter(p => p.nome?.toLowerCase().includes(busca) || p.referencia?.toLowerCase().includes(busca) || p.aplicacao?.toLowerCase().includes(busca));
  if (filtro === 'ativo')    lista = lista.filter(p => p.ativo && !p.esgotado);
  if (filtro === 'esgotado') lista = lista.filter(p => p.esgotado);
  if (filtro === 'inativo')  lista = lista.filter(p => !p.ativo);
  const tbody = document.getElementById('cat-tbody');
  const cards = document.getElementById('cat-cards');
  if (tbody) tbody.innerHTML = cfgRenderLinhasProduto(lista);
  if (cards) cards.innerHTML = cfgRenderCardsProduto(lista);
};


window.cfgSincronizarTodos = async function() {
  const produtos = window._cfgProdutos || [];
  const comSyncFotos = produtos.filter(p => p.sync_fotos !== false && p.ativo);
  if (!comSyncFotos.length) { alert('Nenhum produto ativo com sincronização de fotos habilitada.'); return; }
  if (!confirm(`Sincronizar fotos de ${comSyncFotos.length} produto(s) com o Bling?\n\nIsso pode levar alguns minutos.`)) return;

  const btn = document.getElementById('btn-sync-todos');
  const prog = document.getElementById('sync-todos-progress');
  btn.disabled = true;
  prog.style.display = 'block';

  let ok = 0, erro = 0;
  for (let i = 0; i < comSyncFotos.length; i++) {
    const p = comSyncFotos[i];
    prog.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:13px;font-weight:600">🔄 Sincronizando fotos...</span>
        <span style="font-size:12px;color:var(--text-muted)">${i+1} / ${comSyncFotos.length}</span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:6px;overflow:hidden">
        <div style="background:var(--blue-mid);height:100%;width:${Math.round((i/comSyncFotos.length)*100)}%;transition:width .3s"></div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Produto: ${p.nome} (${p.referencia})</div>
      <div style="font-size:11px;margin-top:2px">✅ ${ok} ok &nbsp; ❌ ${erro} erro(s)</div>
    </div>`;
    try {
      const skuLimpo = String(parseInt(p.referencia));
      const r = await fetch(`${BLING_PROXY}?acao=fotos-cache&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({}));
      const patch = {};
      if ((r?.fotos||[]).length > 0) patch.fotos = r.fotos;
      if (r?.foto_miniatura) patch.foto_miniatura = r.foto_miniatura;
      if (Object.keys(patch).length > 0) await supaPatch('ped_catalogo_produtos', `id=eq.${p.id}`, patch);
      ok++;
    } catch(_) { erro++; }
    // Pequena pausa para não sobrecarregar a edge function
    await new Promise(r => setTimeout(r, 300));
  }

  prog.innerHTML = `<div style="background:var(--green-bg);border:1px solid var(--green);border-radius:var(--radius-sm);padding:12px 16px;font-size:13px">
    ✅ Sincronização concluída — ${ok} produto(s) atualizados${erro ? ` · ${erro} com erro` : ''}.
    <button class="btn btn-outline btn-sm" style="margin-left:12px" onclick="cfgAba('catalogo',null)">Recarregar</button>
  </div>`;
  btn.disabled = false;
};

window.cfgAdicionarProduto = function() {
  abrirDrawer('Adicionar Produto ao Catálogo', 'Digite o SKU do ERP para buscar os dados', `
    <div class="alert alert-info"><span class="alert-icon">ℹ️</span>Digite o código do produto no ERP. Os dados e preço (preco_aux2 Bononi SC) virão automaticamente. As fotos do Bling serão buscadas após salvar.</div>
    <div style="display:flex;gap:10px;align-items:flex-end;margin-bottom:20px">
      <div class="form-field" style="flex:1;margin:0"><label>SKU / Código ERP</label><input type="text" id="np-sku" class="cfg-input" placeholder="Ex: 18744" onkeydown="if(event.key==='Enter') cfgBuscarERP()"></div>
      <button class="btn btn-primary" onclick="cfgBuscarERP()" style="flex-shrink:0">🔍 Buscar</button>
    </div>
    <div id="np-erp-resultado"></div>
    <div id="np-form-produto" style="display:none">
      <div class="cfg-grid-2">
        <div class="form-field"><label>Nome do produto</label><input type="text" id="np-nome" class="cfg-input"></div>
        <div class="form-field"><label>Referência (SKU)</label><input type="text" id="np-ref" class="cfg-input"></div>
      </div>
      <div class="form-field"><label>Aplicação (veículos/modelos)</label><input type="text" id="np-aplicacao" class="cfg-input" placeholder="Ex: Scania R440, Volvo FH 2020"></div>
      <div class="cfg-grid-2">
        <div class="form-field"><label>Grupo</label><input type="text" id="np-grupo" class="cfg-input" readonly style="opacity:.7"></div>
        <div class="form-field"><label>Subgrupo</label><input type="text" id="np-subgrupo" class="cfg-input" readonly style="opacity:.7"></div>
      </div>
      <div class="cfg-grid-2">
        <div class="form-field"><label>Preço base — preco_aux2 (R$)</label><input type="number" id="np-preco" class="cfg-input" min="0" step="0.01"></div>
        <div class="form-field"><label>Estoque Bononi SC</label><input type="text" id="np-estoque" class="cfg-input" readonly style="opacity:.7"></div>
      </div>
      <div class="form-field"><label>Descrição</label><textarea id="np-desc" class="cfg-input" rows="2"></textarea></div>
      <input type="hidden" id="np-id-grupo"><input type="hidden" id="np-id-subgrupo">
      <div style="margin-top:12px">
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px">Tags</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px" id="np-tags-wrap">
          ${(window._cfgTags||[]).map(t=>`<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:4px 10px"><input type="checkbox" class="np-tag-check" value="${t.nome}" style="accent-color:#1A3A8F"> ${t.nome}</label>`).join('') || '<span style="font-size:12px;color:var(--text-muted)">Crie tags em 🏷️ Tags</span>'}
        </div>
      </div>
      <div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap">
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
  // Tenta empresa 8 (Bononi SC) primeiro, fallback para qualquer empresa do grupo
  let rows = await supa('vw_fb_produtos_compras', `id_produto=eq.${parseInt(sku)}&id_empresa=eq.8&select=id_produto,referencia,nome,complemento,id_grupo,grupo,id_subgrupo,subgrupo,preco_aux2,estoque_fisico`);
  if (!rows?.length) {
    rows = await supa('vw_fb_produtos_compras', `id_produto=eq.${parseInt(sku)}&select=id_produto,referencia,nome,complemento,id_grupo,grupo,id_subgrupo,subgrupo,preco_aux2,estoque_fisico&limit=1`);
  }
  const p = rows?.[0];
  if (!p) {
    res.innerHTML = `<div class="alert alert-warning"><span class="alert-icon">⚠️</span>Produto <strong>${sku}</strong> não encontrado no ERP. Pode ser um produto novo — verifique se a integração com o Firebird já sincronizou. Preencha manualmente enquanto isso.</div>`;
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
  res.innerHTML = `<div class="alert alert-success"><span class="alert-icon">✅</span><div><strong>${p.nome?.trim()}</strong><br><span style="font-size:12px">Preço: <strong>R$ ${Number(p.preco_aux2||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong> · Estoque SC: <strong>${p.estoque_fisico??0} un.</strong></span></div></div>`;
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
  const npTags = [...document.querySelectorAll('.np-tag-check:checked')].map(el=>el.value);
  const body = { id_produto_erp: parseInt(sku), referencia, nome, descricao: document.getElementById('np-desc').value.trim(), aplicacao: document.getElementById('np-aplicacao').value.trim(), id_grupo: parseInt(document.getElementById('np-id-grupo').value) || null, grupo: document.getElementById('np-grupo').value.trim(), id_subgrupo: parseInt(document.getElementById('np-id-subgrupo').value) || null, subgrupo: document.getElementById('np-subgrupo').value.trim(), preco_base: parseFloat(document.getElementById('np-preco').value) || 0, ativo: document.getElementById('np-ativo').checked, esgotado: document.getElementById('np-esgotado').checked, fotos: [], especificacoes: {}, tags: npTags };
  const inserted = await supaInsert('ped_catalogo_produtos', body);
  const idNovo = inserted?.[0]?.id;
  btn.textContent = 'Sincronizando com Bling...';
  try {
    const skuLimpo = String(parseInt(referencia));
    const [rFotos, rDim] = await Promise.all([
      fetch(`${BLING_PROXY}?acao=fotos-cache&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({})),
      fetch(`${BLING_PROXY}?acao=dimensoes&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({}))
    ]);
    const patch = {};
    if ((rFotos?.fotos||[]).length > 0) patch.fotos = rFotos.fotos;
    if (rFotos?.foto_miniatura) patch.foto_miniatura = rFotos.foto_miniatura;
    if (rDim?.peso_kg)        patch.peso_kg        = rDim.peso_kg;
    if (rDim?.altura_cm)      patch.altura_cm      = rDim.altura_cm;
    if (rDim?.largura_cm)     patch.largura_cm     = rDim.largura_cm;
    if (rDim?.comprimento_cm) patch.comprimento_cm = rDim.comprimento_cm;
    if (Object.keys(patch).length > 0 && idNovo) {
      await supaPatch('ped_catalogo_produtos', `id=eq.${idNovo}`, patch);
      if (rDim?.peso_kg) {
        await fetch(`${SUPA_URL}/rest/v1/frt_produtos_dimensoes`, { method: 'POST', headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ id_produto: parseInt(sku), descricao: nome, referencia, peso_kg: rDim.peso_kg, altura_cm: rDim.altura_cm, largura_cm: rDim.largura_cm, comprimento_cm: rDim.comprimento_cm, ativo: true }) }).catch(()=>{});
      }
    }
  } catch(e) { console.warn('Bling sync:', e); }
  fecharDrawer(); cfgAba('catalogo', null);
};


window.cfgDefinirCapa = async function(id, indice) {
  if (indice === 0) return; // já é capa
  const res = await supa('ped_catalogo_produtos', `id=eq.${id}&select=fotos`);
  const fotos = res?.[0]?.fotos || [];
  if (!fotos[indice]) return;
  // Move foto escolhida para o índice 0
  const novas = [fotos[indice], ...fotos.filter((_,i) => i !== indice)];
  await supaPatch('ped_catalogo_produtos', `id=eq.${id}`, { fotos: novas });
  // Recarrega o drawer
  cfgEditarProduto(id);
};

window.cfgEditarProduto = async function(id) {
  const res = await supa('ped_catalogo_produtos', `id=eq.${id}`);
  const p = res?.[0]; if (!p) return;
  const fotos = p.fotos || [];
  abrirDrawer('Editar Produto', p.nome, `
    <div style="margin-bottom:4px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px">
        Fotos ${fotos.length > 1 ? '· <span style=\"font-weight:400;color:var(--blue-mid)\">clique para definir capa</span>' : ''}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${fotos.length ? fotos.slice(0,6).map((f,fi) => `
          <div onclick="cfgDefinirCapa(${id},${fi})" title="${fi===0?'✅ Capa atual':'Clique para definir como capa'}"
            style="position:relative;cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid ${fi===0?'#1A3A8F':'var(--border)'};transition:border .15s">
            <img src="${f}" style="width:72px;height:72px;object-fit:contain;background:#f5f6fa;display:block">
            ${fi===0 ? '<div style=\"position:absolute;bottom:0;left:0;right:0;background:#1A3A8F;color:#fff;font-size:9px;font-weight:700;text-align:center;padding:2px\">CAPA</div>' : ''}
          </div>`).join('') : '<div style="font-size:12px;color:var(--text-muted)">Sem fotos — sincronize com o Bling</div>'}
      </div>
    </div>
    <button class="btn btn-outline btn-sm" onclick="cfgSincronizarBling(${id},'${p.referencia}')" style="margin-bottom:4px;width:100%">🔄 Sincronizar com Bling</button>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Atualiza fotos + peso + dimensões</div>
    <div style="display:flex;gap:16px;margin-bottom:12px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="ep-sync-fotos" ${p.sync_fotos!==false?'checked':''} style="accent-color:var(--blue-dark)"> Sincronizar fotos</label>
      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer"><input type="checkbox" id="ep-sync-medidas" ${p.sync_medidas!==false?'checked':''} style="accent-color:var(--blue-dark)"> Sincronizar medidas</label>
    </div>
    <div id="ep-reload-msg" style="font-size:12px;margin-bottom:12px"></div>
    <div class="cfg-grid-2">
      <div class="form-field"><label>Nome</label><input type="text" id="ep-nome" class="cfg-input" value="${p.nome||''}"></div>
      <div class="form-field"><label>Referência</label><input type="text" id="ep-ref" class="cfg-input" value="${p.referencia||''}"></div>
    </div>
    <div class="form-field"><label>Aplicação</label><input type="text" id="ep-aplicacao" class="cfg-input" value="${p.aplicacao||''}"></div>
    <div class="cfg-grid-2">
      <div class="form-field"><label>Grupo</label><input type="text" id="ep-grupo" class="cfg-input" value="${p.grupo||''}"></div>
      <div class="form-field"><label>Subgrupo</label><input type="text" id="ep-subgrupo" class="cfg-input" value="${p.subgrupo||''}"></div>
    </div>
    <div class="cfg-grid-2">
      <div class="form-field"><label>Preço base (R$)</label><input type="number" id="ep-preco" class="cfg-input" value="${p.preco_base||0}" step="0.01"></div>
      <div class="form-field"><label>IPI (%)</label><input type="number" id="ep-ipi" class="cfg-input" value="${p.ipi_perc||0}" step="0.01" min="0" max="100" placeholder="0"></div>
    </div>
    <div class="form-field"><label>Descrição</label><textarea id="ep-desc" class="cfg-input" rows="2">${p.descricao||''}</textarea></div>
    <div style="margin-top:4px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:.5px;margin-bottom:6px">Tags</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${(window._cfgTags||[]).map(t=>{const ok=(p.tags||[]).includes(t.nome);return `<label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;background:var(--surface2);border:1px solid ${ok?'#1A3A8F':'var(--border)'};border-radius:6px;padding:4px 10px"><input type="checkbox" class="ep-tag-check" value="${t.nome}" ${ok?'checked':''} style="accent-color:#1A3A8F"> ${t.nome}</label>`;}).join('') || '<span style="font-size:12px;color:var(--text-muted)">Crie tags em 🏷️ Tags</span>'}
      </div>
    </div>
    <div style="margin-top:14px;padding:12px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm)">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">📦 Dimensões para frete</div>
      <div class="cfg-grid-2">
        <div class="form-field" style="margin:0"><label>Peso (kg)</label><input type="number" id="ep-peso" class="cfg-input" value="${p.peso_kg||''}" step="0.001" placeholder="Ex: 19"></div>
        <div class="form-field" style="margin:0"><label>Altura (cm)</label><input type="number" id="ep-altura" class="cfg-input" value="${p.altura_cm||''}" step="0.1" placeholder="Ex: 55"></div>
        <div class="form-field" style="margin:0"><label>Largura (cm)</label><input type="number" id="ep-largura" class="cfg-input" value="${p.largura_cm||''}" step="0.1" placeholder="Ex: 34"></div>
        <div class="form-field" style="margin:0"><label>Comprimento (cm)</label><input type="number" id="ep-comprimento" class="cfg-input" value="${p.comprimento_cm||''}" step="0.1" placeholder="Ex: 53"></div>
      </div>
    </div>
    <div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" id="ep-ativo" ${p.ativo?'checked':''} style="accent-color:var(--blue-dark)"> Ativo</label>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
          <input type="checkbox" id="ep-esgotado-check" ${p.esgotado?'checked':''} style="accent-color:var(--red)"
            onchange="cfgToggleEsgotado(${p.id}, this.checked)"> Esgotado
        </label>
        <span style="font-size:11px;color:var(--text-muted)">(salva imediatamente)</span>
      </div>
    </div>
  `, `
    <button class="btn btn-sm" style="background:var(--red-bg);color:var(--red);border:1px solid var(--red);margin-right:auto" onclick="cfgExcluirProduto(${id})" >🗑️ Excluir</button>
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
      syncFotos   ? fetch(`${BLING_PROXY}?acao=fotos-cache&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({})) : Promise.resolve({}),
      syncMedidas ? fetch(`${BLING_PROXY}?acao=dimensoes&sku=${skuLimpo}`).then(r=>r.json()).catch(()=>({})) : Promise.resolve({})
    ]);
    const patch = {};
    const fotos = rFotos?.fotos || [];
    if (fotos.length > 0) patch.fotos = fotos;
    if (rFotos?.foto_miniatura) patch.foto_miniatura = rFotos.foto_miniatura;
    if (rDim?.peso_kg)        { patch.peso_kg = rDim.peso_kg; document.getElementById('ep-peso').value = rDim.peso_kg; }
    if (rDim?.altura_cm)      { patch.altura_cm = rDim.altura_cm; document.getElementById('ep-altura').value = rDim.altura_cm; }
    if (rDim?.largura_cm)     { patch.largura_cm = rDim.largura_cm; document.getElementById('ep-largura').value = rDim.largura_cm; }
    if (rDim?.comprimento_cm) { patch.comprimento_cm = rDim.comprimento_cm; document.getElementById('ep-comprimento').value = rDim.comprimento_cm; }
    if (Object.keys(patch).length > 0) await supaPatch('ped_catalogo_produtos', `id=eq.${id}`, patch);
    if (rDim?.peso_kg) {
      const prodRes = await supa('ped_catalogo_produtos', `id=eq.${id}&select=id_produto_erp,nome,referencia`);
      const prod = prodRes?.[0];
      if (prod) await fetch(`${SUPA_URL}/rest/v1/frt_produtos_dimensoes`, { method: 'POST', headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify({ id_produto: prod.id_produto_erp, descricao: prod.nome, referencia: prod.referencia, peso_kg: rDim.peso_kg, altura_cm: rDim.altura_cm, largura_cm: rDim.largura_cm, comprimento_cm: rDim.comprimento_cm, ativo: true }) }).catch(()=>{});
    }
    const msgs = [];
    if (fotos.length) msgs.push(`${fotos.length} foto(s)`);
    if (rDim?.peso_kg) msgs.push('dimensões');
    msg.textContent = msgs.length ? `✅ Sincronizado: ${msgs.join(' · ')}` : '⚠️ Sem dados no Bling para este produto.';
    msg.style.color = msgs.length ? 'var(--green)' : 'var(--orange)';
  } catch(e) { msg.textContent = '❌ Erro ao sincronizar.'; msg.style.color = 'var(--red)'; }
};


window.cfgToggleEsgotado = async function(id, esgotado) {
  await supaPatch('ped_catalogo_produtos', `id=eq.${id}`, { esgotado });
  // Atualiza o checkbox visualmente sem recarregar tudo
  const chk = document.getElementById('ep-esgotado-check');
  if (chk) chk.checked = esgotado;
  // Atualiza na lista em memória
  if (window._cfgProdutos) {
    const p = window._cfgProdutos.find(x => x.id === id);
    if (p) p.esgotado = esgotado;
  }
  // Recarrega a lista para refletir o badge
  cfgAba('catalogo', null);
};

window.cfgAtualizarProduto = async function(id) {
  const patch = { sync_fotos: document.getElementById('ep-sync-fotos')?.checked !== false, sync_medidas: document.getElementById('ep-sync-medidas')?.checked !== false, nome: document.getElementById('ep-nome').value.trim(), referencia: document.getElementById('ep-ref').value.trim(), aplicacao: document.getElementById('ep-aplicacao').value.trim(), grupo: document.getElementById('ep-grupo').value.trim(), subgrupo: document.getElementById('ep-subgrupo').value.trim(), preco_base: parseFloat(document.getElementById('ep-preco').value) || 0, ipi_perc: parseFloat(document.getElementById('ep-ipi')?.value) || 0, descricao: document.getElementById('ep-desc').value.trim(), ativo: document.getElementById('ep-ativo').checked, esgotado: document.getElementById('ep-esgotado-check')?.checked || document.getElementById('ep-esgotado')?.checked || false, atualizado_em: new Date().toISOString() };
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
      <div class="table-card hide-mobile">
        <table class="data-table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Aprovar</th><th>Reprovar</th><th>Faturar</th><th>Catálogo</th><th>Config</th><th>Status</th><th></th></tr></thead>
          <tbody>${!(gestores||[]).length ? `<tr><td colspan="10"><div class="empty-state"><div class="empty-state-icon">🔐</div><h3>Nenhum gestor</h3></div></td></tr>` : cfgRenderLinhasGestor(gestores)}</tbody>
        </table>
      </div>
      <div class="show-mobile">
        ${!(gestores||[]).length ? `<div class="empty-state"><div class="empty-state-icon">🔐</div><h3>Nenhum gestor</h3></div>` :
          (gestores||[]).map(g => {
            const chk = v => v ? '✅' : '—';
            return `<div class="cfg-card-row">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <strong>${g.nome}</strong>
                <span class="badge ${g.ativo ? 'badge-aprovado' : 'badge-cancelado'}">${g.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">${g.email} · ${g.perfil?.toUpperCase()}</div>
              <div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">Aprovar ${chk(g.pode_aprovar)} · Reprovar ${chk(g.pode_reprovar)} · Faturar ${chk(g.pode_faturar)} · Catálogo ${chk(g.pode_catalogo)} · Config ${chk(g.pode_config)}</div>
              <button class="btn btn-outline btn-sm" onclick="cfgEditarGestor(${g.id})" style="width:100%">Editar</button>
            </div>`;
          }).join('')}
      </div>
    </div>

    <!-- REPRESENTANTES -->
    <div class="cfg-section" style="margin-top:28px">
      <div class="section-header" style="margin-bottom:14px">
        <span class="section-title">👥 Representantes (${(reps||[]).length})</span>
        <button class="btn btn-primary" onclick="cfgNovoRepresentante()">+ Novo representante</button>
      </div>
      <div class="table-card hide-mobile">
        <table class="data-table">
          <thead><tr><th>Nome</th><th>E-mail</th><th>Região</th><th>Tabela de preço</th><th>Comissão</th><th>Status</th><th></th></tr></thead>
          <tbody>${!(reps||[]).length ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">👥</div><h3>Nenhum representante</h3></div></td></tr>` : cfgRenderLinhasRep(reps, tabelas)}</tbody>
        </table>
      </div>
      <div class="show-mobile">
        ${!(reps||[]).length ? `<div class="empty-state"><div class="empty-state-icon">👥</div><h3>Nenhum representante</h3></div>` :
          (reps||[]).map(r => {
            const t = (tabelas||[]).find(t => t.id === r.id_tabela_preco);
            return `<div class="cfg-card-row">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                <strong>${r.nome||''}</strong>
                <span class="badge ${r.ativo ? 'badge-aprovado' : 'badge-cancelado'}">${r.ativo ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:2px">${r.email||'—'}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">${r.regiao||'—'} · ${t ? t.nome : 'Padrão'} · ${r.comissao_perc||0}% comissão</div>
              <button class="btn btn-outline btn-sm" onclick="cfgEditarRepresentante(${r.id})" style="width:100%">Editar</button>
            </div>`;
          }).join('')}
      </div>
    </div>
  `;
}

function cfgFormGestor(g) {
  g = g || {};
  var chk = function(val) { return val !== false ? 'checked' : ''; };
  var sel = function(val, match) { return val === match ? 'selected' : ''; };
  return '<div class="cfg-grid-2">' +
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
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-faturar" ' + chk(g.pode_faturar) + ' style="accent-color:var(--blue-dark)"> Faturar (NF/boleto)</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-catalogo" ' + chk(g.pode_catalogo) + ' style="accent-color:var(--blue-dark)"> Gerenciar catálogo</label>' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="gs-config" ' + (g.pode_config===true?'checked':'') + ' style="accent-color:var(--blue-dark)"> Acessar configurações</label>' +
    '</div></div>' +
    '<div class="form-field" style="margin-top:12px"><label>Status</label><select id="gs-ativo" class="cfg-input">' +
    '<option value="true" ' + (g.ativo!==false?'selected':'') + '>Ativo</option>' +
    '<option value="false" ' + (g.ativo===false?'selected':'') + '>Inativo</option>' +
    '</select></div>';
}

window.cfgNovoGestor = function() {
  abrirDrawer('Novo Gestor', 'Defina nome, e-mail e permissões', cfgFormGestor(), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgSalvarGestor()">Cadastrar</button>
  `);
};
// Cria ou atualiza usuário no Auth via edge function admin-users
async function adminCriarUsuario(email, nome, perfil) {
  // Pega o access token da sessão atual do usuário logado
  const sessionStr = Object.entries(localStorage)
    .find(([k]) => k.includes('supabase') && k.includes('auth'))?.[1];
  const session = sessionStr ? JSON.parse(sessionStr) : null;
  const accessToken = session?.access_token || SUPA_KEY;

  const res = await fetch(`${SUPA_URL}/functions/v1/admin-users`, {
    method: 'POST',
    headers: {
      'apikey': SUPA_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ acao: 'criar', email, nome, perfil })
  }).then(r=>r.json()).catch(e => ({ erro: e.message }));
  return res;
}

window.cfgSalvarGestor = async function() {
  const nome   = document.getElementById('gs-nome').value.trim();
  const email  = document.getElementById('gs-email').value.trim();
  const perfil = document.getElementById('gs-perfil').value;
  if (!nome || !email) { alert('Nome e e-mail obrigatórios'); return; }

  // Cria usuário no Auth via edge function (usa service role key no servidor)
  await adminCriarUsuario(email, nome, perfil);

  await supaInsert('ped_gestores', { nome, email, perfil, pode_aprovar: document.getElementById('gs-aprovar').checked, pode_reprovar: document.getElementById('gs-reprovar').checked, pode_faturar: document.getElementById('gs-faturar').checked, pode_catalogo: document.getElementById('gs-catalogo').checked, pode_config: document.getElementById('gs-config').checked, ativo: document.getElementById('gs-ativo').value === 'true' });
  alert(`Gestor cadastrado! Um e-mail de confirmação foi enviado para ${email}.`);
  fecharDrawer(); cfgAba('representantes', null);
};
window.cfgEditarGestor = async function(id) {
  const res = await supa('ped_gestores', 'id=eq.'+id);
  const g = res?.[0]; if (!g) return;
  abrirDrawer('Editar Gestor', g.nome, cfgFormGestor(g), `
    <button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-primary" onclick="cfgAtualizarGestor(${id})">Salvar</button>
  `);
};
window.cfgAtualizarGestor = async function(id) {
  const nome   = document.getElementById('gs-nome').value.trim();
  const email  = document.getElementById('gs-email').value.trim();
  const perfil = document.getElementById('gs-perfil').value;
  const ativo  = document.getElementById('gs-ativo').value === 'true';

  // Atualiza no banco
  await supaPatch('ped_gestores', 'id=eq.'+id, {
    nome, email, perfil,
    pode_aprovar:  document.getElementById('gs-aprovar').checked,
    pode_reprovar: document.getElementById('gs-reprovar').checked,
    pode_faturar:  document.getElementById('gs-faturar').checked,
    pode_catalogo: document.getElementById('gs-catalogo').checked,
    pode_config:   document.getElementById('gs-config').checked,
    ativo
  });

  // Sincroniza perfil no Auth — garante que não volta para representante
  if (email && ativo) await adminCriarUsuario(email, nome, perfil);

  fecharDrawer(); cfgAba('representantes', null);
};

function cfgFormRepresentante(r = {}) {
  const tabelas = window._cfgTabelas || [];
  return `
    <div class="cfg-grid-2">
      <div class="form-field"><label>Nome completo (o usuário receberá um e-mail de acesso)</label><input type="text" id="rp-nome" class="cfg-input" value="${r.nome||''}"></div>
      <div class="form-field"><label>E-mail</label><input type="email" id="rp-email" class="cfg-input" value="${r.email||''}"></div>
    </div>
    <div class="cfg-grid-2">
      <div class="form-field"><label>Região</label><input type="text" id="rp-regiao" class="cfg-input" value="${r.regiao||''}" placeholder="Ex: SP, SUL"></div>
      <div class="form-field"><label>Comissão (%)</label><input type="number" id="rp-comissao" class="cfg-input" value="${r.comissao_perc||0}" step="0.1"></div>
    </div>
    <div class="cfg-grid-2">
      <div class="form-field">
        <label>Tabela de preço</label>
        <select id="rp-tabela" class="cfg-input">
          ${tabelas.map(t => { const markup = t.markup_global; const tag = markup!=null&&markup!==0 ? ` (${markup>0?'+':''}${markup}%)` : ' (base)'; return `<option value="${t.id}" ${r.id_tabela_preco===t.id?'selected':''}>${t.nome}${tag}</option>`; }).join('')}
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
  const nome  = document.getElementById('rp-nome').value.trim();
  const email = document.getElementById('rp-email').value.trim();
  if (!nome) { alert('Nome obrigatório'); return; }

  // Cria usuário no Auth via edge function
  if (email) await adminCriarUsuario(email, nome, 'representante');

  await supaInsert('ped_representantes', { nome, email, regiao: document.getElementById('rp-regiao').value.trim(), comissao_perc: parseFloat(document.getElementById('rp-comissao').value)||0, id_tabela_preco: parseInt(document.getElementById('rp-tabela').value)||1, id_vendedor_erp: parseInt(document.getElementById('rp-erp').value)||null, ativo: document.getElementById('rp-ativo').value==='true' });
  if (email) alert(`Representante cadastrado! Um e-mail de confirmação foi enviado para ${email}.`);
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
  await supaPatch('ped_representantes', `id=eq.${id}`, { nome: document.getElementById('rp-nome').value.trim(), email: document.getElementById('rp-email').value.trim(), regiao: document.getElementById('rp-regiao').value.trim(), comissao_perc: parseFloat(document.getElementById('rp-comissao').value)||0, id_tabela_preco: parseInt(document.getElementById('rp-tabela').value)||1, id_vendedor_erp: parseInt(document.getElementById('rp-erp').value)||null, ativo: document.getElementById('rp-ativo').value==='true' });
  fecharDrawer(); cfgAba('representantes', null);
};

function cfgRenderLinhasRep(reps, tabelas) {
  return (reps||[]).map(function(r) {
    const t = (tabelas||[]).find(function(t) { return t.id === r.id_tabela_preco; });
    const markup = t ? t.markup_global : null;
    const markupStr = (markup != null && markup !== 0) ? ' <span style="font-size:10px;color:' + (markup>0?'var(--orange)':'var(--blue-mid)') + '">(' + (markup>0?'+':'') + markup + '%)</span>' : '';
    return '<tr>' +
      '<td><strong>' + (r.nome||'') + '</strong></td>' +
      '<td style="font-size:12px;color:var(--text-secondary)">' + (r.email||'—') + '</td>' +
      '<td style="font-size:12px">' + (r.regiao||'—') + '</td>' +
      '<td style="font-size:12px">' + (t ? t.nome : 'Padrão') + markupStr + '</td>' +
      '<td class="mono" style="font-size:12px">' + (r.comissao_perc||0) + '%</td>' +
      '<td><span class="badge ' + (r.ativo ? 'badge-aprovado' : 'badge-cancelado') + '">' + (r.ativo ? 'Ativo' : 'Inativo') + '</span></td>' +
      '<td><button class="btn btn-outline btn-sm" onclick="cfgEditarRepresentante(' + r.id + ')">Editar</button></td>' +
      '</tr>';
  }).join('');
}

function cfgRenderLinhasGestor(gestores) {
  return (gestores||[]).map(function(g) {
    var perfBadge = g.perfil === 'admin' ? 'badge-faturado' : 'badge-aprovado';
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
      '<td><span class="badge ' + (g.ativo ? 'badge-aprovado' : 'badge-cancelado') + '">' + (g.ativo ? 'Ativo' : 'Inativo') + '</span></td>' +
      '<td><button class="btn btn-outline btn-sm" onclick="cfgEditarGestor(' + g.id + ')">Editar</button></td>' +
      '</tr>';
  }).join('');
}

// ============================================================
//  CSS DO MÓDULO — com mobile responsivo completo
// ============================================================
(function injetarCssConfiguracoes() {
  if (document.getElementById('css-configuracoes')) return;
  const style = document.createElement('style');
  style.id = 'css-configuracoes';
  style.textContent = `
    /* ── WRAPPER ── */
    .cfg-wrap { max-width: 1100px; }

    /* ── TABS — scrollável no mobile ── */
    .cfg-tabs-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 20px; padding-bottom: 2px; }
    .cfg-tabs { display: flex; gap: 4px; min-width: max-content; }
    .cfg-tab { padding: 8px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; white-space: nowrap; }
    .cfg-tab.active { background: var(--blue-dark); border-color: var(--blue-dark); color: #fff; }
    .cfg-tab:hover:not(.active) { background: var(--surface2); }

    /* ── INPUTS ── */
    .cfg-input { width: 100%; height: 38px; padding: 0 12px; border: 1.5px solid var(--border); border-radius: var(--radius-sm); font-family: 'DM Sans', sans-serif; font-size: 13px; color: var(--text-primary); background: var(--surface2); outline: none; transition: border-color 0.15s; }
    .cfg-input:focus { border-color: var(--blue-mid); background: #fff; }
    textarea.cfg-input { height: auto; padding: 10px 12px; resize: vertical; }

    /* ── GRIDS ── */
    .cfg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .cfg-section { margin-bottom: 24px; }

    /* ── TABELAS DE PREÇO ── */
    .precos-layout { display: grid; grid-template-columns: 200px 1fr; gap: 16px; align-items: start; }
    .preco-tab-item { padding: 10px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); cursor: pointer; margin-bottom: 6px; transition: all 0.15s; }
    .preco-tab-item:hover { border-color: var(--blue-mid); }
    .preco-tab-item.active { border-color: var(--blue-dark); background: var(--blue-pale); }

    /* ── CARDS MOBILE ── */
    .cfg-card-row { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px; margin-bottom: 10px; }
    .cfg-card-item { padding: 12px 0; border-bottom: 1px solid var(--border); }
    .cfg-card-item:last-child { border-bottom: none; }
    .cfg-card-label { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 6px; letter-spacing: 0.3px; }
    .cfg-cards-geral { padding: 4px 0; }

    /* ── SHOW/HIDE ── */
    .hide-mobile { display: table; }
    .show-mobile { display: none; }

    /* ── MOBILE BREAKPOINT ── */
    @media (max-width: 680px) {
      .hide-mobile { display: none !important; }
      .show-mobile { display: block !important; }
      .cfg-grid-2 { grid-template-columns: 1fr; }
      .precos-layout { grid-template-columns: 1fr; }
      .precos-sidebar { display: flex; gap: 8px; flex-wrap: wrap; overflow-x: auto; padding-bottom: 4px; }
      .precos-sidebar .preco-tab-item { flex: 0 0 auto; min-width: 120px; margin-bottom: 0; }
      .section-header { flex-wrap: wrap; gap: 8px; }
      .section-header .btn { flex: 1; min-width: 120px; justify-content: center; }
    }
  `;
  document.head.appendChild(style);
})();

// ============================================================
//  ABA STATUS DE PEDIDOS
// ============================================================
async function cfgCarregarStatus(el) {
  const lista = await supa('ped_status', 'order=ordem&select=*') || [];

  const cores = { 'ENVIADO':'#f59e0b','APROVADO':'#22c55e','FATURADO':'#3b82f6','REPROVADO':'#ef4444','CANCELADO':'#6b7280' };

  el.innerHTML = `
    <div class="section-header" style="margin-bottom:16px">
      <h2 style="font-size:16px;font-weight:700">Status dos Pedidos</h2>
      <button class="btn btn-primary" onclick="cfgNovoStatus()">+ Novo status</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:8px;max-width:600px">
      ${lista.map(s => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:8px">
          <div style="width:12px;height:12px;border-radius:50%;background:${s.cor||'#888'};flex-shrink:0"></div>
          <span style="flex:1;font-size:13px;font-weight:600">${s.nome}</span>
          <span style="font-size:11px;color:var(--text-muted)">Ordem: ${s.ordem}</span>
          ${s.final ? '<span class="badge badge-cancelado" style="font-size:10px">Final</span>' : ''}
          <span class="badge ${s.ativo ? 'badge-aprovado' : 'badge-cancelado'}" style="font-size:10px">${s.ativo?'Ativo':'Inativo'}</span>
          <button class="btn btn-outline btn-sm" onclick="cfgEditarStatus(${s.id})">Editar</button>
        </div>`).join('')}
    </div>`;
}

window.cfgNovoStatus = function() {
  abrirDrawer('Novo Status', 'Crie um novo status para os pedidos', `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-field"><label>Nome do status</label><input type="text" id="st-nome" class="cfg-input" placeholder="Ex: EM SEPARAÇÃO"></div>
      <div class="form-field"><label>Cor</label><input type="color" id="st-cor" class="cfg-input" value="#1A3A8F" style="height:38px;padding:2px 6px"></div>
      <div class="form-field"><label>Ordem (posição no filtro)</label><input type="number" id="st-ordem" class="cfg-input" value="10" min="0"></div>
      <div class="form-field"><label>Status final? (pedido encerrado)</label>
        <select id="st-final" class="cfg-input"><option value="false">Não</option><option value="true">Sim</option></select>
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
     <button class="btn btn-primary" onclick="cfgSalvarStatus()">Salvar</button>`
  );
};

window.cfgSalvarStatus = async function() {
  const nome = document.getElementById('st-nome')?.value.trim().toUpperCase();
  if (!nome) { alert('Nome obrigatório'); return; }
  await supaInsert('ped_status', {
    nome,
    cor:   document.getElementById('st-cor')?.value || '#1A3A8F',
    ordem: parseInt(document.getElementById('st-ordem')?.value)||10,
    final: document.getElementById('st-final')?.value === 'true',
    ativo: true
  });
  window._pedidoStatus = null; // limpa cache
  fecharDrawer();
  cfgAba('status', null);
};

window.cfgEditarStatus = async function(id) {
  const res = await supa('ped_status', `id=eq.${id}&select=*`);
  const s = res?.[0]; if (!s) return;
  abrirDrawer('Editar Status', s.nome, `
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-field"><label>Nome</label><input type="text" id="st-edit-nome" class="cfg-input" value="${s.nome}"></div>
      <div class="form-field"><label>Cor</label><input type="color" id="st-edit-cor" class="cfg-input" value="${s.cor||'#1A3A8F'}" style="height:38px;padding:2px 6px"></div>
      <div class="form-field"><label>Ordem</label><input type="number" id="st-edit-ordem" class="cfg-input" value="${s.ordem||0}" min="0"></div>
      <div class="form-field"><label>Status final?</label>
        <select id="st-edit-final" class="cfg-input">
          <option value="false" ${!s.final?'selected':''}>Não</option>
          <option value="true"  ${s.final?'selected':''}>Sim</option>
        </select>
      </div>
      <div class="form-field"><label>Ativo?</label>
        <select id="st-edit-ativo" class="cfg-input">
          <option value="true"  ${s.ativo?'selected':''}>Sim</option>
          <option value="false" ${!s.ativo?'selected':''}>Não</option>
        </select>
      </div>
    </div>`,
    `<button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
     <button class="btn btn-primary" onclick="cfgAtualizarStatus(${id})">Salvar</button>`
  );
};

window.cfgAtualizarStatus = async function(id) {
  await supaPatch('ped_status', `id=eq.${id}`, {
    nome:  document.getElementById('st-edit-nome')?.value.trim().toUpperCase(),
    cor:   document.getElementById('st-edit-cor')?.value,
    ordem: parseInt(document.getElementById('st-edit-ordem')?.value)||0,
    final: document.getElementById('st-edit-final')?.value === 'true',
    ativo: document.getElementById('st-edit-ativo')?.value === 'true'
  });
  window._pedidoStatus = null;
  fecharDrawer();
  cfgAba('status', null);
};

