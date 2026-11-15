// Preparação interna. Não gera XML, DANFE, numeração ou autorização fiscal.
export const fiscalPartyFieldsV762=['nome','documento','inscricaoEstadual','regime','telefone','email','cep','logradouro','numero','complemento','bairro','cidade','uf','municipioIBGE','indicadorIE','paisCodigo','enderecoEntrega'];
const fiscalTextV762=(v,max=250)=>{if(typeof v!=='string'||v.length>max)throw Error('Confira os dados fiscais informados.');return v.trim();};
export function fiscalSourceV762(raw){if(!raw||Object.keys(raw).some(k=>!['type','id'].includes(k))||!['order','load'].includes(raw.type)||typeof raw.id!=='string'||!/^[-\w]{1,120}$/.test(raw.id))throw Error('Origem fiscal inválida.');return {type:raw.type,id:raw.id};}
export function fiscalPartyV762(raw={}){if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!fiscalPartyFieldsV762.includes(k)))throw Error('Dados do emitente/destinatário inválidos.');return Object.fromEntries(fiscalPartyFieldsV762.map(k=>[k,fiscalTextV762(raw[k]??'',k==='enderecoEntrega'?500:250)]));}
export function fiscalDataV762(raw={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['recipient','products','notes'].includes(k)))throw Error('Preparação fiscal inválida.');
 const products=raw.products||[];if(!Array.isArray(products)||products.length>400)throw Error('Confira os produtos fiscais.');const seen=new Set();
 return {recipient:fiscalPartyV762(raw.recipient),products:products.map(p=>{if(!p||Object.keys(p).some(k=>!['key','ncm','cfop'].includes(k)))throw Error('Produto fiscal inválido.');const key=fiscalTextV762(p.key,1500),ncm=fiscalTextV762(p.ncm??'',8),cfop=fiscalTextV762(p.cfop??'',4);if(!key||seen.has(key)||ncm&&!/^\d{8}$/.test(ncm)||cfop&&!/^\d{4}$/.test(cfop))throw Error('Informe NCM com 8 dígitos e CFOP com 4 dígitos, ou deixe pendente.');seen.add(key);return {key,ncm,cfop};}),notes:fiscalTextV762(raw.notes??'',2000)};
}
const fiscalMoneyV762=v=>{const n=Number(v??0);if(!Number.isFinite(n)||n<0||n>1e12)throw Error('Valores da origem precisam de conferência.');return Math.round((n+Number.EPSILON)*100);};
export function fiscalSnapshotV762(source,rows,order=null){
 source=fiscalSourceV762(source);const items=source.type==='order'?order?.itens:rows;
 if(source.type==='order'&&(!order||order.excluido===true))throw Error('Orçamento/pedido não encontrado.');
 if(!Array.isArray(items)||!items.length||items.length>400||items.some(i=>i.excluido===true))throw Error('Origem sem itens ativos ou acima de 400 linhas.');
 if(source.type==='load'&&items.some(i=>i.cargaStatus==='montagem'&&!i.cargaFechadaEm))throw Error('Feche e sincronize a carga antes de preparar a NF-e.');
 const latest=key=>[...items].filter(i=>i[key]&&typeof i[key]==='object').sort((a,b)=>Number(b[key].atualizadoEm||0)-Number(a[key].atualizadoEm||0))[0]?.[key]||{};
 const savedFiscal=latest('dadosFiscalCargaV559'),client=source.type==='order'?(order.dadosCliente||order.clienteDados||{}):latest('dadosClienteCargaV407');
 const recipient=fiscalPartyV762(Object.fromEntries(fiscalPartyFieldsV762.map(k=>[k,String(client[k]??(k==='nome'?(source.type==='order'?order.cliente:items[0].compradorDestino||items[0].cliente||items[0].nomeOrigemDestino):k==='telefone'&&source.type==='order'?order.telefone:'')??'')])));
 const lines=items.map((i,index)=>{const type=i.tipoMedida||i.tipoCadastro||'m3',unit=type==='m2'?'M2':type==='linear'?'M':type==='m3'||type==='granel'?'M3':null,quantity=Number(i.volume||(type==='linear'?Number(i.comprimento||0)*Number(i.quantidade||0):0));if(!unit||!Number.isFinite(quantity)||quantity<=0||quantity>1e12)throw Error('Confira a unidade e a quantidade comercial dos itens.');
  const productKey=JSON.stringify([i.madeiraId||'',i.madeira||i.especie||i.produto||'Produto',i.produto||'',i.qualidade||'',type]);
  const key=JSON.stringify([i.madeiraId||'',i.madeira||i.especie||'',i.produto||i.tipoLinear||'',i.codigoProduto||'',i.qualidade||'',type,Number(i.espessura||0),Number(i.largura||0),Number(i.comprimento||0)]);
  const fiscal=savedFiscal.produtos?.[productKey]||{};
  return {id:String(i.id||index),key,description:[i.madeira||i.especie||'Madeira',i.produto||i.tipoLinear||'',i.qualidade||'',type==='granel'?'A granel':type==='linear'&&i.linearTotalV744?'Metragem total':[type==='m3'?Number(i.espessura||0)+' cm':'',type!=='linear'?Number(i.largura||0)+' cm':'',Number(i.comprimento||0)+' m'].filter(Boolean).join(' × ')].filter(Boolean).join(' · '),unit,quantity,amountCents:fiscalMoneyV762(i.valor),ncm:String(fiscal.ncm||''),cfop:String(fiscal.cfop||''),servicesIncluded:Number(i.valorServicos||i.valorEndireitamento||i.valorAplainamento||0)>0};
 });
 // Stored commercial totals are authoritative; simulation percentages are never a fiscal value.
 const subtotal=items.reduce((s,i)=>s+Number(i.valor||0),0),adjust=source.type==='order'?{tipoDesconto:'percentual',desconto:order.desconto||0}:latest('financeiroOriginalV403');
 const discountRaw=Number(adjust.desconto||0);if(!Number.isFinite(discountRaw)||discountRaw<0||adjust.tipoDesconto!=='valor'&&discountRaw>100)throw Error('Confira o desconto da origem.');
 const subtotalCents=fiscalMoneyV762(subtotal),discountCents=adjust.tipoDesconto==='valor'?fiscalMoneyV762(discountRaw):fiscalMoneyV762(subtotal*discountRaw/100),freightCents=fiscalMoneyV762(adjust.frete),otherCents=fiscalMoneyV762(adjust.outras);
 if(discountCents>subtotalCents)throw Error('O desconto supera os produtos.');
 return {source,label:source.type==='load'?'Cópia comercial / carga':(!order.status||order.status==='pendente')?'Orçamento':'Pedido',status:source.type==='load'?'carga':String(order.status||'pendente'),recipient,lines,totals:{subtotalCents,discountCents,freightCents,otherCents,totalCents:subtotalCents-discountCents+freightCents+otherCents},transport:source.type==='load'?latest('dadosTransporteCargaV414'):{},legacyFiscal:savedFiscal,notIssued:true};
}
export function fiscalIssuesV762(snapshot,config,data){
 const issues=['Integração com emissor e certificado ainda não configurada.','Tributação completa e dados da operação precisam de validação contábil.'];
 if(!config?.nome||!config?.documento)issues.push('Complete o cadastro fiscal do emitente.');
 if(!data.recipient.nome||!data.recipient.documento)issues.push('Complete nome e CPF/CNPJ do destinatário.');
 if(snapshot.status==='pendente')issues.push('Orçamento ainda não confirmado como pedido.');
 if(snapshot.lines.some(l=>l.amountCents===0))issues.push('Existem itens com valor zero.');
 if(snapshot.lines.some(l=>l.servicesIncluded))issues.push('Confira o tratamento fiscal dos serviços incluídos nos itens.');
 if(snapshot.lines.reduce((sum,l)=>sum+l.amountCents,0)!==snapshot.totals.subtotalCents)issues.push('Confira o arredondamento entre os itens e o subtotal da origem.');
 if(snapshot.lines.some(l=>{const p=data.products.find(p=>p.key===l.key);return !p?.ncm||!p?.cfop;}))issues.push('Existem produtos sem NCM ou CFOP.');
 return issues;
}
