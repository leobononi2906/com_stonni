// ============================================================
//  MÓDULO: CATÁLOGO
//  Visão do representante — grid de produtos com busca e filtro
// ============================================================

async function renderCatalogo(el) {
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

  const [produtos, acoes, tags, cfgRows] = await Promise.all([
    supa('ped_catalogo_produtos', 'ativo=eq.true&order=subgrupo,nome&select=*'),
    supa('ped_acoes_comerciais',  `ativa=eq.true&select=*`),
    supa('ped_catalogo_tags',     'ativo=eq.true&order=nome&select=*'),
    supa('ped_configuracoes',     'chave=like.catalogo_*&select=chave,valor'),
    supa('ped_configuracoes',     'chave=like.catalogo_*&select=chave,valor')
  ]);

  // Tabela de preço do representante logado
  const idTabela = USUARIO.id_tabela_preco || 1;
  const tabelas  = await supa('ped_tabelas_preco', `id=eq.${idTabela}&select=id,nome,markup_global`);
  const tabela   = tabelas?.[0] || { markup_global: 0, nome: 'Padrão' };

  window._catProdutos = produtos || [];
  window._catAcoes    = acoes || [];
  window._catTabela   = tabela;
  window._catTags     = tags || [];
  window._catConfigs  = Object.fromEntries((cfgRows||[]).map(c=>[c.chave,c.valor]));

  // Grupos disponíveis
  const grupos = [...new Map((produtos||[]).filter(p=>p.grupo).map(p=>[p.id_grupo,{id:p.id_grupo,nome:p.grupo}])).values()];

  el.innerHTML = `
    <div class="cat-topbar">
      <div class="cat-filtros">
        <input type="text" id="cat-search" class="cat-search" placeholder="🔍  Buscar produto, referência ou aplicação..." oninput="catFiltrar()">
        <select id="cat-grupo" class="cat-select" onchange="catFiltrar()">
          <option value="">Todos os grupos</option>
          ${grupos.map(g=>`<option value="${g.id}">${g.nome}</option>`).join('')}
        </select>
        <select id="cat-tag" class="cat-select" onchange="catFiltrar()">
          <option value="">Todas as tags</option>
          ${(window._catTags||[]).map(t=>`<option value="${t.nome}">${t.nome}</option>`).join('')}
        </select>
        <select id="cat-disp" class="cat-select" onchange="catFiltrar()">
          <option value="">Disponíveis e esgotados</option>
          <option value="disp">Apenas disponíveis</option>
          <option value="esg">Apenas esgotados</option>
        </select>
      </div>
      <button class="btn btn-outline btn-sm" onclick="catAbrirGerador()" style="display:flex;align-items:center;gap:6px;white-space:nowrap;flex-shrink:0">
        📄 Gerar Catálogo
      </button>
      <div class="cat-info">
        <span id="cat-count" style="font-size:12px;color:var(--text-muted)"></span>
        <span class="badge badge-b" style="font-size:11px">${tabela.nome}${tabela.markup_global?` ${tabela.markup_global>0?'+':''}${tabela.markup_global}%`:''}</span>
      </div>
    </div>
    <div id="cat-grid" class="cat-grid"></div>
  `;

  catFiltrar();
}

// Calcula preço final do produto para o representante
function catPrecoFinal(produto) {
  const tabela = window._catTabela || { markup_global: 0 };
  const acoes  = window._catAcoes || [];
  const hoje   = new Date().toISOString().split('T')[0];

  let preco = produto.preco_base || 0;

  // 1. Aplica markup da tabela
  const markup = tabela.markup_global || 0;
  if (markup !== 0) preco = preco * (1 + markup / 100);

  // 2. Verifica ação comercial ativa (produto específico primeiro, depois grupo)
  const acaoAtiva = acoes.find(a => {
    if (!a.ativa) return false;
    if (a.data_inicio && a.data_inicio > hoje) return false;
    if (a.data_fim   && a.data_fim   < hoje)  return false;
    if (a.escopo === 'produto') return a.id_produto === produto.id_produto_erp;
    if (a.escopo === 'grupo') {
      if (a.id_grupo !== produto.id_grupo) return false;
      if (a.id_subgrupo && a.id_subgrupo !== produto.id_subgrupo) return false;
      return true;
    }
    return false;
  });

  let precoOriginal = null;
  if (acaoAtiva) {
    if (acaoAtiva.tipo === 'preco_fixo') {
      precoOriginal = preco;
      preco = acaoAtiva.valor;
    } else if (acaoAtiva.tipo === 'desconto') {
      precoOriginal = preco;
      preco = preco * (1 - acaoAtiva.valor / 100);
    }
  }

  return { preco, precoOriginal, acaoAtiva };
}

