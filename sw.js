// ============================================================
//  SERVICE WORKER — Stonni Portal & CRM (PWA)
//  Estratégia: network-first para o código do app (deploy novo sempre
//  vence quando online), cache como fallback offline. NUNCA cacheia
//  chamadas ao Supabase/Auth — essas passam direto pela rede.
//
//  ⚠️ Ao subir um deploy, BUMPAR CACHE_VERSION para invalidar o cache antigo.
// ============================================================
const CACHE_VERSION = 'stonni-v4-20260814';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
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
