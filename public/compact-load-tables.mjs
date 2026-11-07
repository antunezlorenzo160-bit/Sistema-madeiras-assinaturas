// Normalize only the presentation of already calculated cells; never sum rounded rows.
export function compactLoadGroups(tables){
 const groups=[];
 for(const input of tables){
  const title=String(input.title||'Itens').replace(/\s*[—–•·-]\s*Comp\..*$/i,'').trim();
  const original=input.headers.map(x=>String(x).trim());
  const key=JSON.stringify([title,original]);let group=groups.find(g=>g.key===key);
  if(!group){group={key,title,headers:original.slice(),rows:[],subtotals:[]};groups.push(group);}
  if(input.subtotal)group.subtotals.push(String(input.subtotal));
  for(const values of input.rows){
   if(values.length!==original.length)throw Error('Colunas incompatíveis no romaneio.');
   const row=values.map(x=>String(x).trim());
   original.forEach((name,index)=>{
    const h=name.toLowerCase();
    if(h==='medidas'){
     const pair=row[index].match(/^([\d,.]+)\s*[×x]\s*([\d,.]+)\s*cm$/);
     const thickness=title.match(/Esp\.\s*([\d,.]+)\s*cm/i);
     if(pair&&thickness&&Number(pair[1].replace(',','.'))===Number(thickness[1].replace(',','.'))){group.headers[index]='Larg. cm';row[index]=pair[2];}
    }
    if(h==='comp.'){group.headers[index]='Comp. m';row[index]=row[index].replace(/\s*m$/,'');}
    if(h==='m³'||h==='m² face'||h==='m linear'||h==='peso est.'){
     group.headers[index]=h==='m linear'?'m linear':h==='peso est.'?'Peso kg':name;
     row[index]=row[index].replace(/\s*(?:m³|m²|m|kg)$/,'');
    }
   });
   group.rows.push(row);
  }
 }
 for(const g of groups){
  const qty=g.rows.reduce((n,row)=>n+(Number(String(row[0]).replace(/[^0-9.,]/g,'').replace(/\./g,'').replace(',','.'))||0),0);
  const units={};for(const text of g.subtotals){const match=text.match(/([0-9][0-9.,]*)\s*(m³|m²|m)/);if(match){const n=Number(match[1].replace(/\./g,'').replace(',','.'));units[match[2]]=(units[match[2]]||0)+n;}}
  const volume=Object.entries(units).map(([u,n])=>n.toLocaleString('pt-BR',{minimumFractionDigits:u==='m³'?4:2,maximumFractionDigits:u==='m³'?4:2})+' '+u).join(' · ');
  const extras=[];
  for(const [label,unit,places,text] of [['m² face','m²',4,'Área de face'],['m linear','m',2,'Metros lineares'],['Peso kg','kg',1,'Peso']]){
   const index=g.headers.indexOf(label);if(index<0)continue;
   const values=g.rows.map(row=>{const str=String(row[index]||'').trim();if(!/^[0-9][0-9.,]*$/.test(str))return null;return Number(str.replace(/\./g,'').replace(',','.'));});
   const known=values.filter(n=>n!==null&&Number.isFinite(n));
   if(!known.length){extras.push(text+': '+(label==='m² face'?'não informada':'não informado'));continue;}
   const total=known.reduce((a,b)=>a+b,0);
   extras.push(text+': '+total.toLocaleString('pt-BR',{minimumFractionDigits:places,maximumFractionDigits:places})+' '+unit+(known.length<values.length?' (parcial)':''));
  }
  const valueIndex=g.headers.indexOf('valor');
  if(valueIndex>=0){
   const cents=g.rows.map(row=>String(row[valueIndex]).replace(/^R\$\s*/,'')).map(v=>/^[0-9][0-9.,]*$/.test(v)?Math.round(Number(v.replace(/\./g,'').replace(',','.'))*100):null);
   if(cents.every(n=>n!==null&&Number.isFinite(n)))extras.push('Valor dos produtos: R$ '+(cents.reduce((a,b)=>a+b,0)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));
  }
  g.totals=[g.title+': '+qty.toLocaleString('pt-BR')+' pç'+(volume?' · '+volume:'')+(extras.length?' · '+extras.join(' · '):'')];
 }
 return groups;
}

