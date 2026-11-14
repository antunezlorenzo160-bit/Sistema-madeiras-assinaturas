// Physical wood volume for explanation only; this never changes document prices or stored costs.
export function loadPhysicalM3(items){
 if(!Array.isArray(items)||!items.length)return null;let units=0;
 for(const item of items){
  const kind=item.tipoMedida||item.tipoCadastro||'m3';if(!['m3','granel'].includes(kind))return null;
  const volume=kind==='granel'?Number(item.volume):Number(item.largura)/100*Number(item.espessura)/100*Number(item.comprimento)*Number(item.quantidade),part=Math.round(volume*1e9);
  if(!Number.isFinite(volume)||volume<=0||!Number.isSafeInteger(part)||part<=0)return null;units+=part;if(!Number.isSafeInteger(units))return null;
 }
 return units/1e9;
}
// Used only for newly created load lines and their subsequent automatic repricing.
export function priceLoadServices(item){
 if((item.tipoMedida||'m3')!=='m3'||item.vendaFechadaM3===true)return item;
 const material=Number(item.volume||0)*Number(item.preco||0),end=item.endireitamento===true?Number(item.precoEndireitamento||0):0,apl=item.aplainamento===true?Number(item.precoAplainamento||0):0;
 if(![material,end,apl].every(n=>Number.isFinite(n)&&n>=0))throw Error('Confira o preço e os percentuais dos serviços antes de lançar a carga.');
 const valorEndireitamento=material*end/100,valorAplainamento=material*apl/100,valorServicos=valorEndireitamento+valorAplainamento;
 if(!Number.isFinite(material+valorServicos)||material+valorServicos>1000000000000)throw Error('Valor dos serviços acima do limite de cálculo.');
 return {...item,servicePricingV727:true,valorMaterial:material,valorEndireitamento,valorAplainamento,valorServicos,valor:material+valorServicos};
}
// Separate only amounts actually reconciled with the saved original line total.
// Percentages alone never prove that a service was included in that total.
export function loadServiceSplit(items,subtotalCents,discountCents){
 let rawServices=0,pendingServiceLines=0;
 for(const item of items){
  const total=Number(item.valor||0),material=Number(item.valorMaterial),explicit=item.valorServicos!==undefined?Number(item.valorServicos):item.valorEndireitamento!==undefined||item.valorAplainamento!==undefined?Number(item.valorEndireitamento||0)+Number(item.valorAplainamento||0):null;
  const flagged=item.endireitamento===true||item.aplainamento===true||item.encaixe===true||item.friso===true;
  if(explicit!==null&&Number.isFinite(explicit)&&explicit>=0&&Number.isFinite(material)&&material>=0&&Math.abs(total-material-explicit)<0.000001){rawServices+=explicit;continue;}
  if(flagged||explicit!==null&&explicit!==0)pendingServiceLines++;
 }
 if(pendingServiceLines)return {serviceCents:null,woodCents:null,pendingServiceLines};
 const beforeDiscount=Math.round((rawServices+Number.EPSILON)*100);
 if(!Number.isSafeInteger(beforeDiscount)||beforeDiscount<0||beforeDiscount>subtotalCents)return {serviceCents:null,woodCents:null,pendingServiceLines:1};
 // Allocate a global discount proportionally, rounded once to cents.
 const net=subtotalCents-discountCents,serviceCents=subtotalCents?Number((BigInt(beforeDiscount)*BigInt(net)+BigInt(Math.floor(subtotalCents/2)))/BigInt(subtotalCents)):0;
 return {serviceCents,woodCents:net-serviceCents,pendingServiceLines:0};
}
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
 return {...loadServiceSplit(items,Math.round(subtotal*100),Math.round(discount*100)),amountCents,date:dateParts.year+'-'+dateParts.month+'-'+dateParts.day,partner:String(customer.nome||items.find(i=>i.compradorDestino)?.compradorDestino||'').slice(0,120),subtotalCents:Math.round(subtotal*100),discountCents:Math.round(discount*100),freightCents:Math.round(round(config.frete)*100),otherCents:Math.round(round(config.outras)*100),zeroValueLines:values.filter(v=>v===0).length};
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

// Manual correction only: convert a declared unit price to the full physical load cost.
export function loadSaleManualCost(valueCents,mode,physicalM3){
 if(!['total','m3'].includes(mode)||!Number.isSafeInteger(valueCents)||valueCents<0||valueCents>100000000000)throw Error('Informe um custo válido.');
 if(mode==='total')return valueCents;
 const units=Math.round(physicalM3*1e9);
 if(!Number.isFinite(physicalM3)||physicalM3<=0||!Number.isSafeInteger(units)||units<=0)throw Error('Esta carga não tem volume físico em m³ disponível. Informe o custo total.');
 const total=Number((BigInt(valueCents)*BigInt(units)+500000000n)/1000000000n);
 if(!Number.isSafeInteger(total)||total>100000000000)throw Error('Custo total acima do limite.');
 return total;
}
