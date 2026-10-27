-- aplicada em produção em 2026-10-27 — ids 117 (17078) e 118 (19068)
-- Inclui no catálogo do Portal do Representante (ped_catalogo_produtos) as 2 baterias de lítio
-- do SGA (empresa 8): SKU 19068 (100AH) e 17078 (300AH). Mesmos campos que o "Novo produto" de
-- Configurações grava (cfgSalvarProduto); preço = preco_aux2 arredondado a 2 casas.
-- Não faz: não mexe em outro produto, não apaga nada, não busca foto/medida no Bling
-- (isso é pela tela: "Sincronizar com Bling" no produto ou "Sincronizar todos").
-- Idempotente: não insere SKU que já esteja no catálogo.
-- Volta: delete from ped_catalogo_produtos where id in (<ids do returning>);
insert into ped_catalogo_produtos
  (id_produto_erp, referencia, nome, descricao, aplicacao, id_grupo, grupo, id_subgrupo, subgrupo,
   preco_base, ativo, esgotado, fotos, especificacoes, tags, criado_por)
select v.id_produto, trim(v.referencia), trim(v.nome), coalesce(trim(v.complemento), ''), '',
       v.id_grupo, v.grupo, v.id_subgrupo, v.subgrupo,
       round(v.preco_aux2::numeric, 2), true, coalesce(v.estoque_fisico, 0) <= 0,
       '[]'::jsonb, '{}'::jsonb, '{}'::text[], 'contato@bononiacessorios.com.br'
from vw_fb_produtos_compras v
where v.id_empresa = 8
  and v.id_produto in (19068, 17078)
  and not exists (select 1 from ped_catalogo_produtos c where c.id_produto_erp = v.id_produto)
returning id, id_produto_erp, nome, grupo, subgrupo, preco_base, ativo, esgotado;
