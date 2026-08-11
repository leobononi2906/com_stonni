// ============================================================
//  MÓDULO MATERIAIS + PERGUNTAR À IA
//  Base compartilhada do grupo (mesmo Supabase), sem backend novo:
//   - Materiais: tabela public.prt_materiais (SELECT liberado p/ anon)
//   - IA: Edge Function assist-perguntar (exige JWT do usuário logado)
//  Área ISOLADA (Padrão Bononi 5.0): erro aqui não derruba o resto do app.
//  Visível para todos com acesso ao portal (rep e interno).
// ============================================================
(function () {
  'use strict';

  const MAT = { items: [], linha: '', busca: '', loaded: false, loading: false };

  const MAT_LINHAS = [
    { key: '',                label: 'Todos',           icon: '📚' },
    { key: 'geladeira',       label: 'Geladeira',       icon: '🧊' },
    { key: 'ar_condicionado', label: 'Ar Condicionado', icon: '❄️' },
    { key: 'gerador',         label: 'Gerador',         icon: '⚡' },
  ];
  const MAT_PRODUTO_IA = { geladeira: 'Geladeira', ar_condicionado: 'Ar Condicionado', gerador: 'Gerador', '': 'Outros' };

  function ytId(url) {
    const m = String(url || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : null;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

  async function carregarMateriais() {
    // supa() do shell já usa HEADERS (apikey + token) e acrescenta limit=9999
    const rows = await supa('prt_materiais', 'select=*&ativo=eq.true&order=ordem.asc,criado_em.desc');
    return Array.isArray(rows) ? rows : [];
  }

  async function renderMateriais(el, params) {
    try {
      if (!el) el = document.getElementById('page-content');

      if (!MAT.loaded) {
        if (MAT.loading) return;
        MAT.loading = true;
        el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
        try { MAT.items = await carregarMateriais(); MAT.loaded = true; }
        finally { MAT.loading = false; }
      }

      const busca = MAT.busca.trim().toLowerCase();
      const lista = MAT.items.filter(m => {
        if (MAT.linha && (m.linha_produto || '') !== MAT.linha) return false;
        if (!busca) return true;
        return [m.titulo, m.descricao, m.modelo, m.categoria].some(c => String(c || '').toLowerCase().includes(busca));
      });

      const chips = MAT_LINHAS.map(l => {
        const n = l.key ? MAT.items.filter(m => (m.linha_produto || '') === l.key).length : MAT.items.length;
        const on = MAT.linha === l.key;
        return `<button onclick="matSetLinha('${l.key}')" style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;border:1.5px solid ${on ? 'var(--blue-mid)' : 'var(--border)'};background:${on ? 'var(--blue-pale)' : 'var(--surface)'};color:${on ? 'var(--blue-dark)' : 'var(--text-secondary)'};font-size:12.5px;font-weight:600;cursor:pointer">${l.icon} ${l.label} <span style="opacity:.7;font-weight:500">${n}</span></button>`;
      }).join('');

      const cards = lista.length
        ? `<div class="cat-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px">${lista.map(matCard).join('')}</div>`
        : `<div class="empty-state"><div class="empty-state-icon">📭</div><h3>Nenhum material</h3><p>Nada encontrado para o filtro atual.</p></div>`;

      el.innerHTML = `
        <div class="card" style="margin-bottom:16px">
          <div class="section-header" style="margin-bottom:14px">
            <div>
              <div class="section-title">📚 Materiais de apoio</div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Vídeos, PDFs e guias dos equipamentos Stonni</div>
            </div>
            <button class="btn btn-primary" onclick="iaAbrir()">🤖 Perguntar à IA</button>
          </div>
          <div class="form-field" style="margin-bottom:12px">
            <input type="text" placeholder="Buscar por título, modelo, categoria..." value="${esc(MAT.busca)}" oninput="matBusca(this.value)"/>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">${chips}</div>
        </div>
        <div class="card">${cards}</div>`;
    } catch (err) {
      if (window.appLog) window.appLog('ERRO', 'Falha ao carregar materiais', { categoria: 'materiais', detalhe: { erro: err && err.message } });
      (el || document.getElementById('page-content')).innerHTML =
        '<div class="alert alert-danger"><span class="alert-icon">⚠️</span><div>Não foi possível carregar os materiais.' +
        (err && err.message ? '<br><small>' + esc(err.message) + '</small>' : '') + '</div></div>';
    }
  }

  function matCard(m) {
    const tipo = (m.tipo || 'link').toLowerCase();
    const titulo = esc(m.titulo || 'Sem título');
    const sub = esc(m.categoria || m.modelo || '');
    let thumb;
    if (tipo === 'video') {
      const id = ytId(m.url);
      thumb = id
        ? `<div style="position:relative;aspect-ratio:16/9;background:#000;border-radius:8px;overflow:hidden"><img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" style="width:100%;height:100%;object-fit:cover" loading="lazy"/><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><span style="width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px">▶</span></div></div>`
        : matThumbIcon('▶', 'VÍDEO', '#dc2626');
    } else if (tipo === 'imagem') {
      thumb = `<div style="aspect-ratio:16/9;background:var(--surface2);border-radius:8px;overflow:hidden"><img src="${esc(m.url)}" style="width:100%;height:100%;object-fit:cover" loading="lazy"/></div>`;
    } else if (tipo === 'pdf') {
      thumb = matThumbIcon('📄', 'PDF', '#0077CC');
    } else {
      thumb = matThumbIcon('🔗', 'LINK', '#16a34a');
    }
    return `<div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--surface);transition:box-shadow .15s" onmouseover="this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.boxShadow='none'">
      <div onclick="matAbrir(${m.id})" title="Abrir" style="cursor:pointer">${thumb}
        <div style="padding:10px 12px 6px">
          <div style="font-size:13px;font-weight:600;color:var(--text-primary);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${titulo}</div>
          ${sub ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">${sub}</div>` : ''}
        </div>
      </div>
      <div style="padding:0 12px 10px">
        <button class="btn btn-outline btn-sm" style="width:100%;justify-content:center;color:#128C7E;border-color:#128C7E" onclick="matShare(${m.id}, event)">📲 Enviar no WhatsApp</button>
      </div>
    </div>`;
  }
  function matThumbIcon(icon, label, cor) {
    return `<div style="aspect-ratio:16/9;background:var(--surface2);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px">
      <span style="font-size:32px">${icon}</span>
      <span style="font-size:10px;font-weight:800;letter-spacing:1px;color:${cor}">${label}</span>
    </div>`;
  }

  function matShare(id, ev) {
    if (ev) ev.stopPropagation();
    const m = MAT.items.find(x => Number(x.id) === Number(id));
    if (!m) return;
    const tipo = (m.tipo || 'link').toLowerCase();
    const texto = [m.titulo, m.descricao].filter(Boolean).join(' — ');
    // PDF/imagem: anexa o arquivo. Vídeo/link: manda o link (não dá p/ anexar).
    if (tipo === 'pdf' || tipo === 'imagem') waShare({ arquivos: [m.url], texto, linkFallback: m.url });
    else waShare({ texto, linkFallback: m.url });
  }

  function matSetLinha(l) { MAT.linha = l; renderMateriais(document.getElementById('page-content')); }
  function matBusca(v) { MAT.busca = v; renderMateriais(document.getElementById('page-content')); }

  function matAbrir(id) {
    const m = MAT.items.find(x => Number(x.id) === Number(id));
    if (!m) return;
    const tipo = (m.tipo || 'link').toLowerCase();
    if (tipo === 'video') {
      const yt = ytId(m.url);
      if (yt) return matVisor(`<div style="position:relative;width:100%;aspect-ratio:16/9;background:#000"><iframe src="https://www.youtube.com/embed/${yt}?autoplay=1" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay;encrypted-media;fullscreen" allowfullscreen></iframe></div>`, m.titulo);
      return window.open(m.url, '_blank');
    }
    if (tipo === 'imagem') return matVisor(`<img src="${esc(m.url)}" style="max-width:100%;max-height:80vh;display:block;margin:0 auto;border-radius:8px"/>`, m.titulo);
    window.open(m.url, '_blank'); // pdf e link
  }

  function matVisor(inner, titulo) {
    let ov = document.getElementById('mat-visor');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'mat-visor';
      ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px';
      ov.onclick = e => { if (e.target === ov) matFecharVisor(); };
      document.body.appendChild(ov);
    }
    ov.innerHTML = `<div style="width:min(880px,100%);background:var(--surface);border-radius:12px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-bottom:1px solid var(--border)">
        <span style="font-size:13px;font-weight:700;color:var(--text-primary)">${esc(titulo || '')}</span>
        <button onclick="matFecharVisor()" style="background:none;border:none;font-size:20px;color:var(--text-muted);cursor:pointer;line-height:1">×</button>
      </div>
      <div style="padding:0">${inner}</div>
    </div>`;
    ov.style.display = 'flex';
  }
  function matFecharVisor() { const ov = document.getElementById('mat-visor'); if (ov) { ov.innerHTML = ''; ov.style.display = 'none'; } }

  // ── PERGUNTAR À IA (Edge Function assist-perguntar, via fetch + JWT) ──
  function iaAbrir() {
    let ov = document.getElementById('ia-modal');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'ia-modal';
      ov.style.cssText = 'position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:40px 20px;overflow-y:auto';
      ov.onclick = e => { if (e.target === ov) iaFechar(); };
      document.body.appendChild(ov);
    }
    const prodDefault = MAT_PRODUTO_IA[MAT.linha] || 'Outros';
    ov.innerHTML = `<div style="width:min(560px,100%);background:var(--surface);border-radius:14px;overflow:hidden;box-shadow:var(--shadow-lg)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-bottom:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">🤖</span><span style="font-size:15px;font-weight:700;color:var(--text-primary)">Perguntar à IA</span></div>
        <button onclick="iaFechar()" style="background:none;border:none;font-size:20px;color:var(--text-muted);cursor:pointer;line-height:1">×</button>
      </div>
      <div style="padding:16px 18px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">Tira dúvidas técnicas sobre os equipamentos Stonni. A resposta já vem pronta pra mandar pro cliente.</div>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Produto</label>
        <select id="ia-produto" style="width:100%;height:38px;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:0 10px;font-size:13px;background:var(--surface2);color:var(--text-primary);outline:none;margin-bottom:12px">
          ${['Ar Condicionado','Geladeira','Gerador','Outros'].map(p => `<option value="${p}"${p === prodDefault ? ' selected' : ''}>${p}</option>`).join('')}
        </select>
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:4px">Pergunta</label>
        <textarea id="ia-pergunta" rows="3" placeholder="Ex: Ar G3 pingando água na cabine, o que faço?" style="width:100%;border:1.5px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;font-size:13px;background:var(--surface2);color:var(--text-primary);outline:none;resize:vertical;font-family:inherit;box-sizing:border-box" onkeydown="if((event.ctrlKey||event.metaKey)&&event.key==='Enter')iaPerguntar()"></textarea>
        <button id="ia-btn" class="btn btn-primary" onclick="iaPerguntar()" style="margin-top:12px;width:100%;justify-content:center;height:42px">Perguntar</button>
        <div id="ia-resp" style="margin-top:14px"></div>
      </div>
    </div>`;
    ov.style.display = 'flex';
    setTimeout(() => { const t = document.getElementById('ia-pergunta'); if (t) t.focus(); }, 50);
  }
  function iaFechar() { const ov = document.getElementById('ia-modal'); if (ov) { ov.style.display = 'none'; ov.innerHTML = ''; } }

  async function iaPerguntar() {
    const pergunta = (document.getElementById('ia-pergunta') && document.getElementById('ia-pergunta').value || '').trim();
    const produto = (document.getElementById('ia-produto') && document.getElementById('ia-produto').value) || undefined;
    const btn = document.getElementById('ia-btn');
    const box = document.getElementById('ia-resp');
    if (!pergunta) { if (box) box.innerHTML = '<div style="font-size:12px;color:var(--red)">Escreva uma pergunta.</div>'; return; }
    btn.disabled = true; btn.textContent = 'Pensando...';
    box.innerHTML = '<div class="loading-overlay" style="padding:20px"><div class="spinner"></div></div>';
    try {
      // assist-perguntar exige JWT (verify_jwt=true) — usa o token do usuário logado (HEADERS.Authorization).
      const auth = (typeof HEADERS !== 'undefined' && HEADERS['Authorization']) || ('Bearer ' + SUPA_KEY);
      const r = await fetch(`${SUPA_URL}/functions/v1/assist-perguntar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPA_KEY, 'Authorization': auth },
        body: JSON.stringify({ pergunta, produto })
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data || data.ok === false) {
        const e = new Error((data && data.erro) || ('HTTP ' + r.status));
        e.status = r.status;
        throw e;
      }
      box.innerHTML = iaRespHtml(data);
    } catch (e) {
      const is401 = (e && e.status === 401) || /401|jwt|auth/i.test(String(e && e.message));
      const msg = is401 ? 'Sessão expirada — saia e entre de novo pra usar a IA.' : 'Não consegui responder agora. Tente de novo.';
      box.innerHTML = `<div class="alert alert-danger" style="margin:0"><span class="alert-icon">⚠️</span><div>${msg}</div></div>`;
    } finally { btn.disabled = false; btn.textContent = 'Perguntar'; }
  }

  function iaRespHtml(d) {
    const conf = { alta: ['Alta', 'var(--green)'], media: ['Média', 'var(--orange)'], baixa: ['Baixa', 'var(--red)'] }[String(d.confianca || '').toLowerCase()] || ['—', 'var(--text-muted)'];
    const videos = Array.isArray(d.videos) ? d.videos.filter(Boolean) : [];
    const resposta = esc(d.resposta || '').replace(/\n/g, '<br>');
    const vids = videos.length
      ? `<div style="margin-top:12px"><div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Vídeos relacionados</div>${videos.map(v => {
          const id = ytId(v);
          return `<a href="${esc(v)}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12.5px;color:var(--blue-mid);text-decoration:none">▶ ${id ? 'youtu.be/' + id : esc(v)}</a>`;
        }).join('')}</div>`
      : '';
    return `<div style="border:1px solid var(--border);border-radius:10px;padding:14px;background:var(--surface2)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.6px">Resposta</span>
        <span style="font-size:11px;font-weight:700;color:${conf[1]}">Confiança: ${conf[0]}</span>
      </div>
      <div style="font-size:13.5px;color:var(--text-primary);line-height:1.6">${resposta}</div>
      ${vids}
      <button onclick="iaCopiar(this)" data-resp="${esc(d.resposta || '')}" class="btn btn-outline btn-sm" style="margin-top:12px">📋 Copiar resposta</button>
    </div>`;
  }
  function iaCopiar(btn) {
    const txt = btn.getAttribute('data-resp') || '';
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => { btn.textContent = '✓ Copiado'; setTimeout(() => { btn.textContent = '📋 Copiar resposta'; }, 1500); });
  }

  // Expor para os onclick inline e para o router
  window.renderMateriais = renderMateriais;
  window.matSetLinha = matSetLinha;
  window.matShare = matShare;
  window.matBusca = matBusca;
  window.matAbrir = matAbrir;
  window.matFecharVisor = matFecharVisor;
  window.iaAbrir = iaAbrir;
  window.iaFechar = iaFechar;
  window.iaPerguntar = iaPerguntar;
  window.iaCopiar = iaCopiar;
})();
