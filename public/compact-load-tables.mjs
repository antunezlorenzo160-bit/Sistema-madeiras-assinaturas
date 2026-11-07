// Normalize only the presentation of already calculated cells; never sum rounded rows.
export function compactLoadGroups(tables){
 const groups=[];
 for(const input of tables){
  const title=String(input.title||'Itens').replace(/\s*[—–•·-]\s*Comp\..*$/i,'').trim();
  const original=input.headers.map(x=>String(x).trim());
  const key=JSON.stringify([title,original]);let group=groups.find(g=>g.key===key);
  if(!group){group={key,title,headers:original.slice(),rows:[]};groups.push(group);}
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
 return groups;
}
