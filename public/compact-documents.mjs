import {compactLoadGroups} from './compact-load-tables.mjs';
// Transform only a detached print clone. The live UI and source records are never mutated.
export function compactPrintClone(root){
 if(root.dataset.compactV710)return root;
 root.dataset.compactV710='1';root.classList.add('compact-document-v710');
 const body=root.querySelector('#tbLancamentos');
 if(body){
  const groups=[];let group=null,header=[];
  for(const row of [...body.rows]){
   if(row.classList.contains('grupo-especie-titulo')){
    const name=row.textContent.trim().replace(/\s*[•·]\s*Comp\..*$/,'').replace(/\s*[—–-]\s*Comp\..*$/,'');
    group=groups.find(g=>g.name===name);if(!group){group={name,rows:[],totals:[],header:[]};groups.push(group);}continue;
   }
   if(row.classList.contains('grupo-especie-head')){header=[...row.cells].filter(c=>!c.classList.contains('resumo-coluna-espacadora')).map(c=>c.textContent.trim());if(group)group.header=header;continue;}
   if(row.classList.contains('resumo-total-espessura')){if(group)group.totals.push(row.textContent.trim());continue;}
   if(row.classList.contains('resumo-total-bloco-v597'))continue;
   if(!group||!row.classList.contains('linha-excluir-pecas'))continue;
   const cells=[...row.cells].filter(c=>!c.classList.contains('resumo-coluna-espacadora'));
   group.rows.push(cells.map(c=>c.textContent.trim()));
  }
  if(groups.some(g=>g.rows.length)){
   const columns=root.ownerDocument.createElement('div');columns.className='compact-columns-v710';
   for(const g of groups){
    if(!g.rows.length)continue;
    const section=root.ownerDocument.createElement('section');section.className='compact-group-v710';
    const title=root.ownerDocument.createElement('h3');title.textContent=g.name;section.append(title);
    const table=root.ownerDocument.createElement('table');const head=table.createTHead().insertRow();
    for(const label of g.header){const th=root.ownerDocument.createElement('th');th.textContent=label;head.append(th);}
    const tb=table.createTBody();for(const values of g.rows){const tr=tb.insertRow();for(const value of values)tr.insertCell().textContent=value;}
    if(g.totals.length){const foot=table.createTFoot();for(const text of g.totals){const td=foot.insertRow().insertCell();td.colSpan=g.header.length;td.textContent=text;}}
    section.append(table);columns.append(section);
   }
   const outer=body.closest('.table-wrap')||body.closest('table');outer.replaceWith(columns);
  }
 }
 // Keep load documents tabular, grouped by species/thickness across lengths.
 const loadTables=[...root.querySelectorAll('.v404-carga-tabela')];
 if(!body&&loadTables.length){
  const data=loadTables.map(table=>{
   const heads=[...table.tHead?.rows||[]];
   return {title:heads.slice(0,-1).map(r=>r.textContent.trim()).join(' '),headers:[...(heads.at(-1)?.cells||[])].map(c=>c.textContent.trim()),rows:[...table.tBodies].flatMap(b=>[...b.rows]).filter(r=>[...r.cells].every(c=>c.colSpan===1)).map(r=>[...r.cells].map(c=>c.textContent.trim()))};
  });
  const groups=compactLoadGroups(data);
  const columns=root.ownerDocument.createElement('div');columns.className='compact-columns-v710 compact-load-columns-v710';
  const first=loadTables[0].closest('.v401-carga-grupo')||loadTables[0];first.before(columns);
  for(const g of groups){
   const section=root.ownerDocument.createElement('section');section.className='compact-group-v710';
   const title=root.ownerDocument.createElement('h3');title.textContent=g.title;section.append(title);
   const table=root.ownerDocument.createElement('table');table.className='compact-load-table-v711';
   const head=table.createTHead().insertRow();for(const name of g.headers){const th=root.ownerDocument.createElement('th');th.textContent=name;head.append(th);}
   const tbody=table.createTBody();for(const row of g.rows){const tr=tbody.insertRow();for(const value of row)tr.insertCell().textContent=value;}
   section.append(table);columns.append(section);
  }
  for(const table of loadTables){const wrapper=table.closest('.v401-carga-grupo');if(wrapper&&wrapper.children.length===1)wrapper.remove();else table.remove();}
 }
 // Large tabular reports keep their column labels and every value. Compact only whitespace.
 root.querySelectorAll('table').forEach(t=>t.classList.add('compact-table-v710'));
 return root;
}
