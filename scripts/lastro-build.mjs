export function applyLastroV825(app){
 const replace=(a,b)=>{if(!app.includes(a))throw Error('Lastro: trecho ausente '+a.slice(0,100));app=app.replace(a,()=>b);};
 replace("modoMedida==='linear'&&String($('quantidade').value).trim()===''?1:Number($('quantidade').value)","(modoMedida==='m3'&&isLastroInputV826($('quantidade').value)||modoMedida==='linear'&&String($('quantidade').value).trim()==='')?1:Number($('quantidade').value)");
 replace("const q=Number($('quantidade').value||0),l=", "const q=modoMedida==='m3'&&isLastroInputV826($('quantidade').value)?1:Number($('quantidade').value||0),l=");
 replace("c=numero('comprimento'),q=numero('quantidade');", "c=numero('comprimento'),q=modoMedida==='m3'&&isLastroInputV826($('quantidade').value)?1:numero('quantidade');");
 replace("if(modoMedida==='linear')Object.assign(item,linearEntryV744", "if(modoMedida==='m3'&&isLastroInputV826($('quantidade').value))Object.assign(item,lastroEntryV825(l,e,c));\n  if(modoMedida==='linear')Object.assign(item,linearEntryV744");
 // Only physical controls use cubic volume in place of unknown pieces. Linear descriptions stay linear.
 app=app.replaceAll("||isLinearTotalV744(item);", "||isMeasuredTotalV825(item);");
 app=app.replaceAll('itens.some(isLinearTotalV744)', 'itens.some(isMeasuredTotalV825)');
 app=app.replaceAll('quantidade:isLinearTotalV744(', 'quantidade:isMeasuredTotalV825(');
 for(const v of ['item','ref','i','entrada']){
  app=app.replaceAll('...(isLinearTotalV744('+v+')?{linearTotalV744:true', '...(isLastroM3V825('+v+')?{lastroM3V825:true}:{}),...(isLinearTotalV744('+v+')?{linearTotalV744:true');
 }
 app=app.replaceAll("isLinearTotalV744(f.ref)?'m':'pç'", "isLastroM3V825(f.ref)?'m³':isLinearTotalV744(f.ref)?'m':'pç'");
 app=app.replaceAll("isLinearTotalV744(item)?'m':'peça(s)'", "isLastroM3V825(item)?'m³':isLinearTotalV744(item)?'m':'peça(s)'");
 app=app.replaceAll("isLinearTotalV744(i)?'—':numeroRomaneioV418(m.pecas,0)","isLastroM3V825(i)?lastroLabelV826(i):isLinearTotalV744(i)?'—':numeroRomaneioV418(m.pecas,0)");
 replace("function aplicarCobrancaOrcamento(x){", "function aplicarCobrancaOrcamento(x){if(isLastroM3V825(x)){const priced=aplicarCobrancaOrcamento({...x,lastroM3V825:false,quantidade:1,compensarPerda:false});return {...priced,lastroM3V825:true,quantidade:0};}");
 replace("function volumeFisicoItemV370(i){", "function volumeFisicoItemV370(i){if(isLastroM3V825(i))return Number(i.volumeReal??i.volume)||0;");
 // Keep measured lastros separate from counted rows in all standard grouping keys.
 replace("fechado=x.vendaFechadaM3===true?'F1':isLinearTotalV744(x)?'LT1':'F0'", "fechado=isLastroM3V825(x)?'LASTRO':x.vendaFechadaM3===true?'F1':isLinearTotalV744(x)?'LT1':'F0'");
 replace("linear?'Quantidade (opcional)':'Quantidade'", "linear?'Quantidade (opcional)':'Quantidade';const lastroButton=document.getElementById('lastroChooseV826');if(lastroButton)lastroButton.hidden=modoMedida!=='m3'");
 replace('<p class="note" id="linearTotalHintV744"', '<p class="note">No m³, informe a quantidade de peças ou escreva Lastros para medir o conjunto. Cada lançamento é identificado como 1 Lstr.</p><p class="note" id="linearTotalHintV744"');
 app=app.replaceAll('${g.quantidade}pç', "${g.lastroM3V825?lastroLabelV826(g):g.quantidade+'pç'}");
 app=app.replaceAll('${Number(x.quantidade)||0}pç', "${isLastroM3V825(x)?lastroLabelV826(x):(Number(x.quantidade)||0)+'pç'}");
 replace('nome,espessura:esp,largura:larg,comprimento:comp,', 'nome,lastroM3V825:x.lastroM3V825===true,espessura:esp,largura:larg,comprimento:comp,');
 replace(':`${nome}|${esp.toFixed(4)}|${larg.toFixed(4)}|${comp.toFixed(4)}`;', ':`${nome}|${esp.toFixed(4)}|${larg.toFixed(4)}|${comp.toFixed(4)}|${x.lastroM3V825===true}`;');
 app=app.replaceAll("volume:Number(item.volume||0),quantidade:Number(item.quantidade||0),largura:", "volume:Number(item.volume||0),quantidade:Number(item.quantidade||0),...(isLastroM3V825(item)?{lastroM3V825:true}:{}),largura:");
 app=app.replaceAll('${Number(x.quantidade||0)}pç', "${isLastroM3V825(x)?lastroLabelV826(x):Number(x.quantidade||0)+'pç'}");
 replace("  const v1=m2?areaM2(l,c,1)", "  if(modoMedida==='m3')$('labelPreview1').textContent=isLastroInputV826($('quantidade').value)?'Volume do lastro':'Volume da peça';\n  const v1=m2?areaM2(l,c,1)");
 app=app.replaceAll('isLinearTotalV744(item)?1e-8:0','isMeasuredTotalV825(item)?1e-8:0');
 app=app.replaceAll('<small>Total de peças</small>', '<small>Peças informadas</small>').replaceAll('<small>Total geral — peças</small>', '<small>Total de peças informadas</small>');
 app=app.replaceAll('numeroRomaneioV418(metricas.pecas,0)', "(metricas.pecas>0?numeroRomaneioV418(metricas.pecas,0):'—')");
 app=app.replaceAll('g.quantidade+=Number(x.quantidade||0);', 'g.quantidade+=Number(x.quantidade||0);if(isLastroM3V825(x))g.lastrosV826=(g.lastrosV826||0)+1;');
 replace('<input id="quantidade" type="number"', '<input id="quantidade" type="text"');
 replace('id="quantidade" type="text" min="1"', 'id="quantidade" type="text" list="lastroOptionsV826" min="1"');
 replace('<div class="quantidade-row quantidade-row-v254">', `<datalist id="lastroOptionsV826"><option value="Lastros"></option></datalist><div class="quantidade-row quantidade-row-v254"><button id="lastroChooseV826" hidden type="button" class="btn btn-secondary" style="min-height:36px;padding:6px 10px" onclick="document.getElementById('quantidade').value='Lastros';calcPreview()">Lastros</button>`);
 replace("  if(!m)return alert(", "  if(modoMedida==='m3'&&String($('quantidade').value).trim()==='')return alert('Informe a quantidade de peças ou escreva Lastros.');\n  if(!m)return alert(");
 return app;
}
