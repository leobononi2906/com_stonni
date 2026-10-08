// ============================================================
//  MÓDULO: REGRAS DE FATURAMENTO (ped_regras_faturamento)
//  Texto das etapas de faturamento que o admin escreve e o representante lê.
//  Cada publicação é uma linha NOVA (tabela só de insert): a vigente é a
//  mais recente, e o histórico de quem alterou é a própria tabela.
//  Fluxo do admin: Editar → Pré-visualizar → Publicar (nunca grava sem preview).
//  Trava real: RLS (insert só com user_metadata.admin = true).
//  Área ISOLADA (Padrão Bononi 5.0): um erro aqui não derruba o resto do app.
// ============================================================
(function () {
  'use strict';

  // Carregadas sob demanda (só esta tela usa) — versões fixas no cdnjs.
  const CDN_PURIFY = 'https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.1.6/purify.min.js';
  const CDN_QUILL_JS = 'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js';
  const CDN_QUILL_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css';

  function usuarioAtual() { return (typeof USUARIO !== 'undefined') ? USUARIO : null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function fmtDataHora(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  const _carregando = {};
  function carregarScript(src) {
    if (!_carregando[src]) {
      _carregando[src] = new Promise((ok, falha) => {
        const s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = () => falha(new Error('Falha ao carregar ' + src));
        document.head.appendChild(s);
      });
    }
    return _carregando[src];
  }
  function carregarCss(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    document.head.appendChild(l);
  }

  // Conteúdo exibido SEMPRE passa pelo DOMPurify (o HTML vem do banco).
  function limpar(html) {
    return window.DOMPurify
      ? DOMPurify.sanitize(html || '', { ADD_ATTR: ['target'] })
      : esc(html || '');
  }

  function injetarEstilo() {
    if (document.getElementById('rf-estilo')) return;
    const st = document.createElement('style');
    st.id = 'rf-estilo';
    st.textContent = `
      .rf-wrap{max-width:900px;margin:0 auto}
      .rf-topo{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;justify-content:space-between;margin-bottom:var(--space-4)}
      .rf-selo{display:inline-flex;align-items:center;gap:var(--space-2);font-size:var(--fs-200);color:var(--text-muted);background:var(--surface-subtle);border:var(--border-w) solid var(--border-subtle);border-radius:var(--radius-pill);padding:var(--space-1) var(--space-3)}
      .rf-selo strong{color:var(--text-heading)}
      .rf-acoes{display:flex;gap:var(--space-2);flex-wrap:wrap}
      .rf-doc{background:var(--surface-card);border:var(--border-w) solid var(--border-default);border-radius:var(--radius-lg);padding:var(--space-6);box-shadow:var(--shadow-sm);color:var(--text-body);line-height:var(--lh-relaxed);overflow-wrap:anywhere}
      .rf-doc h1,.rf-doc h2,.rf-doc h3{color:var(--text-heading);margin:var(--space-4) 0 var(--space-2);line-height:var(--lh-snug)}
      .rf-doc h1{font-size:var(--fs-700)} .rf-doc h2{font-size:var(--fs-600)} .rf-doc h3{font-size:var(--fs-500)}
      .rf-doc > :first-child{margin-top:0}
      .rf-doc p{margin:0 0 var(--space-2)}
      .rf-doc ol,.rf-doc ul{margin:0 0 var(--space-3);padding-left:var(--space-6)}
      .rf-doc li{margin-bottom:var(--space-1)}
      .rf-doc a{color:var(--text-link)}
      .rf-doc .ql-indent-1{padding-left:2em} .rf-doc .ql-indent-2{padding-left:4em}
      .rf-doc .ql-align-center{text-align:center} .rf-doc .ql-align-right{text-align:right}
      .rf-vazio{color:var(--text-muted);text-align:center;padding:var(--space-10) var(--space-4)}
      .rf-aviso-preview{background:var(--feedback-info-bg);border:var(--border-w) solid var(--feedback-info-border);color:var(--feedback-info-fg);border-radius:var(--radius-md);padding:var(--space-3) var(--space-4);margin-bottom:var(--space-4);font-size:var(--fs-200)}
      .rf-editor-box{background:var(--surface-card);border-radius:var(--radius-lg)}
      .rf-editor-box .ql-toolbar{border-color:var(--border-default);border-radius:var(--radius-lg) var(--radius-lg) 0 0}
      .rf-editor-box .ql-container{border-color:var(--border-default);border-radius:0 0 var(--radius-lg) var(--radius-lg);min-height:360px;font-family:var(--font-sans);font-size:var(--fs-300)}
      .rf-editor-box .ql-editor{min-height:360px}
      .rf-hist{width:100%;border-collapse:collapse;font-size:var(--fs-200)}
      .rf-hist th,.rf-hist td{text-align:left;padding:var(--space-2) var(--space-3);border-bottom:var(--border-w) solid var(--border-subtle)}
      .rf-hist tr.rf-click{cursor:pointer} .rf-hist tr.rf-click:hover{background:var(--surface-hover)}
      @media (max-width:600px){.rf-doc{padding:var(--space-4)}}
    `;
    document.head.appendChild(st);
  }

  async function api(caminho, opts) {
    const url = `${SUPA_URL}/rest/v1/${caminho}`;
    let res = await fetch(url, { ...opts, headers: { ...HEADERS, ...(opts && opts.headers) } });
    if (res.status === 401 && typeof renovarToken === 'function' && await renovarToken()) {
      res = await fetch(url, { ...opts, headers: { ...HEADERS, ...(opts && opts.headers) } });
    }
    return res;
  }

  // Estado da tela (em memória; o editor não sobrevive a F5, o rascunho sim — ver salvarRascunho)
  const st = { el: null, atual: null, rascunho: '', quill: null, salvando: false };
  const LS_RASCUNHO = 'com_stonni:regras-faturamento:rascunho';
  function salvarRascunho(html) { try { localStorage.setItem(LS_RASCUNHO, html); } catch (e) {} }
  function lerRascunho() { try { return localStorage.getItem(LS_RASCUNHO); } catch (e) { return null; } }
  function apagarRascunho() { try { localStorage.removeItem(LS_RASCUNHO); } catch (e) {} }

  function seloAutor(v) {
    if (!v) return '<span class="rf-selo"><i class="ic ic-sm" data-ic="info"></i> Ainda não publicado</span>';
    return `<span class="rf-selo"><i class="ic ic-sm" data-ic="clock"></i> Última atualização: <strong>${esc(fmtDataHora(v.criado_em))}</strong> por <strong>${esc(v.autor_nome || v.autor_email)}</strong></span>`;
  }

  function erroHtml(msg, det) {
    return '<div class="alert alert-danger"><span class="alert-icon"><i class="ic ic-sm" data-ic="alert-triangle"></i></span>' +
      `<div>${esc(msg)}${det ? '<br><small>' + esc(det) + '</small>' : ''}</div></div>`;
  }

  // ── LEITURA ──────────────────────────────────────────────
  async function renderRegrasFaturamento(el) {
    if (!el) el = document.getElementById('page-content');
    st.el = el;
    el.style.padding = '';
    injetarEstilo();
    el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      await carregarScript(CDN_PURIFY);
      const res = await api('ped_regras_faturamento?select=id,conteudo_html,autor_email,autor_nome,criado_em&order=criado_em.desc&limit=1');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const linhas = await res.json();
      st.atual = Array.isArray(linhas) && linhas.length ? linhas[0] : null;
      telaLeitura();
    } catch (err) {
      if (window.appLog) window.appLog('ERRO', 'LOAD_REGRAS_FATURAMENTO', { categoria: 'regras-faturamento', detalhe: { erro: err && err.message } });
      el.innerHTML = erroHtml('Não foi possível carregar as regras de faturamento.', err && err.message);
    }
  }

  function telaLeitura(versao) {
    const v = versao || st.atual;
    const admin = typeof ehAdmin === 'function' && ehAdmin();
    const ehAntiga = versao && st.atual && versao.id !== st.atual.id;
    st.el.innerHTML = `
      <div class="rf-wrap">
        ${ehAntiga ? '<div class="rf-aviso-preview">Você está vendo uma versão antiga. <a href="#" onclick="rfVoltarAtual();return false">Voltar à versão vigente</a></div>' : ''}
        <div class="rf-topo">
          ${seloAutor(v)}
          ${admin ? `<div class="rf-acoes">
            <button class="btn btn-outline btn-sm" onclick="rfHistorico()"><i class="ic ic-sm" data-ic="clipboard-list"></i> Histórico</button>
            <button class="btn btn-primary btn-sm" onclick="rfEditar()"><i class="ic ic-sm" data-ic="pencil"></i> Editar</button>
          </div>` : ''}
        </div>
        ${v ? `<div class="rf-doc">${limpar(v.conteudo_html)}</div>`
            : `<div class="rf-doc rf-vazio">Nenhuma regra de faturamento publicada ainda.${admin ? '<br>Clique em <strong>Editar</strong> para escrever a primeira versão.' : ''}</div>`}
      </div>`;
  }

  // ── EDIÇÃO (admin) ───────────────────────────────────────
  async function rfEditar(manterRascunho) {
    if (!(typeof ehAdmin === 'function' && ehAdmin())) return;
    carregarCss(CDN_QUILL_CSS);
    try { await carregarScript(CDN_QUILL_JS); }
    catch (err) { st.el.innerHTML = erroHtml('Não foi possível abrir o editor.', err.message); return; }

    if (!manterRascunho) {
      const salvo = lerRascunho();
      st.rascunho = salvo != null ? salvo : (st.atual ? st.atual.conteudo_html : '');
    }
    st.el.innerHTML = `
      <div class="rf-wrap">
        <div class="rf-topo">
          ${seloAutor(st.atual)}
          <div class="rf-acoes">
            <button class="btn btn-outline btn-sm" onclick="rfCancelar()"><i class="ic ic-sm" data-ic="x"></i> Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="rfPreview()"><i class="ic ic-sm" data-ic="eye"></i> Pré-visualizar</button>
          </div>
        </div>
        <div class="rf-editor-box"><div id="rf-editor"></div></div>
      </div>`;
    st.quill = new Quill('#rf-editor', {
      theme: 'snow',
      placeholder: 'Escreva as etapas de faturamento…',
      modules: {
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['link'],
          ['clean'],
        ],
      },
    });
    st.quill.clipboard.dangerouslyPasteHTML(limpar(st.rascunho || ''));
    st.quill.on('text-change', () => { st.rascunho = st.quill.root.innerHTML; salvarRascunho(st.rascunho); });
    st.quill.focus();
  }

  function rfCancelar() {
    if (st.rascunho && st.atual && st.rascunho !== st.atual.conteudo_html &&
        !confirm('Descartar as alterações não publicadas?')) return;
    apagarRascunho();
    st.rascunho = '';
    telaLeitura();
  }

  function rfPreview() {
    if (st.quill) st.rascunho = st.quill.root.innerHTML;
    const vazio = !st.quill || st.quill.getText().trim() === '';
    if (vazio) { alert('O texto está vazio.'); return; }
    const u = usuarioAtual();
    st.el.innerHTML = `
      <div class="rf-wrap">
        <div class="rf-aviso-preview"><strong>Pré-visualização</strong> — é assim que os representantes vão ver. Ainda não foi publicado.</div>
        <div class="rf-topo">
          ${seloAutor({ criado_em: new Date().toISOString(), autor_nome: u && u.nome, autor_email: u && u.email })}
          <div class="rf-acoes">
            <button class="btn btn-outline btn-sm" onclick="rfEditar(true)"><i class="ic ic-sm" data-ic="pencil"></i> Voltar a editar</button>
            <button class="btn btn-primary btn-sm" id="rf-btn-publicar" onclick="rfPublicar()"><i class="ic ic-sm" data-ic="check"></i> Publicar</button>
          </div>
        </div>
        <div class="rf-doc">${limpar(st.rascunho)}</div>
      </div>`;
  }

  async function rfPublicar() {
    if (st.salvando) return;
    const u = usuarioAtual();
    const html = limpar(st.rascunho);
    if (!html.replace(/<[^>]*>/g, '').trim()) { alert('O texto está vazio.'); return; }
    st.salvando = true;
    const btn = document.getElementById('rf-btn-publicar');
    if (btn) { btn.disabled = true; btn.textContent = 'Publicando…'; }
    try {
      const res = await api('ped_regras_faturamento?select=id,conteudo_html,autor_email,autor_nome,criado_em', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ conteudo_html: html, autor_email: u.email, autor_nome: u.nome }),
      });
      const linhas = await res.json().catch(() => null);
      // RLS pode recusar sem erro aparente: só vale se a linha voltou.
      if (!res.ok || !Array.isArray(linhas) || !linhas.length) {
        throw new Error((linhas && linhas.message) || `HTTP ${res.status}`);
      }
      st.atual = linhas[0];
      apagarRascunho();
      st.rascunho = '';
      if (window.appLog) window.appLog('INFO', 'Regras de faturamento publicadas (versão ' + st.atual.id + ')', { categoria: 'regras-faturamento' });
      telaLeitura();
    } catch (err) {
      if (window.appLog) window.appLog('ERRO', 'PUBLICAR_REGRAS_FATURAMENTO', { categoria: 'regras-faturamento', detalhe: { erro: err && err.message } });
      alert('Não foi possível publicar: ' + (err && err.message) + '\nO texto continua salvo como rascunho neste navegador.');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ic ic-sm" data-ic="check"></i> Publicar'; }
    } finally {
      st.salvando = false;
    }
  }

  // ── HISTÓRICO (admin) ────────────────────────────────────
  let _hist = [];
  async function rfHistorico() {
    st.el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
    try {
      const res = await api('ped_regras_faturamento?select=id,conteudo_html,autor_email,autor_nome,criado_em&order=criado_em.desc', {
        headers: { 'Range-Unit': 'items', 'Range': '0-499' },
      });
      if (!res.ok && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      _hist = await res.json();
      st.el.innerHTML = `
        <div class="rf-wrap">
          <div class="rf-topo">
            <span class="rf-selo"><i class="ic ic-sm" data-ic="clipboard-list"></i> ${_hist.length} versão(ões) publicada(s)</span>
            <div class="rf-acoes"><button class="btn btn-outline btn-sm" onclick="rfVoltarAtual()"><i class="ic ic-sm" data-ic="arrow-left"></i> Voltar</button></div>
          </div>
          <div class="rf-doc" style="padding:0">
            <table class="rf-hist">
              <thead><tr><th>Publicado em</th><th>Por</th><th></th></tr></thead>
              <tbody>${_hist.map((v, i) => `
                <tr class="rf-click" onclick="rfVerVersao(${i})">
                  <td>${esc(fmtDataHora(v.criado_em))}</td>
                  <td>${esc(v.autor_nome || v.autor_email)}<br><small style="color:var(--text-muted)">${esc(v.autor_email)}</small></td>
                  <td>${i === 0 ? '<strong style="color:var(--text-success)">Vigente</strong>' : '<span style="color:var(--text-link)">Ver</span>'}</td>
                </tr>`).join('')}</tbody>
            </table>
          </div>
        </div>`;
    } catch (err) {
      st.el.innerHTML = erroHtml('Não foi possível carregar o histórico.', err && err.message);
    }
  }
  function rfVerVersao(i) { if (_hist[i]) telaLeitura(_hist[i]); }
  function rfVoltarAtual() { telaLeitura(); }

  window.renderRegrasFaturamento = renderRegrasFaturamento;
  window.rfEditar = rfEditar;
  window.rfCancelar = rfCancelar;
  window.rfPreview = rfPreview;
  window.rfPublicar = rfPublicar;
  window.rfHistorico = rfHistorico;
  window.rfVerVersao = rfVerVersao;
  window.rfVoltarAtual = rfVoltarAtual;
})();
