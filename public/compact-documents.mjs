import {compactLoadGroups,projectCompactLoadGroups,paginateCompactGroups,samePrintMetricTotals} from './compact-load-tables.mjs';
// Transform only a detached print clone. The live UI and source records are never mutated.
export function compactPrintClone(root,options={}){
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
   const columns=renderCompactPages(root.ownerDocument,groups);
   const outer=body.closest('.table-wrap')||body.closest('table');outer.replaceWith(columns);
  }
 }
 // Keep load documents tabular, grouped by species/thickness across lengths.
 const loadTables=[...root.querySelectorAll('.v404-carga-tabela')];
 if(!body&&loadTables.length){
  const data=loadTables.map(table=>{
   const heads=[...table.tHead?.rows||[]];
   return {title:heads.slice(0,-1).map(r=>r.textContent.trim()).join(' '),subtotal:table.querySelector('.v599-total-medida')?.textContent.trim()||'',headers:[...(heads.at(-1)?.cells||[])].map(c=>c.textContent.trim()),rows:[...table.tBodies].flatMap(b=>[...b.rows]).filter(r=>[...r.cells].every(c=>c.colSpan===1)).map(r=>[...r.cells].map(c=>c.textContent.trim()))};
  });
  const groups=projectCompactLoadGroups(compactLoadGroups(data),options.detailed===true);
  const columns=renderCompactPages(root.ownerDocument,groups,options.detailed?30:44);
  const first=loadTables[0].closest('.v401-carga-grupo')||loadTables[0];first.before(columns);
  for(const table of loadTables){const wrapper=table.closest('.v401-carga-grupo');if(wrapper&&wrapper.children.length===1)wrapper.remove();else table.remove();}
 }
 // Keep the full global metrics at the top; remove only an equivalent repeated footer.
 const metricBlocks=[...root.querySelectorAll('.v418-romaneio-totais')];
 if(metricBlocks.length>1){
  const first=[...metricBlocks[0].querySelectorAll('b')].map(b=>b.textContent);
  for(const block of metricBlocks.slice(1)){
   const values=[...block.querySelectorAll('b')].map(b=>b.textContent);
   if(samePrintMetricTotals(first,values))block.remove();
  }
 }
 // Large tabular reports keep their column labels and every value. Compact only whitespace.
 root.querySelectorAll('table').forEach(t=>t.classList.add('compact-table-v710'));
 return root;
}

export function renderCompactPages(doc,groups,capacity=44){
 const pages=doc.createElement('div');pages.className='compact-pages-v712';
 const wide=groups.some(g=>(g.headers||g.header).length>7||(g.headers||g.header).includes('Preço un.'));
 if(wide)capacity=Math.min(capacity,32);
 for(const columns of paginateCompactGroups(groups,capacity,wide?1:2)){
  const sheet=doc.createElement('div');sheet.className='compact-sheet-v712'+(wide?' compact-sheet-wide-v715':'');
  for(const fragments of columns){const col=doc.createElement('div');col.className='compact-column-v712';
   for(const g of fragments){
    const section=doc.createElement('section');section.className='compact-group-v710';
    const title=doc.createElement('h3');title.textContent=g.name||g.title; if(g.continued)title.textContent+=' (continuação)';section.append(title);
    const table=doc.createElement('table');table.className='compact-fixed-table-v712';
    const headers=g.headers||g.header;table.dataset.columns=String(headers.length);const head=table.createTHead().insertRow();for(const label of headers){const th=doc.createElement('th');th.textContent=label;head.append(th);}
    const tbody=table.createTBody();for(const values of g.rows){const tr=tbody.insertRow();for(const value of values)tr.insertCell().textContent=value;}
    section.append(table);col.append(section);
   }
   sheet.append(col);
  }
  pages.append(sheet);
 }
 const totals=groups.flatMap(g=>g.totals||[]);
 if(totals.length){const foot=doc.createElement('div');foot.className='compact-species-totals-v712';const heading=doc.createElement('h3');heading.textContent='Totais por espécie e espessura';foot.append(heading);for(const text of totals){const p=doc.createElement('p');p.textContent=text;foot.append(p);}pages.append(foot);}
 return pages;
}
