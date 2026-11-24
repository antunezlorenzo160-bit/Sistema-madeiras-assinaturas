import {readFileSync} from 'node:fs';
export function applyCalculatorLaunchPerformanceV831(app){
 const focusStart=app.indexOf('function prepararProximoLancamentoM3(){'),focusEnd=app.indexOf('// Renderizações fora da tela',focusStart);
 if(focusStart<0||focusEnd<focusStart)throw Error('Launch stability: next-width function missing');
 const focus=app.slice(focusStart,focusEnd).replace("if(document.activeElement!==largura)largura.focus({preventScroll:true});\n      largura.select();", "if(document.activeElement!==largura)largura.focus({preventScroll:true});");
 app=app.slice(0,focusStart)+focus+app.slice(focusEnd);
 const a=app.indexOf('function atualizarTelasAposLancamento(destino){'),b=app.indexOf('function saldoDimensionalMadeira(',a);
 if(a<0||b<a)throw Error('Launch performance: launch rendering function missing');
 const original=app.slice(a,b);if(!original.includes("if(destino!=='carga')save();"))throw Error('Launch performance: persistence boundary changed');
 app=app.slice(0,a)+readFileSync(new URL('../ui/calculator-launch-performance.js',import.meta.url),'utf8')+'\n'+app.slice(b);
 // Repeated sync acknowledgements keep the existing row DOM and native focus/selection.
 const start=app.indexOf('function renderLancamentos(){'),finish=app.indexOf('\n// V377',start);
 let body=app.slice(start,finish);
 const tableStart='  tb.innerHTML=grupos.length?',tableEnd='Nenhuma peça lançada.</td></tr>`;';
 if(!body.includes(tableStart)||!body.includes(tableEnd))throw Error('Launch performance: summary table changed');
 body=body.replace(tableStart,'  stableCalculatorHtmlV831(tb,grupos.length?').replace(tableEnd,'Nenhuma peça lançada.</td></tr>`);');
 body=body.replace('    hostEspecies.innerHTML=especiesTotais.map(g=>{','    stableCalculatorHtmlV831(hostEspecies,especiesTotais.map(g=>{').replace("    }).join('');\n  }", "    }).join(''));\n  }");
 app=app.slice(0,start)+body+app.slice(finish);
 const flowStart=app.indexOf('  function atualizarFluxoCargaV388(){'),flowEnd=app.indexOf('  // Permite corrigir uma peça',flowStart);
 if(flowStart<0||flowEnd<flowStart)throw Error('Launch performance: load panel changed');
 let flow=app.slice(flowStart,flowEnd);
 flow=flow.replace("painel.innerHTML='';return", "stableCalculatorHtmlV831(painel,'');return").replace("    painel.innerHTML='<div", "    stableCalculatorHtmlV831(painel,'<div").replace("    }).join('');", "    }).join(''));");
 return app.slice(0,flowStart)+flow+app.slice(flowEnd);
}
