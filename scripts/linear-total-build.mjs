export function applyLinearTotalV744(app){
 if(app.includes('// LINEAR_TOTAL_V744'))return app;
 const replace=(a,b)=>{if(!app.includes(a))throw Error('Linear total: trecho ausente '+a.slice(0,90));app=app.replace(a,()=>b);};
 replace('async function lancar(){','// LINEAR_TOTAL_V744\nasync function lancar(){');
 replace("?1:Number($('quantidade').value),volumeGranelV384", "?1:(modoMedida==='linear'&&String($('quantidade').value).trim()===''?1:Number($('quantidade').value)),volumeGranelV384");
 replace("if(modoMedida==='linear'){unidade='m';if(positivo(c)&&positivo(q))valor=c*q;}", "if(modoMedida==='linear'){unidade='m';const qtd=String($('quantidade').value).trim()===''?1:q;if(positivo(c)&&positivo(qtd))valor=c*qtd;}");
 const validation="  if(modoMedida==='linear'&&(!(c>0)||!Number.isSafeInteger(q)||q<1))return alert('Preencha o comprimento e uma quantidade inteira e positiva de peças.');";
 replace(validation,"  if(modoMedida==='linear'){try{linearEntryV744($('comprimento').value,$('quantidade').value);}catch(e){return alert(e.message);}}");
 replace('const destino=destinoSelecionado();item.destino=destino;',"if(modoMedida==='linear')Object.assign(item,linearEntryV744($('comprimento').value,$('quantidade').value));\n  const destino=destinoSelecionado();item.destino=destino;");
 replace("const metros=Number(c||0)*Math.max(0,q);", "const entradaLinearV744=String($('quantidade').value).trim()===''?1:q;\n    const metros=Number(c||0)*Math.max(0,entradaLinearV744);");
 // The existing processing helper uses volume for totals, with no invented per-piece CMDP.
 replace('cobrarServicosLinear({volume:metros,comprimento:Number(c||0),quantidade:q,preco:p,...selecionarServicosLinear()})',"cobrarServicosLinear({volume:metros,comprimento:String($('quantidade').value).trim()===''?0:Number(c||0),quantidade:entradaLinearV744,preco:p,...selecionarServicosLinear()})");
 replace("$('labelQuantidade').textContent=m2?'Peças por pacote':'Quantidade';", "$('labelQuantidade').textContent=m2?'Peças por pacote':linear?'Quantidade (opcional)':'Quantidade';const notaLinear=document.getElementById('linearTotalHintV744');if(notaLinear)notaLinear.hidden=!linear;");
 replace('<div class="quantidade-row quantidade-row-v254">','<p class="note" id="linearTotalHintV744" hidden>Sem quantidade, informe em Comprimento a metragem total somada. Ex.: 70 m de vários comprimentos. As peças e o comprimento individual ficam não informados.</p><div class="quantidade-row quantidade-row-v254">');
 replace("function compLinhaV392(i){", "function compLinhaV392(i){if(isLinearTotalV744(i))return 'Metragem total';");
 app=app.replaceAll('${numeroRomaneioV418(m.pecas,0)}', "${isLinearTotalV744(i)?'—':numeroRomaneioV418(m.pecas,0)}");
 replace("function compOrcamento(x){", "function compOrcamento(x){if(isLinearTotalV744(x))return 'Metragem total';");
 app=app.replaceAll("const unidadeVolume=(item.tipoMedida||'m3')==='granel';", "const unidadeVolume=(item.tipoMedida||'m3')==='granel'||isLinearTotalV744(item);");
 for(const name of ['mesmaBitolaCarga','mesmaBitolaTransferencia'])replace('function '+name+'(a,b){','function '+name+'(a,b){const linear=linearMatchV744(a,b);if(linear!==null)return linear;');
 app=app.replaceAll('const novo={...atual,quantidade:unidadeVolume?Number(atual.quantidade||0)*fator:qDepois,volume:Number(atual.volume||0)*fator,valor:Number(atual.valor||0)*fator,atualizadoEm:Date.now()};','const novo=linearRemainderV744(atual,{...atual,quantidade:unidadeVolume?Number(atual.quantidade||0)*fator:qDepois,volume:Number(atual.volume||0)*fator,valor:Number(atual.valor||0)*fator,atualizadoEm:Date.now()});');
 replace('quantidade:op.retirar,\n      largura:Number(item.largura||0),','quantidade:isLinearTotalV744(item)?0:op.retirar,\n      ...(isLinearTotalV744(item)?{linearTotalV744:true,produto:item.produto||\'\'}:{}),\n      largura:Number(item.largura||0),');
 app=app.replaceAll('quantidade:Number(unidadeVolume?item.volume:item.quantidade)||0,largura:',"quantidade:isLinearTotalV744(item)?0:Number(unidadeVolume?item.volume:item.quantidade)||0,...(isLinearTotalV744(item)?{linearTotalV744:true,produto:item.produto||''}:{}),largura:");
 // Validate combined demands against a virtual stock; reserve explicit lengths before totals.
 replace('function conferirSaldoCargaV388(itens){',"function conferirSaldoCargaV388(itens){if(itens.some(isLinearTotalV744)){const missing=linearConferenceV744(itens,fonteFisicaCargaV388,mesmaBitolaCarga,ehMadeiraVerde);return missing.length?{ok:false,...missing[0]}:{ok:true};}");
 replace('function faltasSaldoCargaV390(itens){',"function faltasSaldoCargaV390(itens){if(itens.some(isLinearTotalV744))return linearConferenceV744(itens,fonteFisicaCargaV388,mesmaBitolaCarga,ehMadeiraVerde);");
 replace('async function executarBaixaConferidaCargaV390(grupoId,itens,{ajustes=[]}={}){', 'async function executarBaixaConferidaCargaV390(grupoId,itens,{ajustes=[]}={}){itens=[...itens].sort((a,b)=>Number(isLinearTotalV744(a))-Number(isLinearTotalV744(b)));');
 app=app.replaceAll('qRef=Math.max(0,Number(ref.quantidade||0))','qRef=Math.max(0,linearUnitsV744(ref))');
 // Both quick-conference entry formats keep the unknown count as zero and the missing metres as volume.
 app=app.replaceAll('        quantidade:q,\n',"        quantidade:isLinearTotalV744(ref)?0:q,\n        ...(isLinearTotalV744(ref)?{linearTotalV744:true}:{}),\n");
 app=app.replaceAll('quantidade:Number(f.faltam||0),volume:Number(i.volume||0),',"quantidade:isLinearTotalV744(i)?0:Number(f.faltam||0),volume:Number(i.volume||0),...(isLinearTotalV744(i)?{linearTotalV744:true,produto:i.produto||''}:{}),");
 app=app.replaceAll('quantidade:q,volume:Number(entrada.volume||0),',"quantidade:isLinearTotalV744(entrada)?0:q,volume:Number(entrada.volume||0),...(isLinearTotalV744(entrada)?{linearTotalV744:true,produto:entrada.produto||''}:{}),");
 app=app.replaceAll("item.tipoMedida==='granel'?'m³':'peça(s)'", "item.tipoMedida==='granel'?'m³':isLinearTotalV744(item)?'m':'peça(s)'");
 // Totals have their own grouping key and never mix with a known single long piece.
 replace("fechado=x.vendaFechadaM3===true?'F1':'F0'", "fechado=x.vendaFechadaM3===true?'F1':isLinearTotalV744(x)?'LT1':'F0'");
 app=app.replaceAll('${x.quantidade}', '${linearPieceTextV744(x)}');
 app=app.replaceAll('${numM1(x.comprimento)} m','${isLinearTotalV744(x)?\'Metragem total\':numM1(x.comprimento)+\' m\'}');
 replace("function descricaoMedidaCargaV388(i){", "function descricaoMedidaCargaV388(i){if(isLinearTotalV744(i))return (i.produto||'Produto')+' • '+num2(i.volume)+' m totais';");
 replace("const metros=real>0?real*q:Math.max(0,Number(x.volumeReal??x.volume??0));", "const metros=real>0?real*q:Math.max(0,Number(x.volumeReal??x.volume??0));");
 // Desktop and stock sheets retain unknown quantities instead of manufacturing a piece.
 app=app.replaceAll("'+Number(x.quantidade||0)+'</td><td>'+numCompOrc(x.comprimento)+' m</td>'", "'+linearPieceTextV744(x)+'</td><td>'+(isLinearTotalV744(x)?'Metragem total':numCompOrc(x.comprimento)+' m')+'</td>'");
 replace("${Number(g.quantidade||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}pç", "${Number(g.quantidade||0)>0?Number(g.quantidade).toLocaleString('pt-BR',{maximumFractionDigits:2})+'pç':'—'}");
 replace('${numM1(g.comprimento)} m',"${Number(g.comprimento)>0?numM1(g.comprimento)+' m':'Variados'}");
 app=app.replaceAll('Falta ${qtd} pç', "Falta ${qtd} ${isLinearTotalV744(f.ref)?'m':'pç'}");
 app=app.replaceAll(': +${q} pç', ": +${q} ${isLinearTotalV744(f.ref)?'m':'pç'}");
 app=app.replaceAll('<b>Peça ${i+1}</b>', "<b>${isLinearTotalV744(x)?'Metragem total':'Peça '+(i+1)}</b>");
 replace("!granel?'Comp. '+numCompOrc(x.comprimento)+' m':''", "!granel?(isLinearTotalV744(x)?'Metragem total':'Comp. '+numCompOrc(x.comprimento)+' m'):''");
 replace('<small>Peças deste tipo</small>', '<small>Peças informadas deste tipo</small>');
 app=app.replaceAll("${Number(qtdTipo||0).toLocaleString('pt-BR',{maximumFractionDigits:2})}pç", "${qtdTipo>0?Number(qtdTipo).toLocaleString('pt-BR',{maximumFractionDigits:2})+'pç informadas':'—'}");
 app=app.replaceAll("'+Number(x.quantidade||0)+'</td>","'+linearPieceTextV744(x)+'</td>");
 app=app.replaceAll("'+numCompOrc(x.comprimento)+' m</td>","'+(isLinearTotalV744(x)?'Metragem total':numCompOrc(x.comprimento)+' m')+'</td>");
 app=app.replaceAll('if(faltam>0){', 'if(faltam>(isLinearTotalV744(item)?1e-8:0)){');
 app=app.replaceAll('if(qDepois<=0){', 'if(qDepois<=(isLinearTotalV744(item)?1e-8:0)){');
 replace("botaoOpcaoOrc(ids,'compensarPerda',x.compensarPerda===true,'CMDP')", "(isLinearTotalV744(x)?'':botaoOpcaoOrc(ids,'compensarPerda',x.compensarPerda===true,'CMDP'))");
 replace("const botao=orc?'<div class=", "const botao=orc&&!isLinearTotalV744(x)?'<div class=");
 return app;
}
