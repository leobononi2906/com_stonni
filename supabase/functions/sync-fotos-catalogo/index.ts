import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Rotina automatica de fotos do catalogo (Bling) — substitui o botao "Sincronizar todos".
// Roda em lotes pequenos (BATCH) revezando os produtos por fotos_sync_em, e so
// re-sincroniza foto com mais de STALE_DAYS dias (ou nunca sincronizada / produto novo).
// Reusa a edge bling-proxy (acao=fotos-cache) que baixa a foto do Bling pro Storage.
// Agendada por pg_cron (de hora em hora). verify_jwt=false: chamada pelo cron via pg_net.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SB = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

const BATCH = 12;
const STALE_DAYS = 7;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

// 28/10/2026: só o cron (header x-cron-chave = segredo `geral_cron_chave` do Vault, conferido pela RPC
// geral_cron_chave_confere, Hub 0078) ou a chave de serviço. Antes qualquer um com a URL disparava a função.
async function chamadaAutorizada(req: Request): Promise<boolean> {
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (servico && token === servico) return true;
  const chave = req.headers.get("x-cron-chave") ?? "";
  if (chave.length < 32) return false;
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/geral_cron_chave_confere`, {
    method: "POST",
    headers: { apikey: servico, Authorization: `Bearer ${servico}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_chave: chave }),
  }).catch(() => null);
  return !!r && r.ok && (await r.json().catch(() => false)) === true;
}

Deno.serve(async (req) => {
  if (req.method !== "OPTIONS" && !(await chamadaAutorizada(req))) {
    return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  try {
    const desde = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString();
    const filtro = `and=(ativo.eq.true,referencia.not.is.null,or(sync_fotos.is.null,sync_fotos.eq.true),or(fotos_sync_em.is.null,fotos_sync_em.lt.${encodeURIComponent(desde)}))`;
    const q = `${SUPABASE_URL}/rest/v1/ped_catalogo_produtos?${filtro}&select=id,referencia&order=fotos_sync_em.asc.nullsfirst&limit=${BATCH}`;
    const prods = await fetch(q, { headers: SB }).then(r => r.json());
    if (!Array.isArray(prods) || prods.length === 0) {
      return json({ ok: true, processados: 0, msg: 'nada para sincronizar' });
    }

    let comFoto = 0, semFoto = 0, erro = 0;
    for (const p of prods) {
      try {
        const sku = String(parseInt(p.referencia, 10));
        const r = await fetch(
          `${SUPABASE_URL}/functions/v1/bling-proxy?acao=fotos-cache&sku=${sku}`,
          { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
        ).then(r => r.json()).catch(() => ({}));

        const patch: Record<string, unknown> = { fotos_sync_em: new Date().toISOString() };
        if (Array.isArray(r?.fotos) && r.fotos.length > 0) {
          patch.fotos = r.fotos;
          if (r.foto_miniatura) patch.foto_miniatura = r.foto_miniatura;
          comFoto++;
        } else {
          semFoto++;
        }
        await fetch(`${SUPABASE_URL}/rest/v1/ped_catalogo_produtos?id=eq.${p.id}`, {
          method: 'PATCH', headers: { ...SB, Prefer: 'return=minimal' }, body: JSON.stringify(patch),
        });
      } catch (_) { erro++; }
      await new Promise(r => setTimeout(r, 300));
    }
    return json({ ok: true, processados: prods.length, com_foto: comFoto, sem_foto: semFoto, erro });
  } catch (e) {
    return json({ ok: false, erro: e instanceof Error ? e.message : String(e) }, 500);
  }
});
