// Plain text keeps measurements readable when messaging apps change fonts or wrap lines.
export function tabelaTextoMensagem(linhas){
 if(!linhas?.length)return '';
 const limpar=v=>String(v??'').replace(/\s+/g,' ').trim();
 const cabecalhos=linhas[0].map(limpar);
 const dados=linhas.slice(1).map(l=>l.map(limpar)).filter(l=>l.some(Boolean));
 if(cabecalhos.join('|')==='Pç|Larg.cm|m³'){
  return dados.map(l=>`${l[0]} pç · ${l[1]} cm · ${l[2]} m³`).join('\n');
 }
 return dados.map(l=>l.map((v,i)=>v?`${cabecalhos[i]||'Informação'}: ${v}`:'').filter(Boolean).join('\n')).join('\n\n');
}
export function applyReadableCopy(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada para formatar cópia.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));
 const begin=app.indexOf('function tabelaTextoCopia('),finish=app.indexOf('function textoExportacao(',begin);
 if(begin<0||finish<0||app.indexOf('function tabelaTextoCopia(',begin+1)!==-1)throw Error('Formatador de cópia não encontrado ou duplicado.');
 app=app.slice(0,begin)+tabelaTextoMensagem.toString().replace('tabelaTextoMensagem','tabelaTextoCopia')+'\n'+app.slice(finish);
 return html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
}
