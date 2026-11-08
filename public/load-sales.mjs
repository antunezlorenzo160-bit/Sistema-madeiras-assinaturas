// The original commercial total is authoritative; copies and quotes are not sales.
export function completedLoadSale(items){
 if(!Array.isArray(items)||!items.length||items.some(i=>!Number.isSafeInteger(Number(i.cargaBaixadaEm))||Number(i.cargaBaixadaEm)<=0||i.cargaStatus==='montagem'||['cancelado','cancelled','excluido'].includes(i.cargaStatus)||i.cargaArquivadaInconsistenteEm))return null;
 const round=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
 const values=items.map(i=>Number(i.valor||0));if(values.some(v=>!Number.isFinite(v)||v<0))throw Error('Há valores inválidos no carregamento. Corrija os preços antes de consultar a venda.');
 const configs=items.filter(i=>i.financeiroOriginalV403&&typeof i.financeiroOriginalV403==='object').map(i=>i.financeiroOriginalV403).sort((a,b)=>Number(b.atualizadoEm||0)-Number(a.atualizadoEm||0));
 const normalize=c=>({tipoDesconto:c.tipoDesconto==='valor'?'valor':'percentual',desconto:Number(c.desconto||0),frete:Number(c.frete||0),outras:Number(c.outras||0)});
 const config=normalize(configs[0]||{});
 if(configs.some(c=>Number(c.atualizadoEm||0)===Number(configs[0]?.atualizadoEm||0)&&JSON.stringify(normalize(c))!==JSON.stringify(config)))throw Error('Os ajustes financeiros da carga estão divergentes. Sincronize os dados antes de consultar a venda.');
 const subtotal=round(values.reduce((sum,v)=>sum+v,0)),discount=round(config.tipoDesconto==='valor'?config.desconto:subtotal*config.desconto/100);
 if(![subtotal,config.desconto,config.frete,config.outras].every(v=>Number.isFinite(v)&&v>=0&&v<=1000000000000)||config.tipoDesconto==='percentual'&&config.desconto>100||discount>subtotal)throw Error('Os ajustes financeiros da carga são inválidos. Confira desconto, frete e outros valores.');
 const amountCents=Math.round(round(subtotal-discount+config.frete+config.outras)*100);if(!Number.isSafeInteger(amountCents))throw Error('Valor do carregamento acima do limite de cálculo.');
 const at=Math.max(...items.map(i=>Number(i.cargaBaixadaEm))),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(at)),dateParts=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 const customer=items.map(i=>i.dadosClienteCargaV407).filter(c=>c&&typeof c==='object').sort((a,b)=>Number(b.atualizadoEm||0)-Number(a.atualizadoEm||0))[0]||{};
 return {amountCents,date:dateParts.year+'-'+dateParts.month+'-'+dateParts.day,partner:String(customer.nome||items.find(i=>i.compradorDestino)?.compradorDestino||'').slice(0,120),subtotalCents:Math.round(subtotal*100),discountCents:Math.round(discount*100),freightCents:Math.round(round(config.frete)*100),otherCents:Math.round(round(config.outras)*100),zeroValueLines:values.filter(v=>v===0).length};
}
export function normalizeLoadSaleConfig(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['loadId','revision','signature','include','costCents','manualEntry','resolution'].includes(k)))throw Error('Dados da venda inválidos.');
 if(typeof input.loadId!=='string'||!input.loadId||input.loadId.length>180||/[\u0000-\u001f]/.test(input.loadId)||!Number.isSafeInteger(input.revision)||input.revision<0||typeof input.signature!=='string'||!/^[a-f0-9]{64}$/.test(input.signature)||typeof input.include!=='boolean')throw Error('Atualize a venda do carregamento antes de salvar.');
 if(input.costCents!==null&&(!Number.isSafeInteger(input.costCents)||input.costCents<0||input.costCents>100000000000))throw Error('Informe o custo da madeira vendida ou deixe pendente.');
 if(!['none','separate','replace'].includes(input.resolution)||input.resolution==='replace'&&input.manualEntry===null||input.manualEntry!==null&&input.resolution!=='replace')throw Error('Confira como deseja tratar o lançamento manual.');
 if(input.manualEntry!==null&&(!input.manualEntry||typeof input.manualEntry!=='object'||Array.isArray(input.manualEntry)||Object.keys(input.manualEntry).some(k=>!['id','revision'].includes(k))||typeof input.manualEntry.id!=='string'||!/^[a-f0-9-]{36}$/.test(input.manualEntry.id)||!Number.isSafeInteger(input.manualEntry.revision)||input.manualEntry.revision<1||!input.include))throw Error('Selecione um lançamento manual válido para substituir.');
 return {loadId:input.loadId,revision:input.revision,signature:input.signature,include:input.include,costCents:input.costCents,manualEntry:input.manualEntry,resolution:input.resolution};
}
export function reviewLoadSaleDuplicates(entries){
 const manual=entries.filter(row=>row.status==='active'&&row.type==='sale'&&!row.source);
 return entries.map(row=>{
  if(row.source?.type!=='load-sale'||!['active','pending-review'].includes(row.status))return row;
  const matches=manual.filter(other=>other.date===row.date&&other.amountCents===row.amountCents).map(other=>other.id);
  return {...row,status:matches.length&&!row.source.separateConfirmed?'pending-review':'active',source:{...row.source,possibleManualIds:matches}};
 });
}
