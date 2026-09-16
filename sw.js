// ============================================================
//  SERVICE WORKER — Stonni Portal & CRM (PWA)
//  Estratégia: network-first para o código do app (deploy novo sempre
//  vence quando online), cache como fallback offline. NUNCA cacheia
//  chamadas ao Supabase/Auth — essas passam direto pela rede.
//
//  ⚠️ Ao subir um deploy, BUMPAR CACHE_VERSION para invalidar o cache antigo.
// ============================================================
// v6 engloba o v5 que veio do 0de5264: a versao mais nova vence, e o
// APP_SHELL abaixo ja e o dos dois lados somados.
// v7: a porta do app passou a conferir modulo (temAcessoStonni). O index.html
// esta no APP_SHELL, entao sem bumpar aqui quem ja instalou o PWA continuaria
// arrancando pela casca velha quando estiver offline.
const CACHE_VERSION = 'stonni-v7-20260916';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // O ?v= tem de ser IDENTICO ao do <link>/<img> no index.html: caches.match
  // casa a URL inteira, query string incluida. Se divergir, o arranque offline
  // pinta o app sem estilo nenhum — e nao da erro, so fica feio.
  './ds/stonni-ds.css?v=20260915',
  './ds/stonni-icones.css?v=20260915',
  './logo-stonni-ink.png?v=20260916',
  './logo-stonni-white.png?v=20260916',
];

// Instala: pré-cacheia a casca (para abrir offline). Não falha o SW se algum item faltar.
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(APP_SHELL.map((u) => cache.add(u)))
    )
  );
});

// Ativa: remove caches de versões anteriores.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Só cuida de GET do mesmo domínio (o app estático). Todo o resto
  // (Supabase REST/Auth/Functions, fontes, Bling) vai direto pra rede.
  const mesmoDominio = url.origin === self.location.origin;
  if (req.method !== 'GET' || !mesmoDominio) return;

  // Network-first: tenta a rede; se der certo, atualiza o cache; se falhar, usa o cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copia)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match('./index.html'))
      )
  );
});
