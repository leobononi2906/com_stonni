// ═══ STONNI ATACADO — umbler.js ═══
async function naoComercial(tel){
  const motivo = await new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:var(--surface-overlay);z-index:9999;display:flex;align-items:center;justify-content:center';
    d.innerHTML = `<div style='background:var(--neutral-0);border-radius:var(--radius-xl);padding:var(--space-6);max-width:320px;width:90%'>
      <p style='margin-bottom:var(--space-3);font-size:var(--fs-300);font-weight:600'>Marcar como não comercial</p>
      <input id='_nc_m' placeholder='Motivo obrigatório' style='width:100%;padding:var(--space-2);border:1px solid var(--border-default);border-radius:var(--radius-lg);font-size:var(--fs-200);box-sizing:border-box;margin-bottom:var(--space-3)'>
      <div style='display:flex;gap:var(--space-2);justify-content:flex-end'>
        <button id='_nc_n' style='padding:var(--space-2) var(--space-4);border-radius:var(--radius-lg);border:1px solid var(--border-default);background:var(--surface-subtle);cursor:pointer'>Cancelar</button>
        <button id='_nc_s' style='padding:var(--space-2) var(--space-4);border-radius:var(--radius-lg);border:none;background:var(--blue-500);color:var(--neutral-0);cursor:pointer'>Confirmar</button>
      </div></div>`;
    document.body.appendChild(d);
    d.querySelector('#_nc_s').onclick = () => { const v=d.querySelector('#_nc_m').value.trim(); if(!v){toast('Motivo obrigatório','err');return;} d.remove(); res(v); };
    d.querySelector('#_nc_n').onclick = () => { d.remove(); res(null); };
  });
  if (!motivo) return;
  await sbUpdate('atac_umbler_contatos','telefone',tel,{nao_comercial:true,motivo_nao_comercial:motivo});
  toast('Marcado como não comercial');
  await loadUmbler();renderUmbler();
}
async function naoComercialConfig(tel){
  const motivo = await new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:var(--surface-overlay);z-index:9999;display:flex;align-items:center;justify-content:center';
    d.innerHTML = `<div style='background:var(--neutral-0);border-radius:var(--radius-xl);padding:var(--space-6);max-width:320px;width:90%'>
      <p style='margin-bottom:var(--space-3);font-size:var(--fs-300);font-weight:600'>Marcar como não comercial</p>
      <input id='_ncC_m' placeholder='Motivo obrigatório' style='width:100%;padding:var(--space-2);border:1px solid var(--border-default);border-radius:var(--radius-lg);font-size:var(--fs-200);box-sizing:border-box;margin-bottom:var(--space-3)'>
      <div style='display:flex;gap:var(--space-2);justify-content:flex-end'>
        <button id='_ncC_n' style='padding:var(--space-2) var(--space-4);border-radius:var(--radius-lg);border:1px solid var(--border-default);background:var(--surface-subtle);cursor:pointer'>Cancelar</button>
        <button id='_ncC_s' style='padding:var(--space-2) var(--space-4);border-radius:var(--radius-lg);border:none;background:var(--blue-500);color:var(--neutral-0);cursor:pointer'>Confirmar</button>
      </div></div>`;
    document.body.appendChild(d);
    d.querySelector('#_ncC_s').onclick = () => { const v=d.querySelector('#_ncC_m').value.trim(); if(!v){toast('Motivo obrigatório','err');return;} d.remove(); res(v); };
    d.querySelector('#_ncC_n').onclick = () => { d.remove(); res(null); };
  });
  if (!motivo) return;
  await sbUpdate('atac_umbler_contatos','telefone',tel,{nao_comercial:true,motivo_nao_comercial:motivo});
  toast('Marcado como não comercial');
  renderConfig();
}

// modal vincular cliente
function abrirVinc(tel,nome,atend){
  const m=document.getElementById('modal-vinc');if(!m)return;
  m.dataset.tel=tel;m.dataset.nome=nome;m.dataset.atend=atend||'';
  m.dataset.extra='';
  m.classList.add('open');
  document.getElementById('vinc-search').value='';
  document.getElementById('vinc-results').innerHTML='<p class="empty-msg">Digite para buscar...</p>';
}
function closeVinc(){document.getElementById('modal-vinc')?.classList.remove('open');}

