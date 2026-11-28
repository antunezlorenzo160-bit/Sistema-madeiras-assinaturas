import {compactLoadGroups,projectCompactLoadGroups,paginateCompactGroups,samePrintMetricTotals} from './compact-load-tables.mjs';
// Transform only a detached print clone. The live UI and source records are never mutated.
export function compactPrintClone(root,options={}){
 if(root.dataset.compactV710)return root;
 root.dataset.compactV710='1';root.classList.add('compact-document-v710');
 for(const notice of root.querySelectorAll('.price-notice-v710'))notice.remove();
 const body=root.querySelector('#tbLancamentos');
 if(body){
  const groups=[];let group=null,header=[],blockTitle='';
  for(const row of [...body.rows]){
   if(row.classList.contains('grupo-especie-titulo')){blockTitle=row.textContent.trim();group=null;continue;}
   if(row.classList.contains('grupo-especie-head')){
    header=[...row.cells].filter(c=>!c.classList.contains('resumo-coluna-espacadora')).map(c=>c.textContent.trim());
    const species=blockTitle.split(/\s*[—–]\s*Esp\.|\s*[•·—–]\s*Comp\./)[0].trim(),key=JSON.stringify([species,header]);
    group=groups.find(g=>g.key===key);
    if(!group){group={key,name:species,rows:[],header};groups.push(group);}continue;
   }
   if(!group||!row.classList.contains('linha-excluir-pecas'))continue;
   const cells=[...row.cells].filter(c=>!c.classList.contains('resumo-coluna-espacadora'));
   group.rows.push(cells.map(c=>c.textContent.trim()));
  }
  if(groups.some(g=>g.rows.length)){
   const columns=renderCompactPages(root.ownerDocument,groups,44,true);
   const outer=body.closest('.table-wrap')||body.closest('table');outer.replaceWith(columns);
  }
  simplifyCalculatorCloneV788(root);
 }
 // Keep load documents tabular, grouped by species/thickness across lengths.
 const loadTables=[...root.querySelectorAll('.v404-carga-tabela')];
 if(!body&&loadTables.length){
  const data=loadTables.map(table=>{
   const heads=[...table.tHead?.rows||[]];
   return {physicalTotals:physicalPrintTotalsV789(table),title:heads.slice(0,-1).map(r=>r.textContent.trim()).join(' '),subtotal:table.querySelector('.v599-total-medida')?.textContent.trim()||'',headers:[...(heads.at(-1)?.cells||[])].map(c=>c.textContent.trim()),rows:[...table.tBodies].flatMap(b=>[...b.rows]).filter(r=>[...r.cells].every(c=>c.colSpan===1)).map(r=>[...r.cells].map(c=>c.textContent.trim()))};
  });
  const isRomaneio=root.classList.contains?.('v418-romaneio-documento')||!!root.querySelector('.v418-romaneio-documento');
  const groups=projectCompactLoadGroups(compactLoadGroups(data,{lengthTotals:isRomaneio}),options.detailed===true);
  const columns=renderCompactPages(root.ownerDocument,groups,options.detailed?30:44);
  const first=loadTables[0].closest('.v401-carga-grupo')||loadTables[0];first.before(columns);
  for(const table of loadTables){const wrapper=table.closest('.v401-carga-grupo');if(wrapper&&wrapper.children.length===1)wrapper.remove();else table.remove();}
 }
 // Included orders use the same explicit print columns as the load. Transform
 // only the detached clone; retain order boundaries, service labels and totals.
 for(const order of root.querySelectorAll('.order-document-order-v767')){
  const tables=[...order.querySelectorAll('.order-document-table-v770')];
  if(!tables.length)continue;
  const groups=orderPrintGroupsV772(tables).map(group=>({...group,totals:[]}));
  const lines=Math.max(1,...groups.flatMap(g=>g.rows.map(row=>Math.max(...row.map(cell=>cell.split('\n').length)))));
  const pages=renderCompactPages(root.ownerDocument,groups,Math.max(4,Math.floor(36/lines)));
  pages.classList.add('order-document-pages-v772');
  tables[0].closest('.order-document-table-wrap-v770').before(pages);
  for(const table of tables)table.closest('.order-document-table-wrap-v770').remove();
 }
 simplifyOrderPrintV773(root);
 // Keep the full global metrics at the top; remove only an equivalent repeated footer.
 const metricBlocks=[...root.querySelectorAll('.v418-romaneio-totais')];
 if(metricBlocks.length>1){
  const first=[...metricBlocks[0].querySelectorAll('b')].map(b=>b.textContent);
  for(const block of metricBlocks.slice(1)){
   const values=[...block.querySelectorAll('b')].map(b=>b.textContent);
   if(samePrintMetricTotals(first,values))block.remove();
  }
 }
 // Top indicators form one row regardless of how many metrics are present.
 for(const totals of root.querySelectorAll('.v401-carga-totais,.v418-romaneio-totais')){
  totals.dataset.compactTotals='1';
  totals.style.setProperty('--compact-totals-count',String(Math.max(1,totals.children.length)));
 }
 // Large tabular reports keep their column labels and every value. Compact only whitespace.
 root.querySelectorAll('table').forEach(t=>t.classList.add('compact-table-v710'));
 return root;
}

