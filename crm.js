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

      // Placeholder da Fase 1 (as telas reais do CRM entram aqui).
      el.innerHTML =
        '<div class="page-section">' +
        '  <div class="alert alert-info">' +
        '    <span class="alert-icon">🛠️</span>' +
        '    <div><strong>Info Técnica (CRM)</strong> — área interna em construção. ' +
        '    As telas de carteira, prospecção e ranking serão portadas do stonnidist-v2 nesta fase.</div>' +
        '  </div>' +
        '  <div class="empty-state">' +
        '    <div class="empty-state-icon">📇</div>' +
        '    <h3>CRM em migração</h3>' +
        '    <p>Enquanto isso, o CRM atual segue no ar normalmente na URL de produção.</p>' +
        '  </div>' +
        '</div>';
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
