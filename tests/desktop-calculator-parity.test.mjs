import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {applyDesktopCalculatorParity} from '../scripts/desktop-calculator-parity.mjs';
const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),tail=html.slice(html.indexOf('const TEMPLATE=')+15);let end=1;for(;end<tail.length;end++){if(tail[end]==='\\'){end++;continue}if(tail[end]==='"'){end++;break}}
const app=applyDesktopCalculatorParity(JSON.parse(tail.slice(0,end)));
const escape=s=>String(s).replaceAll('<','&lt;').replaceAll('>','&gt;');
const c={agruparItensMedida:arr=>arr.map(x=>({...x,_ids:[x.id]})),esc:escape,numCompOrc:Number,num2:x=>Number(x).toFixed(2),moeda:x=>'R$'+Number(x).toFixed(2),servicosLinearTexto:x=>x.encaixe?'Encaixe 10%':'',botaoOpcaoOrc:(ids,campo,ativo)=>`<button data-id="${ids}" data-field="${campo}" aria-pressed="${ativo}">CMDP</button>`};vm.createContext(c);
vm.runInContext(app.slice(app.indexOf('function pcPlanilhaLinearHtml('),app.indexOf('function pcPlanilhaHtml(')),c);
const rows=[{id:'L1',madeira:'Pinus',produto:'<Ripa>',tipoMedida:'linear',quantidade:2,comprimento:3.1,volume:6.2,comprimentoCobrado:3.5,acrescimoComprimento:.4,compensarPerda:true,encaixe:true,encaixePercentual:10,valor:77},{id:'M3',tipoMedida:'m3',valor:999}];
test('desktop quotation displays real and billed lengths, service snapshots and CMDP toggle',()=>{
 const view=c.pcPlanilhaLinearHtml(rows,'Orçamento',true,false);assert.match(view,/3.1 m/);assert.match(view,/\+0,40 m/);assert.match(view,/6.20 m/);assert.match(view,/ENC 10%/);assert.match(view,/R\$77.00/);assert.doesNotMatch(view,/999/);assert.match(view,/data-id="L1"/);assert.match(view,/&lt;Ripa&gt;/);
});
test('stock display does not offer quotation adjustment controls or prices',()=>{
 const view=c.pcPlanilhaLinearHtml(rows,'Estoque',false,true);assert.doesNotMatch(view,/<button|R\$|Encaixe/);assert.match(view,/6.20 m/);
});
test('load display includes selected services and charged amounts without budget controls',()=>{
 const view=c.pcPlanilhaLinearHtml(rows,'Carga',false,false);assert.match(view,/ENC 10%/);assert.match(view,/R\$77.00/);assert.doesNotMatch(view,/<button/);
});
