// Prices are snapshotted per document. Existing documents without opt-in metadata stay unchanged.
export function normalizePricePolicy(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Configuração inválida.');
 const revision=Number(value.revision||0);if(!Number.isSafeInteger(revision)||revision<0)throw Error('Versão da configuração inválida.');
 const limits={};for(const u of ['m3','m2','linear']){
  const v=value.limits?.[u];if(v!==null&&v!==undefined&&v!==''){
   const n=Number(v);if(!Number.isFinite(n)||n<0||n>1e9)throw Error('Informe limites válidos, maiores ou iguais a zero.');limits[u]=n;
  }
 }
 return {enabled:value.enabled===true,limits,revision};
}
export function priceUnit(item){const t=item.tipoMedida||item.tipoCadastro||'m3';return t==='granel'?'m3':t;}
export function documentQuantities(items){
 const totals={m3:0,m2:0,linear:0};
 for(const i of items){const u=priceUnit(i);if(!(u in totals))continue;
  const n=Number(i.volumeReal??i.volume??0);if(Number.isFinite(n)&&n>=0)totals[u]+=n;
 }
 for(const u in totals)totals[u]=Math.round(totals[u]*1e8)/1e8;
 return totals;
}
export function applyDocumentPrices(items){
 const totals=documentQuantities(items);
 return items.map(i=>{
  const a=i.autoPriceV1;if(!a||a.locked)return i;
  const u=priceUnit(i),limit=a.policy?.limits?.[u];
  const wholesale=a.policy?.enabled===true&&limit!==undefined&&totals[u]>limit;
  const missing=wholesale&&!(Number(a.wholesale)>0);
  const price=Number(wholesale&&!missing?a.wholesale:a.retail);
  if(!Number.isFinite(price)||price<0)throw Error('Preço inválido no documento.');
  return {...i,preco:price,priceTierV1:wholesale&&!missing?'atacado':'varejo',priceWarningV1:missing?'Preço de atacado não cadastrado; mantido o varejo.':'',valor:Number(i.volume||0)*price};
 });
}
export function catalogPricePair(item,catalog){
 const type=item.tipoMedida||'m3';const m=catalog||{};
 const n=v=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):0;
 const has=(s,v)=>String(s??'').replace(/,/g,'.').split(/[\s;/]+/).some(x=>x!==''&&Math.abs(Number(x)-Number(v))<1e-6);
 const retail=x=>n(x?.precoVarejo??x?.preco??0),wholesale=x=>n(x?.precoAtacado??0);
 if(item.estadoMadeira==='verde')return {retail:n(item.preco),wholesale:0,locked:true};
 if(type==='linear'){
  const r=(m.regrasLinear||[]).find(r=>String(r.tipo||'')===String(item.produto||''));return {retail:retail(r||m),wholesale:wholesale(r||m)};
 }
 if(type==='m2'){
  const matchesLength=r=>{const text=String(r.comprimentoRegra||'').trim().toLowerCase();if(!text)return Number(item.comprimento||0)>=Number(r.acimaDe||0);const match=text.match(/(\d+(?:[.,]\d+)?)/);if(!match)return false;const limit=Number(match[1].replace(',','.'));return /acima|maior|>=/.test(text)?Number(item.comprimento||0)>=limit:Math.abs(Number(item.comprimento||0)-limit)<1e-6;};
  const r=(m.regrasM2||[]).filter(r=>(!r.larguras&&!r.larguraRegra||has(r.larguras??r.larguraRegra,item.largura))&&matchesLength(r)).sort((a,b)=>Number(Boolean(b.comprimentoRegra))-Number(Boolean(a.comprimentoRegra))||Number(b.acimaDe||0)-Number(a.acimaDe||0))[0];return {retail:retail(r||m),wholesale:wholesale(r||m)};
 }
 if(type==='granel')return {retail:retail(m),wholesale:wholesale(m)};
 const bit=(m.bitolas||[]).find(b=>has(b.espessuraRegra??b.espessura,item.espessura));
 if(!bit)return {retail:n(item.preco),wholesale:0};
 const width=(bit.regrasLargura||[]).find(r=>has(r.larguraRegra??r.larguras,item.largura));
 let r=retail(bit),w=wholesale(bit);
 if(width){if(retail(width)>0)r=retail(width);if(wholesale(width)>0)w=wholesale(width);}
 const rule=(bit.regrasComprimento||[]).filter(r=>Number(item.comprimento||0)>=Number(r.acimaDe??r.comprimentoRegra??Infinity)).sort((a,b)=>Number(b.acimaDe??b.comprimentoRegra)-Number(a.acimaDe??a.comprimentoRegra))[0];
 if(rule){const f=1+Number(rule.percentual??rule.acrescimoPercentual??0)/100;r=Math.round(r*f*100)/100;w=Math.round(w*f*100)/100;}
 return {retail:r,wholesale:w};
}
