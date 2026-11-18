import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {incompleteLoadRowV791,assertLoadRecordWriteV791,loadRecordDiagnosticV791} from '../public/load-record-integrity.mjs';
import {applyLoadRecordIntegrityV791} from '../scripts/load-record-integrity-build.mjs';
test('metadata-only records cannot masquerade as physical loads; valid units, legacy dimensions and free goods remain intact',()=>{
 for(const row of [{},{id:'x',atualizadoEm:123,cargaStatus:'concluido'},{quantidade:0,volume:0,espessura:0},{volume:NaN,quantidade:-1}])assert(incompleteLoadRowV791(row));
 for(const row of [{quantidade:3,valor:0},{tipoMedida:'m2',volume:333},{tipoMedida:'linear',volume:96},{tipoMedida:'granel',volumeGranel:2},{volumeFechado:3},{comprimento:5,espessura:2.5}])assert(!incompleteLoadRowV791(row));
});
test('set cannot create a stub even over a valid previous row; patches preserve existing physical data, deletion is allowed',()=>{
 const previous={id:'a',quantidade:12,volume:0.576},before=JSON.stringify(previous);
 assert.throws(()=>assertLoadRecordWriteV791(null,{}));assert.throws(()=>assertLoadRecordWriteV791(previous,{cargaStatus:'concluido'},'set'));
 assert.doesNotThrow(()=>assertLoadRecordWriteV791(previous,{cargaStatus:'concluido'},'merge'));
 assert.doesNotThrow(()=>assertLoadRecordWriteV791(previous,{cargaStatus:'concluido'},'update'));
 assert.throws(()=>assertLoadRecordWriteV791(null,{cargaStatus:'concluido'},'merge'));
 assert.doesNotThrow(()=>assertLoadRecordWriteV791(null,null,'delete'));assert.equal(JSON.stringify(previous),before);
});
test('diagnostic copies selected technical fields without editing records or including customer contacts and unrelated secrets',()=>{
 const rows=[{id:'a',atualizadoEm:123,unknownMarker:true,clienteEmail:'private',token:'secret',finance:{amount:123}}],before=JSON.stringify(rows),report=loadRecordDiagnosticV791(rows);
 assert(report.records[0].incomplete);assert(report.records[0].fieldNames.includes('unknownMarker'));assert.equal(report.records[0].data.id,'a');assert(!JSON.stringify(report).includes('private'));assert(!JSON.stringify(report).includes('secret'));assert.equal(JSON.stringify(rows),before);
});
test('generated guard runs before administrator bypass and only validates load paths',()=>{
 const source="function employeeCheckLoadWrite(ref,data,mode='set'){if(parent.admin)return;}\n  function statusGrupoV392(itens){}\nconst total=[].filter(Boolean).join(' • ')||r.pecas+' peças';\nconst name=`<span class=\"v408-destino-nome\">${esc(destino)}</span>`;\nfunction render(){\n      if(estadoCargasV408.gid!==gid)return '';\n}";
 const built=applyLoadRecordIntegrityV791(source);assert.equal(applyLoadRecordIntegrityV791(built),built);assert.throws(()=>applyLoadRecordIntegrityV791('unknown'));
 const begin=built.indexOf('// LOAD_RECORD_INTEGRITY_V791'),end=built.indexOf('  function statusGrupoV392');
 const context={parent:{admin:true},employeePath:r=>r.path,employeeLoadRecord:()=>({quantidade:2}),window:{}};vm.createContext(context);vm.runInContext(built.slice(begin,end),context);
 const ref={path:'empresas/company/dados/sm2_carregamentos/registros/a'};
 assert.throws(()=>context.employeeCheckLoadWrite(ref,{},'set'));context.employeeCheckLoadWrite(ref,null,'delete');context.employeeCheckLoadWrite({path:'empresas/company/dados/sm2_madeiras/registros/a'},{},'set');
 assert(built.includes("txt:'Registro incompleto'"));assert(built.includes('return incompleteLoadCardV791(gid,itens)'));
});
