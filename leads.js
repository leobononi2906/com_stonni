// ============================================================
//  MÓDULO: LEADS DO SITE (site_leads)
//  Fonte: tabela public.site_leads, gravada pela Edge Function do site
//  oficial (stonni.com.br). RLS: SELECT/UPDATE só para quem tem
//  modulos 'comercial'/'atacado' ou admin (mesma regra de podeVerLeads()
//  em index.html) — aqui é só a tela; a trava real é a RLS.
//  Área ISOLADA (Padrão Bononi 5.0): um erro aqui não derruba o resto do app.
// ============================================================
(function () {
  'use strict';

  const COLS = 'id,criado_em,tipo,nome,email,telefone,empresa,cidade,uf,interesse,mensagem,origem_url,status,atendido_por,atendido_em,observacao';

  // USUARIO é um `let` global do script inline do index.html (compartilhado
  // entre <script>), NÃO existe como window.USUARIO — mesma observação do
  // crm.js. Referência direta com guarda de TDZ.
  function usuarioAtual() { return (typeof USUARIO !== 'undefined') ? USUARIO : null; }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  function fmtDataHora(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // wa.me pede só dígitos, com DDI na frente. O formulário do site não
  // garante DDI — se vier só DDD+número (≤11 dígitos), completa com 55.
  function whatsappLink(tel) {
    const digitos = String(tel || '').replace(/\D/g, '');
    if (!digitos) return null;
    const comDDI = digitos.length > 11 ? digitos : ('55' + digitos);
    return `https://wa.me/${comDDI}`;
  }

  // Paginação por header Range — nunca .range=N,M na query string (corta em
  // 200 linhas em silêncio; ver memória "range alto não é paginação").
  async function buscarTodosLeads() {
    const url = `${SUPA_URL}/rest/v1/site_leads?select=${COLS}&order=criado_em.desc`;
    const PAGE = 500;
    let offset = 0, total = null, todos = [];
    while (true) {
      const range = `${offset}-${offset + PAGE - 1}`;
      let res = await fetch(url, { headers: { ...HEADERS, 'Range-Unit': 'items', 'Range': range } });
      if (res.status === 401 && await renovarToken()) {
        res = await fetch(url, { headers: { ...HEADERS, 'Range-Unit': 'items', 'Range': range } });
      }
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      const linhas = await res.json().catch(() => []);
      const pagina = Array.isArray(linhas) ? linhas : [];
      todos = todos.concat(pagina);
      const cr = res.headers.get('content-range'); // "0-499/1234" ou "0-13/*"
      const m = cr && /\/(\d+|\*)$/.exec(cr);
      if (m && m[1] !== '*') total = parseInt(m[1], 10);
      if (!pagina.length || pagina.length < PAGE || (total != null && todos.length >= total)) break;
      offset += PAGE;
    }
    return todos;
  }

  window._leadsCache = null;
  window._leadsFiltro = 'novos'; // 'novos' | 'atendidos' | 'todos'

  async function renderLeads(el, params) {
    if (!el) el = document.getElementById('page-content');
    el.style.padding = '';
    el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      window._leadsCache = await buscarTodosLeads();
      _leadsRenderTela(el);
    } catch (err) {
      if (window.appLog) window.appLog('ERRO', 'LOAD_LEADS', { categoria: 'leads', detalhe: { erro: err && err.message } });
      el.innerHTML =
        '<div class="alert alert-danger">' +
        '<span class="alert-icon"><i class="ic ic-sm" data-ic="alert-triangle"></i></span>' +
        '<div>Não foi possível carregar os leads do site.' +
        (err && err.message ? '<br><small>' + esc(err.message) + '</small>' : '') +
        '</div></div>';
    }
  }
  window.renderLeads = renderLeads;

  function listaFiltrada() {
    let lista = window._leadsCache || [];
    if (window._leadsFiltro === 'novos') lista = lista.filter(l => l.status === 'novo');
    else if (window._leadsFiltro === 'atendidos') lista = lista.filter(l => l.status !== 'novo');
    // 'todos': sem filtro — mas novo sempre primeiro, depois mais recente.
    return lista.slice().sort((a, b) => {
      const pa = a.status === 'novo' ? 0 : 1, pb = b.status === 'novo' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return new Date(b.criado_em) - new Date(a.criado_em);
    });
  }

  function linhaLead(l) {
    const wa = whatsappLink(l.telefone);
    const contato = [
      l.email ? `<div><a href="mailto:${esc(l.email)}"><i class="ic ic-sm" data-ic="mail"></i> ${esc(l.email)}</a></div>` : '',
      wa ? `<div><a href="${wa}" target="_blank" rel="noopener"><i class="ic ic-sm" data-ic="phone"></i> ${esc(l.telefone)}</a></div>`
         : (l.telefone ? `<div>${esc(l.telefone)}</div>` : ''),
    ].filter(Boolean).join('') || '—';

    const origemInteresse = [esc(l.interesse || ''), esc(l.origem_url || '')].filter(Boolean).join(' · ') || '—';

    const isNovo = l.status === 'novo';
    // status aceitos pelo CHECK de site_leads: novo, em_contato, convertido, descartado
    const badgeClasse = isNovo ? 'badge-enviado' : (['em_contato', 'convertido'].includes(l.status) ? 'badge-aprovado' : 'badge-rascunho');
    const acao = isNovo
      ? `<button class="btn btn-success btn-sm" onclick="leadsAtender(${l.id})"><i class="ic ic-sm" data-ic="check-circle"></i> Entrei em contato</button>`
      : `<div style="font-size:var(--fs-090);color:var(--text-muted)">${esc(l.atendido_por || '—')}${l.atendido_em ? ' · ' + fmtDataHora(l.atendido_em) : ''}${l.observacao ? `<div style="margin-top:2px">${esc(l.observacao)}</div>` : ''}</div>`;

    return `
      <tr>
        <td style="font-size:var(--fs-100)">${fmtDataHora(l.criado_em)}</td>
        <td>
          <div style="font-weight:500;font-size:var(--fs-200)">${esc(l.nome || '—')}</div>
          <div style="font-size:var(--fs-090);color:var(--text-muted)">${esc(l.empresa || '')}${l.cidade ? ` · ${esc(l.cidade)}/${esc(l.uf || '')}` : ''}</div>
        </td>
        <td style="font-size:var(--fs-100)">${contato}</td>
        <td style="font-size:var(--fs-100)">${origemInteresse}${l.mensagem ? `<div style="color:var(--text-muted);margin-top:2px;max-width:260px">${esc(l.mensagem)}</div>` : ''}</td>
        <td><span class="badge ${badgeClasse}">${esc(ROTULO_STATUS[l.status] || l.status || '—')}</span></td>
        <td>${acao}</td>
      </tr>`;
  }

  const ROTULO_STATUS = { novo: 'Novo', em_contato: 'Em contato', convertido: 'Convertido', descartado: 'Descartado' };

  function leadsRenderLinhas() {
    const lista = listaFiltrada();
    const tbody = document.getElementById('leads-tbody');
    const count = document.getElementById('leads-count');
    if (!tbody) return;
    if (count) count.textContent = `${lista.length} lead(s)`;
    tbody.innerHTML = lista.length
      ? lista.map(linhaLead).join('')
      : `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon"><i class="ic ic-sm" data-ic="mail"></i></div><h3>Nenhum contato novo do site</h3><p>${window._leadsFiltro === 'novos' ? 'Nenhum contato novo do site.' : 'Nada encontrado para este filtro.'}</p></div></td></tr>`;
  }

  function _leadsRenderTela(el) {
    el.innerHTML = `
      <div class="section-header">
        <div class="section-title"><i class="ic ic-sm" data-ic="mail"></i> Leads do site</div>
        <div class="toggle-group" id="leads-filtros">
          <button type="button" class="toggle-btn ${window._leadsFiltro === 'novos' ? 'active' : ''}"     data-f="novos"     onclick="leadsSetFiltro('novos')">Novos</button>
          <button type="button" class="toggle-btn ${window._leadsFiltro === 'atendidos' ? 'active' : ''}" data-f="atendidos" onclick="leadsSetFiltro('atendidos')">Atendidos</button>
          <button type="button" class="toggle-btn ${window._leadsFiltro === 'todos' ? 'active' : ''}"      data-f="todos"     onclick="leadsSetFiltro('todos')">Todos</button>
        </div>
      </div>
      <div class="table-card">
        <div class="table-card-header">
          <div class="table-card-title">Contatos do site</div>
          <span id="leads-count" style="font-size:var(--fs-100);color:var(--text-muted)"></span>
        </div>
        <table class="data-table">
          <thead><tr>
            <th>Recebido em</th>
            <th>Nome / Empresa</th>
            <th>Contato</th>
            <th>Origem / Interesse</th>
            <th>Status</th>
            <th></th>
          </tr></thead>
          <tbody id="leads-tbody"></tbody>
        </table>
      </div>
    `;
    leadsRenderLinhas();
  }

  window.leadsSetFiltro = function (f) {
    window._leadsFiltro = f;
    document.querySelectorAll('#leads-filtros .toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.f === f));
    leadsRenderLinhas();
  };

  window.leadsAtender = async function (id) {
    const resp = prompt('Observação (opcional) — deixe em branco se não houver:');
    if (resp === null) return; // cancelou

    const u = usuarioAtual();
    // 'em_contato': o CHECK de site_leads só aceita novo/em_contato/convertido/descartado
    // ('atendido' era recusado com 400 — o lead nunca saía da fila).
    const status = await supaPatch('site_leads', `id=eq.${id}`, {
      status: 'em_contato',
      atendido_por: (u && (u.nome || u.email)) || null,
      atendido_em: new Date().toISOString(),
      observacao: resp.trim() || null,
    });
    // supaPatch já mostra o aviso na tela (erro HTTP, ou 200 com 0 linhas —
    // RLS barrando em silêncio); aqui só decide se atualiza a lista local.
    if (typeof status !== 'number' || status < 200 || status >= 300) return;

    const item = (window._leadsCache || []).find(l => l.id === id);
    if (item) {
      item.status = 'em_contato';
      item.atendido_por = (u && (u.nome || u.email)) || null;
      item.atendido_em = new Date().toISOString();
      item.observacao = resp.trim() || null;
    }
    leadsRenderLinhas();
    if (window.appLog) window.appLog('acao', `Lead #${id} marcado como em contato`, { categoria: 'leads' });
    if (window.GeralCentral && window.GeralCentral.recarregarPendencias) window.GeralCentral.recarregarPendencias();
    if (window.recalcularSelos) window.recalcularSelos();
  };
})();
