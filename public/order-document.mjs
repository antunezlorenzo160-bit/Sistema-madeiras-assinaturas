// Documentos combinados; não cria itens de estoque, carga ou lançamentos financeiros.
export function orderCustomerLabelV768(order){
 const direct=[order?.cliente,order?.clienteBusca,order?.nomeCliente,order?.clienteNome,order?.nome_cliente,order?.customerName].find(value=>typeof value==='string'&&value.trim());if(direct)return direct.trim();
 for(const field of ['dadosCliente','clienteDados','contato']){const value=order?.[field];if(!value||typeof value!=='object')continue;const name=[value.nome,value.cliente,value.name].find(v=>typeof v==='string'&&v.trim());if(name)return name.trim();}return '';
}
export const orderCustomerNameV767=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
export const orderCustomerIdentifiedV768=name=>!['','cliente','cliente não informado','cliente nao informado','não informado','nao informado','sem cliente'].includes(orderCustomerNameV767(name));
export const orderLoadActiveV767=row=>row.excluido!==true&&!row.cargaArquivadaInconsistenteEm&&!['cancelado','cancelled','excluido'].includes(row.cargaStatus);
export const orderLoadDraftV767=row=>orderLoadActiveV767(row)&&row.cargaStatus==='montagem'&&!row.cargaBaixadaEm&&!row.cargaFechadaEm;
const finite=(v,label)=>{const n=Number(v||0);if(!Number.isFinite(n)||n<0||n>1e12)throw Error('Confira '+label+' no pedido.');return n;};
export function orderLineUnitsV767(item){const kind=item.tipoMedida||item.tipoCadastro||'m3',byVolume=kind==='granel'||item.vendaFechadaM3===true||item.linearTotalV744===true;const total=finite(byVolume?item.volume:item.quantidade,'a quantidade');if(!['m3','m2','linear','granel'].includes(kind)||total<=0||!byVolume&&!Number.isSafeInteger(total))throw Error('A unidade ou a quantidade do pedido precisa de conferência.');return {kind,byVolume,total,unit:byVolume?(kind==='linear'?'m':'m³'):'pç'};}
function rates(item,flag,key,value){if(!item[flag])return 0;if(item[key]!==undefined)return finite(item[key],'o serviço');const base=Number(item.valorMaterial);if(base>0&&item[value]!==undefined)return finite(item[value],'o serviço')/base*100;throw Error('O serviço do pedido está sem percentual salvo. Confira o pedido antes de importar.');}
// Largest remainder keeps the sum of rounded lines equal to the document total.
function centsParts(values,total=Math.round(values.reduce((s,n)=>s+n,0))){const result=values.map(Math.floor),delta=total-result.reduce((s,n)=>s+n,0);if(delta<0||delta>values.length)throw Error('Valores do pedido precisam de conferência.');const indexes=values.map((v,i)=>({i,rest:v-result[i]})).sort((a,b)=>b.rest-a.rest||a.i-b.i);for(let i=0;i<delta;i++)result[indexes[i].i]++;return result;}
export function orderCommercialV767(order){
 if(!order||order.status!=='confirmado'||order.excluido===true||!Array.isArray(order.itens)||!order.itens.length||order.itens.length>400)throw Error('Escolha um pedido confirmado que ainda aguarda entrega.');
 const raw=order.itens.map(item=>{const {kind}=orderLineUnitsV767(item),amount=finite(item.valor,'o valor');let material=amount,end=0,apl=0,enc=0,friso=0;
  if(kind==='m3'&&!item.vendaFechadaM3){end=material*rates(item,'endireitamento','precoEndireitamento','valorEndireitamento')/100;apl=material*rates(item,'aplainamento','precoAplainamento','valorAplainamento')/100;}
  if(kind==='linear'){const e=rates(item,'encaixe','encaixePercentual','valorEncaixe'),f=rates(item,'friso','frisoPercentual','valorFriso');material=amount/(1+(e+f)/100);enc=material*e/100;friso=material*f/100;}
  return [material,end,apl,enc,friso];
 });
 const discount=finite(order.desconto,'o desconto');if(discount>100)throw Error('Desconto inválido no pedido.');const flattened=raw.flat().map(n=>n*100),gross=centsParts(flattened),sum=gross.reduce((s,n)=>s+n,0),discountCents=Math.round(sum*discount/100),net=centsParts(gross.map(n=>sum?n*(sum-discountCents)/sum:0),sum-discountCents);
 if(!Number.isSafeInteger(sum)||sum>100000000000000)throw Error('Valor do pedido acima do limite.');
 return {subtotalCents:sum,discountCents,totalCents:sum-discountCents,lines:raw.map((_,i)=>({grossCents:gross.slice(i*5,i*5+5).reduce((s,n)=>s+n,0),parts:net.slice(i*5,i*5+5)}))};
}

export function orderDocumentV767(order){
 const values=orderCommercialV767(order);
 return {orderId:order.id,customer:orderCustomerLabelV768(order),subtotalCents:values.subtotalCents,discountCents:values.discountCents,totalCents:values.totalCents,lines:order.itens.map((item,index)=>{
  const fields=['madeira','especie','produto','tipoLinear','codigoProduto','qualidade','tipoMedida','tipoCadastro','quantidade','volume','comprimento','largura','espessura','linearTotalV744','vendaFechadaM3'],kind=item.tipoMedida||item.tipoCadastro||'m3';
  const definitions=kind==='m3'&&!item.vendaFechadaM3?[[1,'endireitamento','precoEndireitamento','valorEndireitamento','Endireitamento'],[2,'aplainamento','precoAplainamento','valorAplainamento','Aplainamento']]:kind==='linear'?[[3,'encaixe','encaixePercentual','valorEncaixe','Encaixe'],[4,'friso','frisoPercentual','valorFriso','Friso']]:[];
  const services=definitions.filter(([,flag])=>item[flag]===true).map(([part,flag,percent,value,label])=>({part,label,percent:rates(item,flag,percent,value)}));
  return {...Object.fromEntries(fields.filter(k=>item[k]!==undefined).map(k=>[k,item[k]])),parts:values.lines[index].parts,services};
 })};
}
