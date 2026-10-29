// Transform the legacy iframe source without committing its generated HTML.
export function applyLinearServices(app) {
  if (app.includes('/* linear-services-v1 */')) return app;
  const replace = (from, to) => {
    if (!app.includes(from)) throw new Error('Linear services anchor missing: ' + from.slice(0, 90));
    app = app.replace(from, to);
  };
  const fields = `
    '<div class="linear-service-fields" style="grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">'+
    '<div><label><input class="cad-linear-encaixe-ativo" type="checkbox" style="width:auto"> Encaixe</label><label>Encaixe (%)</label><input class="cad-linear-encaixe-pct" type="number" min="0" max="1000" step="0.01" inputmode="decimal"></div>'+
    '<div><label><input class="cad-linear-friso-ativo" type="checkbox" style="width:auto"> Friso</label><label>Friso (%)</label><input class="cad-linear-friso-pct" type="number" min="0" max="1000" step="0.01" inputmode="decimal"></div></div>'+`;
  replace(`'<button type="button" class="btn btn-danger cad-linear-x-v381" title="Excluir tipo">×</button>';`, fields + `'<button type="button" class="btn btn-danger cad-linear-x-v381" title="Excluir tipo">×</button>';`);
  replace(`  row.querySelector('.cad-linear-x-v381').addEventListener`, `  ['encaixe','friso'].forEach(servico=>{
    const active=row.querySelector('.cad-linear-'+servico+'-ativo'),pct=row.querySelector('.cad-linear-'+servico+'-pct');
    active.checked=dados[servico+'Ativo']===true;pct.value=Number(dados[servico+'Percentual']||0);
    const sync=()=>{pct.disabled=!active.checked};active.addEventListener('change',sync);sync();
  });
  row.querySelector('.cad-linear-x-v381').addEventListener`);
  replace(`    precoAtacado:Number(row.querySelector('.cad-linear-atacado-v381')?.value||0)`, `    precoAtacado:Number(row.querySelector('.cad-linear-atacado-v381')?.value||0),
    encaixeAtivo:row.querySelector('.cad-linear-encaixe-ativo').checked,
    encaixePercentual:Number(row.querySelector('.cad-linear-encaixe-pct').value||0),
    frisoAtivo:row.querySelector('.cad-linear-friso-ativo').checked,
    frisoPercentual:Number(row.querySelector('.cad-linear-friso-pct').value||0)`);
  replace(`  if(cadastroTipo==='linear'&&!regrasLinear.length)`, `  if(cadastroTipo==='linear'&&regrasLinear.some(r=>['encaixe','friso'].some(s=>!Number.isFinite(r[s+'Percentual'])||r[s+'Percentual']<0||r[s+'Percentual']>1000)))return alert('Informe percentuais de Encaixe e Friso entre 0 e 1.000.');
  if(cadastroTipo==='linear'&&!regrasLinear.length)`);
  const normalized=`precoAtacado:Number(r?.precoAtacado??0)}`;
  if (!app.includes(normalized)) throw new Error('Linear normalization missing');
  app=app.replaceAll(normalized,`precoAtacado:Number(r?.precoAtacado??0),encaixeAtivo:r?.encaixeAtivo===true,encaixePercentual:Number(r?.encaixePercentual||0),frisoAtivo:r?.frisoAtivo===true,frisoPercentual:Number(r?.frisoPercentual||0)}`);
  const helpers=`/* linear-services-v1 */
function servicosLinearTexto(x){return [x.encaixe?'Encaixe '+Number(x.encaixePercentual||0)+'%':'',x.friso?'Friso '+Number(x.frisoPercentual||0)+'%':''].filter(Boolean).join(' + ')}
function cobrarServicosLinear(x){
 const metros=Number(x.volume||0)>0?Number(x.volume):Number(x.comprimento||0)*Math.max(1,Number(x.quantidade||1)),material=metros*Number(x.preco||0);
 const encaixe=x.encaixe?material*Number(x.encaixePercentual||0)/100:0,friso=x.friso?material*Number(x.frisoPercentual||0)/100:0;
 return {...x,compensarPerda:false,comprimentoCobrado:Number(x.comprimento||0),acrescimoComprimento:0,volumeReal:metros,volumeAdicional:0,valorBase:material,valorAdicional:0,precoEndireitamento:0,precoAplainamento:0,valorEncaixe:encaixe,valorFriso:friso,valorEndireitamento:encaixe,valorAplainamento:friso,valorServicos:encaixe+friso,valorMaterial:material,volume:metros,valor:material+encaixe+friso};
}
function atualizarDisponibilidadeLinear(){
 const linear=document.body.classList.contains('modo-linear-real'),r=linear?regraLinearSelecionadaV381():null;
 [['chkEndireitamento','encaixe'],['chkAplainamento','friso']].forEach(([id,s])=>{
  const c=$(id);c.disabled=linear&&r?.[s+'Ativo']!==true;
  if(c.disabled)c.checked=false;
  c.title=c.disabled?'Ative este serviço no cadastro do tipo/produto.':'';
 });
}
document.addEventListener('change',e=>{
 if(['calcMadeira','tipoLinear'].includes(e.target?.id)&&document.body.classList.contains('modo-linear-real')){
  $('chkEndireitamento').checked=false;$('chkAplainamento').checked=false;
  atualizarDisponibilidadeLinear();calcPreview();
 }
});
new MutationObserver(atualizarDisponibilidadeLinear).observe(document.body,{attributes:true,attributeFilter:['class']});
function selecionarServicosLinear(){
 const r=regraLinearSelecionadaV381(),destino=document.querySelector('input[name="destinoLancamento"]:checked')?.value;
 const permitido=destino==='orcamento'||destino==='carga';
 return {encaixe:permitido&&r?.encaixeAtivo===true&&$('chkEndireitamento').checked,friso:permitido&&r?.frisoAtivo===true&&$('chkAplainamento').checked,encaixePercentual:Number(r?.encaixePercentual||0),frisoPercentual:Number(r?.frisoPercentual||0)};
}
`;
  replace('function aplicarCobrancaOrcamento(x){',helpers+'function aplicarCobrancaOrcamento(x){');
  const start=app.indexOf("if(t==='linear'){const metros=",app.indexOf('function aplicarCobrancaOrcamento'));
  const end=app.indexOf("if(t==='granel')",start);
  if(start<0||end<0)throw new Error('Linear billing branch missing');
  app=app.slice(0,start)+"if(t==='linear')return cobrarServicosLinear(x);"+app.slice(end);
  replace(`$('previewValor').textContent=moeda(metros*p);`, `$('previewValor').textContent=moeda(cobrarServicosLinear({volume:metros,preco:p,...selecionarServicosLinear()}).valor);`);
  replace(`const destino=destinoSelecionado();item.destino=destino;`, `const destino=destinoSelecionado();item.destino=destino;
  if(modoMedida==='linear')Object.assign(item,cobrarServicosLinear({...item,...selecionarServicosLinear()}));`);
  replace(`n(x.precoEndireitamento),n(x.precoAplainamento)].join('|')`, `n(x.precoEndireitamento),n(x.precoAplainamento),x.encaixe?'ENC1':'ENC0',x.friso?'FRI1':'FRI0',n(x.encaixePercentual),n(x.frisoPercentual)].join('|')`);
  app=app.replaceAll(`linear?' Enc. ':' Endir. '`,`linear?' Encaixe ':' Endir. '`).replaceAll(`linear?' Friz. ':' Apla. '`,`linear?' Friso ':' Apla. '`);
  replace(`const serv=tipo==='m3'?(Number(x.valorEndireitamento||0)+Number(x.valorAplainamento||0)):0;`, `const serv=(tipo==='m3'||tipo==='linear')?(Number(x.valorEndireitamento||0)+Number(x.valorAplainamento||0)):0;`);
  replace(`const nomes=[ativo(item.endireitamento)?`, `if(item.tipoMedida==='linear')return servicosLinearTexto(item);
 const nomes=[ativo(item.endireitamento)?`);
  // The linear quotation row is also used by the print view.
  replace(`<td>\${moeda(x.preco)}/m</td><td></td><td></td><td>\${moeda(x.valor)}</td>`, `<td>\${moeda(x.preco)}/m</td><td>\${esc(servicosLinearTexto(x))}</td><td></td><td>\${moeda(x.valor)}</td>`);
  return app;
}
