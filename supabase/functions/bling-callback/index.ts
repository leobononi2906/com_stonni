import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SUPA_URL = 'https://vishxwdxqiygbxmtpfoy.supabase.co';
const CLIENT_ID = Deno.env.get('BLING_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('BLING_CLIENT_SECRET') ?? '';
const REDIRECT_URI = `${SUPA_URL}/functions/v1/bling-callback`;

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(
      html(`<h2 style="color:#dc2626">Erro OAuth</h2><p>${error}: ${url.searchParams.get('error_description')}</p>`),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  if (!code) {
    return new Response(
      html(`<h2 style="color:#dc2626">Parâmetro code ausente</h2>`),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Troca code pelo token
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const tokenRes = await fetch('https://www.bling.com.br/Api/v3/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'enable-jwt': '1', 'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.refresh_token) {
    return new Response(
      html(`<h2 style="color:#dc2626">Falha ao obter token</h2><pre>${JSON.stringify(tokenData, null, 2)}</pre>`),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Salva o refresh_token no Supabase
  const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const saveRes = await fetch(`${SUPA_URL}/rest/v1/ped_configuracoes?chave=eq.bling_refresh_token`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': svcKey,
      'Authorization': `Bearer ${svcKey}`,
    },
    body: JSON.stringify({ valor: tokenData.refresh_token }),
  });

  if (!saveRes.ok) {
    return new Response(
      html(`<h2 style="color:#dc2626">Token obtido mas falhou ao salvar</h2><pre>${await saveRes.text()}</pre>`),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Salva o access_token também
  if (tokenData.access_token) {
    await fetch(`${SUPA_URL}/rest/v1/ped_configuracoes?chave=eq.bling_api_token`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': svcKey,
        'Authorization': `Bearer ${svcKey}`,
      },
      body: JSON.stringify({ valor: tokenData.access_token }),
    });
  }

  return new Response(
    html(`
      <h2 style="color:#16a34a">✅ Bling conectado com sucesso!</h2>
      <p>Refresh token salvo no Supabase com os novos escopos.</p>
      <p style="color:#6b7280;font-size:14px">Escopos: Produtos + Estoque + Depósitos</p>
      <p style="margin-top:24px"><a href="https://bononiecommerce.vercel.app" style="background:#1e40af;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Voltar ao App</a></p>
    `),
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
});

function html(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bling Auth</title></head>
  <body style="font-family:sans-serif;max-width:500px;margin:80px auto;padding:20px;text-align:center">${body}</body></html>`;
}
