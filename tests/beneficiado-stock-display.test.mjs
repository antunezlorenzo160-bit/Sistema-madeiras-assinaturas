import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {purchasePacketCountV755} from '../public/stock-purchase.mjs';
const raw=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),app=JSON.parse(raw.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]),start=app.indexOf('function renderPlanilhasM3Especies(){'),end=app.indexOf("\ndocument.querySelectorAll('.planilha-estoque-btn')",start+30),source=app.slice(start,end);
function render(rows){
 const dest={innerHTML:'',querySelectorAll:()=>[]},note={},bloco={style:{},querySelector:()=>note},title={};
 const fmt=(n,d)=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}),before=JSON.stringify(rows);
 const c={lotePacotesEmCurso:false,queueStockChartsV720(){},diferirRenderizacaoV595:()=>false,$:id=>id==='planilhasM3Especies'?dest:id==='blocoPlanilhasM3'?bloco:id==='tituloPlanilhaEstoque'?title:null,document:{querySelectorAll:()=>[]},estoquePlanilhaAtivo:'estoque2',estoqueTipo:'m2',estoque1Lancamentos:[],estoque2Lancamentos:rows,larguraAtivaPorProduto:{},esc:String,numM1:n=>fmt(n,1),num2:n=>fmt(n,2),numCm:n=>String(n).replace('.',','),purchasePacketCountV755,save(){throw Error('Presentation must not write inventory');}};
 vm.createContext(c);vm.runInContext(source,c);c.renderPlanilhasM3Especies();assert.equal(JSON.stringify(rows),before);return dest.innerHTML;
}
let seq=0;const row=(length,quantity,counted=false,extra={})=>({id:'r'+ ++seq,tipoMedida:'m2',madeira:'Pinus',largura:10,comprimento:length,quantidade:quantity,volume:.1*length*quantity,contadoComoPacote:counted,...extra});
const plain=s=>s.replace(/<small\b[^>]*>[\s\S]*?<\/small>/g,'').replace(/<[^>]*>/g,'').trim();
const cells=html=>[...html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>plain(m[1]));
function blocks(html){return [...html.matchAll(/<h5[^>]*>([^<]+)<\/h5>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>[\s\S]*?<tfoot>([\s\S]*?)<\/tfoot>/g)].map(m=>({length:m[1],rows:[...m[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map(x=>cells(x[1])),total:cells(m[3])}));}
test('reported stock shows 153 pieces/51.90m² with counted packets separated from unknown packet counts',()=>{
 const rows=[...Array.from({length:5},()=>row(2.5,6,true)),row(2.5,6),...Array.from({length:7},()=>row(3,6)),row(3,5),row(3,4),...Array.from({length:6},()=>row(3.5,6,true)),...Array.from({length:5},()=>row(5,6,true))],html=render(rows),result=blocks(html);
 assert.match(html,/peças totais/);assert.match(html,/Pacotes informados nesta largura<\/small><strong>16/);assert.match(html,/Peças nesta largura<\/small><strong>153/);assert.match(html,/51,90 m²/);
 const short=result.find(b=>b.length==='2,5 m');assert.equal(short.rows.length,2);assert.deepEqual(short.rows[0],['5','30pç','10 cm','× 2,5 m','7,50 m²']);assert.deepEqual(short.rows[1],['—','6pç','10 cm','× 2,5 m','1,50 m²']);assert.equal(short.total[1],'36pç');assert.equal(short.total[4],'9,00 m²');
 const three=result.find(b=>b.length==='3,0 m');assert.equal(three.rows.length,1);assert.deepEqual(three.rows[0],['—','51pç','10 cm','× 3,0 m','15,30 m²']);assert.equal(three.total[0],'—');
 assert.equal(result.find(b=>b.length==='3,5 m').rows[0][1],'36pç');assert.equal(result.find(b=>b.length==='5,0 m').rows[0][1],'30pç');
 const renderedIds=[...html.matchAll(/abrirPecasLinhaV224\('estoque','est2','([^']+)'\)/g)].flatMap(m=>m[1].split(','));assert.deepEqual([...renderedIds].sort(),rows.map(r=>r.id).sort());assert.match(html,/6 pç\/pct/);
});
test('grouped purchase packet count reaches header and rows; partial packet remainder never invents package count',()=>{
 const full=row(3,20,true,{largura:20,volume:12,purchasePacketsV755:2,purchasePiecesPerPacketV755:10}),html=render([full]),group=blocks(html)[0];assert.match(html,/Pacotes informados nesta largura<\/small><strong>2/);assert.deepEqual(group.rows[0],['2','20pç','20 cm','× 3,0 m','12,00 m²']);
 const remaining={...full,quantidade:15,volume:9},partial=render([remaining]);assert.equal(blocks(partial)[0].rows[0][0],'—');assert.equal(blocks(partial)[0].rows[0][1],'15pç');assert.equal(remaining.purchasePacketsV755,2);
});