// Abre modal de vincular com cliente do ERP pré-sugerido
async function abrirVincComSugestao(tel, nome, atend, erpId, erpNome) {
  const m = document.getElementById('modal-vinc');
  if (!m) return;
  m.dataset.tel = tel;
  m.dataset.nome = nome;
  m.dataset.atend = atend || '';
  m.dataset.extra = '';
  m.classList.add('open');

  // Pré-popular busca com nome do cliente sugerido
  const input = document.getElementById('vinc-search');
  if (input) input.value = erpNome;

  // Mostrar diretamente o cliente sugerido nos resultados
  const el = document.getElementById('vinc-results');
  if (el) {
    el.innerHTML = `
      <div style="background:var(--blue-veil);border:1px solid var(--blue-veil-strong);border-radius:var(--radius-md);padding:var(--space-2) var(--space-2-5);margin-bottom:var(--space-1-5);font-size:var(--fs-090);color:var(--blue-mid)">
        <i class="ic ic-sm" data-ic="external-link"></i> Sugestão baseada no telefone — confirme se é o cliente correto
      </div>
      <button class="mres-btn" onclick="confirmarVinc(${erpId},'${esc(erpNome)}')" style="border-color:var(--blue-veil-strong)">
        <div class="mres-nome">${erpNome}</div>
        <div class="mres-meta">Cód. ERP #${erpId}</div>
      </button>
      <button onclick="document.getElementById('vinc-search').value='';document.getElementById('vinc-results').innerHTML='<p class=\"empty-msg\">Digite para buscar outro cliente...</p>'"
        style="width:100%;margin-top:var(--space-1-5);padding:var(--space-1-5);font-size:var(--fs-090);color:var(--text-muted);background:transparent;border:1px dashed var(--border);border-radius:var(--radius-md);cursor:pointer">
        Não é esse — buscar outro
      </button>`;
  }
}
async function searchVinc(){
  const q=document.getElementById('vinc-search')?.value?.trim();
  if(!q||q.length<2)return;
  const el=document.getElementById('vinc-results');if(!el)return;
  el.innerHTML='<p class="empty-msg">Buscando...</p>';

  const qNum = isNaN(q) ? 0 : parseInt(q);
  const qCnpj = q.replace(/\D/g,'');

  // Buscar em vw_dim_cliente (todos os clientes do ERP)
  let params = `select=id_cliente,nome_cliente,cnpj,cidade,uf&limit=15`;
  if (qNum > 0) {
    params += `&or=(nome_cliente.ilike.*${encodeURIComponent(q)}*,id_cliente.eq.${qNum})`;
  } else if (qCnpj.length >= 8) {
    params += `&or=(nome_cliente.ilike.*${encodeURIComponent(q)}*,cnpj.ilike.*${qCnpj}*)`;
  } else {
    params += `&nome_cliente=ilike.*${encodeURIComponent(q)}*`;
  }

  const d = await sbQ('vw_dim_cliente', params);
  const res = Array.isArray(d) ? d : [];
  el.innerHTML = res.length
    ? res.map(c=>`<button class="mres-btn" onclick="confirmarVinc(${c.id_cliente},'${esc(c.nome_cliente)}')">
        <div class="mres-nome">${c.nome_cliente}</div>
        ${(c.cnpj||c.cidade)?`<div class="mres-meta">${c.cnpj?fmtC(c.cnpj)+' · ':''}${c.cidade||''}${c.uf?' - '+c.uf:''}</div>`:''}
      </button>`).join('')
    : '<p class="empty-msg">Nenhum cliente encontrado</p>';
}
async function confirmarVinc(cId,cNome){
  const m=document.getElementById('modal-vinc');if(!m)return;
  const tel=m.dataset.tel;
  const isExtra=(m.dataset.extra==='true');

  // Verifica se já tem compras → vai para Carteira ou Prospecção
  // (apenas para novo vínculo, não para extra)
  const principal = !isExtra; // se é o primeiro vínculo, marcar como principal

  await sbInsert('atac_cliente_telefones',{
    id_cliente:cId, nome_cliente:cNome,
    telefone:tel, descricao:'Umbler', principal
  });

  // Auto-detectar vendedor pelo atendente (apenas em novo vínculo)
  if (!isExtra) {
    const atend = m.dataset.atend || '';
    const uvMatch = S.umblerVendMap.find(u =>
      (u.usuario_umbler||'').toLowerCase() === atend.toLowerCase() ||
      (u.nome_vendedor_erp||'').toLowerCase() === atend.toLowerCase() ||
      atend.toLowerCase().includes((u.usuario_umbler||'').toLowerCase().split(' ')[0]) ||
      (u.usuario_umbler||'').toLowerCase().includes(atend.toLowerCase().split(' ')[0])
    );
    if (uvMatch) {
      const vend = S.vendedores.find(v => v.id_vendedor === uvMatch.id_vendedor_erp);
      if (vend) {
        await sbUpsert('atac_cliente_vendedor', {
          id_cliente: cId, nome_cliente: cNome,
          id_vendedor_responsavel: vend.id_vendedor,
          nome_vendedor_responsavel: vend.nome_vendedor,
          atualizado_por: 'UMBLER'
        }, 'id_cliente');
      }
    }
    await logAcao('VINCULAR_TELEFONE', {
      id_cliente: cId, nome_cliente: cNome,
      detalhe: { telefone: tel, atendente: m.dataset.atend || '' }
    });
    toast(`<i class="ic ic-sm" data-ic="check-circle"></i> ${cNome} vinculado`);
    closeVinc();
    await Promise.all([loadUmbler(),loadCarteira(),loadProspeccao()]);
    renderUmbler();renderLista();
  } else {
    // Modo extra: apenas atualiza o drawer
    m.dataset.extra = '';
    toast(`<i class="ic ic-sm" data-ic="external-link"></i> ${cNome} vinculado a este número`);
    closeVinc();
    if (S.selId) { await loadDetalhe(S.selId); renderDrawer(); }
  }
}

