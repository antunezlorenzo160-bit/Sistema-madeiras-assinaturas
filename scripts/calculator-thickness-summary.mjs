import {readFileSync} from 'node:fs';
export function applyCalculatorThicknessSummary(app){
 const groupingStart=app.indexOf('function organizarBlocosResumoV598(');
 const groupingEnd=app.indexOf('\n}',groupingStart)+2;
 if(groupingStart<0||groupingEnd<2)throw new Error('Agrupamento do resumo não encontrado.');
 app=app.slice(0,groupingStart)+readFileSync(new URL('../ui/thickness-grouping.js',import.meta.url),'utf8').trimEnd()+app.slice(groupingEnd);
 if(app.includes('/* calculator-thickness-summary-v1 */'))return app;
 const target='function renderLancamentos(){';
 const start=app.indexOf(target),end=app.indexOf('\nfunction ',start+target.length);
 if(start<0||end<0)throw new Error('Resumo da calculadora não encontrado.');
 let body=app.slice(start,end);
 const declaration="let ultimoBlocoResumo='',totalBlocoResumo=0,unidadeBlocoResumo='m³',colunasBlocoResumo=6;";
 const row='${label}: ${valor} ${unidadeBlocoResumo}</td></tr>`;';
 if(!body.includes(declaration)||!body.includes(row))throw new Error('Totais dos blocos não encontrados.');
 body=body.replace(declaration,'const totaisEspessura=totaisEspessuraResumo(grupos);\n  '+declaration).replace(row,'${label}: ${valor} ${unidadeBlocoResumo}</td></tr>`+linhaTotalEspessuraResumo(totaisEspessura,ultimoBlocoResumo,colunasBlocoResumo);');
 const helper=readFileSync(new URL('../ui/thickness-summary.js',import.meta.url),'utf8');
 app=app.slice(0,start)+'/* calculator-thickness-summary-v1 */\n'+helper+'\n'+body+app.slice(end);
 // Desktop sheets already group each species/thickness across every length.
 app=app.replace("${tipo==='m2'?'Área total':'Volume total'}</small>","${tipo==='m2'?'Área total':'Volume total por espessura'}</small>");
 return app;
}