window.catFiltrar = function() {
  const busca  = document.getElementById('cat-search')?.value.toLowerCase() || '';
  const grupo  = document.getElementById('cat-grupo')?.value || '';
  const disp   = document.getElementById('cat-disp')?.value || '';
  let lista    = window._catProdutos || [];

  if (busca)  lista = lista.filter(p =>
    p.nome?.toLowerCase().includes(busca) ||
    p.referencia?.toLowerCase().includes(busca) ||
    p.aplicacao?.toLowerCase().includes(busca) ||
    p.grupo?.toLowerCase().includes(busca)
  );
  if (grupo)        lista = lista.filter(p => p.id_grupo == grupo);
  const tagFiltro = document.getElementById('cat-tag')?.value||'';
  if (tagFiltro) lista = lista.filter(p => Array.isArray(p.tags) && p.tags.includes(tagFiltro));
  if (disp==='disp') lista = lista.filter(p => !p.esgotado);
  if (disp==='esg')  lista = lista.filter(p => p.esgotado);

  const count = document.getElementById('cat-count');
  if (count) count.textContent = `${lista.length} produto(s)`;

  const grid = document.getElementById('cat-grid');
  if (!grid) return;

  if (!lista.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🔍</div><h3>Nenhum produto encontrado</h3><p>Tente outros termos de busca.</p></div>`;
    return;
  }

  grid.innerHTML = lista.map(p => {
    const foto = p.fotos?.[0] || null;
    const { preco, precoOriginal, acaoAtiva } = catPrecoFinal(p);

    return `
      <div class="cat-card ${p.esgotado ? 'cat-card-esgotado' : ''}" onclick="catAbrirProduto(${p.id})">
        <div class="cat-card-foto">
          ${foto
            ? `<img src="${foto}" alt="${p.nome}" loading="lazy">`
            : `<div class="cat-card-sem-foto">📦</div>`}
          ${p.esgotado ? `<div class="cat-card-badge-esg">ESGOTADO</div>` : ''}
          ${acaoAtiva ? `<div class="cat-card-badge-promo">🎯 OFERTA</div>` : ''}
        </div>
        <div class="cat-card-body">
          <div class="cat-card-grupo">${p.grupo || '—'}</div>
          <div class="cat-card-nome">${p.nome}</div>
          ${p.aplicacao ? `<div class="cat-card-aplicacao">📍 ${p.aplicacao}</div>` : ''}
          <div class="cat-card-ref">Ref: ${p.referencia || '—'}</div>
          <div class="cat-card-preco">
            ${precoOriginal ? `<span class="cat-preco-original">R$ ${precoOriginal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>` : ''}
            <span class="cat-preco-final ${acaoAtiva ? 'cat-preco-oferta' : ''}">
              R$ ${preco.toLocaleString('pt-BR',{minimumFractionDigits:2})}
            </span>
            ${acaoAtiva?.tipo==='desconto' ? `<span class="cat-desconto-badge">-${acaoAtiva.valor}%</span>` : ''}
          </div>
        </div>
        <div class="cat-card-footer">
          <button class="btn btn-primary btn-sm" style="width:100%" onclick="event.stopPropagation();catAdicionarAoPedido(${p.id})"
            ${p.esgotado ? 'disabled style="opacity:.5;cursor:not-allowed"' : ''}>
            ${p.esgotado ? 'Esgotado' : '+ Adicionar ao pedido'}
          </button>
        </div>
      </div>
    `;
  }).join('');
};

window.catAbrirProduto = function(id) {
  const p = (window._catProdutos||[]).find(p => p.id === id);
  if (!p) return;
  const { preco, precoOriginal, acaoAtiva } = catPrecoFinal(p);
  const fotos = p.fotos || [];

  const fotosHtml = fotos.length
    ? `<div class="cat-detalhe-fotos">
        <div class="cat-detalhe-foto-principal">
          <img id="cat-foto-principal" src="${fotos[0]}" alt="${p.nome}">
        </div>
        ${fotos.length > 1 ? `
          <div class="cat-detalhe-thumbs">
            ${fotos.slice(0,6).map((f,i) => `
              <img src="${f}" onclick="document.getElementById('cat-foto-principal').src='${f}'"
                   style="width:56px;height:56px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i===0?'var(--blue-mid)':'var(--border)'}">
            `).join('')}
          </div>` : ''}
      </div>`
    : `<div style="width:100%;height:200px;background:var(--surface2);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;font-size:48px;margin-bottom:16px">📦</div>`;

  const especHtml = p.especificacoes && Object.keys(p.especificacoes).length
    ? Object.entries(p.especificacoes).map(([k,v]) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;color:var(--text-muted);font-weight:600;text-transform:uppercase">${k}</span>
          <span style="font-size:13px">${v}</span>
        </div>`).join('')
    : '<div style="font-size:12px;color:var(--text-muted)">Sem especificações cadastradas</div>';

  abrirDrawer(p.nome, `Ref: ${p.referencia||'—'} · ${p.grupo||''}`, `
    ${fotosHtml}
    ${acaoAtiva ? `<div class="alert alert-success" style="margin-bottom:12px"><span class="alert-icon">🎯</span><strong>${acaoAtiva.nome}</strong> — ${acaoAtiva.tipo==='desconto'?`${acaoAtiva.valor}% de desconto`:`Preço especial`}</div>` : ''}
    <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px">
      ${precoOriginal ? `<span style="font-size:14px;color:var(--text-muted);text-decoration:line-through">R$ ${precoOriginal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>` : ''}
      <span style="font-size:28px;font-weight:700;font-family:'DM Mono',monospace;color:${acaoAtiva?'var(--green)':'var(--blue-dark)'}">R$ ${preco.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
    </div>
    ${p.aplicacao ? `<div style="margin-bottom:12px"><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted)">Aplicação</span><div style="font-size:13px;margin-top:4px">📍 ${p.aplicacao}</div></div>` : ''}
    ${p.descricao ? `<div style="margin-bottom:16px"><span style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted)">Descrição</span><div style="font-size:13px;color:var(--text-secondary);margin-top:4px;line-height:1.5">${p.descricao}</div></div>` : ''}
    <div style="margin-bottom:16px">
      <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted)">Especificações</span>
      <div style="margin-top:8px">${especHtml}</div>
    </div>
    ${p.esgotado ? `<div class="alert alert-danger"><span class="alert-icon">⚠️</span>Produto temporariamente esgotado.</div>` : ''}
  `, `
    <button class="btn btn-outline" onclick="fecharDrawer()">Fechar</button>
    ${!p.esgotado ? `<button class="btn btn-primary" onclick="fecharDrawer();catAdicionarAoPedido(${p.id})">+ Adicionar ao pedido</button>` : ''}
  `);
};

window.catAdicionarAoPedido = function(idProduto) {
  // Redireciona para Novo Pedido com produto pré-selecionado
  irPara('novo-pedido', { adicionarProduto: idProduto });
};

// CSS do módulo
(function() {
  if (document.getElementById('css-catalogo')) return;
  const s = document.createElement('style');
  s.id = 'css-catalogo';
  s.textContent = `
    .cat-topbar { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
    .cat-filtros { display:flex; gap:10px; flex:1; flex-wrap:wrap; }
    .cat-search { flex:1; min-width:240px; height:38px; padding:0 14px; border:1.5px solid var(--border); border-radius:var(--radius-sm); font-family:'DM Sans',sans-serif; font-size:13px; background:var(--surface); outline:none; transition:border-color .15s; }
    .cat-search:focus { border-color:var(--blue-mid); }
    .cat-select { height:38px; padding:0 10px; border:1.5px solid var(--border); border-radius:var(--radius-sm); font-family:'DM Sans',sans-serif; font-size:13px; background:var(--surface); color:var(--text-primary); outline:none; cursor:pointer; }
    .cat-info { display:flex; align-items:center; gap:10px; flex-shrink:0; }
    .cat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
    .cat-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); overflow:hidden; cursor:pointer; transition:all .2s; display:flex; flex-direction:column; }
    .cat-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); border-color:var(--blue-mid); }
    .cat-card-esgotado { opacity:.65; }
    .cat-card-foto { position:relative; width:100%; padding-top:75%; background:var(--surface2); overflow:hidden; }
    .cat-card-foto img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
    .cat-card-sem-foto { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:40px; color:var(--text-muted); }
    .cat-card-badge-esg { position:absolute; top:8px; left:8px; background:var(--red); color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; letter-spacing:.5px; }
    .cat-card-badge-promo { position:absolute; top:8px; right:8px; background:var(--green); color:#fff; font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; }
    .cat-card-body { padding:12px 14px; flex:1; display:flex; flex-direction:column; gap:4px; }
    .cat-card-grupo { font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-muted); letter-spacing:.5px; }
    .cat-card-nome { font-size:13px; font-weight:600; color:var(--text-primary); line-height:1.3; }
    .cat-card-aplicacao { font-size:11px; color:var(--text-muted); }
    .cat-card-ref { font-size:11px; color:var(--text-muted); font-family:'DM Mono',monospace; }
    .cat-card-preco { margin-top:auto; padding-top:8px; display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; }
    .cat-preco-original { font-size:12px; color:var(--text-muted); text-decoration:line-through; font-family:'DM Mono',monospace; }
    .cat-preco-final { font-size:16px; font-weight:700; font-family:'DM Mono',monospace; color:var(--text-primary); }
    .cat-preco-oferta { color:var(--green); }
    .cat-desconto-badge { font-size:10px; font-weight:700; background:var(--green-bg); color:var(--green); padding:2px 6px; border-radius:4px; }
    .cat-card-footer { padding:10px 14px; border-top:1px solid var(--border); background:var(--surface2); }
    .cat-detalhe-fotos { margin-bottom:16px; }
    .cat-detalhe-foto-principal { width:100%; border-radius:var(--radius); overflow:hidden; background:var(--surface2); margin-bottom:8px; }
    .cat-detalhe-foto-principal img { width:100%; max-height:280px; object-fit:contain; }
    .cat-detalhe-thumbs { display:flex; gap:8px; flex-wrap:wrap; }
    @media(max-width:768px) { .cat-grid { grid-template-columns:repeat(2,1fr); gap:10px; } .cat-topbar { flex-direction:column; align-items:stretch; } }
  `;
  document.head.appendChild(s);
})();

// ============================================================
//  GERADOR DE CATÁLOGO PDF
// ============================================================
window.catAbrirGerador = async function() {
  // Sempre busca tags frescas — garante que estão atualizadas
  const [tagRows, cfgRows] = await Promise.all([
    supa('ped_catalogo_tags', 'ativo=eq.true&order=nome&select=*'),
    supa('ped_configuracoes', 'chave=like.catalogo_*&select=chave,valor')
  ]);
  const tags = tagRows || [];
  window._catTags    = tags;
  window._catConfigs = Object.fromEntries((cfgRows||[]).map(c=>[c.chave,c.valor]));
  const produtos = window._catProdutosAll || window._catProdutos || [];
  const cfgs     = window._catConfigs || {};

  const subgrupos = [...new Map(
    produtos.filter(p=>p.subgrupo).map(p=>[p.id_subgrupo,{id:p.id_subgrupo,nome:p.subgrupo}])
  ).values()].sort((a,b)=>a.nome.localeCompare(b.nome));

  const bodyHtml = `
    <div style="display:flex;flex-direction:column;gap:20px;padding:4px 0">
      <div class="form-field">
        <label>Título do catálogo</label>
        <input type="text" id="gpdf-titulo" class="cfg-input"
          value="${cfgs.catalogo_titulo||'CATÁLOGO PRODUTOS 2026'}"
          placeholder="Ex: Catálogo Motor Home 2026">
      </div>

      <div class="form-field">
        <label>Filtrar por tag <span style="font-weight:400;color:var(--text-muted)">(desmarcado = todos)</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px" id="gpdf-tags">
          ${tags.length
            ? tags.map(t=>`<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 12px"><input type="checkbox" value="${t.nome}" style="accent-color:#1A3A8F"> ${t.nome}</label>`).join('')
            : '<span style="font-size:12px;color:var(--text-muted)">Nenhuma tag cadastrada</span>'}
        </div>
      </div>
      <div class="form-field">
        <label>Filtrar por subgrupo <span style="font-weight:400;color:var(--text-muted)">(desmarcado = todos)</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px" id="gpdf-subgrupos">
          ${subgrupos.map(s=>`<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:6px 12px"><input type="checkbox" value="${s.id}" style="accent-color:#1A3A8F"> ${s.nome}</label>`).join('')}
        </div>
      </div>
    </div>`;

  abrirDrawer(
    '📄 Gerar Catálogo PDF',
    'Escolha as opções e clique em Gerar',
    bodyHtml,
    `<button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
     <button class="btn btn-primary" onclick="catExecutarGerador()">🖨️ Gerar PDF</button>`
  );
};

window.catExecutarGerador = function() {
  const titulo      = document.getElementById('gpdf-titulo')?.value.trim()||'CATÁLOGO PRODUTOS 2026';
  const exibirPreco = document.getElementById('gpdf-preco')?.value !== 'nao';
  const cfgs        = window._catConfigs || {};
  const tagsFiltro      = [...document.querySelectorAll('#gpdf-tags input:checked')].map(el=>el.value);
  const subgruposFiltro = [...document.querySelectorAll('#gpdf-subgrupos input:checked')].map(el=>el.value);
  fecharDrawer();
  if (typeof window.catGerarPDF !== 'function') {
    alert('Erro: catalogo-pdf.js não carregado. Verifique o index.html.');
    return;
  }
  window.catGerarPDF({
    titulo,
    subtitulo:  cfgs.catalogo_subtitulo||'@STONNI.OFICIAL',
    exibirPreco,
    tagsFiltro,
    subgruposFiltro,
    capaUrl: cfgs.catalogo_capa_url||''
  });
};
