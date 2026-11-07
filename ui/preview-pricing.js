// PRICING_PREVIEW_V710 — settings are company scoped; no migration of existing documents.
let pricePolicyV710=(()=>{try{return normalizePricePolicy(JSON.parse(window.__v456Local.getItem('price_policy_v710')||'{}'));}catch{return normalizePricePolicy();}})();
function attachPriceV710(item,others=[]){
 if(!pricePolicyV710.enabled||others.some(x=>!x.autoPriceV1))return item;
 const existing=others.find(x=>x.autoPriceV1)?.autoPriceV1;
 const wood=madeiras.find(x=>String(x.id)===String(item.madeiraId));
 const normalized=wood?{...wood,bitolas:normalizarBitolasCadastroV347(wood.bitolas||[])}:{};
 const pair=catalogPricePair(item,normalized);
 return {...item,autoPriceV1:{...pair,policy:existing?.policy||JSON.parse(JSON.stringify(pricePolicyV710))}};
}
function updatePricedRowsV710(items,collectionName,budget=false){
 const priced=applyDocumentPrices(items).map(i=>i.autoPriceV1&&!i.autoPriceV1.locked?(budget?aplicarCobrancaOrcamento(i):{...i,valor:Number(i.volume||0)*Number(i.preco||0)}):i);
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
function previewDocumentValueV710(){
 if(!pricePolicyV710.enabled)return;
 const destination=destinoSelecionado();if(!['orcamento','carga'].includes(destination))return;
 const wood=madeiras.find(m=>String(m.id)===String($('calcMadeira')?.value||''));if(!wood)return;
 const kind=modoMedida==='m3fechado'?'m3':modoMedida;
 const width=Number($('largura')?.value||0),thickness=Number($('espessura')?.value||0),length=Number($('comprimento')?.value||0),quantity=Number($('quantidade')?.value||0);
 let v=kind==='m2'?width/100*length*quantity*(quantidadePacotesPrevia()||1):kind==='linear'?length*quantity:kind==='granel'?Number($('volumeGranelV384')?.value||0):modoMedida==='m3fechado'?Number($('volumeFechadoV387')?.value||0):width/100*thickness/100*length*quantity;
 if(!(v>0))return;
 const others=destination==='orcamento'?orcamento:carregamentos.filter(i=>i.grupoCargaId===sessaoCargaAtual&&i.cargaStatus==='montagem');
 const candidate={id:'price-preview-only',madeiraId:wood.id,tipoMedida:kind,largura:width,espessura:thickness,comprimento:length,quantidade:quantity,volume:v,volumeReal:v,preco:Number($('precoM3')?.value||0),produto:kind==='linear'?regraLinearSelecionadaV381()?.tipo||'':wood.produto||'',estadoMadeira:modoMedida==='m3fechado'&&$('chkVerdeFechado')?.checked?'verde':'seca'};
 const attached=attachPriceV710(candidate,others);if(!attached.autoPriceV1)return;
 const price=applyDocumentPrices([...others,attached]).at(-1);let total=v*price.preco;
 if(kind==='linear')total=cobrarServicosLinear({...candidate,preco:price.preco,...selecionarServicosLinear()}).valor;
 if(kind==='m3'&&modoMedida!=='m3fechado')total*=1+(($('chkEndireitamento')?.checked?Number(servicosM3.endireitamento||0):0)+($('chkAplainamento')?.checked?Number(servicosM3.aplainamento||0):0))/100;
 $('previewValor').textContent=moeda(total);
 let note=document.getElementById('pricePreviewV710');if(!note){note=document.createElement('p');note.id='pricePreviewV710';note.className='note';$('previewValor').parentElement.append(note);}
 note.textContent=price.autoPriceV1.locked?'Preço próprio da madeira verde':('Preço previsto: '+price.priceTierV1+(price.priceWarningV1?' · '+price.priceWarningV1:''));
}
