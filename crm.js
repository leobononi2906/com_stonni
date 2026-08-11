// ============================================================
//  MÓDULO CRM — "Info Técnica" (interno)
//  Área ISOLADA (Padrão Bononi 5.0): um erro aqui NÃO derruba o resto do app.
//  Visível apenas para quem tem o módulo 'atacado' (vendedor interno / admin).
//
//  STATUS: stub. A Fase 1 porta aqui as telas do stonnidist-v2
//  (carteira, prospecção, ranking, agenda) como sub-abas desta área.
// ============================================================
(function () {
  'use strict';

  function podeVerCRM() {
    // USUARIO é um `let` global do script inline (compartilhado entre <script>),
    // NÃO existe como window.USUARIO. Referência direta com guarda de TDZ.
    const u = (typeof USUARIO !== 'undefined') ? USUARIO : null;
    const mods = (u && u.modulos) || [];
    return (Array.isArray(mods) && mods.includes('atacado')) || !!(u && u.admin); // admin sempre vê
  }
  window.podeVerCRM = podeVerCRM;

  let _crmQueuedTab = null;

  // Injeta CSS no iframe (same-origin) escondendo a barra interna do CRM —
  // a navegação passa a vir da sidebar do Portal. Sidebar única.
  function _crmInject(ifr) {
    try {
      const d = ifr.contentDocument;
      if (d && d.head && !d.getElementById('crm-embed-style')) {
        const s = d.createElement('style');
        s.id = 'crm-embed-style';
        s.textContent = '.sidebar{display:none!important}.menu-toggle{display:none!important}';
        d.head.appendChild(s);
      }
    } catch (e) {}
  }

  // Troca a tela DENTRO do CRM chamando o gotoTab do iframe (same-origin).
  function crmGoto(tab) {
    const ifr = document.getElementById('crm-frame');
    if (!ifr) { _crmQueuedTab = tab; return; }
    const w = ifr.contentWindow;
    if (w && typeof w.gotoTab === 'function') { try { w.gotoTab(tab); } catch (e) {} _crmQueuedTab = null; }
    else { _crmQueuedTab = tab; }
  }
  window.crmGoto = crmGoto;

  function renderCRM(el, params) {
    try {
      // Trava de segurança no front (a trava REAL é a RLS por módulo 'atacado' — Fase 3).
      if (!podeVerCRM()) {
        el.innerHTML =
          '<div class="empty-state">' +
          '<div class="empty-state-icon">🔒</div>' +
          '<h3>Sem acesso</h3>' +
          '<p>Esta área é interna. Fale com o administrador se precisar de acesso.</p>' +
          '</div>';
        return;
      }

      // CRM vendorizado em ./crm/ (cópia fiel), embutido via iframe SAME-ORIGIN.
      // Barra interna escondida; navegação vem da sidebar do Portal (crmGoto).
      const wanted = (params && params.tab) || _crmQueuedTab || 'crm';
      el.style.padding = '0';
      el.innerHTML =
        '<iframe id="crm-frame" title="CRM interno" src="./crm/index.html" ' +
        'style="display:block;width:100%;height:calc(100dvh - 60px);min-height:480px;border:0;background:var(--surface)" ' +
        'allow="clipboard-write"></iframe>';
      const ifr = document.getElementById('crm-frame');
      // Aplica CSS + tela desejada no load; repete pra sobreviver ao auto-login do CRM.
      ifr.addEventListener('load', function () {
        _crmInject(ifr); crmGoto(wanted);
        setTimeout(function () { _crmInject(ifr); crmGoto(wanted); }, 600);
        setTimeout(function () { crmGoto(wanted); }, 1500);
      });
    } catch (err) {
      if (window.appLog) window.appLog('ERRO', 'LOAD_CRM', { categoria: 'crm', detalhe: { erro: err && err.message } });
      el.innerHTML =
        '<div class="alert alert-danger">' +
        '<span class="alert-icon">⚠️</span>' +
        '<div>Não foi possível carregar a área de CRM. ' +
        (err && err.message ? '<br><small>' + err.message + '</small>' : '') +
        '</div></div>';
    }
  }
  window.renderCRM = renderCRM;
})();