// ── MODAL NOVO CONTATO UMBLER → PROSPECÇÃO ────────────────────
function abrirNovoContato(tel, nome, atend) {
  S.novoContatoTel = tel;
  S.novoContatoNome = nome;
  S.novoContatoAtend = atend;
  const m = document.getElementById('modal-novo-contato');
  if (!m) return;
  // preencher campos
  document.getElementById('nc-nome').value = nome || '';
  document.getElementById('nc-tel').value = fmtP(tel) || '';
  document.getElementById('nc-cnpj').value = '';
  document.getElementById('nc-cidade').value = '';
  document.getElementById('nc-uf').value = '';
  // detectar vendedor pelo atendente
  const uvMatch = S.umblerVendMap.find(u =>
    (u.usuario_umbler||'').toLowerCase() === (atend||'').toLowerCase() ||
    (u.nome_vendedor_erp||'').toLowerCase() === (atend||'').toLowerCase()
  );
  // Padrao: o atendente da Umbler; se nao der match, quem esta logado.
  // Continua alteravel — explicito na tela ganha de automatico invisivel.
  const vendId = uvMatch?.id_vendedor_erp || S.meuVendedor?.id || null;
  const sel = document.getElementById('nc-vend');
  if (sel) {
    sel.innerHTML = '<option value="">Sem vendedor (Prospecção Geral)</option>' +
      S.vendedores.map(v => `<option value="${v.id_vendedor}"${v.id_vendedor===vendId?' selected':''}>${v.nome_vendedor}</option>`).join('');
  }
  m.classList.add('open');
}
function fecharNovoContato() {
  document.getElementById('modal-novo-contato')?.classList.remove('open');
}
async function salvarNovoContato() {
  const nome = document.getElementById('nc-nome')?.value?.trim();
  const tel = S.novoContatoTel;
  const cnpj = document.getElementById('nc-cnpj')?.value?.trim();
  const cidade = document.getElementById('nc-cidade')?.value?.trim();
  const uf = document.getElementById('nc-uf')?.value?.trim();
  const vendId = document.getElementById('nc-vend')?.value;
  if (!nome) { toast('Nome é obrigatório', 'err'); return; }
  // Impedir duplicata: checar se telefone já tem vínculo
  const telExisteCheck = await sbQ('atac_cliente_telefones', `select=id_cliente,nome_cliente&telefone=eq.${tel}&limit=1`);
  if (Array.isArray(telExisteCheck) && telExisteCheck.length > 0) {
    toast(`<i class="ic ic-sm" data-ic="alert-triangle"></i> Este contato já foi vinculado a ${telExisteCheck[0].nome_cliente || 'um cliente'}`, 'err');
    fecharNovoContato();
    await Promise.all([loadUmbler(), loadProspeccao()]);
    renderUmbler(); renderLista();
    return;
  }
  const btn = document.getElementById('nc-btn');
  if (btn) { btn.textContent = 'Salvando...'; btn.disabled = true; }
  try {
    // 1. Verificar se CNPJ já existe no ERP antes de criar
    let erpMatch = null;
    if (cnpj) {
      const cnpjDigits = cnpj.replace(/\D/g,'');
      const erpBusca = await sbQ('vw_dim_cliente',
        `select=id_cliente,nome_cliente&cnpj=ilike.*${cnpjDigits}*&limit=1`);
      if (Array.isArray(erpBusca) && erpBusca.length > 0) {
        erpMatch = erpBusca[0];
      }
    }

    let newId;
    if (erpMatch) {
      // CNPJ já existe no ERP — usar o ID do ERP diretamente
      newId = erpMatch.id_cliente;
      // Garantir que está na atac_clientes
      const jaExiste = await sbQ('atac_clientes', `select=id_cliente&id_cliente=eq.${newId}`);
      if (!Array.isArray(jaExiste) || jaExiste.length === 0) {
        await sbInsert('atac_clientes', {
          id_cliente: newId, nome_cliente: erpMatch.nome_cliente,
          cnpj_cpf: cnpj||null, situacao: 'A', origem: 'UMBLER',
          nao_comercial: false, criado_em: new Date().toISOString()
        });
      }
      toast(`<i class="ic ic-sm" data-ic="external-link"></i> CNPJ encontrado no ERP — vinculando ao cliente ${erpMatch.nome_cliente}`);
    } else {
      // Novo cliente — gerar ID sequencial a partir de 500000 (faixa CRM, longe do ERP que está em ~85000)
      const maxRes = await sbQ('atac_clientes', 'select=id_cliente&id_cliente=gte.500000&order=id_cliente.desc&limit=1');
      const maxId = Array.isArray(maxRes) && maxRes.length ? maxRes[0].id_cliente : 499999;
      newId = maxId + 1;
      // Anti race-condition: re-checar se ID já foi pego por outro vendedor
      const idConflito = await sbQ('atac_clientes', `select=id_cliente&id_cliente=eq.${newId}`);
      if (Array.isArray(idConflito) && idConflito.length > 0) {
        newId = newId + Math.floor(Math.random() * 50) + 1;
      }
      await sbInsert('atac_clientes', {
        id_cliente: newId, nome_cliente: nome.toUpperCase(),
        cnpj_cpf: cnpj||null, cidade: cidade||null, uf: uf||null,
        situacao: 'A', origem: 'UMBLER', nao_comercial: false,
        criado_em: new Date().toISOString()
      });
    }

    // 2. Vincular telefone
    const telExiste = await sbQ('atac_cliente_telefones', `select=id&id_cliente=eq.${newId}&telefone=eq.${tel}`);
    if (!Array.isArray(telExiste) || telExiste.length === 0) {
      await sbInsert('atac_cliente_telefones', {
        id_cliente: newId, nome_cliente: nome,
        telefone: tel, descricao: 'Umbler', principal: true
      });
    }

    // 3. Vincular vendedor.
    // Sem escolha no modal, o cliente fica com QUEM CRIOU — quem atendeu na Umbler
    // e o dono natural. Cair no balcao seria convidar outro a pegar o lead do colega.
    // O prazo de 15 dias ja protege contra quem cadastra e abandona.
    const donoId   = Number(vendId) || S.meuVendedor?.id || null;
    const donoNome = vendId
      ? (S.vendedores.find(v => v.id_vendedor === Number(vendId))?.nome_vendedor || '')
      : (S.meuVendedor?.nome || '');
    if (donoId) {
      await sbUpsert('atac_cliente_vendedor', {
        id_cliente: newId, nome_cliente: nome,
        id_vendedor_responsavel: donoId,
        nome_vendedor_responsavel: donoNome,
        liberado_em: null,          // reassume: se ja teve vinculo, volta a valer
        motivo_liberacao: null,
        // DEFAULT now() so vale no INSERT. Sem isso, cliente que ja teve vinculo
        // mantem a data velha e o cron das 06:10 solta ele na manha seguinte.
        atualizado_em: new Date().toISOString(),
        atualizado_por: 'UMBLER'
      }, 'id_cliente');
    }

    await logAcao('CRIAR_CLIENTE', {
      id_cliente: newId, nome_cliente: nome,
      id_vendedor: donoId, nome_vendedor: donoNome || null,
      detalhe: { telefone: tel, origem: 'UMBLER', erp_vinculado: !!erpMatch,
                 dono_por: vendId ? 'ESCOLHIDO_NO_MODAL' : 'LOGIN_DE_QUEM_CRIOU' }
    });
    fecharNovoContato();
    await Promise.all([loadUmbler(), loadCarteira(), loadProspeccao()]);
    if (donoId) {
      gotoTab('crm');
      setMainTab('carteira');
      setSub('sem_compra');   // cliente novo nasce sem compra — abre onde ele esta
      toast(`<i class="ic ic-sm" data-ic="check-circle"></i> ${nome} entrou na carteira de ${sN(donoNome)} — em "Sem compra"`);
    } else {
      // so cai aqui se o login nao estiver cadastrado em atac_config_usuario
      gotoTab('prospeccao');
      toast(`<i class="ic ic-sm" data-ic="check-circle"></i> ${nome} foi para a Prospecção — seu login não está vinculado a um vendedor`, 'ok');
    }
    renderUmbler(); renderLista();
  } catch(e) {
    console.error('salvarNovoContato erro:', e);
    await logAcao('ERRO_CRIAR_CLIENTE', { nivel:'ERROR', detalhe: { telefone: document.getElementById('nc-tel')?.value }, erro: e?.message||String(e) });
    toast('<i class="ic ic-sm" data-ic="alert-circle"></i> Erro ao criar cliente: ' + (e?.message || e), 'err');
  } finally {
    if (btn) { btn.textContent = 'Criar Cliente'; btn.disabled = false; }
  }
}

