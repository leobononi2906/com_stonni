// ============================================================
//  BOLETOS — encaminhar boleto ao cliente pelo WhatsApp (28/10/2026)
//  Pedido do Leo: o representante manda o boleto pelo WhatsApp DELE,
//  corrigindo o número se precisar. Nunca por e-mail.
//   - Dados: Edge Function fin-boleto-email (bononi-dashboard), ações
//     portal_boletos / whatsapp_preparar / outro_canal, com o token de quem
//     está logado. A função só devolve boleto de cliente do atacado
//     (atac_clientes) e, pelo Portal, só aceita o canal WhatsApp.
//   - "Sim, enviei" grava o envio na fila do Financeiro (o e-mail automático
//     não manda de novo) e o telefone que deu certo vale para todos.
//  Área ISOLADA: erro aqui não derruba o resto do app.
// ============================================================
(function () {
  'use strict';

  // ── Lógica pura (testada em scripts/teste-boletos.js) ──

  /** DDD + número, sem 55 e sem 0; null se não parece telefone (igual ao telefoneLimpo da função). */
  function telefoneLimpo(s) {
    let d = String(s == null ? '' : s).replace(/\D/g, '');
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
    d = d.replace(/^0+/, '');
    return d.length === 10 || d.length === 11 ? d : null;
  }
  const telefoneFormatado = (t) =>
    t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}`;
  const linkWhats = (telefone, texto) => `https://wa.me/55${telefone}?text=${encodeURIComponent(texto)}`;

  const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataBR = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('/') : '');
  const primeiroNome = (s) => String(s || '').trim().split(/\s+/).slice(0, 3).join(' ');
  const diasEntre = (de, ate) => Math.round((Date.parse(ate + 'T12:00:00Z') - Date.parse(de + 'T12:00:00Z')) / 86400000);

  /** p = resposta do whatsapp_preparar; rep = nome de quem envia. */
  function montarMensagem(p, rep) {
    const linhas = (p.boletos || []).map((b) => {
      const cab = `• ${b.num_doc} · ${brl(b.valor)} · vence ${dataBR(b.data_venc)}`;
      return b.linha_digitavel ? `${cab}\n  Linha digitável: ${b.linha_digitavel}` : cab;
    }).join('\n');
    const um = (p.boletos || []).length === 1;
    return `Olá, ${primeiroNome(p.cliente) || 'tudo bem'}! Aqui é ${primeiroNome(rep) || 'o seu representante'}, da Stonni.\n\n`
      + `Segue ${um ? 'o seu boleto' : 'os seus boletos'}:\n${linhas}\n\n`
      + `Todos os seus boletos e notas fiscais ficam no Portal do Cliente: ${p.portal_url}\n`
      + '(entre com o CNPJ/CPF; no primeiro acesso, clique em "Primeiro acesso").\n\n'
      + 'Qualquer dúvida, é só me chamar.';
  }

  /** Situação do boleto no dia `hoje` (AAAA-MM-DD). */
  function situacao(b, hoje) {
    const d = diasEntre(hoje, String(b.data_venc).slice(0, 10));
    if (d < 0) return { vencido: true, texto: `Vencido há ${-d} dia${d === -1 ? '' : 's'}` };
    if (d === 0) return { vencido: false, texto: 'Vence hoje' };
    return { vencido: false, texto: `Vence em ${d} dia${d === 1 ? '' : 's'}` };
  }

  /** Como o boleto já foi entregue (fila do Financeiro); null quando ainda não foi. */
  function rotuloEnvio(e) {
    if (!e) return null;
    const quando = e.em ? ' ' + new Date(e.em).toLocaleDateString('pt-BR') : '';
    if (e.situacao === 'outro_canal') {
      const canal = { whatsapp: 'WhatsApp', impresso: 'Impresso', em_maos: 'Em mãos' }[e.canal] || 'Outro canal';
      return { ok: true, texto: `${canal}${quando}${e.por ? ' · ' + e.por : ''}` };
    }
    if (['enviado', 'entregue', 'aberto', 'clicado', 'atrasado'].includes(e.situacao)) return { ok: true, texto: `E-mail${quando}` };
    if (['devolvido', 'reclamado', 'erro'].includes(e.situacao)) return { ok: false, texto: 'E-mail não chegou' };
    return null;
  }

  /** Filtra (a vencer / vencidos / todos + busca) e junta por cliente, na ordem do vencimento mais próximo. */
  function agrupar(boletos, hoje, filtro, busca) {
    const q = String(busca || '').trim().toLowerCase();
    const qDig = q.replace(/\D/g, '');
    const grupos = new Map();
    for (const b of boletos) {
      if (!(Number(b.valor) > 0)) continue; // boleto zerado no SGA não tem o que pagar (nem linha digitável)
      const venc = String(b.data_venc).slice(0, 10) < hoje;
      if (filtro === 'avencer' && venc) continue;
      if (filtro === 'vencidos' && !venc) continue;
      if (q) {
        const texto = `${b.cliente} ${b.num_doc} ${b.cidade}`.toLowerCase();
        if (!texto.includes(q) && !(qDig.length >= 3 && String(b.documento).includes(qDig))) continue;
      }
      const chave = b.documento || 'sem-doc-' + b.codigo;
      if (!grupos.has(chave)) grupos.set(chave, { documento: b.documento, cliente: b.cliente, cidade: b.cidade, uf: b.uf, boletos: [], total: 0 });
      const g = grupos.get(chave);
      g.boletos.push(b);
      g.total += Number(b.valor || 0);
    }
    return [...grupos.values()];
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { telefoneLimpo, telefoneFormatado, linkWhats, montarMensagem, situacao, rotuloEnvio, agrupar };
    return;
  }

  // ── Tela ──

  // marcados: nada vem marcado (cliente grande tem dezenas de parcelas); abertos: clientes com a lista toda à mostra.
  const BOL = { lista: [], hoje: '', filtro: 'avencer', busca: '', marcados: new Set(), abertos: new Set(), mostrar: 40, carregado: false };
  const POR_CLIENTE = 5;
  const LOTE_MAX = 25; // o máximo que a fin-boleto-email aceita por vez
  const ENV = { codigos: [], preparo: null, telefone: '' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function fmtDoc(d) {
    d = String(d || '');
    if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return d;
  }

  async function chamar(corpo) {
    const r = await fetch(`${SUPA_URL}/functions/v1/fin-boleto-email`, {
      method: 'POST',
      headers: { 'apikey': SUPA_KEY, 'Authorization': HEADERS['Authorization'] || '', 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.erro || `erro ${r.status}`);
    return j;
  }

  async function renderBoletos(el) {
    if (!el) el = document.getElementById('page-content');
    try {
      if (!BOL.carregado) {
        el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';
        const r = await chamar({ acao: 'portal_boletos' });
        BOL.lista = r.boletos || [];
        BOL.hoje = r.hoje;
        BOL.carregado = true;
      }
      const filtroBtn = (f, rot) => `<button type="button" class="toggle-btn ${BOL.filtro === f ? 'active' : ''}" onclick="bolFiltro('${f}')">${rot}</button>`;
      el.innerHTML = `
        <div class="card" style="margin-bottom:var(--space-4)">
          <div class="section-header" style="margin-bottom:var(--space-3)">
            <div>
              <div class="section-title"><i class="ic ic-sm" data-ic="receipt"></i> Boletos do atacado</div>
              <div style="font-size:var(--fs-100);color:var(--text-muted);margin-top:var(--space-0-5)">Encaminhe o boleto pelo seu WhatsApp. Confira o número antes de enviar.</div>
            </div>
            <div class="toggle-group">${filtroBtn('avencer', 'A vencer')}${filtroBtn('vencidos', 'Vencidos')}${filtroBtn('todos', 'Todos')}</div>
          </div>
          <div class="form-field" style="margin-bottom:0">
            <input type="text" placeholder="Buscar por cliente, CNPJ, número do boleto ou cidade..." value="${esc(BOL.busca)}" oninput="bolBusca(this.value)"/>
          </div>
        </div>
        <div id="bol-lista">${listaHtml()}</div>`;
    } catch (err) {
      if (window.appLog) window.appLog('ERRO', 'Falha ao carregar boletos', { categoria: 'boletos', detalhe: { erro: err && err.message } });
      el.innerHTML = '<div class="alert alert-danger"><span class="alert-icon"><i class="ic ic-sm" data-ic="alert-triangle"></i></span><div>Não foi possível carregar os boletos.'
        + (err && err.message ? '<br><small>' + esc(err.message) + '</small>' : '')
        + '<div style="margin-top:var(--space-2)"><button class="btn btn-outline btn-sm" onclick="bolRecarregar()">Tentar de novo</button></div></div></div>';
    }
  }

  function listaHtml() {
    const grupos = agrupar(BOL.lista, BOL.hoje, BOL.filtro, BOL.busca);
    if (!grupos.length) {
      return `<div class="card"><div class="empty-state"><div class="empty-state-icon"><i class="ic ic-sm" data-ic="receipt"></i></div><h3>Nenhum boleto</h3><p>${BOL.lista.length ? 'Nada encontrado para o filtro atual.' : 'Nenhum boleto em aberto dos clientes do atacado.'}</p></div></div>`;
    }
    const nBol = grupos.reduce((s, g) => s + g.boletos.length, 0);
    const mais = grupos.length > BOL.mostrar
      ? `<div style="text-align:center;margin-top:var(--space-3)"><button class="btn btn-outline" onclick="bolMais()">Mostrar mais clientes (${grupos.length - BOL.mostrar})</button></div>` : '';
    return `<div style="font-size:var(--fs-100);color:var(--text-muted);margin-bottom:var(--space-2)">${grupos.length} cliente${grupos.length === 1 ? '' : 's'} · ${nBol} boleto${nBol === 1 ? '' : 's'}</div>`
      + grupos.slice(0, BOL.mostrar).map(grupoHtml).join('') + mais;
  }

  function grupoHtml(g) {
    const marcados = g.boletos.filter(b => BOL.marcados.has(b.codigo)).map(b => b.codigo);
    const chave = g.documento || 'c' + g.boletos[0].codigo; // só dígitos/letras: vai dentro do onclick
    const aberto = BOL.abertos.has(chave);
    const visiveis = aberto ? g.boletos : g.boletos.slice(0, POR_CLIENTE);
    const linhas = visiveis.map(b => {
      const s = situacao(b, BOL.hoje);
      const env = rotuloEnvio(b.envio);
      return `<div style="display:flex;align-items:center;gap:var(--space-2-5);padding:var(--space-2) 0;border-top:1px solid var(--border)">
          <input type="checkbox" ${BOL.marcados.has(b.codigo) ? 'checked' : ''} onchange="bolMarcar(${b.codigo}, this.checked)" title="Marcar para enviar junto" style="accent-color:var(--blue-dark);width:18px;height:18px;flex-shrink:0;cursor:pointer">
          <div style="flex:1;min-width:0">
            <div style="font-family:var(--font-mono);font-size:var(--fs-100)">${esc(b.num_doc)}</div>
            <div style="font-size:var(--fs-090);color:${s.vencido ? 'var(--red-fg)' : 'var(--text-muted)'}">${dataBR(b.data_venc)} · ${s.texto}</div>
            ${env ? `<div style="font-size:var(--fs-090);color:${env.ok ? 'var(--green-fg)' : 'var(--text-warning)'}"><i class="ic ic-sm" data-ic="${env.ok ? 'check-circle' : 'alert-triangle'}"></i> ${esc(env.texto)}</div>` : ''}
          </div>
          <div style="font-weight:700;white-space:nowrap">${brl(b.valor)}</div>
          <button class="btn btn-success btn-sm" onclick="bolEnviar('${b.codigo}')" title="Enviar este boleto pelo WhatsApp" style="flex-shrink:0"><i class="ic ic-sm" data-ic="smartphone"></i> Enviar</button>
        </div>`;
    }).join('');
    const resto = g.boletos.length - visiveis.length;
    const verMais = resto > 0
      ? `<button class="btn btn-outline btn-sm" style="margin-top:var(--space-2)" onclick="bolAbrirCliente('${chave}')">Ver mais ${resto} boleto${resto === 1 ? '' : 's'}</button>`
      : (aberto && g.boletos.length > POR_CLIENTE ? `<button class="btn btn-outline btn-sm" style="margin-top:var(--space-2)" onclick="bolAbrirCliente('${chave}')">Mostrar menos</button>` : '');
    const demais = marcados.length > LOTE_MAX;
    const btnMarcados = marcados.length
      ? `<button class="btn btn-success" ${demais ? 'disabled' : ''} onclick="bolEnviar('${marcados.join(',')}')"><i class="ic ic-sm" data-ic="smartphone"></i> Enviar marcados (${marcados.length})</button>
         ${demais ? `<div style="font-size:var(--fs-090);color:var(--text-warning);margin-top:var(--space-1)">No máximo ${LOTE_MAX} por vez</div>` : ''}` : '';
    return `<div class="card" style="margin-bottom:var(--space-3)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-3);flex-wrap:wrap;margin-bottom:var(--space-2)">
          <div style="min-width:0;flex:1">
            <div style="font-weight:700">${esc(g.cliente)}</div>
            <div style="font-size:var(--fs-090);color:var(--text-muted)">${esc(fmtDoc(g.documento))}${g.cidade ? ` · ${esc(g.cidade)}/${esc(g.uf)}` : ''} · ${g.boletos.length} boleto${g.boletos.length === 1 ? '' : 's'} · ${brl(g.total)}</div>
          </div>
          <div style="text-align:right">${btnMarcados}</div>
        </div>
        ${linhas}
        ${verMais}
      </div>`;
  }

  function redesenharLista() {
    const el = document.getElementById('bol-lista');
    if (el) el.innerHTML = listaHtml();
  }

  // ── Envio ──

  async function bolEnviar(codigosDoCliente) {
    const codigos = String(codigosDoCliente).split(',').map(Number).filter(Number.isInteger);
    if (!codigos.length || codigos.length > LOTE_MAX) return;
    ENV.codigos = codigos; ENV.preparo = null; ENV.telefone = '';
    abrirDrawer('<i class="ic ic-sm" data-ic="smartphone"></i> Enviar pelo WhatsApp', '', '<div class="loading-overlay" style="position:static;min-height:120px"><div class="spinner"></div></div>');
    try {
      const p = await chamar({ acao: 'whatsapp_preparar', codigos });
      if (ENV.codigos !== codigos) return; // fechou e abriu outro no meio
      ENV.preparo = p;
      ENV.telefone = (p.telefones && p.telefones[0] && p.telefones[0].telefone) || '';
      document.getElementById('drawer-sub').textContent = p.cliente || '';
      document.getElementById('drawer-body').innerHTML = corpoEnvioHtml(p);
      document.getElementById('drawer-footer').innerHTML = rodapeAbrir();
    } catch (err) {
      document.getElementById('drawer-body').innerHTML = `<div class="alert alert-danger"><span class="alert-icon"><i class="ic ic-sm" data-ic="alert-triangle"></i></span><div>${esc(err.message)}</div></div>`;
    }
  }

  function corpoEnvioHtml(p) {
    const chips = (p.telefones || []).map(t => {
      const nota = t.vezes ? `deu certo ${t.vezes}x` : 'do cadastro';
      return `<button type="button" class="toggle-btn" onclick="bolUsarTelefone('${t.telefone}')" style="margin:0 var(--space-1-5) var(--space-1-5) 0">${telefoneFormatado(t.telefone)} <span style="opacity:.7">· ${nota}</span></button>`;
    }).join('');
    return `
      ${p.aviso_linha ? `<div class="alert alert-info" style="margin-bottom:var(--space-3)"><span class="alert-icon"><i class="ic ic-sm" data-ic="info"></i></span><div>${esc(p.aviso_linha)} O cliente vê o boleto no Portal do Cliente pelo link da mensagem.</div></div>` : ''}
      <div class="form-field">
        <label>WhatsApp do cliente (com DDD)</label>
        <input type="tel" id="bol-tel" class="cfg-input" value="${ENV.telefone ? telefoneFormatado(ENV.telefone) : ''}" placeholder="(44) 99999-9999" oninput="bolTelDigitado(this.value)">
        <div id="bol-tel-aviso" style="font-size:var(--fs-090);color:var(--text-muted);margin-top:var(--space-1)">${chips ? 'Números conhecidos (toque para usar):' : 'Nenhum número no cadastro: digite o do cliente.'}</div>
        ${chips ? `<div style="margin-top:var(--space-1-5)">${chips}</div>` : ''}
      </div>
      <div class="form-field">
        <label>Mensagem</label>
        <textarea id="bol-msg" class="cfg-input" rows="12" style="width:100%;font-family:inherit;resize:vertical">${esc(montarMensagem(p, USUARIO && USUARIO.nome))}</textarea>
      </div>`;
  }

  const rodapeAbrir = () => `<button class="btn btn-outline" onclick="fecharDrawer()">Cancelar</button>
    <button class="btn btn-success" onclick="bolAbrirWhats()"><i class="ic ic-sm" data-ic="smartphone"></i> Abrir WhatsApp</button>`;

  function bolAbrirWhats() {
    const tel = telefoneLimpo(document.getElementById('bol-tel').value);
    const aviso = document.getElementById('bol-tel-aviso');
    if (!tel) {
      aviso.textContent = 'Número inválido: use DDD + número, por exemplo (44) 99999-9999.';
      aviso.style.color = 'var(--red-fg)';
      aviso.dataset.erro = '1';
      return;
    }
    ENV.telefone = tel;
    // Abre já no clique (sem await antes), senão o navegador bloqueia a janela.
    window.open(linkWhats(tel, document.getElementById('bol-msg').value), '_blank');
    const rodape = document.getElementById('drawer-footer');
    rodape.style.flexWrap = 'wrap';
    rodape.innerHTML = `
      <div style="flex-basis:100%;font-size:var(--fs-100)">Conseguiu enviar para <strong>${telefoneFormatado(tel)}</strong>?</div>
      <button class="btn btn-outline" onclick="bolNaoEnviou()">Não enviei</button>
      <button class="btn btn-success" onclick="bolEnviou(this)"><i class="ic ic-sm" data-ic="check-circle"></i> Sim, enviei</button>`;
  }

  async function bolEnviou(btn) {
    btn.disabled = true;
    try {
      await chamar({ acao: 'outro_canal', codigos: ENV.codigos, canal: 'whatsapp', telefone: ENV.telefone, deu_certo: true });
      const agora = new Date().toISOString();
      const nome = USUARIO && USUARIO.nome;
      BOL.lista.forEach(b => { if (ENV.codigos.includes(b.codigo)) b.envio = { situacao: 'outro_canal', canal: 'whatsapp', em: agora, por: nome }; });
      ENV.codigos.forEach(c => BOL.marcados.delete(c));
      fecharDrawer();
      redesenharLista();
    } catch (err) {
      btn.disabled = false;
      document.getElementById('drawer-footer').insertAdjacentHTML('afterbegin', `<div style="flex-basis:100%;color:var(--red-fg);font-size:var(--fs-100)">Não gravou: ${esc(err.message)}</div>`);
    }
  }

  // Pelo menu, sempre busca de novo (o Financeiro pode ter enviado algo nesse meio tempo).
  window.renderBoletos = function (el) { BOL.carregado = false; return renderBoletos(el); };
  window.bolEnviar = bolEnviar;
  window.bolAbrirWhats = bolAbrirWhats;
  window.bolEnviou = bolEnviou;
  window.bolNaoEnviou = function () { document.getElementById('drawer-footer').innerHTML = rodapeAbrir(); };
  window.bolUsarTelefone = function (t) {
    document.getElementById('bol-tel').value = telefoneFormatado(t);
    window.bolTelDigitado(t);
  };
  window.bolTelDigitado = function () {
    const aviso = document.getElementById('bol-tel-aviso');
    if (aviso && aviso.dataset.erro) { delete aviso.dataset.erro; aviso.style.color = 'var(--text-muted)'; aviso.textContent = 'Confira o número antes de enviar.'; }
  };
  window.bolFiltro = function (f) { BOL.filtro = f; BOL.mostrar = 40; renderBoletos(); };
  window.bolBusca = function (v) { BOL.busca = v; BOL.mostrar = 40; redesenharLista(); };
  window.bolMais = function () { BOL.mostrar += 40; redesenharLista(); };
  window.bolMarcar = function (codigo, marcado) {
    if (marcado) BOL.marcados.add(codigo); else BOL.marcados.delete(codigo);
    redesenharLista();
  };
  window.bolAbrirCliente = function (chave) {
    if (BOL.abertos.has(chave)) BOL.abertos.delete(chave); else BOL.abertos.add(chave);
    redesenharLista();
  };
  window.bolRecarregar = function () { BOL.carregado = false; renderBoletos(); };
})();
