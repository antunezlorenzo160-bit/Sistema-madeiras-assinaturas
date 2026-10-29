export function applyLinearCmdp(app) {
  if(app.includes('/* linear-cmdp-v1 */'))return app;
  const replace=(from,to)=>{if(!app.includes(from))throw new Error('Linear CMDP anchor missing: '+from.slice(0,90));app=app.replace(from,to)};
  replace(`$('campoCadCmdp').style.display=m3?'':'none';`,`$('campoCadCmdp').style.display=(m3||linear)?'':'none';`);
  replace(`compensacaoPerdaAtiva:cadastroTipo==='m3'?$('cadCmdp').checked:false,`,`compensacaoPerdaAtiva:(cadastroTipo==='m3'||cadastroTipo==='linear')?$('cadCmdp').checked:false,`);
  replace(`$('cadCmdp').checked=(m.tipoCadastro||'m3')==='m3'&&m.compensacaoPerdaAtiva===true;`,`$('cadCmdp').checked=['m3','linear'].includes(m.tipoCadastro||'m3')&&m.compensacaoPerdaAtiva===true;`);
  const start=app.indexOf('function cobrarServicosLinear('),end=app.indexOf('function selecionarServicosLinear(',start);
  if(start<0||end<0)throw new Error('Linear billing helper missing');
  app=app.slice(0,start)+`/* linear-cmdp-v1 */
function cobrarServicosLinear(x){
 const real=Math.max(0,Number(x.comprimento||0)),q=Math.max(1,Number(x.quantidade||1));
 const metros=real>0?real*q:Math.max(0,Number(x.volumeReal??x.volume??0));
 const compensar=x.compensarPerda===true,cc=compensar&&real>0?proximaMedidaComercial(real):real;
 const cobrados=real>0?cc*q:metros,preco=Number(x.preco||0),material=cobrados*preco;
 const encaixe=x.encaixe?material*Number(x.encaixePercentual||0)/100:0,friso=x.friso?material*Number(x.frisoPercentual||0)/100:0;
 return {...x,compensarPerda:compensar,comprimentoCobrado:cc,acrescimoComprimento:Math.max(0,cc-real),volumeReal:metros,volumeAdicional:Math.max(0,cobrados-metros),metrosCobrados:cobrados,valorBase:metros*preco,valorAdicional:Math.max(0,cobrados-metros)*preco,precoEndireitamento:0,precoAplainamento:0,valorEncaixe:encaixe,valorFriso:friso,valorEndireitamento:encaixe,valorAplainamento:friso,valorServicos:encaixe+friso,valorMaterial:material,volume:metros,valor:material+encaixe+friso};
}
`+app.slice(end);
  replace(`return {encaixe:permitido&&$('chkEndireitamento').checked,`,`const madeira=madeiras.find(x=>String(x.id)===String($('calcMadeira')?.value||''));
 return {compensarPerda:permitido&&madeira?.compensacaoPerdaAtiva===true,encaixe:permitido&&$('chkEndireitamento').checked,`);
  replace(`cobrarServicosLinear({volume:metros,preco:p,...selecionarServicosLinear()})`,`cobrarServicosLinear({volume:metros,comprimento:Number(c||0),quantidade:q,preco:p,...selecionarServicosLinear()})`);
  // The actual length remains the reference for stock and dimensions.
  replace(`<td>\${compOrcamento(x)}</td><td>\${num2(x.volume)} m</td><td>\${moeda(x.preco)}/m</td>`, `<td>\${compOrcamento(x)}<div class="no-print">\${botaoOpcaoOrc(ids,'compensarPerda',x.compensarPerda===true,'CMDP')}</div>\${x.compensarPerda===true&&Number(x.acrescimoComprimento)>0?'<small>Cobrado: '+numCompOrc(x.comprimentoCobrado)+' m</small>':''}</td><td>\${num2(x.volume)} m</td><td>\${moeda(x.preco)}/m</td>`);
  return app;
}