// The compact romaneio uses the five approved columns. Complementary metrics remain
// in the document totals; a detailed print option retains all per-piece metrics.
export function projectCompactLoadGroups(groups,detailed=false){
 return groups.map(g=>{
  if(detailed||!g.headers.includes('m² face')||!g.headers.includes('Peso kg'))return {...g,rows:g.rows.map(r=>r.slice())};
  const thickness=g.title.match(/Esp\.\s*([\d,.]+)\s*cm/i)?.[1]||'—';
  const unitColumn=g.rows.some(r=>r[3]!=='—')?3:g.rows.some(r=>r[4]!=='—')?4:5;
  const unit=unitColumn===3?'m³':unitColumn===4?'m²':'m';
  const origin=g.headers.indexOf('origem'),price=g.headers.indexOf('preço un.'),value=g.headers.indexOf('valor');
  const headers=['Pç','Esp. cm',g.headers[1]==='Larg. cm'?'Larg. cm':'Medidas','Comp. m',unitColumn===3?'Volume m³':unitColumn===4?'Área m²':'Metros m'];
  if(origin>=0)headers.push('Origem');
  // Move repeated currency/unit labels into headers. Numeric strings stay intact.
  const numericPrice=price>=0&&g.rows.every(r=>/^R\$\s*[\d.,]+\s*\/\s*(?:m³|m²|m)$/.test(r[price]));
  const priceUnits=price>=0?[...new Set(g.rows.map(r=>r[price].match(/\/\s*(m³|m²|m)$/)?.[1]).filter(Boolean))]:[];
  if(price>=0)headers.push(numericPrice&&priceUnits.length===1?'R$/'+priceUnits[0]:'Preço un.');
  if(value>=0)headers.push('Valor R$');
  const rows=g.rows.map(r=>{
   const row=[r[0],thickness,r[1],r[2],r[unitColumn]];
   if(origin>=0)row.push(r[origin]);
   if(price>=0)row.push(numericPrice?r[price].replace(/^R\$\s*/,'').replace(/\s*\/\s*(m³|m²|m)$/,''):r[price]);
   if(value>=0)row.push(r[value].replace(/^R\$\s*/,''));
   return row;
  });
  return {...g,headers,rows};
 });
}

// Explicit columns avoid Android's CSS multicol table fragmentation. Each header
// and row consumes a bounded slot; repeated headers identify every continuation.
export function paginateCompactGroups(groups,capacity=44,columnCount=2){
 if(!Number.isInteger(capacity)||capacity<4)throw Error('Capacidade de impressão inválida.');
 if(![1,2].includes(columnCount))throw Error('Número de colunas inválido.');
 const pages=[];let columns=Array.from({length:columnCount},()=>[]),column=0,used=0;
 const advance=()=>{if(column<columnCount-1){column++;used=0;}else{pages.push(columns);columns=Array.from({length:columnCount},()=>[]);column=0;used=0;}};
 for(const group of groups){let offset=0;
  while(offset<group.rows.length){
   if(capacity-used<3)advance();
   const take=Math.min(group.rows.length-offset,capacity-used-2);
   columns[column].push({...group,continued:offset>0,rows:group.rows.slice(offset,offset+take)});
   offset+=take;used+=take+2;
   if(offset<group.rows.length)advance();
  }
 }
 if(columns.some(c=>c.length))pages.push(columns);
 return pages;
}


export function samePrintMetricTotals(first,last){
 const normalize=v=>String(v??'').toLowerCase().replace(/\s*(?:m³|m²|kg|m)(?=\s|$)/g,'').replace(/\s+/g,' ').trim();
 return first.length>0&&first.length===last.length&&first.every((v,i)=>normalize(v)===normalize(last[i]));
}
