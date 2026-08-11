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
    return Array.isArray(mods) && mods.includes('atacado');
  }
  window.podeVerCRM = podeVerCRM;

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

      // CRM vendorizado em ./crm/ (cópia fiel do stonnidist-v2), embutido via
      // iframe SAME-ORIGIN. Compartilha a sessão Supabase do localStorage → SSO
      // (sem segundo login). Isolamento total: o CRM roda no seu próprio contexto,
      // um erro nele não derruba o portal.
      el.style.padding = '0';  // o iframe ocupa a área toda; CRM tem seu próprio layout
      el.innerHTML =
        '<iframe title="CRM — Info Técnica" src="./crm/index.html" ' +
        'style="display:block;width:100%;height:calc(100dvh - 60px);min-height:480px;border:0;background:var(--surface)" ' +
        'allow="clipboard-write"></iframe>';
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
