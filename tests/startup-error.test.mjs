import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('startup failure remains visible through subsequent errors and can be copied or dismissed',async()=>{
 const panels=[],copied=[];const c={window:{},document:{body:{append:x=>panels.push(x)},createElement:()=>({style:{},children:[],setAttribute(){},append(...items){this.children.push(...items);},remove(){this.removed=true;}})},navigator:{clipboard:{writeText:async value=>copied.push(value)}}};vm.createContext(c);vm.runInContext(readFileSync(new URL('../ui/startup-error.js',import.meta.url),'utf8'),c);
 c.window.__smShowStartupFailure("Cannot access 'destinoAtual' before initialization",'Interface: linha 6993');c.window.__smShowStartupFailure('Sessão encerrada');assert.equal(panels.length,1);assert(panels[0].children[1].textContent.includes('destinoAtual'));await panels[0].children[2].onclick();assert(copied[0].includes('linha 6993'));panels[0].children[3].onclick();assert(panels[0].removed);c.window.__smShowStartupFailure('Novo erro');assert.equal(panels.length,2);
});
