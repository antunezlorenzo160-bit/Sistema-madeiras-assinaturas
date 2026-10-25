import test from 'node:test';
import assert from 'node:assert/strict';
import { agruparToras, volumeToras, criarSincronismoToras } from '../public/toras.mjs';

test('same dimensions sum quantities, preserving species and labor price', () => {
  const base = { especie: '', diametro: 25, comprimento: 4 };
  const rows = [{ ...base, id:'a', quantidade:1 }, { ...base, id:'b', quantidade:12 }];
  const [group] = agruparToras(rows);
  assert.equal(group.quantidade, 13);
  assert.deepEqual(group.ids, ['a','b']);
  assert.equal(volumeToras(group.diametro,group.comprimento,group.quantidade).total,volumeToras(25,4,13).total);
  assert.equal(agruparToras([...rows,{...base,id:'c',especie:'Pinus',quantidade:2},{...base,id:'d',precoMaoObra:100,quantidade:1}]).length,3);
  assert.equal(agruparToras([{...rows[0],especie:' Ipê '},{...rows[1],especie:'IPE'}]).length,1);
  assert.equal(rows[0].quantidade,1);
});

test('two devices retain concurrent additions, offline queue, shared header and group removal', async () => {
  const db = new Map(), listeners = [];
  let online = true;
  const snapshot = () => ({docs:[...db].map(([id,data])=>({id,data})),fromCache:!online,hasPendingWrites:false});
  function device() {
    const queue = new Map(); let state;
    const sync = criarSincronismoToras({
      observar: callback => { listeners.push(callback); callback(snapshot()); return () => {}; },
      pendencias: () => [...queue.values()],
      gravar: (id,obj) => queue.set(id,{id,obj,modo:'set'}),
      confirmar: async () => {
        if (!online) return;
        for (const op of queue.values()) db.set(op.id,op.obj);
        queue.clear(); listeners.forEach(callback=>callback(snapshot()));
      },
    });
    sync.observarLista(s=>state=s,()=>assert.fail('unexpected error'));
    return {sync,get state(){return state;},queue};
  }
  const a=device(),b=device();
  const row = {especie:'',diametro:25,comprimento:4,quantidade:1};
  online=false;
  await a.sync.gravarLinha('A',{...row,migrar:true});
  await b.sync.gravarLinha('B',{...row,quantidade:12});
  assert.equal(a.queue.size,1); assert.equal(b.queue.size,1);
  assert.equal(a.state.pendente,true);
  online=true;
  await a.sync.gravarLinha('A',row);
  assert.equal(b.state.linhas.length,2); // Remote + still pending local addition.
  await b.sync.gravarLinha('B',{...row,quantidade:12});
  assert.equal(agruparToras(a.state.linhas)[0].quantidade,13);
  assert.equal(agruparToras(b.state.linhas)[0].quantidade,13);
  assert.equal(db.get('cubagem_toras_linha_A').migrar,undefined);
  await a.sync.salvarIdentificacao({cliente:'Cliente teste',maoObra:'Serraria'});
  assert.equal(b.state.identificacao.cliente,'Cliente teste');
  await a.sync.gravarLinha('A',{...row,ativo:false});
  await a.sync.gravarLinha('B',{...row,quantidade:12,ativo:false});
  assert.equal(b.state.linhas.length,0);
  assert.equal(b.state.conhecido,true); // Tombstones distinguish an empty list from a missing cache.
  assert.equal(a.state.pendente,false);
});

test('failed confirmation retains the persistent operation and pending state', async () => {
  const queue=[];let state;
  const sync=criarSincronismoToras({observar:cb=>cb({docs:[],fromCache:false}),pendencias:()=>queue,
    gravar:(id,obj)=>queue.push({id,obj}),confirmar:async()=>{throw Error('offline');}});
  sync.observarLista(s=>state=s);
  await assert.rejects(sync.gravarLinha('A',{diametro:25,comprimento:4,quantidade:1,especie:''}));
  assert.equal(queue.length,1);assert.equal(state.linhas.length,1);assert.equal(state.pendente,true);
});
