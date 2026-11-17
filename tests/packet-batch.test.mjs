import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../ui/packet-batch.js',import.meta.url),'utf8');
function setup({count=320,fail=false,hideAfter=Infinity,existing=185}={}){
 const input={value:String(count),disabled:false},button={textContent:'Lançar pacote',disabled:false},protectedControl={disabled:true},controls=[input,button,protectedControl],alerts=[],rows=Array.from({length:existing},(_,i)=>({id:'old'+i,q:6,area:1.8})),stored=new Map();let yields=0,checkpoints=0,paint=0;
 const retry={remove(){this.removed=true;}};button.after=()=>{};
 const c={window:{},entradaPacotes:input,adicionandoPacotesDigitados:false,lotePacotesEmCurso:false,contadorPacotes:existing,contadorPacotesLigado:true,modoMedida:'m2',document:{hidden:false,getElementById:()=>retry,createElement:()=>retry,querySelectorAll:()=>controls},$:()=>button,conferirMedidaContadorPacotes(){},destinoSelecionado:()=> 'carga',async lancar(){c.contadorPacotes++;rows.push({id:'new'+c.contadorPacotes,q:6,area:1.8});if(rows.length-existing>=hideAfter)c.document.hidden=true;},persistirBlocoPacotes(){checkpoints++;if(fail)throw Error('QuotaExceededError');for(const row of rows)stored.set(row.id,{...row});},setTimeout(fn){yields++;fn();},calcPreview(){paint++;},atualizarTelasAposLancamento(){paint++;},atualizarPainelPacotes(){paint++;},sincronizarOfflineOps:async()=>{},atualizarStatusSync(){},alert:msg=>alerts.push(msg)};
 vm.createContext(c);vm.runInContext(source,c);return{c,input,button,controls,rows,stored,alerts,retry,stats:()=>({yields,checkpoints,paint})};
}
test('320 packages retain separate correction IDs and existing185 packages; yield, checkpoint and paint once at end',async()=>{
 const s=setup();await s.c.adicionarPacotesDigitados();assert.equal(s.rows.length,505);assert.equal(s.stored.size,505);assert.equal(s.rows.reduce((sum,r)=>sum+r.q,0),3030);assert.equal(s.input.value,'');assert.equal(s.button.disabled,false);assert.equal(s.controls[2].disabled,true);assert.equal(s.c.lotePacotesEmCurso,false);assert.equal(s.c.adicionandoPacotesDigitados,false);assert(s.stats().yields>=100);assert.equal(s.stats().checkpoints,33);assert.equal(s.stats().paint,3);assert.equal(s.alerts.length,0);
});
test('persistence failure releases button and batch guards and leaves only unprocessed count in input with explicit warning',async()=>{
 const s=setup({fail:true});await s.c.adicionarPacotesDigitados();assert.equal(s.rows.length,195);assert.equal(s.input.value,'310');assert.equal(s.button.disabled,true);assert.equal(s.c.window.__smPacketPersistencePendingV778,true);assert.equal(s.c.lotePacotesEmCurso,false);assert.equal(s.c.adicionandoPacotesDigitados,false);assert.equal(s.stored.size,0);assert.match(s.alerts[0],/Não repita o lote inteiro/);assert.match(s.alerts[0],/QuotaExceededError/);
});
test('backgrounding saves completed progress without silently launching the remainder',async()=>{
 const s=setup({count:220,hideAfter:7});await s.c.adicionarPacotesDigitados();assert.equal(s.rows.length,192);assert.equal(s.stored.size,192);assert.equal(s.input.value,'213');assert.equal(s.c.lotePacotesEmCurso,false);assert.equal(s.alerts.length,0);
});

test('after persistence failure, retry saves existing records without relaunching or increasing package count',async()=>{
 const s=setup({fail:true});await s.c.adicionarPacotesDigitados();const count=s.rows.length;
 await s.c.adicionarPacotesDigitados();assert.equal(s.rows.length,count);
 s.c.persistirBlocoPacotes=()=>{for(const row of s.rows)s.stored.set(row.id,{...row});};
 s.retry.onclick();assert.equal(s.rows.length,count);assert.equal(s.stored.size,count);assert.equal(s.c.window.__smPacketPersistencePendingV778,false);assert.equal(s.button.disabled,false);assert(s.retry.removed);assert.equal(s.input.value,'310');
});
