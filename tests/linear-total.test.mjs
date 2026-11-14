import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {linearEntryV744,isLinearTotalV744,linearMatchV744,linearRemainderV744,linearConferenceV744,linearUnitsV744,linearPieceTextV744} from '../public/linear-total.mjs';
const base={madeiraId:'wood',madeira:'Eucalipto',produto:'Cemalha',tipoMedida:'linear'},total=(metres=70)=>({...base,...linearEntryV744(metres,'')});
test('70 metres without a piece count is a total, while explicit length and pieces keep their original meaning',()=>{
 assert.deepEqual(linearEntryV744('70',''),{linearTotalV744:true,comprimento:0,quantidade:0,volume:70,volumeReal:70});assert.deepEqual(linearEntryV744('7','10'),{comprimento:7,quantidade:10,volume:70,volumeReal:70});assert.equal(linearEntryV744('70,5',' ').volume,70.5);assert.equal(linearPieceTextV744(total()),'—');
 for(const q of ['0','-1','1.5','x'])assert.throws(()=>linearEntryV744(70,q));for(const length of ['','0','-2','Infinity'])assert.throws(()=>linearEntryV744(length,''));
});
test('total metres consume matching products across lengths but never infer pieces from an unknown total',()=>{
 const pieces={...base,comprimento:7,quantidade:10,volume:70};assert.equal(linearMatchV744(pieces,total()),true);assert.equal(linearMatchV744({...pieces,produto:'Rodapé'},total()),false);assert.equal(linearMatchV744({...pieces,madeiraId:'pine',madeira:'Pinus'},total()),false);assert.equal(linearMatchV744(total(),pieces),false);
 const rest=linearRemainderV744(pieces,{...pieces,quantidade:65/7,volume:65});assert.equal(rest.volume,65);assert.equal(rest.quantidade,0);assert.equal(rest.comprimento,0);assert.equal(isLinearTotalV744(rest),true);
 assert.equal(linearRemainderV744(pieces,{...pieces,quantidade:9,volume:63}).quantidade,9);
});
test('combined load conference reserves known pieces first and reports missing metres without changing stock',()=>{
 const stock=[{...base,comprimento:7,quantidade:10,volume:70}],source={arr:stock,nome:'Estoque 1',verde:false},match=(a,b)=>linearMatchV744(a,b)??(a.comprimento===b.comprimento),before=JSON.stringify(stock),known={...base,comprimento:7,quantidade:1,volume:7};
 assert.equal(linearConferenceV744([total(63),known],()=>source,match,()=>false).length,0);const missing=linearConferenceV744([total(70),known],()=>source,match,()=>false);assert.equal(missing.length,1);assert.equal(missing[0].faltam,7);assert.equal(missing[0].solicitado,70);assert.equal(JSON.stringify(stock),before);
});
const raw=readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),app=JSON.parse(raw.match(/const TEMPLATE\s*=\s*("(?:\\.|[^"\\])*")/)[1]);
function compiledContext(){
 const fields={};for(const id of ['calcMadeira','largura','espessura','comprimento','quantidade','precoM3','cadCmdp','nomeOrigemDestino'])fields[id]={value:'',checked:false,focus(){},select(){}};fields.calcMadeira.value='wood';fields.comprimento.value='70';fields.quantidade.value='';
 const queue=[],alerts=[],c={console,Date,crypto:{randomUUID},$:id=>fields[id]||{value:'',checked:false},document:{activeElement:null,getElementById:()=>null},window:{__v456Local:{durable:true},__smLoadDeductionJournal:{recover:()=>false,commit:async()=>{}},__smMergeLoadDeductionQueue:()=>[]},conexaoOnline:()=>false,lotePacotesEmCurso:false,conferirMedidaContadorPacotes(){},modoMedida:'linear',madeiras:[{id:'wood',nome:'Eucalipto'}],regraLinearSelecionadaV381:()=>({tipo:'Cemalha',precoVarejo:10.4}),servicosM3:{},destinoSelecionado:()=> 'orcamento',selecionarServicosLinear:()=>({}),linearEntryV744,isLinearTotalV744,linearMatchV744,linearRemainderV744,linearUnitsV744,linearPieceTextV744,alert:v=>alerts.push(v),confirm:()=>true,save(){},limparAvisosRegraV375(){},orcamento:[],lancamentos:[],carregamentos:[],estoque1Lancamentos:[],estoque2Lancamentos:[],movimentos:[],resumoOrcOculto:false,producaoCalcPendente:null,employeeCheckLoadWrite(){},employeeAssertWrite(){},exigirEscritaPlano(){},doc:()=>({}),db:{},nowBR:()=> '14/11/2026, 10:00:00',offlineOps:()=>[],STORAGE:{lancamentos:'rows',movimentos:'moves'},OFFLINE_OPS_KEY:'queue',atualizarPendenciasCadastroV457(){},atualizarTelasAposLancamento(){},calcPreview(){},atualizarPainelPacotes(){},setTimeout(){},enfileirarOffline:(...args)=>queue.push(args),COL:{orcamento:'quotes',cargas:'loads',estoque1:'stock1',estoque2:'stock2',movimentos:'moves'},normalizarBitolasCadastroV347:x=>x,attachPriceV710:x=>x,repriceBudgetV710(){},ehMadeiraVerde:()=>false,adicionarReferenciaPesoV420:x=>x,sessaoCargaAtual:'load',sincronizarOfflineOps:async()=>{},marcarSyncOk(){},atualizarStatusSync(){}};
 vm.createContext(c);
 const serviceStart=app.indexOf('function cobrarServicosLinear('),serviceEnd=app.indexOf('function selecionarServicosLinear(',serviceStart);vm.runInContext(app.slice(serviceStart,serviceEnd),c);c.aplicarCobrancaOrcamento=c.cobrarServicosLinear;
 return {c,fields,queue,alerts};
}
test('the real generated offline launch records 70 metres and R$728 without a 70 metre piece',async()=>{
 const s=compiledContext(),start=app.indexOf('async function lancar(){'),end=app.indexOf('// O número digitado adiciona pacotes',start);vm.runInContext(app.slice(start,end),s.c);await s.c.lancar();assert.deepEqual(s.alerts,[]);assert.equal(s.c.orcamento.length,1);const item=s.c.orcamento[0];assert.equal(item.volume,70);assert.equal(item.valor,728);assert.equal(item.quantidade,0);assert.equal(item.comprimento,0);assert.equal(item.linearTotalV744,true);assert.equal(s.queue.length,1);
});
test('the real generated stock deduction consumes metres and records unknown pieces without touching another product',async()=>{
 const s=compiledContext(),start=app.indexOf('function mesmaBitolaCarga(a,b){'),end=app.indexOf('function mesmaBitolaTransferencia(',start);s.c.estoque1Lancamentos=[{...base,id:'stock',comprimento:7,quantidade:10,volume:70,valor:728},{...base,id:'other',produto:'Rodapé',comprimento:7,quantidade:1,volume:7,valor:100}];vm.runInContext(app.slice(start,end),s.c);
 await s.c.salvarCargaComBaixa({...total(5),id:'out',preco:10.4,valor:52},'estoque1');const remaining=s.c.estoque1Lancamentos.find(i=>i.id==='stock');assert.equal(remaining.volume,65);assert.equal(remaining.quantidade,0);assert.equal(remaining.linearTotalV744,true);assert.equal(s.c.estoque1Lancamentos.find(i=>i.id==='other').volume,7);assert.equal(s.c.movimentos[0].quantidade,0);assert.equal(s.c.movimentos[0].volume,5);
});

test('the generated services helper charges total metres without inventing per-piece CMDP',()=>{
 const s=compiledContext();s.c.proximaMedidaComercial=n=>Math.ceil(n*2)/2;const result=s.c.cobrarServicosLinear({...total(),preco:10.4,compensarPerda:true,encaixe:true,encaixePercentual:10,friso:true,frisoPercentual:5});assert.equal(result.volumeReal,70);assert.equal(result.metrosCobrados,70);assert(Math.abs(result.valor-837.2)<1e-8);
 const pieces=s.c.cobrarServicosLinear({...base,...linearEntryV744('7.01','10'),preco:10.4,compensarPerda:true});assert.equal(pieces.metrosCobrados,75);
});
test('the generated offline transfer moves only the requested metres and preserves unknown piece counts',async()=>{
 const s=compiledContext(),matchStart=app.indexOf('function mesmaBitolaTransferencia('),matchEnd=app.indexOf('async function salvarTransferenciaEntreEstoques(',matchStart),start=app.indexOf('async function salvarTransferenciaEntreEstoquesOffline('),end=app.indexOf('// V375',start);vm.runInContext(app.slice(matchStart,matchEnd)+'\n'+app.slice(start,end),s.c);s.c.estoque1Lancamentos=[{...total(70),id:'stock',valor:728}];await s.c.salvarTransferenciaEntreEstoquesOffline({...total(20),id:'move',valor:208},'1para2');assert.equal(s.c.estoque1Lancamentos[0].volume,50);assert.equal(s.c.estoque2Lancamentos[0].volume,20);assert.equal(s.c.estoque2Lancamentos[0].quantidade,0);assert.equal(s.c.movimentos[0].quantidade,0);
});

test('quick conference fills missing metres without inventing pieces or individual lengths',()=>{
 const s=compiledContext(),start=app.indexOf('function prepararAjustesVirtuaisCargaV390('),end=app.indexOf('async function registrarAjustesConferenciaV390(',start);vm.runInContext(app.slice(start,end),s.c);const result=s.c.prepararAjustesVirtuaisCargaV390([{ref:total(70),faltam:5,fonte:{arr:s.c.estoque1Lancamentos}}],'load');assert.equal(result[0].entrada.volume,5);assert.equal(result[0].entrada.quantidade,0);assert.equal(result[0].entrada.comprimento,0);assert.equal(result[0].entrada.linearTotalV744,true);
});
test('insufficient metres fail before deductions and legacy piece launches remain unchanged',async()=>{
 const s=compiledContext(),start=app.indexOf('function mesmaBitolaCarga(a,b){'),end=app.indexOf('function mesmaBitolaTransferencia(',start);s.c.estoque1Lancamentos=[{...base,id:'stock',comprimento:7,quantidade:10,volume:70,valor:728}];vm.runInContext(app.slice(start,end),s.c);const before=JSON.stringify(s.c.estoque1Lancamentos);await assert.rejects(s.c.salvarCargaComBaixa({...total(80),id:'too-much',valor:832},'estoque1'),/ESTOQUE_INSUFICIENTE/);assert.equal(JSON.stringify(s.c.estoque1Lancamentos),before);assert.equal(s.queue.length,0);
 const a=app.indexOf('async function lancar(){'),b=app.indexOf('// O número digitado adiciona pacotes',a);vm.runInContext(app.slice(a,b),s.c);s.fields.comprimento.value='7';s.fields.quantidade.value='10';await s.c.lancar();assert.equal(s.c.orcamento[0].quantidade,10);assert.equal(s.c.orcamento[0].comprimento,7);assert.equal(s.c.orcamento[0].volume,70);assert.equal(s.c.orcamento[0].linearTotalV744,undefined);
});

test('the generated desktop/print table presents total metres with unknown pieces and no invented length',()=>{
 const s=compiledContext(),start=app.indexOf('function pcPlanilhaLinearHtml('),end=app.indexOf('function pcPlanilhaHtml(',start);Object.assign(s.c,{agruparItensMedida:rows=>rows,esc:v=>String(v||''),numCompOrc:n=>String(n),num2:n=>Number(n).toFixed(2),moeda:n=>Number(n).toFixed(2),botaoOpcaoOrc:()=>''});vm.runInContext(app.slice(start,end),s.c);const html=s.c.pcPlanilhaLinearHtml([{...total(70),valor:728,_ids:['line']}],'Metro linear',true,false);assert(html.includes('<td>—</td><td>Metragem total</td>'));assert(html.includes('70.00 m'));
});

test('decimal total metres tolerate only floating-point residue in the actual offline deduction',async()=>{
 const s=compiledContext(),start=app.indexOf('function mesmaBitolaCarga(a,b){'),end=app.indexOf('function mesmaBitolaTransferencia(',start);vm.runInContext(app.slice(start,end),s.c);s.c.estoque1Lancamentos=[{...total(0.1),id:'a',valor:1.04},{...total(0.7),id:'b',valor:7.28}];await s.c.salvarCargaComBaixa({...total(0.8),id:'out-decimal',valor:8.32},'estoque1');assert.equal(s.c.estoque1Lancamentos.length,0);
});

test('the real calculator top counter also previews total metres when quantity is empty',()=>{
 const s=compiledContext(),start=app.indexOf('function atualizarVolumeAntesLancamento(){'),end=app.indexOf('\n}\n',start)+3;s.fields.sumVolumeTopo={dataset:{},textContent:''};Object.assign(s.c,{num2:n=>Number(n).toFixed(2),num4:n=>Number(n).toFixed(4),quantidadePacotesPrevia:()=>0});vm.runInContext(app.slice(start,end),s.c);s.c.atualizarVolumeAntesLancamento();assert.equal(s.fields.sumVolumeTopo.textContent,'70.00 m');s.fields.comprimento.value='7';s.fields.quantidade.value='10';s.c.atualizarVolumeAntesLancamento();assert.equal(s.fields.sumVolumeTopo.textContent,'70.00 m');
});
