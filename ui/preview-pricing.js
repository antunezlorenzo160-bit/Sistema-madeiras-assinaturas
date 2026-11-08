// PRICING_PREVIEW_V710 — settings are company scoped; no migration of existing documents.
let pricePolicyV710=(()=>{try{return normalizePricePolicy(JSON.parse(window.__v456Local.getItem('price_policy_v710')||'{}'));}catch{return normalizePricePolicy();}})();
function attachPriceV710(item,others=[]){
 const existing=others.find(x=>x.autoPriceV1)?.autoPriceV1;
 if(!(existing?.policy||pricePolicyV710).enabled||others.some(x=>!x.autoPriceV1))return item;
 const wood=madeiras.find(x=>String(x.id)===String(item.madeiraId));
 const normalized=wood?{...wood,bitolas:normalizarBitolasCadastroV347(wood.bitolas||[])}:{};
 const pair=catalogPricePair(item,normalized);
 return {...item,autoPriceV1:{...pair,policy:existing?.policy||JSON.parse(JSON.stringify(pricePolicyV710))}};
}
function updatePricedRowsV710(items,collectionName,budget=false){
 const priced=applyDocumentPrices(items).map(i=>i.autoPriceV1&&!i.autoPriceV1.locked?(budget?aplicarCobrancaOrcamento(i):(i.tipoMedida==='linear'?cobrarServicosLinear(i):i.servicePricingV727===true?priceLoadServices(i):{...i,valor:Number(i.volume||0)*Number(i.preco||0)})):i);
 for(let n=0;n<items.length;n++){
  const old=items[n],next=priced[n];
  if(old.preco!==next.preco||old.valor!==next.valor||old.priceTierV1!==next.priceTierV1||old.priceWarningV1!==next.priceWarningV1){
   enfileirarOffline(collectionName,next.id,next,'set');
   const idx=lancamentos.findIndex(x=>x.id===next.id);if(idx>=0)lancamentos[idx]={...lancamentos[idx],...next};
  }
 }
 return priced;
}
function repriceBudgetV710(){
 if(!orcamento.some(i=>i.autoPriceV1&&!i.autoPriceV1.locked))return;
 orcamento=updatePricedRowsV710(orcamento,COL.orcamento,true);
 window.__v456Local.setItem(STORAGE.orcamento,JSON.stringify(orcamento));
}
function repriceLoadsV710(){
 if(parent.__smEmployeeMember?.()?.papel!=='admin')return;
 if(typeof carregamentos==='undefined')return;
 const groups=new Map();
 for(const i of carregamentos){if(!i.autoPriceV1||i.cargaStatus!=='montagem'||i.cargaBaixadaEm||i.autoPriceV1.locked)continue;const id=String(i.grupoCargaId||'');if(!groups.has(id))groups.set(id,[]);groups.get(id).push(i);}
 for(const [id] of groups){const all=carregamentos.filter(i=>String(i.grupoCargaId||'')===id);if(all.some(i=>i.cargaStatus!=='montagem'||!i.autoPriceV1))continue;
  const changed=updatePricedRowsV710(all,COL.cargas);const map=new Map(changed.map(i=>[i.id,i]));carregamentos=carregamentos.map(i=>map.get(i.id)||i);
 }
 if(groups.size){window.__v456Local.setItem('carregamentos_lancamentos_v1',JSON.stringify(carregamentos));window.__v456Local.setItem(STORAGE.lancamentos,JSON.stringify(lancamentos));}
}
async function pricePolicyRequestV710(input){
 const user=authV456.currentUser;if(!user)throw Error('Entre com sua conta.');
 const response=await fetch('/.netlify/functions/company-price-policy',{method:input?'POST':'GET',headers:{Authorization:'Bearer '+await user.getIdToken(),'Content-Type':'application/json'},...(input?{body:JSON.stringify(input)}:{}),signal:AbortSignal.timeout(8000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível consultar os preços.');return data.policy;
}
function mountPricePolicyV710(){
 if(document.getElementById('pricePolicyV710'))return;
 const host=document.getElementById('cadastro');if(!host)return;
 const card=document.createElement('article');card.id='pricePolicyV710';card.className='card';
 card.innerHTML='<h3>Preços automáticos por documento</h3><p>Some todas as espécies do orçamento ou carregamento. Até o limite: varejo. Acima: atacado. Cada unidade tem seu próprio limite; m³ de madeira e granel somam juntos.</p><p>Usa o volume físico, sem acréscimo de CMDP. Documentos antigos mantêm os preços salvos. Madeira verde mantém seu preço próprio.</p><form id="pricePolicyFormV710"><label><input id="pricePolicyEnabledV710" type="checkbox"> Ativar para documentos novos</label><div class="grid"><label>Varejo até (m³)<input id="priceLimitM3V710" type="number" min="0" step="0.0001"></label><label>Varejo até (m²)<input id="priceLimitM2V710" type="number" min="0" step="0.01"></label><label>Varejo até (metros lineares)<input id="priceLimitLinearV710" type="number" min="0" step="0.01"></label></div><p>Campo vazio mantém varejo nessa unidade. Se faltar preço de atacado, mantém varejo e mostra um aviso no documento. Alterações valem para os próximos documentos; os limites ficam registrados em cada documento.</p><button class="btn btn-primary" type="submit">Salvar limites da empresa</button><button class="btn btn-secondary" type="button" id="pricePolicyReloadV710">Atualizar limites</button></form><p id="pricePolicyStatusV710" role="status"></p>';
 host.appendChild(card);
 const status=card.querySelector('[role=status]');const form=card.querySelector('form');
 const fill=()=>{document.getElementById('pricePolicyEnabledV710').checked=pricePolicyV710.enabled;for(const [u,id] of [['m3','priceLimitM3V710'],['m2','priceLimitM2V710'],['linear','priceLimitLinearV710']])document.getElementById(id).value=pricePolicyV710.limits[u]??'';};fill();
 const set=p=>{pricePolicyV710=normalizePricePolicy(p);window.__v456Local.setItem('price_policy_v710',JSON.stringify(pricePolicyV710));fill();};
 const reload=async()=>{try{set(await pricePolicyRequestV710());status.textContent='Limites da empresa atualizados.';}catch{status.textContent='Não foi possível consultar os limites. Dados salvos neste aparelho preservados.';}};
 const admin=parent.__smEmployeeMember?.()?.papel==='admin';form.hidden=!admin;
 if(!admin){status.textContent='Somente o responsável pela empresa pode configurar os limites.';}
 form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{
  const limits={};for(const [u,id] of [['m3','priceLimitM3V710'],['m2','priceLimitM2V710'],['linear','priceLimitLinearV710']])limits[u]=document.getElementById(id).value;
  const policy=normalizePricePolicy({enabled:document.getElementById('pricePolicyEnabledV710').checked,limits,revision:pricePolicyV710.revision});
  set(await pricePolicyRequestV710(policy));status.textContent='Limites salvos. Válidos para documentos novos, inclusive offline após a sincronização neste aparelho.';
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
 document.getElementById('pricePolicyReloadV710').onclick=reload;reload();
}
function priceDocumentNoticeV710(items,host){
 if(!host)return;let box=host.querySelector(':scope > .price-notice-v710');
 const warnings=[...new Set(items.map(i=>i.priceWarningV1).filter(Boolean))];
 const tiers=[...new Set(items.filter(i=>i.autoPriceV1).map(i=>i.priceTierV1||'varejo'))];
 if(!tiers.length){box?.remove();return;}if(!box){box=document.createElement('p');box.className='price-notice-v710 note';host.prepend(box);}
 box.textContent='Preços do documento: '+tiers.join(' / ')+(warnings.length?' — '+warnings.join(' '):'')+'.';
}
setTimeout(mountPricePolicyV710,0);
function pricePreviewNoteV729(){
 let note=document.getElementById('pricePreviewV710');if(!note){note=document.createElement('p');note.id='pricePreviewV710';note.className='note';$('previewValor').parentElement.append(note);}return note;
}
function pricePolicySameV729(a,b){return (a?.enabled===true)===(b?.enabled===true)&&['m3','m2','linear'].every(u=>(a?.limits?.[u]??null)===(b?.limits?.[u]??null));}
function priceCurrentLoadActionV729(note,items){
 if(destinoSelecionado()!=='carga'||!items.length||!pricePolicyV710.enabled||parent.__smEmployeeMember?.()?.papel!=='admin')return;
 const first=items.find(i=>i.autoPriceV1)?.autoPriceV1;
 if(items.every(i=>i.autoPriceV1)&&pricePolicySameV729(first?.policy,pricePolicyV710))return;
 const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent='Aplicar limites e preços atuais';button.onclick=applyCurrentLoadPricingV729;note.append(document.createElement('br'),button);
}
function applyCurrentLoadPricingV729(){
 if(parent.__smEmployeeMember?.()?.papel!=='admin'||!pricePolicyV710.enabled||destinoSelecionado()!=='carga')return;
 const items=carregamentos.filter(i=>String(i.grupoCargaId||'')===String(sessaoCargaAtual));
 if(!items.length||items.some(i=>i.cargaStatus!=='montagem'||i.cargaBaixadaEm||i.cargaFechadaEm)){pricePreviewNoteV729().textContent='Só é possível aplicar os limites a uma carga ainda em montagem.';return;}
 try{
  const prepared=items.map(i=>i.autoPriceV1?.locked?{...i,autoPriceV1:{...i.autoPriceV1,policy:JSON.parse(JSON.stringify(pricePolicyV710))}}:attachPriceV710(i,[]));
  const changed=updatePricedRowsV710(prepared,COL.cargas),byId=new Map(changed.map(i=>[i.id,i]));
  // Persist new snapshots even when the resulting monetary price happens to be equal.
  changed.forEach(i=>enfileirarOffline(COL.cargas,i.id,i,'set'));
  carregamentos=carregamentos.map(i=>byId.get(i.id)||i);lancamentos=lancamentos.map(i=>byId.get(i.id)||i);
  window.__v456Local.setItem('carregamentos_lancamentos_v1',JSON.stringify(carregamentos));window.__v456Local.setItem(STORAGE.lancamentos,JSON.stringify(lancamentos));
  renderLancamentos();calcPreview();sincronizarOfflineOps().catch(()=>{});
 }catch(e){pricePreviewNoteV729().textContent='Não foi possível concluir a atualização dos preços: '+e.message;}
}
function previewDocumentValueV710(){
 // The base input remains the catalog price; only the visible rate is overlaid.
 if((modoMedida==='m3'||modoMedida==='m3fechado')&&$('precoBitolaAoLado')){const base=Number($('precoM3')?.value||0),span=$('precoBitolaAoLado');span.textContent=base>0?moeda(base)+'/m³':'sem preço';span.title='';span.classList.toggle('sem-preco',!(base>0));}
 const destination=destinoSelecionado();if(!['orcamento','carga'].includes(destination))return;
 const wood=madeiras.find(m=>String(m.id)===String($('calcMadeira')?.value||''));if(!wood)return;
 const kind=modoMedida==='m3fechado'?'m3':modoMedida;
 const width=Number($('largura')?.value||0),thickness=Number($('espessura')?.value||0),length=Number($('comprimento')?.value||0),quantity=Number($('quantidade')?.value||0);
 const v=kind==='m2'?width/100*length*quantity*(quantidadePacotesPrevia()||1):kind==='linear'?length*quantity:kind==='granel'?Number($('volumeGranelV384')?.value||0):modoMedida==='m3fechado'?Number($('volumeFechadoV387')?.value||0):width/100*thickness/100*length*quantity;
 const others=destination==='orcamento'?orcamento:carregamentos.filter(i=>i.grupoCargaId===sessaoCargaAtual&&i.cargaStatus==='montagem');
 const candidate={id:'price-preview-only',madeiraId:wood.id,tipoMedida:kind,largura:width,espessura:thickness,comprimento:length,quantidade:quantity,volume:v>0?v:0,volumeReal:v>0?v:0,preco:Number($('precoM3')?.value||0),produto:kind==='linear'?regraLinearSelecionadaV381()?.tipo||'':wood.produto||'',estadoMadeira:modoMedida==='m3fechado'&&$('chkVerdeFechado')?.checked?'verde':'seca'};
 const attached=attachPriceV710(candidate,others),note=pricePreviewNoteV729();
 if(!attached.autoPriceV1){
  note.textContent=others.some(i=>!i.autoPriceV1)?'Esta carga mantém os preços salvos e ainda não usa os limites automáticos.':'Preços automáticos desativados. Ative em Cadastro → Preços automáticos por documento.';
  priceCurrentLoadActionV729(note,others);return;
 }
 const price=applyDocumentPrices([...others,attached]).at(-1),unit=priceUnit(candidate),policy=attached.autoPriceV1.policy,limit=policy?.limits?.[unit],totalVolume=documentQuantities(v>0?[...others,candidate]:others)[unit],unitLabel=unit==='m3'?'m³':unit==='m2'?'m²':'m';
 if(kind==='m3'){
  const span=$('precoBitolaAoLado');if(span){span.textContent=price.preco>0?moeda(price.preco)+'/m³':'sem preço';span.title=price.autoPriceV1.locked?'Preço próprio da madeira verde':price.priceTierV1==='atacado'?'Preço de atacado':'Preço de varejo';span.classList.toggle('sem-preco',!(price.preco>0));}
 }else if(kind==='linear'&&$('precoTipoLinear'))$('precoTipoLinear').textContent=moeda(price.preco)+'/m';
 else if(kind==='granel'&&$('precoGranelV384'))$('precoGranelV384').textContent=moeda(price.preco)+'/m³';
 let total=v>0?v*price.preco:0;
 if(v>0&&kind==='linear')total=cobrarServicosLinear({...candidate,preco:price.preco,...selecionarServicosLinear()}).valor;
 if(kind==='m3'&&modoMedida!=='m3fechado')total*=1+(($('chkEndireitamento')?.checked?Number(servicosM3.endireitamento||0):0)+($('chkAplainamento')?.checked?Number(servicosM3.aplainamento||0):0))/100;
 $('previewValor').textContent=moeda(total);
 note.textContent=price.autoPriceV1.locked?'Preço próprio da madeira verde':('Preço '+(v>0?'previsto para o lançamento':'do documento')+': '+price.priceTierV1+' · '+Number(totalVolume||0).toLocaleString('pt-BR',{maximumFractionDigits:4})+' '+unitLabel+(v>0?' após o lançamento':' no documento')+(limit===undefined?' · sem limite automático nesta unidade':' · varejo até '+Number(limit).toLocaleString('pt-BR')+' '+unitLabel)+(price.priceWarningV1?' · '+price.priceWarningV1:''));
 if(!pricePolicySameV729(policy,pricePolicyV710))note.append(document.createTextNode(' Este documento usa os limites salvos quando foi iniciado.'));
 priceCurrentLoadActionV729(note,others);
}
