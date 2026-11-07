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
 // Load and delivery tables contain extra financial/physical columns. Preserve each
 // labelled value in a compact two-column list, rather than shrinking a 9-column table.
 const loadTables=[...root.querySelectorAll('.v404-carga-tabela')];
 if(!body&&loadTables.length){
  const columns=root.ownerDocument.createElement('div');columns.className='compact-columns-v710 compact-load-columns-v710';
  const first=loadTables[0].closest('.v401-carga-grupo')||loadTables[0];first.before(columns);
  for(const table of loadTables){
   const section=root.ownerDocument.createElement('section');section.className='compact-group-v710';
   const headings=[...table.tHead?.rows||[]];
   const labels=[...(headings[headings.length-1]?.cells||[])].map(c=>c.textContent.trim());
   for(const row of headings.slice(0,-1)){const title=root.ownerDocument.createElement('h3');title.textContent=row.textContent.trim();section.append(title);}
   for(const row of [...table.tBodies].flatMap(b=>[...b.rows])){
    const cells=[...row.cells];
    const line=root.ownerDocument.createElement('div');line.className='compact-load-row-v710';
    if(cells.some(c=>c.colSpan>1)){line.textContent=row.textContent.trim();}
    else cells.forEach((cell,index)=>{const span=root.ownerDocument.createElement('span');span.textContent=(labels[index]?labels[index]+': ':'')+cell.textContent.trim();line.append(span);});
    section.append(line);
   }
   if(table.tFoot){const total=root.ownerDocument.createElement('p');total.className='compact-load-total-v710';total.textContent=table.tFoot.textContent.trim();section.append(total);}
   columns.append(section);const wrapper=table.closest('.v401-carga-grupo');if(wrapper&&wrapper.children.length===1)wrapper.remove();else table.remove();
  }
 }
 // Large tabular reports keep their column labels and every value. Compact only whitespace.
 root.querySelectorAll('table').forEach(t=>t.classList.add('compact-table-v710'));
 return root;
}
