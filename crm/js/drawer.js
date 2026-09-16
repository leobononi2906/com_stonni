// ═══ STONNI ATACADO — drawer.js ═══
// ── Drawer ─────────────────────────────────────────────────
async function selCliente(id){
  S.selId=id;
  let lista;
  if(S.mainTab==='carteira') lista=S.carteira;
  else lista=S.prospGeral;
  S.selCliente=lista.find(c=>c.id_cliente===id)||null;
  renderLista();
  document.getElementById('drawer')?.classList.add('open');
  document.getElementById('cd-ph')?.classList.add('hidden');
  document.getElementById('dw-title').textContent=S.selCliente?.nome_cliente||'Ficha';
  document.getElementById('dw-wa').style.display='none';
  document.getElementById('dw-body').innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:80px;color:var(--neutral-600)"><span class="spin">⟳</span></div>';
  await loadDetalhe(id);
  renderDrawer();
}
function closeDrawer(){
  document.getElementById('drawer')?.classList.remove('open');
  document.getElementById('cd-ph')?.classList.remove('hidden');
  S.selId=null;S.selCliente=null;
  renderLista();
}
function renderDrawer(){
  const el=document.getElementById('dw-body');if(!el||!S.selCliente)return;
  const c=S.selCliente;
  const dim=S.dimMap.get(c.id_cliente)||{};
  const st=getStatus(c);
  const fat=S.pedidos.reduce((s,p)=>s+docFat(p),0);
  const qtd=S.pedidos.length;
  const telPrinc=S.telefones.find(t=>t.principal)||S.telefones[0];
  const waEl=document.getElementById('dw-wa');
  if(waEl) waEl.style.display='none';

  el.innerHTML=`
    <div>
      ${S.dupSugestao?`<div style="background:var(--warning-50);border:1px solid var(--warning-600);border-radius:var(--radius-lg);padding:var(--space-2-5) var(--space-3);margin-bottom:var(--space-2-5)">
        <div style="font-size:var(--fs-100);font-weight:700;color:var(--warning-600);margin-bottom:3px"><i class="ic ic-sm" data-ic="alert-triangle"></i> Possível duplicado ${S.dupSugestao.motivo==='CNPJ'?'· mesmo CNPJ':'· mesmo telefone'}</div>
        <div style="font-size:11.5px;color:var(--text-secondary);margin-bottom:var(--space-2)">
          Existe no ERP: <strong>${escH(sN(S.dupSugestao.nome_erp))}</strong>${S.dupSugestao.faturamento_erp?` · R$ ${Number(S.dupSugestao.faturamento_erp).toLocaleString('pt-BR',{maximumFractionDigits:0})} em distribuição`:''}.
          ${S.dupSugestao.motivo==='TELEFONE'?'<br><span style="color:var(--warning-600)">Telefone igual não garante mesmo cliente — confira antes.</span>':''}
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <button onclick="fundirDuplicado()" style="font-size:var(--fs-090);font-weight:700;padding:5px var(--space-3);border:none;border-radius:var(--radius-lg);background:var(--green);color:var(--neutral-0);cursor:pointer">Fundir cards</button>
          <button onclick="ignorarDuplicado()" style="font-size:var(--fs-090);font-weight:600;padding:5px var(--space-3);border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--surface);color:var(--text-secondary);cursor:pointer">Ignorar</button>
        </div>
      </div>`:''}
      <div class="dc-nome">${c.nome_cliente}</div>
      <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap;margin-top:var(--space-2)">
        ${bdg(st)}
      </div>
      ${semaforo(c)}
      <div class="dc-info">
        ${(dim.cnpj_cpf||c.cnpj_cpf)?`<span style="font-family:monospace">${fmtC(dim.cnpj_cpf||c.cnpj_cpf)}</span>`:''}
        ${(dim.cidade||c.cidade)?`<span>${dim.cidade||c.cidade}${(dim.uf||c.uf)?' - '+(dim.uf||c.uf):''}</span>`:''}
        ${dim.email?`<span><i class="ic ic-sm" data-ic="mail"></i> ${dim.email}</span>`:''}
        <span style="color:var(--neutral-700)">Cód. ERP: ${c.id_cliente}</span>
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-2);margin-top:var(--space-2-5);flex-wrap:wrap">
        <span style="font-size:var(--fs-090);color:var(--text-muted)">Vendedor:</span>
        <strong style="font-size:var(--fs-100);color:var(--text-primary)">${c.nome_vendedor_responsavel?sN(c.nome_vendedor_responsavel):'<em style=\"color:var(--purple);font-style:normal;font-weight:600\">Sem vendedor</em>'}</strong>
        ${c.dono_por_venda?`<span title="Vinculado automaticamente por ter feito a última venda de distribuição" style="font-size:9.5px;font-weight:700;background:var(--green-bg);color:var(--green);border-radius:var(--radius-sm);padding:var(--space-0-5) 7px;white-space:nowrap"><i class="ic ic-sm" data-ic="receipt"></i> por venda</span>`:''}
        <button onclick="abrirModalVendedor(${c.id_cliente},'${esc(c.nome_cliente)}',${c.id_vendedor_responsavel||'null'})"
          style="font-size:var(--fs-090);padding:3px 9px;border:1.5px solid var(--border);border-radius:var(--radius-lg);color:var(--blue-mid);background:var(--blue-pale);cursor:pointer;font-weight:600">
          <i class="ic ic-sm" data-ic="pencil"></i> Alterar
        </button>
        ${!c.nome_vendedor_responsavel?`<button class="btn-assumir" style="padding:3px 9px;font-size:var(--fs-090)" onclick="assumirCliente(${c.id_cliente},'${esc(c.nome_cliente)}')">+ Assumir</button>`:''}
      </div>
      <!-- Ações do cliente -->
      <div style="display:flex;gap:var(--space-1-5);margin-top:var(--space-2-5);flex-wrap:wrap">
        <button onclick="abrirVincularERP(${c.id_cliente},'${esc(c.nome_cliente)}')"
          style="font-size:var(--fs-090);font-weight:600;padding:5px var(--space-2-5);border:1.5px solid var(--border);border-radius:var(--radius-lg);color:var(--text-secondary);background:var(--surface2);cursor:pointer;display:flex;align-items:center;gap:var(--space-1)">
          <i class="ic ic-sm" data-ic="external-link"></i> Vincular ao ERP
        </button>
        <button onclick="abrirEditarCliente(${c.id_cliente},'${esc(c.nome_cliente)}')" 
          style="font-size:var(--fs-090);font-weight:600;padding:5px var(--space-2-5);border:1.5px solid var(--border);border-radius:var(--radius-lg);color:var(--text-secondary);background:var(--surface2);cursor:pointer;display:flex;align-items:center;gap:var(--space-1)">
          <i class="ic ic-sm" data-ic="pencil"></i> Editar Cliente
        </button>
      </div>
    </div>

    <!-- CLIENTES ERP VINCULADOS -->
    ${S.vinculosERP.length ? `
    <div>
      <div class="sec-head" style="margin-bottom:var(--space-1-5)">
        <span class="sec-lbl"><i class="ic ic-sm" data-ic="external-link"></i> Códigos ERP Vinculados (${S.vinculosERP.length})</span>
        <button onclick="abrirVincularERP(${c.id_cliente},'${esc(c.nome_cliente)}')" class="link-add">+ Adicionar</button>
      </div>
      <p style="font-size:var(--fs-075);color:var(--text-muted);margin-bottom:var(--space-2)">Pedidos, última compra e status consideram o mais recente entre todos os códigos.</p>
      ${S.vinculosERP.map(v=>`
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-2) var(--space-3);margin-bottom:var(--space-1-5);gap:var(--space-2)">
          <div style="flex:1;min-width:0">
            <div style="font-size:var(--fs-200);font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${v.nome_cliente_erp||'—'}</div>
            <div style="font-size:var(--fs-090);color:var(--text-muted);margin-top:1px">
              <span>#${v.id_cliente_erp}</span>
              ${v.cnpj_cpf_erp?`<span style="margin-left:var(--space-2)">${fmtC(v.cnpj_cpf_erp)}</span>`:''}
            </div>
          </div>
          <div style="display:flex;gap:var(--space-1-5);flex-shrink:0">
            <button onclick="editarVincERP('${v.id}','${esc(v.nome_cliente_erp||'')}','${esc(v.cnpj_cpf_erp||'')}',${c.id_cliente})"
              style="font-size:var(--fs-090);padding:var(--space-1) var(--space-2);border:1.5px solid var(--border);border-radius:var(--radius-lg);color:var(--blue-mid);background:var(--blue-pale);cursor:pointer;font-weight:500">
              <i class="ic ic-sm" data-ic="pencil"></i> Editar
            </button>
            <button onclick="desvincularERP('${v.id}',${c.id_cliente},'${esc(v.nome_cliente_erp||'')}')"
              style="font-size:var(--fs-090);padding:var(--space-1) var(--space-2);border:1.5px solid var(--border);border-radius:var(--radius-lg);color:var(--red);background:var(--red-bg);cursor:pointer;font-weight:500">
              <i class="ic ic-sm" data-ic="x"></i> Remover
            </button>
          </div>
        </div>`).join('')}
      <p style="font-size:var(--fs-075);color:var(--text-muted);margin-top:var(--space-1)">
        <i class="ic ic-sm" data-ic="lightbulb"></i> Pedidos e datas consideram o mais recente entre todos os ERP vinculados
      </p>
    </div>` : ''}

    ${S.finAlerta ? `
    <div style="display:flex;align-items:center;gap:var(--space-2-5);padding:var(--space-2-5) var(--space-3);background:var(--danger-50);border:1.5px solid var(--danger-100);border-radius:var(--radius-lg);margin-bottom:var(--space-0-5)">
      <span style="font-size:var(--fs-550)"><i class="ic ic-sm" data-ic="alert-triangle"></i></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--fs-100);font-weight:700;color:var(--danger-600)">Pendência Financeira</div>
        <div style="font-size:var(--fs-090);color:var(--danger-700);margin-top:1px">
          ${S.finAlerta.qtd} título${S.finAlerta.qtd>1?'s':''} em aberto · ${fmt(S.finAlerta.total)} · maior atraso: ${S.finAlerta.maxAtraso}d
        </div>
      </div>
    </div>` : ''}
    <div class="kmini-row">
      <div class="kmini"><div class="l">Faturamento</div><div class="v">${fmt(fat)}</div></div>
      <div class="kmini"><div class="l">Pedidos</div><div class="v">${qtd}</div></div>
      <div class="kmini"><div class="l">Ticket Médio</div><div class="v">${fmt(qtd?fat/qtd:0)}</div></div>
    </div>

    <div>
      <div class="sec-head">
        <span class="sec-lbl"><i class="ic ic-sm" data-ic="phone"></i> Telefones</span>
        <span class="link-add" onclick="togglePhForm()">+ Adicionar</span>
      </div>
      <div id="ph-form" class="ph-form">
        <input id="ph-num" placeholder="Telefone" />
        <input id="ph-nome" placeholder="Nome do contato" />
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn-sv" style="padding:7px" onclick="savePhone(${c.id_cliente},'${esc(c.nome_cliente)}')">Salvar</button>
          <button style="font-size:var(--fs-100);color:var(--text-subtle);padding:7px var(--space-2-5)" onclick="togglePhForm()">Cancelar</button>
        </div>
      </div>
      ${S.telefones.map(t=>{
        const umbl = S.umblerTelMap?.get(t.telefone);
        return `<div class="phone-card">
          <div class="ph-info">
            <span class="ph-num">${fmtP(t.telefone)}</span>
            ${t.nome_contato?`<span class="ph-name">${t.nome_contato}${t.cargo?' · '+t.cargo:''}</span>`:''}
            ${t.descricao&&!t.nome_contato?`<span class="ph-name" style="color:var(--text-muted)">(${t.descricao})</span>`:''}
            ${t.principal?'<span class="ph-princ">Principal</span>':''}
            ${umbl?`<span style="font-size:var(--fs-075);color:var(--blue-mid);font-weight:600"><i class="ic ic-sm" data-ic="message-square"></i> Umbler · ${sN(umbl.nome_atendente)} · ${fmtD(umbl.ultimo_contato)}</span>`:''}
          </div>
          <div class="ph-acts">

            <button class="ph-del" title="Remover" onclick="delPhone('${t.id}')"><i class="ic ic-sm" data-ic="x"></i></button>
          </div>
        </div>`;
      }).join('')||'<p style="color:var(--neutral-600);font-size:var(--fs-100)">Nenhum telefone</p>'}
    </div>

    ${(S.membrosSecundarios && S.membrosSecundarios.length) ? `
    <div>
      <details class="card-membros">
        <summary>
          <span class="det-arrow">▸</span>
          <span class="sec-lbl"><i class="ic ic-sm" data-ic="clipboard-list"></i> Cadastros vinculados (${S.membrosSecundarios.length})</span>
        </summary>
        <p style="font-size:var(--fs-075);color:var(--text-muted);margin:var(--space-1-5) 0 var(--space-2)">Telefones e notas de outros cadastros do mesmo cliente, reunidos neste card.</p>
        ${S.membrosSecundarios.map(m=>`
          <div style="border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-2-5) var(--space-3);margin-bottom:var(--space-2);background:var(--surface2)">
            <div style="font-size:12.5px;font-weight:700;color:var(--text-primary)">${escH(sN(m.nome))}</div>
            <div style="font-size:10.5px;color:var(--text-muted);margin-top:var(--space-0-5)">
              <span>${m.origem==='MANUAL'?'<i class="ic ic-sm" data-ic="pencil"></i> Manual':'<i class="ic ic-sm" data-ic="archive"></i> ERP'} · #${m.id_cliente}</span>
              ${m.cnpj_cpf?`<span style="margin-left:var(--space-2);font-family:monospace">${fmtC(m.cnpj_cpf)}</span>`:''}
              ${m.cidade?`<span style="margin-left:var(--space-2)">${escH(m.cidade)}${m.uf?' - '+escH(m.uf):''}</span>`:''}
            </div>
            ${m.telefones.length?`
              <div style="margin-top:var(--space-2);display:flex;flex-direction:column;gap:3px">
                ${m.telefones.map(t=>{
                  const umbl=S.umblerTelMap?.get(t.telefone);
                  return `<div style="display:flex;align-items:center;gap:var(--space-2);font-size:var(--fs-100);flex-wrap:wrap">
                    <span style="font-weight:600"><i class="ic ic-sm" data-ic="phone"></i> ${fmtP(t.telefone)}</span>
                    ${t.nome_contato?`<span style="color:var(--text-muted)">${escH(t.nome_contato)}</span>`:''}
                    ${umbl?`<span style="font-size:var(--fs-075);color:var(--blue-mid);font-weight:600"><i class="ic ic-sm" data-ic="message-square"></i> ${sN(umbl.nome_atendente)} · ${fmtD(umbl.ultimo_contato)}</span>`:''}
                  </div>`;
                }).join('')}
              </div>`:'<div style="font-size:var(--fs-090);color:var(--text-muted);margin-top:var(--space-1-5)">Sem telefone neste cadastro</div>'}
            ${m.notas.length?`
              <div style="margin-top:var(--space-2);border-top:1px dashed var(--border);padding-top:var(--space-1-5);display:flex;flex-direction:column;gap:5px">
                ${m.notas.map(n=>`
                  <div style="font-size:11.5px;color:var(--text-secondary)">
                    <span style="display:flex;align-items:center;gap:5px">${tipoBdg(n.tipo)}<span style="color:var(--text-muted);font-size:var(--fs-075)">${fmtD(n.data_criacao)}${n.criado_por?' · '+escH(n.criado_por):''}</span></span>
                    <div style="margin-top:var(--space-0-5)">${escH(n.texto||'')}</div>
                  </div>`).join('')}
              </div>`:''}
          </div>`).join('')}
      </details>
    </div>` : ''}

    <div>
      <div class="sec-head"><span class="sec-lbl"><i class="ic ic-sm" data-ic="package"></i> Últimos Pedidos</span></div>
      ${S.pedidos.length?`
        <table class="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>NF</th>
              <th>Vendedor</th>
              <th class="r">Valor</th>
              <th class="r">Itens</th>
            </tr>
          </thead>
          <tbody>
            ${S.pedidos.map(p=>`
              <tr>
                <td>${fmtD(p.data_faturamento)}</td>
                <td style="font-family:var(--font-mono);color:var(--text-muted);font-size:var(--fs-100)">${p.id_doc||'—'}</td>
                <td style="font-size:var(--fs-090);color:var(--text-secondary)">${p.nome_vendedor?escH(sN(p.nome_vendedor)):'—'}</td>
                <td class="r" style="font-weight:600">${fmt(docFat(p))}</td>
                <td class="r">${p.qtd_itens_doc||0}</td>
              </tr>`).join('')}
          </tbody>
        </table>`:'<p style="color:var(--text-muted);font-size:var(--fs-100)">Sem pedidos no histórico</p>'}
    </div>

    <div>
      <div class="sec-head"><span class="sec-lbl"><i class="ic ic-sm" data-ic="file-text"></i> Tarefas e Notas</span></div>
      <div style="max-height:300px;overflow-y:auto">
        ${S.notas.map(n=>`
          <div class="nota-card${n.resolvido?' done':''}">
            <div class="nc-head">
              <div style="display:flex;align-items:center;gap:var(--space-1-5)">${tipoBdg(n.tipo)}<span class="nc-meta">${fmtD(n.data_criacao)}${n.criado_por?' · '+n.criado_por:''}</span></div>
              <div style="display:flex;gap:var(--space-1);align-items:center">
                ${!n.resolvido && n.tipo==='TAREFA' && !n.reagendado ? `<button style="font-size:var(--fs-075);padding:var(--space-0-5) 7px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--surface2);color:var(--text-secondary);cursor:pointer" onclick="reagendarNotaDrawer('${n.id}','${n.data_prevista||''}',${n.qtd_reagendamentos||0})">↻</button>` : ''}
                ${!n.resolvido?`<button class="btn-res" onclick="resolverNotaDrawer('${n.id}',${c.id_cliente},'${esc(c.nome_cliente)}',${c.id_vendedor_responsavel||'null'})"><i class="ic ic-sm" data-ic="check"></i> Resolver</button>`:'<span style="font-size:var(--fs-075);color:var(--neutral-700)">Resolvido</span>'}
              </div>
            </div>
            <p class="nc-txt">${n.texto}</p>
            ${n.data_prevista?`<p class="nc-date"><i class="ic ic-sm" data-ic="calendar"></i> ${fmtD(n.data_prevista)}</p>`:''}
          </div>`).join('')||'<p style="color:var(--neutral-600);font-size:var(--fs-100)">Nenhuma nota</p>'}
      </div>
    </div>

    <div class="note-box">
      <h4>Novo Registro</h4>
      <div class="row2">
        <select id="nota-tipo" onchange="toggleNotaDate()">
          <option value="OBSERVACAO">Observação</option>
          <option value="TAREFA">Tarefa</option>
          <option value="FOLLOWUP">Follow-up</option>
          <option value="LIGACAO">Ligação</option>
        </select>
        <span id="nota-criado-lbl" style="display:flex;align-items:center;gap:5px;font-size:var(--fs-090);color:var(--text-muted);white-space:nowrap;padding:0 var(--space-1)" title="Vem do seu login — nao e digitado">
          <span style="font-size:var(--fs-100)"><i class="ic ic-sm" data-ic="user"></i></span><strong style="color:var(--text-secondary)">${escH(S.meuNome||'—')}</strong>
        </span>
      </div>
      <textarea id="nota-texto" rows="3" placeholder="Texto da nota..."></textarea>
      <input id="nota-data" type="date" style="display:none" />
      <button class="btn-sv" onclick="salvarNota(${c.id_cliente},'${esc(c.nome_cliente)}',${c.id_vendedor_responsavel||'null'},'${esc(c.nome_vendedor_responsavel||'')}')">Salvar</button>
    </div>`;
}
function toggleNotaDate(){const t=document.getElementById('nota-tipo')?.value;const d=document.getElementById('nota-data');if(d)d.style.display=['TAREFA','FOLLOWUP'].includes(t)?'':'none';}