export function renderCompactPages(doc,groups,capacity=44,balance=false){
 const pages=doc.createElement('div');pages.className='compact-pages-v712';
 const wide=groups.some(g=>(g.headers||g.header).length>7||(g.headers||g.header).includes('Preço un.'));
 if(wide)capacity=Math.min(capacity,32);
 if(balance&&!wide&&paginateCompactGroups(groups,capacity,2).length===1){
  const minimum=Math.max(4,Math.ceil(groups.reduce((sum,g)=>sum+g.rows.length,0)/2));
  for(let candidate=minimum;candidate<capacity;candidate++)if(paginateCompactGroups(groups,candidate,2).length===1){capacity=candidate;break;}
 }
 for(const columns of paginateCompactGroups(groups,capacity,wide?1:2)){
  const sheet=doc.createElement('div');sheet.className='compact-sheet-v712'+(wide?' compact-sheet-wide-v715':'');
  for(const fragments of columns){const col=doc.createElement('div');col.className='compact-column-v712';
   for(const g of fragments){
    const section=doc.createElement('section');section.className='compact-group-v710';
    const title=doc.createElement('h3');title.textContent=g.name||g.title; if(g.continued)title.textContent+=' (continuação)';section.append(title);
    const table=doc.createElement('table');table.className='compact-fixed-table-v712';
    const headers=g.headers||g.header;table.dataset.columns=String(headers.length);const head=table.createTHead().insertRow();for(const label of headers){const th=doc.createElement('th');th.textContent=label;head.append(th);}
    const tbody=table.createTBody();for(const values of g.rows){const tr=tbody.insertRow();for(const value of values)tr.insertCell().textContent=value;}
    if(g.footer&&g.finalFragment){
     const foot=doc.createElement('tfoot');
     for(const total of [g.footer,g.extraFooter].filter(Boolean)){
      const row=foot.insertRow();row.className='compact-group-total-v784';
      const label=row.insertCell();label.colSpan=headers.length-1;label.textContent=total.label;
      row.insertCell().textContent=total.value;
     }
     table.append(foot);
    }
    section.append(table);col.append(section);
   }
   sheet.append(col);
  }
  pages.append(sheet);
 }
 const totals=groups.flatMap(g=>g.totals||[]);
 if(totals.length){const foot=doc.createElement('div');foot.className='compact-species-totals-v712'+(groups.some(g=>g.totalsHeading)?' compact-calculator-totals-v787':'');const heading=doc.createElement('h3');heading.textContent=groups.find(g=>g.totalsHeading)?.totalsHeading||'Totais por espécie e espessura';foot.append(heading);for(const text of totals){const p=doc.createElement('p');p.textContent=text;foot.append(p);}pages.append(foot);}
 return pages;
}

// Keep displayed amounts as text: no repricing, quantity or service recalculation.
export function orderPrintGroupsV772(tables){
 return tables.map(table=>({
  title:table.tHead.rows[0].textContent.trim(),
  headers:[...table.tHead.rows[1].cells].map(cell=>cell.textContent.trim()),
  rows:[...table.tBodies].flatMap(body=>[...body.rows]).map(row=>[...row.cells].map(cell=>{
   const services=[...cell.querySelectorAll('.order-document-service-v770')];
   return services.length?services.map(service=>[...service.children].map(child=>child.textContent.trim()).join(' ')).join('\n'):cell.textContent.trim();
  })),
  totals:table.tFoot?[table.tHead.rows[0].textContent.trim()+' — '+[...table.tFoot.rows[0].cells].map(cell=>cell.textContent.trim()).join(': ')]:[]
 }));
}

// The final combined summary owns the totals; keep only useful load adjustments.
export function simplifyOrderPrintV773(root){
 const orders=[...root.querySelectorAll('.order-document-order-v767')];
 if(!orders.length)return;
 if(orders.length===1)orders[0].querySelector('.order-document-value-v767')?.remove();
 for(const summary of root.querySelectorAll('.v403-fin-resumo')){
  const rows=[...summary.children];
  if(rows.length!==5||!rows[4].classList.contains('v403-fin-final'))continue;
  const adjustments=rows.slice(1,4),isZero=row=>{
   const text=row.querySelector('strong')?.textContent||'';
   return /R\$/.test(text)&&/^0+$/.test(text.replace(/[^0-9]/g,''));
  };
  if(adjustments.every(isZero))summary.remove();
  else{rows[4].remove();for(const row of adjustments)if(isZero(row))row.remove();}
 }
}

export function simplifyCalculatorCloneV788(root){
 for(const heading of root.querySelectorAll('h2,h3'))if(heading.textContent.trim()==='Resumo dos lançamentos'&&!heading.closest?.('.compact-group-v710'))heading.remove();
 const first=root.querySelector('.stats');
 if(first){
  const descriptions=[...first.querySelectorAll('.stat')].map(stat=>({label:stat.querySelector('small')?.textContent.trim(),value:stat.querySelector('strong')?.textContent.trim()})).filter(stat=>stat.label&&stat.value&&!/valor|preço/i.test(stat.label)&&!stat.value.includes('R$'));
  if(descriptions.length){const text=root.ownerDocument.createElement('p');text.className='compact-summary-meta-v788';text.textContent=descriptions.map(stat=>stat.label+': '+stat.value).join(' · ');first.before(text);}
 }
 root.querySelector('#summaryFooterV718')?.remove();
 root.querySelector('#resumoEspeciesCalcV581')?.remove();
 for(const stats of root.querySelectorAll('.stats'))stats.remove();
}

function physicalPrintTotalsV789(table){
 try{const totals=JSON.parse(table.dataset?.physicalTotalsV789||'null');return totals&&['m3','m2','ml'].every(key=>typeof totals[key]==='number'&&Number.isFinite(totals[key])&&totals[key]>=0)?totals:null;}catch{return null;}
}
