import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CLIENT_ID = Deno.env.get('BLING_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('BLING_CLIENT_SECRET') ?? '';

// Host oficial da API de dados do Bling. O antigo www.bling.com.br foi
// bloqueado ("Acesso nao permitido") e passou a exigir api.bling.com.br.
const BLING_API = 'https://api.bling.com.br/Api/v3';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SB_HEADERS = {
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

const TOKEN_MARGIN_MS = 120_000;
const LOCK_TTL_MS     = 20_000;
const LOCK_WAIT_MS    = 10_000;
const DEFAULT_EXPIRES_S = 21_600;

async function lerConfigMulti(chaves: string[]): Promise<Record<string, string>> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ped_configuracoes?chave=in.(${chaves.join(',')})&select=chave,valor`,
    { headers: SB_HEADERS }
  );
  const rows = await res.json() as { chave: string; valor: string }[];
  const map: Record<string, string> = {};
  if (Array.isArray(rows)) for (const r of rows) map[r.chave] = r.valor;
  return map;
}

async function upsertConfig(chave: string, valor: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/ped_configuracoes?on_conflict=chave`, {
    method: 'POST',
    headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ chave, valor, atualizado_em: new Date().toISOString() }),
  });
}

async function trocarToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; expires_in?: number }> {
  const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const tokenRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${creds}` },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Erro token: ${JSON.stringify(tokenData)}`);
  return tokenData;
}

async function persistirTokens(t: { access_token: string; refresh_token: string; expires_in?: number }): Promise<void> {
  const expMs = Date.now() + ((t.expires_in ?? DEFAULT_EXPIRES_S) * 1000);
  await Promise.all([
    upsertConfig('bling_refresh_token', t.refresh_token),
    upsertConfig('bling_access_token', t.access_token),
    upsertConfig('bling_access_token_exp', String(expMs)),
  ]);
}

function tokenValido(cfg: Record<string, string>): string | null {
  const at = cfg['bling_access_token'];
  const exp = parseInt(cfg['bling_access_token_exp'] || '0', 10);
  if (at && exp && (exp - TOKEN_MARGIN_MS) > Date.now()) return at;
  return null;
}

async function tentarAdquirirLock(): Promise<boolean> {
  const until = String(Date.now() + LOCK_TTL_MS);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/ped_configuracoes?chave=eq.bling_refresh_lock&valor=lt.${Date.now()}`,
    {
      method: 'PATCH',
      headers: { ...SB_HEADERS, Prefer: 'return=representation' },
      body: JSON.stringify({ valor: until }),
    }
  );
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0;
}

async function liberarLock(): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/ped_configuracoes?chave=eq.bling_refresh_lock`, {
    method: 'PATCH',
    headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ valor: '0' }),
  }).catch(() => {});
}

async function renovarToken(): Promise<string> {
  let cfg = await lerConfigMulti(['bling_access_token', 'bling_access_token_exp', 'bling_refresh_token']);
  const cached = tokenValido(cfg);
  if (cached) return cached;

  const deadline = Date.now() + LOCK_WAIT_MS;
  while (true) {
    if (await tentarAdquirirLock()) {
      try {
        cfg = await lerConfigMulti(['bling_access_token', 'bling_access_token_exp', 'bling_refresh_token']);
        const jaValido = tokenValido(cfg);
        if (jaValido) return jaValido;
        const tokenData = await trocarToken(cfg['bling_refresh_token']);
        await persistirTokens(tokenData);
        return tokenData.access_token;
      } finally {
        await liberarLock();
      }
    }
    if (Date.now() > deadline) {
      cfg = await lerConfigMulti(['bling_access_token', 'bling_access_token_exp', 'bling_refresh_token']);
      const ultimo = tokenValido(cfg);
      if (ultimo) return ultimo;
      const tokenData = await trocarToken(cfg['bling_refresh_token']);
      await persistirTokens(tokenData);
      return tokenData.access_token;
    }
    await new Promise(r => setTimeout(r, 400));
    cfg = await lerConfigMulti(['bling_access_token', 'bling_access_token_exp']);
    const agoraValido = tokenValido(cfg);
    if (agoraValido) return agoraValido;
  }
}