// Resolver nota a partir do drawer — abre modal próximo contato
async function resolverNotaDrawer(id, idCliente, nomeCliente, idVendedor) {
  await sbUpdate('atac_crm_notas','id',id,{resolvido:true,reagendado:false,data_resolucao:new Date().toISOString()});
  await logAcao('RESOLVER_NOTA', {
    id_cliente: idCliente, nome_cliente: nomeCliente,
    id_vendedor: idVendedor||null
  });
  toast('<i class="ic ic-sm" data-ic="check-circle"></i> Resolvido!');
  await Promise.all([loadOverdue(), renderAlertasCRM()]);
  if(S.selId){await loadDetalhe(S.selId);renderDrawer();}
  renderLista();
  // Abrir modal próximo contato
  const m = document.getElementById('modal-proximo-contato');
  if (!m) return;
  m.dataset.idcliente = idCliente || '';
  m.dataset.nomecliente = nomeCliente || '';
  const dt = new Date();
  dt.setDate(dt.getDate() + 21);
  document.getElementById('pc-data').value = dt.toISOString().split('T')[0];
  document.getElementById('pc-texto').value = '';
  document.getElementById('pc-nome').textContent = nomeCliente || '';
  // Pré-selecionar vendedor do cliente
  const sel = document.getElementById('pc-vend');
  if(sel) {
    sel.innerHTML = '<option value="">Sem vendedor</option>' +
      S.vendedores.map(v=>`<option value="${v.id_vendedor}"${v.id_vendedor===idVendedor?' selected':''}>${v.nome_vendedor}</option>`).join('');
  }
  m.classList.add('open');
}

