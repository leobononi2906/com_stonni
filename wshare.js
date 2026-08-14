// ============================================================
//  COMPARTILHAR (WhatsApp / share sheet) — peça reutilizável
//  Mobile-first: usa Web Share API com ARQUIVOS (abre o WhatsApp com o
//  anexo já embutido). Fallbacks: share só com link → wa.me com texto+link.
//  Usado por Materiais, Catálogo (fotos) e Catálogos-modelo.
// ============================================================
(function () {
  'use strict';

  function _fnameFromUrl(url, fallback) {
    try {
      const u = new URL(url, location.href);
      const base = (u.pathname.split('/').pop() || '').trim();
      return base || fallback;
    } catch (e) { return fallback; }
  }

  async function _urlToFile(url, fallbackName) {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const blob = await r.blob();
    let name = _fnameFromUrl(url, fallbackName);
    if (!/\.\w{2,5}$/.test(name)) {
      const ext = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[blob.type] || '';
      name = fallbackName + ext;
    }
    return new File([blob], name, { type: blob.type || 'application/octet-stream' });
  }

  // opts: { arquivos:(string|File|Blob)[] (URLs OU arquivos p/ anexar), texto, linkFallback }
  // Retorna { ok, via } — via ∈ share-files | share-link | wa.me | cancel
  async function waShare(opts) {
    const { arquivos = [], texto = '', linkFallback = '' } = opts || {};

    // 1) Ideal: anexar arquivos no share sheet (WhatsApp recebe o arquivo)
    if (arquivos.length && navigator.canShare) {
      try {
        const files = [];
        for (let i = 0; i < arquivos.length; i++) {
          const a = arquivos[i];
          if (a instanceof File) { files.push(a); continue; }
          if (a instanceof Blob) { files.push(new File([a], 'arquivo-' + (i + 1), { type: a.type || 'application/octet-stream' })); continue; }
          files.push(await _urlToFile(a, 'arquivo-' + (i + 1)));
        }
        if (files.length && navigator.canShare({ files })) {
          await navigator.share({ files, text: texto });
          return { ok: true, via: 'share-files' };
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return { ok: false, via: 'cancel' };
        // senão: cai pros fallbacks
      }
    }

    const url = linkFallback || (typeof arquivos[0] === 'string' ? arquivos[0] : '') || '';

    // 2) Share sheet só com link/texto
    if (navigator.share) {
      try {
        await navigator.share({ text: texto, url: url || undefined });
        return { ok: true, via: 'share-link' };
      } catch (e) {
        if (e && e.name === 'AbortError') return { ok: false, via: 'cancel' };
      }
    }

    // 3) Universal: abre o WhatsApp Web/app com texto + link
    const msg = [texto, url].filter(Boolean).join('\n');
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
    return { ok: true, via: 'wa.me' };
  }

  window.waShare = waShare;
})();
