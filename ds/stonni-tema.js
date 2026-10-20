/* Stonni — tema claro/escuro/sistema.
   Carregar SÍNCRONO no <head>, ANTES do CSS (evita flash de tema errado).
   Preferência salva em localStorage 'bononi-tema' = claro | escuro | sistema (padrão).
   Aplica <html data-theme="light|dark">, ajusta <meta name="theme-color"> e dispara
   o evento 'tema-mudou' no document (detail.tema = 'dark'|'light') — gráficos
   (Chart.js/recharts) e qualquer cor lida em JS devem reagir a ele.
   API: BnnTema.preferencia() · BnnTema.efetivo() · BnnTema.definir('claro'|'escuro'|'sistema')
        BnnTema.ciclar() · BnnTema.botao(elementoContainer) */
(function(){
  if (window.BnnTema) return;
  var KEY = 'bononi-tema', ESCURO_META = '#100b2e';
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var metaOrig = null, botoes = [];

  function ler(){
    try { var v = localStorage.getItem(KEY); return (v === 'claro' || v === 'escuro') ? v : 'sistema'; }
    catch (e) { return 'sistema'; }
  }
  function efetivo(p){
    p = p || ler();
    return (p === 'escuro' || (p === 'sistema' && mq && mq.matches)) ? 'dark' : 'light';
  }
  function meta(){ return document.querySelector('meta[name="theme-color"]'); }

  function aplicar(emitir){
    var t = efetivo(), el = document.documentElement;
    el.setAttribute('data-theme', t);
    var m = meta();
    if (m) {
      if (metaOrig === null) metaOrig = m.getAttribute('content') || '';
      m.setAttribute('content', t === 'dark' ? ESCURO_META : metaOrig);
    }
    for (var i = 0; i < botoes.length; i++) pintar(botoes[i]);
    if (emitir) {
      try { document.dispatchEvent(new CustomEvent('tema-mudou', { detail: { tema: t } })); } catch (e) {}
    }
  }

  function definir(p){
    try { if (p === 'sistema') localStorage.removeItem(KEY); else localStorage.setItem(KEY, p); } catch (e) {}
    aplicar(true);
  }
  function ciclar(){
    var p = ler();
    definir(p === 'sistema' ? 'claro' : p === 'claro' ? 'escuro' : 'sistema');
  }

  var ICONES = {
    sistema: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    claro: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    escuro: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
  };
  var ROTULO = { sistema: 'Tema: automático (segue o aparelho)', claro: 'Tema: claro', escuro: 'Tema: escuro' };

  function pintar(b){
    var p = ler();
    b.setAttribute('aria-label', ROTULO[p] + '. Clique para trocar.');
    b.setAttribute('title', ROTULO[p]);
    b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONES[p] + '</svg>';
  }

  function estilo(){
    if (document.getElementById('bnn-tema-css')) return;
    var s = document.createElement('style');
    s.id = 'bnn-tema-css';
    s.textContent = '.bnn-tema-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;padding:0;border:1px solid var(--border-default,#c6ccd6);border-radius:var(--radius-md,5px);background:var(--surface-card,#fff);color:var(--text-body,#1f232b);cursor:pointer;flex-shrink:0}.bnn-tema-btn:hover{background:var(--surface-hover,#eef1f5)}.bnn-tema-btn:focus-visible{outline:none;box-shadow:var(--focus-ring,0 0 0 2px #fff,0 0 0 4px #14161a)}';
    (document.head || document.documentElement).appendChild(s);
  }

  function botao(container){
    if (!container) return null;
    estilo();
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'bnn-tema-btn';
    b.addEventListener('click', ciclar);
    botoes.push(b);
    pintar(b);
    container.appendChild(b);
    return b;
  }

  window.BnnTema = { preferencia: ler, efetivo: efetivo, definir: definir, ciclar: ciclar, botao: botao };

  aplicar(false);
  document.addEventListener('DOMContentLoaded', function(){ aplicar(false); });
  if (mq) {
    var onSis = function(){ if (ler() === 'sistema') aplicar(true); };
    if (mq.addEventListener) mq.addEventListener('change', onSis); else if (mq.addListener) mq.addListener(onSis);
  }
  window.addEventListener('storage', function(e){ if (e.key === KEY) aplicar(true); });
})();
