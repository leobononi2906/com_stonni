// Testes da lógica pura da tela Boletos (boletos.js). Rodar: node scripts/teste-boletos.js
const assert = require('assert');
const L = require('../boletos.js');

let n = 0;
const t = (nome, f) => { f(); n++; console.log('ok -', nome); };

t('telefone: tira 55, zero e máscara', () => {
  assert.strictEqual(L.telefoneLimpo('+55 (44) 99870-8200'), '44998708200');
  assert.strictEqual(L.telefoneLimpo('044 3029-1000'), '4430291000');
  assert.strictEqual(L.telefoneLimpo('99870-8200'), null); // sem DDD
  assert.strictEqual(L.telefoneLimpo(''), null);
});

t('link do WhatsApp vai para o número com 55 e o texto codificado', () => {
  assert.strictEqual(L.linkWhats('44998708200', 'Olá & boleto'), 'https://wa.me/5544998708200?text=Ol%C3%A1%20%26%20boleto');
});

t('mensagem: nome curto, linha digitável só quando vem, link do portal', () => {
  const p = {
    cliente: 'COMERCIAL DE PECAS SILVA LTDA ME', portal_url: 'https://cliente.acessoriosbononi.com.br',
    boletos: [
      { num_doc: 'VD-100/P1', valor: 150.5, data_venc: '2026-11-10', linha_digitavel: '74891.12345' },
      { num_doc: 'VD-100/P2', valor: 150.5, data_venc: '2026-12-10', linha_digitavel: null },
    ],
  };
  const m = L.montarMensagem(p, 'João Pedro da Silva');
  assert.ok(m.startsWith('Olá, COMERCIAL DE PECAS! Aqui é João Pedro da, da Stonni.'));
  assert.ok(m.includes('os seus boletos'));
  assert.ok(m.includes('• VD-100/P1 · R$') && m.includes('Linha digitável: 74891.12345'));
  assert.strictEqual(m.split('Linha digitável').length, 2); // só a P1
  assert.ok(m.includes('https://cliente.acessoriosbononi.com.br'));
  assert.ok(!/e-mail/i.test(m));
});

t('situação: vencido, hoje, a vencer', () => {
  assert.deepStrictEqual(L.situacao({ data_venc: '2026-10-27' }, '2026-10-28'), { vencido: true, texto: 'Vencido há 1 dia' });
  assert.deepStrictEqual(L.situacao({ data_venc: '2026-10-28' }, '2026-10-28'), { vencido: false, texto: 'Vence hoje' });
  assert.deepStrictEqual(L.situacao({ data_venc: '2026-11-07' }, '2026-10-28'), { vencido: false, texto: 'Vence em 10 dias' });
});

t('envio: WhatsApp, e-mail, devolvido, pendente', () => {
  assert.ok(L.rotuloEnvio({ situacao: 'outro_canal', canal: 'whatsapp', em: '2026-10-28T15:00:00Z', por: 'Ana' }).texto.startsWith('WhatsApp'));
  assert.strictEqual(L.rotuloEnvio({ situacao: 'enviado', em: null }).texto, 'E-mail');
  assert.strictEqual(L.rotuloEnvio({ situacao: 'devolvido' }).ok, false);
  assert.strictEqual(L.rotuloEnvio({ situacao: 'pendente' }), null);
  assert.strictEqual(L.rotuloEnvio(null), null);
});

t('agrupar: filtro, busca por nome/CNPJ e total por cliente', () => {
  const lista = [
    { codigo: 1, documento: '11222333000144', cliente: 'Loja A', cidade: 'Maringá', num_doc: 'VD-1', valor: 100, data_venc: '2026-10-20' },
    { codigo: 2, documento: '11222333000144', cliente: 'Loja A', cidade: 'Maringá', num_doc: 'VD-2', valor: 50, data_venc: '2026-11-20' },
    { codigo: 3, documento: '99888777000166', cliente: 'Loja B', cidade: 'Londrina', num_doc: 'OS-3', valor: 70, data_venc: '2026-11-01' },
  ];
  const hoje = '2026-10-28';
  assert.strictEqual(L.agrupar(lista, hoje, 'todos', '').length, 2);
  assert.strictEqual(L.agrupar(lista, hoje, 'todos', '')[0].total, 150);
  assert.deepStrictEqual(L.agrupar(lista, hoje, 'avencer', '').map(g => g.boletos.length), [1, 1]);
  assert.deepStrictEqual(L.agrupar(lista, hoje, 'vencidos', '').map(g => g.cliente), ['Loja A']);
  assert.deepStrictEqual(L.agrupar(lista, hoje, 'todos', '99.888').map(g => g.cliente), ['Loja B']);
  assert.deepStrictEqual(L.agrupar(lista, hoje, 'todos', 'londrina').map(g => g.cliente), ['Loja B']);
});

console.log(`\n${n}/${n} ok`);