// ── VÍNCULOS MÚLTIPLOS POR TELEFONE ───────────────────────────
async function toggleVincsTel(phId, telefone) {
  const listEl = document.getElementById(`vinc-tel-list-${phId}`);
  if (!listEl) return;
  if (listEl.style.display !== 'none') { listEl.style.display = 'none'; return; }
  listEl.innerHTML = '<div style="font-size:var(--fs-090);color:var(--text-muted);padding:var(--space-1) 0">Carregando...</div>';
  listEl.style.display = 'block';
  const vincs = await loadVinculosTelefone(telefone);
  if (!vincs.length) { listEl.innerHTML = '<div style="font-size:var(--fs-090);color:var(--text-muted);padding:var(--space-1) 0">Nenhum outro cliente vinculado</div>'; return; }
  listEl.innerHTML = `
    <div style="font-size:var(--fs-075);font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-1-5)">
      Clientes com este número (${vincs.length})
    </div>
    ${vincs.map(v=>`
      <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-1-5) var(--space-2-5);margin-bottom:var(--space-1);gap:var(--space-2)">
        <div style="min-width:0;flex:1">
          <span style="font-size:var(--fs-100);font-weight:600;color:var(--text-primary)">${v.nome_cliente}</span>
          <span style="font-size:var(--fs-075);color:var(--text-muted);margin-left:var(--space-1-5)">#${v.id_cliente}</span>
          ${v.principal?'<span style="font-size:9px;background:var(--blue-pale);color:var(--blue-dark);border-radius:var(--radius-sm);padding:1px 5px;margin-left:var(--space-1);font-weight:700">Principal</span>':''}
          ${v.descricao?`<span style="font-size:var(--fs-075);color:var(--text-muted);margin-left:var(--space-1)">(${v.descricao})</span>`:''}
        </div>
        <div style="display:flex;gap:var(--space-1);flex-shrink:0">
          <button onclick="selCliente(${v.id_cliente})" style="font-size:var(--fs-075);padding:3px var(--space-2);border:1.5px solid var(--border);border-radius:var(--radius-lg);color:var(--text-secondary);background:var(--surface);cursor:pointer;font-weight:500">Ver</button>
          <button onclick="removerVincTel('${v.id}')" style="font-size:var(--fs-075);padding:3px var(--space-2);border:1.5px solid var(--border);border-radius:var(--radius-lg);color:var(--red);background:var(--red-bg);cursor:pointer;font-weight:500"><i class="ic ic-sm" data-ic="x"></i></button>
        </div>
      </div>`).join('')}
    <button onclick="abrirVincTelExtra('${esc(telefone)}')"
      style="font-size:var(--fs-090);color:var(--blue-mid);background:none;border:none;cursor:pointer;padding:var(--space-1) 0;font-weight:600;display:block">
      + Vincular outro cliente a este número
    </button>`;
}

