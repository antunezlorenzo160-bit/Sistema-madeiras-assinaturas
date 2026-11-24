import {applyCalculatorTypeV829} from './calculator-m3-type-build.mjs';
export function applyLastroV825(app){
 const replace=(a,b)=>{if(!app.includes(a))throw Error('Lastro: trecho ausente '+a.slice(0,100));app=app.replace(a,()=>b);};
 replace("modoMedida==='linear'&&String($('quantidade').value).trim()===''?1:Number($('quantidade').value)","modoMedida==='linear'&&String($('quantidade').value).trim()===''?1:Number($('quantidade').value)");
 replace("const q=Number($('quantidade').value||0),l=", "const q=Number($('quantidade').value||0),l=");
 replace("c=numero('comprimento'),q=numero('quantidade');", "c=numero('comprimento'),q=numero('quantidade');");
 replace("if(modoMedida==='linear')Object.assign(item,linearEntryV744", "if(lastroSelectedV828())Object.assign(item,lastroEntryV825(l,e,c,q));\n  if(modoMedida==='linear')Object.assign(item,linearEntryV744");
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
 replace("function aplicarCobrancaOrcamento(x){", "function aplicarCobrancaOrcamento(x){if(isLastroM3V825(x)){const priced=aplicarCobrancaOrcamento({...x,lastroM3V825:false,quantidade:Number(x.lastrosV826||1),compensarPerda:false});return {...priced,lastroM3V825:true,quantidade:0};}");
 replace("function volumeFisicoItemV370(i){", "function volumeFisicoItemV370(i){if(isLastroM3V825(i))return Number(i.volumeReal??i.volume)||0;");
 // Keep measured lastros separate from counted rows in all standard grouping keys.
 replace("fechado=x.vendaFechadaM3===true?'F1':isLinearTotalV744(x)?'LT1':'F0'", "fechado=isLastroM3V825(x)?'LASTRO':x.vendaFechadaM3===true?'F1':isLinearTotalV744(x)?'LT1':'F0'");
 replace("linear?'Quantidade (opcional)':'Quantidade'", "linear?'Quantidade (opcional)':'Quantidade';const lastroButton=document.getElementById('lastroChooseV826');if(lastroButton)lastroButton.hidden=modoMedida!=='m3'");
 app=app.replaceAll('${g.quantidade}pç', "${g.lastroM3V825?lastroLabelV826(g):g.quantidade+'pç'}");
 app=app.replaceAll('${Number(x.quantidade)||0}pç', "${isLastroM3V825(x)?lastroLabelV826(x):(Number(x.quantidade)||0)+'pç'}");
 replace('nome,espessura:esp,largura:larg,comprimento:comp,', 'nome,lastroM3V825:x.lastroM3V825===true,espessura:esp,largura:larg,comprimento:comp,');
 replace(':`${nome}|${esp.toFixed(4)}|${larg.toFixed(4)}|${comp.toFixed(4)}`;', ':`${nome}|${esp.toFixed(4)}|${larg.toFixed(4)}|${comp.toFixed(4)}|${x.lastroM3V825===true}`;');
 app=app.replaceAll("volume:Number(item.volume||0),quantidade:Number(item.quantidade||0),largura:", "volume:Number(item.volume||0),quantidade:Number(item.quantidade||0),...(isLastroM3V825(item)?{lastroM3V825:true}:{}),largura:");
 app=app.replaceAll('${Number(x.quantidade||0)}pç', "${isLastroM3V825(x)?lastroLabelV826(x):Number(x.quantidade||0)+'pç'}");
 replace("  const v1=m2?areaM2(l,c,1)", "  if(modoMedida==='m3')$('labelPreview1').textContent=lastroSelectedV828()?'Volume do lastro':'Volume da peça';\n  const v1=m2?areaM2(l,c,1)");
 app=app.replaceAll('isLinearTotalV744(item)?1e-8:0','isMeasuredTotalV825(item)?1e-8:0');
 app=app.replaceAll('<small>Total de peças</small>', '<small>Peças informadas</small>').replaceAll('<small>Total geral — peças</small>', '<small>Total de peças informadas</small>');
 app=app.replaceAll('numeroRomaneioV418(metricas.pecas,0)', "(metricas.pecas>0?numeroRomaneioV418(metricas.pecas,0):'—')");
 app=app.replaceAll('g.quantidade+=Number(x.quantidade||0);', 'g.quantidade+=Number(x.quantidade||0);if(isLastroM3V825(x)){g.lastrosV826=(g._lastroAccumV828||0)+Number(x.lastrosV826||1);g._lastroAccumV828=g.lastrosV826;}');
 replace('<div class="quantidade-inline-v254">', `<div class="quantidade-inline-v254"><select id="lastroChooseV826" hidden aria-label="Unidade da quantidade" style="width:auto;min-height:40px"><option value="pieces">Peças</option><option value="lastros">Lastros</option></select>`);
 replace("  if(!m)return alert(", "  if(modoMedida==='m3'&&String($('quantidade').value).trim()==='')return alert('Informe a quantidade de peças ou de lastros.');\n  if(lastroSelectedV828()&&(!Number.isSafeInteger(q)||q<1||q>1000000))return alert('Informe uma quantidade inteira positiva de lastros.');\n  if(!m)return alert(");
 replace('function calcPreviewBaseV710(){', `// LASTRO_BUTTON_V827
 function lastroSelectedV828(){return modoMedida==='m3'&&document.getElementById('lastroChooseV826')?.value==='lastros';}
 document.getElementById('lastroChooseV826')?.addEventListener('change',()=>{if(modoMedida!=='m3')return;const field=$('quantidade');if(!String(field.value).trim()||isLastroInputV826(field.value))field.value='1';calcPreview();});
 // END_LASTRO_BUTTON_V827
 function calcPreviewBaseV710(){`);
 replace("  $('quantidade').value=1;", "  $('quantidade').value=1;const unit=document.getElementById('lastroChooseV826');if(unit)unit.value='pieces';");
 app=app.replaceAll('lastroM3V825:true}:{}', 'lastroM3V825:true,lastrosV826:Number(item.lastrosV826||1)}:{}');
 // The stock and movement snapshots carry lastro counts separately from pieces.
 for(const v of ['ref','i','entrada'])app=app.replaceAll('isLastroM3V825('+v+')?{lastroM3V825:true,lastrosV826:Number(item.lastrosV826||1)}', 'isLastroM3V825('+v+')?{lastroM3V825:true,lastrosV826:Number('+v+'.lastrosV826||1)}');

 const deductionStart=app.indexOf('async function salvarCargaComBaixa('),deductionEnd=app.indexOf('function mesmaBitolaTransferencia(',deductionStart);
 const deduction=app.slice(deductionStart,deductionEnd).replaceAll('lastrosV826:Number(item.lastrosV826||1)', 'lastrosV826:Number(item.lastrosV826||1)*op.volume/Number(item.volume)');
 app=app.slice(0,deductionStart)+deduction+app.slice(deductionEnd);
 app=app.replaceAll('lastrosV826:Number(ref.lastrosV826||1)', 'lastrosV826:Number(ref.lastrosV826||1)*proporcao');
 return applyCalculatorTypeV829(app);
}
