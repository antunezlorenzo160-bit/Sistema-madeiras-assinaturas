import test from 'node:test';
import assert from 'node:assert/strict';
import {orderPrintGroupsV772,renderCompactPages} from '../public/compact-documents.mjs';
class Element{
 constructor(){this.children=[];this.dataset={};this.textContent='';}
 append(child){this.children.push(child);}
 insertRow(){const row=new Element();row.insertCell=()=>{const cell=new Element();row.append(cell);return cell;};this.append(row);return row;}
 createTHead(){const el=new Element();this.append(el);return el;}
 createTBody(){const el=new Element();this.append(el);return el;}
}
const doc={createElement:()=>new Element()};
const cell=(text,services=[])=>({textContent:text,querySelectorAll:()=>services});
const service=(label,value)=>({children:[{textContent:label},{textContent:value}]});
test('included order uses two explicit columns and repeats labels without losing amounts or service descriptions',()=>{
 const table={tHead:{rows:[{textContent:'Garapeira'},{cells:['Pç.','Medidas','Volume / área','Serviços','Madeira'].map(v=>cell(v))}]},tBodies:[{rows:Array.from({length:75},(_,i)=>({cells:[cell(String(i)),cell('8 × 12 cm × 5 m'),cell('0,576 m³'),cell('',[service('Aplainamento 10%','R$ 72,00'),service('Encaixe 0%','R$ 0,00')]),cell('R$ 720,00')]}))}],tFoot:{rows:[{cells:[cell('Subtotal com serviços'),cell('R$ 59.400,00')]}]}};
 const before=JSON.stringify(table);const groups=orderPrintGroupsV772([table]);
 assert.equal(groups[0].rows[0][3],'Aplainamento 10% R$ 72,00\nEncaixe 0% R$ 0,00');
 assert.equal(groups[0].rows[0][4],'R$ 720,00');assert.equal(JSON.stringify(table),before);
 const pages=renderCompactPages(doc,groups,18);
 const sheets=pages.children.filter(e=>e.className==='compact-sheet-v712');assert(sheets.length>1);assert(sheets.every(s=>s.children.length===2));
 const sections=sheets.flatMap(s=>s.children.flatMap(c=>c.children));
 const rows=sections.flatMap(s=>s.children[1].children[1].children.map(row=>row.children.map(c=>c.textContent)));
 assert.deepEqual(rows,groups[0].rows);assert(sections.slice(1).every(s=>s.children[0].textContent.includes('continuação')));
 assert(sections.every(s=>s.children[1].children[0].children[0].children.map(c=>c.textContent).join('|')===groups[0].headers.join('|')));
 assert.equal(pages.children.at(-1).children.at(-1).textContent,'Garapeira — Subtotal com serviços: R$ 59.400,00');
});

import {simplifyOrderPrintV773} from '../public/compact-documents.mjs';
test('combined PDF removes redundant single-order and load totals but retains real adjustments and separate order totals',()=>{
 const node=(text='',final=false)=>({removed:false,textContent:text,remove(){this.removed=true;},classList:{contains:()=>final},querySelector:()=>({textContent:text})});
 const orderTotal=node(),order={querySelector:()=>orderTotal};
 const summary=values=>Object.assign(node(),{children:values.map((v,i)=>node(v,i===4))});
 const noAdjust=summary(['R$ 384,00','− R$ 0,00','+ R$ 0,00','+ R$ 0,00','R$ 384,00']);
 const withAdjust=summary(['R$ 384,00','− R$ 10,00','+ R$ 20,00','+ R$ 0,00','R$ 394,00']);
 const root={querySelectorAll:selector=>selector==='.order-document-order-v767'?[order]:[noAdjust,withAdjust]};
 simplifyOrderPrintV773(root);assert(orderTotal.removed);assert(noAdjust.removed);assert(!withAdjust.removed);assert(withAdjust.children[4].removed);assert(withAdjust.children[3].removed);assert(!withAdjust.children[0].removed);assert(!withAdjust.children[1].removed);assert(!withAdjust.children[2].removed);
 orderTotal.removed=false;root.querySelectorAll=selector=>selector==='.order-document-order-v767'?[order,order]:[];simplifyOrderPrintV773(root);assert(!orderTotal.removed);
});