// Vincular um telefone extra a outro cliente (além do atual)
function abrirVincTelExtra(telefone) {
  // Reutiliza o modal de vincular, mas salva o telefone sem remover o vínculo atual
  const m = document.getElementById('modal-vinc');
  if (!m) return;
  m.dataset.tel = telefone;
  m.dataset.extra = 'true'; // flag: não é novo, é extra
  m.classList.add('open');
  document.getElementById('vinc-search').value = '';
  document.getElementById('vinc-results').innerHTML = '<p class="empty-msg">Digite para buscar...</p>';
}

async function removerVincTel(phId) {
  const okRem = await new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;background:var(--surface-overlay);z-index:9999;display:flex;align-items:center;justify-content:center';
    d.innerHTML = `<div style='background:var(--neutral-0);border-radius:var(--radius-xl);padding:var(--space-6);max-width:300px;width:90%;text-align:center'>
      <p style='margin-bottom:var(--space-4);font-size:var(--fs-300)'>Remover vínculo com este número?<br><span style='font-size:var(--fs-100);color:var(--text-subtle)'>O cliente não é excluído, apenas a ligação com este telefone.</span></p>
      <div style='display:flex;gap:var(--space-2);justify-content:center'>
        <button id='_rv_n' style='padding:var(--space-2) var(--space-5);border-radius:var(--radius-lg);border:1px solid var(--border-default);background:var(--surface-subtle);cursor:pointer'>Cancelar</button>
        <button id='_rv_s' style='padding:var(--space-2) var(--space-5);border-radius:var(--radius-lg);border:none;background:var(--danger-600);color:var(--neutral-0);cursor:pointer'>Remover</button>
      </div></div>`;
    document.body.appendChild(d);
    d.querySelector('#_rv_s').onclick = () => { d.remove(); res(true); };
    d.querySelector('#_rv_n').onclick = () => { d.remove(); res(false); };
  });
  if (!okRem) return;
  await sbDel('atac_cliente_telefones', 'id', phId);
  toast('Vínculo removido!');
  // Recarregar detalhe
  if (S.selId) { await loadDetalhe(S.selId); renderDrawer(); }
}