async function buscarTodasFotos(idBling: number, accessToken: string, prodObj: Record<string, unknown>): Promise<{ fotos: string[]; miniatura: string | null }> {
  try {
    const imgRes = await fetch(`${BLING_API}/produtos/${idBling}/imagens`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (imgRes.ok) {
      const imgData = await imgRes.json();
      const lista = Array.isArray(imgData?.data) ? imgData.data as Record<string, unknown>[] : [];
      const sorted = lista.sort((a, b) => Number(a.ordem ?? 99) - Number(b.ordem ?? 99));
      const fotos = sorted.map(i => (i.link || i.url || '') as string).filter(Boolean);
      const miniatura = (sorted[0]?.linkMiniatura || sorted[0]?.link || null) as string | null;
      if (fotos.length > 0) return { fotos, miniatura };
    }
  } catch (_) { }
  const midia = prodObj?.midia as Record<string, unknown> | null;
  if (!midia) return { fotos: [], miniatura: null };
  const imagens = midia.imagens as Record<string, unknown> | null;
  if (!imagens) return { fotos: [], miniatura: null };
  const internas = Array.isArray(imagens.internas) ? imagens.internas as Record<string, unknown>[] : [];
  const fotos = internas.map(i => (i.link || '') as string).filter(Boolean);
  const miniatura = (internas[0]?.linkMiniatura || internas[0]?.link || null) as string | null;
  if (fotos.length > 0) return { fotos, miniatura };
  const externas = Array.isArray(imagens.externas) ? imagens.externas as Record<string, unknown>[] : [];
  const fotosExt = externas.map(i => (i.link || i.url || '') as string).filter(Boolean);
  return { fotos: fotosExt, miniatura: fotosExt[0] || null };
}

async function deletarFotosAntigas(skuLimpo: string): Promise<void> {
  try {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/pedidos-docs`, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: `catalogo/${skuLimpo}/`, limit: 20 }),
    });
    if (!listRes.ok) return;
    const arquivos = await listRes.json() as { name: string }[];
    if (!Array.isArray(arquivos) || !arquivos.length) return;
    const paths = arquivos.map(a => `catalogo/${skuLimpo}/${a.name}`);
    await fetch(`${SUPABASE_URL}/storage/v1/object/pedidos-docs`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paths }),
    });
  } catch (_) { }
}

async function uploadParaStorage(urlOrigem: string, storagePath: string): Promise<string | null> {
  try {
    const imgRes = await fetch(urlOrigem);
    if (!imgRes.ok) return null;
    const blob = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/pedidos-docs/${storagePath}`;
    let upRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': contentType },
      body: blob,
    });
    if (!upRes.ok) {
      upRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': contentType, 'x-upsert': 'true' },
        body: blob,
      });
    }
    if (!upRes.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/pedidos-docs/${storagePath}`;
  } catch (_) { return null; }
}

function extrairDimensoes(prodObj: Record<string, unknown>): Record<string, unknown> {
  const dim = prodObj?.dimensoes as Record<string, unknown> | null;
  const pesoBruto = parseFloat(String(prodObj?.pesoBruto || 0)) || null;
  const pesoLiquido = parseFloat(String(prodObj?.pesoLiquido || 0)) || null;
  const largura = dim ? parseFloat(String(dim.largura || 0)) || null : null;
  const altura = dim ? parseFloat(String(dim.altura || 0)) || null : null;
  const profundidade = dim ? parseFloat(String(dim.profundidade || 0)) || null : null;
  return { peso_kg: pesoBruto || pesoLiquido, altura_cm: altura, largura_cm: largura, comprimento_cm: profundidade };
}

// ── Porta de entrada (06/10/2026) ─────────────────────────────────────────────
// Esta função respondia a qualquer pessoa sem login, e cada chamada renova o token do Bling. A chave
// anon pública é um JWT válido, então o Verify JWT não bastaria; a checagem é feita aqui, ANTES de
// renovar o token:
//   1) script/cron: cabeçalho x-sync-key igual a ped_configuracoes.bling_sync_chave; ou
//   2) pessoa logada que seja admin global ou tenha o módulo 'stonni' ou 'atacado' em user_metadata
//      (a mesma regra com que o Comercial Stonni deixa a pessoa entrar).
async function chamadaAutorizada(req: Request): Promise<boolean> {
  const recebida = req.headers.get('x-sync-key') ?? '';
  if (recebida) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ped_configuracoes?chave=eq.bling_sync_chave&select=valor`, { headers: SB_HEADERS });
    const esperada: string = r.ok ? ((await r.json())?.[0]?.valor ?? '') : '';
    if (!esperada || esperada.length !== recebida.length) return false;
    let dif = 0;
    for (let i = 0; i < esperada.length; i++) dif |= esperada.charCodeAt(i) ^ recebida.charCodeAt(i);
    return dif === 0;
  }
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${token}` } });
  if (!u.ok) return false;
  const meta = (await u.json())?.user_metadata ?? {};
  const mods: string[] = Array.isArray(meta.modulos) ? meta.modulos : [];
  return meta.admin === true || meta.admin === 'true' || mods.includes('stonni') || mods.includes('atacado');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!(await chamadaAutorizada(req))) {
    return new Response(JSON.stringify({ erro: 'nao autorizado' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
  try {
    const url = new URL(req.url);
    const acao = url.searchParams.get('acao') ?? 'produto';
    const sku = url.searchParams.get('sku') ?? '';
    const accessToken = await renovarToken();

    if (acao === 'fotos') {
      if (!sku) return new Response(JSON.stringify({ erro: 'sku obrigatorio' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      const skuLimpo = String(parseInt(sku, 10));
      const buscaRes = await fetch(`${BLING_API}/produtos?codigo=${encodeURIComponent(skuLimpo)}&limite=5`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const buscaData = await buscaRes.json();
      const lista = Array.isArray(buscaData?.data) ? buscaData.data : [];
      if (!lista.length) return new Response(JSON.stringify({ fotos: [], encontrado: false }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      const idBling = lista[0]?.id as number;
      const nomeBling = lista[0]?.nome;
      const detalheRes = await fetch(`${BLING_API}/produtos/${idBling}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const detalheData = await detalheRes.json();
      const prodObj = detalheData?.data as Record<string, unknown> || {};
      const { fotos } = await buscarTodasFotos(idBling, accessToken, prodObj);
      return new Response(JSON.stringify({ fotos, encontrado: true, nome: nomeBling, id_bling: idBling, total_fotos: fotos.length }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (acao === 'fotos-cache') {
      if (!sku) return new Response(JSON.stringify({ erro: 'sku obrigatorio' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      const skuLimpo = String(parseInt(sku, 10));
      const buscaRes = await fetch(`${BLING_API}/produtos?codigo=${encodeURIComponent(skuLimpo)}&limite=5`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const buscaData = await buscaRes.json();
      const lista = Array.isArray(buscaData?.data) ? buscaData.data : [];
      if (!lista.length) return new Response(JSON.stringify({ fotos: [], foto_miniatura: null, encontrado: false }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      const idBling = lista[0]?.id as number;
      const nomeBling = lista[0]?.nome;
      const detalheRes = await fetch(`${BLING_API}/produtos/${idBling}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const detalheData = await detalheRes.json();
      const prodObj = detalheData?.data as Record<string, unknown> || {};
      const { fotos: fotosOriginais, miniatura: urlMiniaturaBling } = await buscarTodasFotos(idBling, accessToken, prodObj);
      if (!fotosOriginais.length) {
        return new Response(JSON.stringify({ fotos: [], foto_miniatura: null, encontrado: true, nome: nomeBling }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
      await deletarFotosAntigas(skuLimpo);
      const ts = Date.now();
      const fotosCache: string[] = [];
      const fotosPara = fotosOriginais.slice(0, 6);
      for (let i = 0; i < fotosPara.length; i++) {
        const ext = fotosPara[i].includes('.png') ? 'png' : 'jpg';
        const path = `catalogo/${skuLimpo}/${ts}_${i}.${ext}`;
        const urlCache = await uploadParaStorage(fotosPara[i], path);
        if (urlCache) fotosCache.push(urlCache);
      }
      let fotoMiniaturaCache: string | null = null;
      const urlParaMiniatura = urlMiniaturaBling || fotosOriginais[0];
      if (urlParaMiniatura) {
        const ext = urlParaMiniatura.includes('.png') ? 'png' : 'jpg';
        fotoMiniaturaCache = await uploadParaStorage(urlParaMiniatura, `catalogo/${skuLimpo}/${ts}_miniatura.${ext}`);
      }
      return new Response(JSON.stringify({ fotos: fotosCache, foto_miniatura: fotoMiniaturaCache, encontrado: true, nome: nomeBling, id_bling: idBling, total_fotos: fotosCache.length }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (acao === 'dimensoes') {
      if (!sku) return new Response(JSON.stringify({ erro: 'sku obrigatorio' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      const skuLimpo = String(parseInt(sku, 10));
      const buscaRes = await fetch(`${BLING_API}/produtos?codigo=${encodeURIComponent(skuLimpo)}&limite=5`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const buscaData = await buscaRes.json();
      const lista = Array.isArray(buscaData?.data) ? buscaData.data : [];
      if (!lista.length) return new Response(JSON.stringify({ encontrado: false }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      const idBling = lista[0]?.id;
      const nomeBling = lista[0]?.nome;
      const detalheRes = await fetch(`${BLING_API}/produtos/${idBling}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const detalheData = await detalheRes.json();
      const prodObj = detalheData?.data as Record<string, unknown>;
      const dimensoes = extrairDimensoes(prodObj || {});
      return new Response(JSON.stringify({ encontrado: true, nome: nomeBling, id_bling: idBling, ...dimensoes }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (acao === 'produto') {
      if (!sku) return new Response(JSON.stringify({ erro: 'sku obrigatorio' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
      const skuLimpo = String(parseInt(sku, 10));
      const res = await fetch(`${BLING_API}/produtos?codigo=${encodeURIComponent(skuLimpo)}&limite=5`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (acao === 'listar') {
      const pagina = parseInt(url.searchParams.get('pagina') ?? '1');
      const res = await fetch(`${BLING_API}/produtos?situacao=A&limite=100&pagina=${pagina}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      const data = await res.json();
      return new Response(JSON.stringify(data), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ erro: `Acao desconhecida: ${acao}` }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ erro: msg }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
