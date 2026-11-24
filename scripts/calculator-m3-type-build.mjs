import {applyCalculatorLaunchPerformanceV831} from './calculator-launch-performance-build.mjs';
import {readFileSync} from 'node:fs';
export function applyCalculatorTypeV829(app){
 const replace=(a,b)=>{if(!app.includes(a))throw Error('Tipo m³: trecho ausente '+a.slice(0,90));app=app.replace(a,()=>b);};
 const block=/<div id="campoEspessura"><label>Espessura \(cm\)<\/label>\s*<div class="esp-preco-wrap">(<input[^>]*id="espessura"[^>]*>)(<span[^>]*id="precoBitolaAoLado"[^>]*>.*?<\/span>)<\/div>\s*<\/div>/;
 if(!block.test(app))throw Error('Tipo m³: campo de espessura ausente');
 app=app.replace(block,(_,input,price)=>'<div id="campoEspessura"><div class="calc-type-row-v829"><div><label for="espessura">Espessura (cm)</label><div class="esp-preco-wrap">'+input+'</div></div><div><div class="calc-type-label-v830"><label for="calcTipoM3V829">Tipo</label>'+price+'</div><select id="calcTipoM3V829" disabled><option value="">Informe a espessura</option></select></div></div></div>');
 replace('</head>','<style id="calculator-type-v829">#calculadora .calc-type-row-v829{display:grid;grid-template-columns:minmax(86px,110px) minmax(0,1fr);gap:12px;align-items:end}#calculadora .calc-type-row-v829>div{min-width:0}#calculadora .calc-type-row-v829 input,#calculadora .calc-type-row-v829 select{width:100%;box-sizing:border-box;min-width:0}#calculadora .calc-type-label-v830{display:flex;justify-content:space-between;align-items:center;gap:6px}#calculadora .calc-type-label-v830 label{margin:0}#calculadora .calc-type-label-v830 .preco-bitola-ao-lado{font-size:12px;white-space:normal;text-align:right}</style></head>');
 replace('function calcPreviewBaseV710(){',readFileSync(new URL('../ui/calculator-m3-type.js',import.meta.url),'utf8')+'\nfunction calcPreviewBaseV710(){');
 replace('function atualizarPrecoBitolaCalculadora(){', 'function atualizarPrecoBitolaCalculadora(){\n  const tipoBitolaV829=calcTypeRefreshV829();');
 replace('const bitola=bits.find(b=>regraListaContemNumeroV349(b.espessuraRegra??b.espessura,esp));', "const bitola=bits.find(b=>regraListaContemNumeroV349(b.espessuraRegra??b.espessura,esp)&&(tipoBitolaV829?String(b.tipo??b.produto??'').trim()===tipoBitolaV829:!m3TypeChoicesV829(bits,esp).length));");
 replace("  if(!m)return alert(", "  if((modoMedida==='m3'||modoMedida==='m3fechado')){const error=calcTypeValidateV829();if(error)return alert(error);}\n  if(!m)return alert(");
 replace('  const destino=destinoSelecionado();item.destino=destino;', "  if(modoMedida==='m3'||modoMedida==='m3fechado'){const type=$('calcTipoM3V829')?.value;if(type){item.tipoBitolaV829=type;item.produto=type;}}\n  const destino=destinoSelecionado();item.destino=destino;");
 replace("prod=t==='linear'?String(x.produto||x.tipoLinear||'').trim().toLowerCase():''", "prod=t==='linear'?String(x.produto||x.tipoLinear||'').trim().toLowerCase():String(x.tipoBitolaV829||'').trim().toLowerCase()");
 replace('function pcItemNome(x){', "function pcItemNome(x){if(x?.tipoBitolaV829)return String(x.madeira||x.nomeMadeira||'Sem espécie')+' · '+x.tipoBitolaV829;");
 return applyCalculatorLaunchPerformanceV831(app);
}