// Reagendar nota a partir do drawer
function reagendarNotaDrawer(id, dataAtual, qtdReag) {
  const m = document.getElementById('modal-reagendar');
  if (!m) return;
  m.dataset.notaid = id;
  m.dataset.qtdreag = qtdReag;
  // Usar vendedor vinculado ao cliente atual
  m.dataset.idvendedor = S.selCliente?.id_vendedor_responsavel || '';
  const dt = new Date((dataAtual || new Date().toISOString().split('T')[0]) + 'T12:00:00');
  dt.setDate(dt.getDate() + 7);
  document.getElementById('reag-data').value = dt.toISOString().split('T')[0];
  m.classList.add('open');
}
async function salvarNota(cId,cNome,vId,vNome){
  const tipo=document.getElementById('nota-tipo')?.value;
  const texto=document.getElementById('nota-texto')?.value?.trim();
  const criado = S.meuNome || '';   // auditoria: sai do login, nao da digitacao
  const data=document.getElementById('nota-data')?.value;
  if(!texto){toast('Escreva o texto da nota','err');return;}
  if(!criado){toast('Seu login nao esta vinculado a um vendedor — avise o Leo','err');return;}
  if(['TAREFA','FOLLOWUP'].includes(tipo)&&!data){toast('Informe a data prevista','err');return;}
  await sbInsert('atac_crm_notas',{id_cliente:cId,nome_cliente:cNome,tipo,texto,criado_por:criado,data_prevista:data||null,data_criacao:new Date().toISOString(),id_vendedor_responsavel:vId||null,nome_vendedor_responsavel:vNome||null,resolvido:false});
  await logAcao('CRIAR_NOTA', {
    id_cliente: cId, nome_cliente: cNome,
    id_vendedor: vId||null, nome_vendedor: vNome||null,
    detalhe: { tipo, data_prevista: data||null }
  });
  toast('Registro salvo!');
  await loadDetalhe(cId);renderDrawer();
}
function togglePhForm(){document.getElementById('ph-form')?.classList.toggle('open');}
async function savePhone(cId,cNome){
  const tel=document.getElementById('ph-num')?.value?.trim();
  const nome=document.getElementById('ph-nome')?.value?.trim();
  if(!tel){toast('Informe o telefone','err');return;}
  await sbInsert('atac_cliente_telefones',{id_cliente:cId,nome_cliente:cNome,telefone:tel,nome_contato:nome||null,principal:false});
  toast('Telefone adicionado!');
  await loadDetalhe(cId);renderDrawer();
}
async function delPhone(id){
  const ok = await new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:var(--surface-overlay);z-index:9999;display:flex;align-items:center;justify-content:center';
    d.innerHTML = `<div style='background:var(--neutral-0);border-radius:var(--radius-xl);padding:var(--space-6);max-width:300px;width:90%;text-align:center'>
      <p style='margin-bottom:var(--space-4);font-size:var(--fs-300)'>Remover este telefone?</p>
      <div style='display:flex;gap:var(--space-2);justify-content:center'>
        <button id='_dp_n' style='padding:var(--space-2) var(--space-5);border-radius:var(--radius-lg);border:1px solid var(--border-default);background:var(--surface-subtle);cursor:pointer'>Cancelar</button>
        <button id='_dp_s' style='padding:var(--space-2) var(--space-5);border-radius:var(--radius-lg);border:none;background:var(--danger-600);color:var(--neutral-0);cursor:pointer'>Remover</button>
      </div></div>`;
    document.body.appendChild(d);
    d.querySelector('#_dp_s').onclick = () => { d.remove(); res(true); };
    d.querySelector('#_dp_n').onclick = () => { d.remove(); res(false); };
  });
  if (!ok) return;
  await sbDel('atac_cliente_telefones','id',id);
  toast('Removido!');
  await loadDetalhe(S.selId);renderDrawer();
}
