import test from 'node:test';import assert from 'node:assert/strict';import {compactPrintClone,simplifyCalculatorCloneV788,renderCompactPages} from '../public/compact-documents.mjs';
test('calculator clone removes duplicate title, old footer, species cards and statistic boxes but retains the three summary fields',()=>{
 const node=text=>({textContent:text,removed:false,remove(){this.removed=true;}}),title=node('Resumo dos lançamentos'),species=node('Garapeira'),old=node('old totals'),cards=node('cards');let meta;
 const stats=Object.assign(node(),{before:node=>meta=node,querySelectorAll:()=>[['Lançamentos / unidades','36'],['Volume total','10,5850 m³ · 96,00 m'],['Valor total','R$ 15.000,00'],['Tipos de lançamento','19']].map(([label,value])=>({querySelector:selector=>({textContent:selector==='small'?label:value})}))});
 const root={ownerDocument:{createElement:()=>({})},querySelector:selector=>selector==='.stats'?stats:selector==='#summaryFooterV718'?old:selector==='#resumoEspeciesCalcV581'?cards:null,querySelectorAll:selector=>selector==='h2,h3'?[title,species]:selector==='.stats'?[stats]:[]};
 simplifyCalculatorCloneV788(root);assert(title.removed);assert(!species.removed);assert(old.removed);assert(cards.removed);assert(stats.removed);assert.equal(meta.textContent,'Lançamentos / unidades: 36 · Volume total: 10,5850 m³ · 96,00 m · Tipos de lançamento: 19');
});
class Element{constructor(tag){this.tag=tag;this.children=[];this.dataset={};}append(c){this.children.push(c);}insertRow(){const r=new Element('tr');r.insertCell=()=>{const c=new Element('td');r.append(c);return c;};this.append(r);return r;}createTHead(){const h=new Element('thead');this.append(h);return h;}createTBody(){const b=new Element('tbody');this.append(b);return b;}}
test('short summary balances two columns in one page without losing reading order',()=>{
 const groups=[{name:'Garapeira',header:['Pç.','Volume'],rows:Array.from({length:19},(_,i)=>[String(i),'1,0000 m³'])},{name:'eucalipto',header:['Pç.','Metros'],rows:[['19','96,00 m']]}];
 const pages=renderCompactPages({createElement:tag=>new Element(tag)},groups,44,true),sheets=pages.children.filter(n=>n.className==='compact-sheet-v712');assert.equal(sheets.length,1);assert(sheets[0].children.every(col=>col.children.length>0));
 const rows=sheets[0].children.flatMap(col=>col.children.flatMap(section=>section.children.find(n=>n.tag==='table').children.find(n=>n.tag==='tbody').children.map(row=>row.children.map(c=>c.textContent))));assert.deepEqual(rows,groups.flatMap(g=>g.rows));
});

test('print clone removes automatic retail-wholesale notice without modifying price values',()=>{
 const notice={textContent:'Preços do documento: atacado / varejo.',removed:false,remove(){this.removed=true;}};
 const root={dataset:{},classList:{add(){}},querySelector:()=>null,querySelectorAll:selector=>selector==='.price-notice-v710'?[notice]:[]};
 compactPrintClone(root);assert(notice.removed);assert.equal(notice.textContent,'Preços do documento: atacado / varejo.');
});
