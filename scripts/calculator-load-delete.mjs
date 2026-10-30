import {readFileSync} from 'node:fs';
export function applyCalculatorLoadDelete(app){
 const start=app.indexOf('async function apagarCargaAtualV388(){');
 const end=app.indexOf('\n  function garantirPainelCargaV388()',start);
 if(start<0||end<0)throw new Error('Fluxo de exclusão de carregamento não encontrado.');
 app=app.slice(0,start)+readFileSync(new URL('../ui/delete-calculator-load.js',import.meta.url),'utf8').trimEnd()+'\n'+app.slice(end);
 const target='function atualizarFluxoCargaV388(){';
 if(!app.includes(target))throw new Error('Atualização dos botões de carga não encontrada.');
 if(!app.includes('/* calculator-load-summary-button */'))app=app.replace(target,target+'\n    /* calculator-load-summary-button */ atualizarBotaoApagarResumoCarga();');
 return app;
}
