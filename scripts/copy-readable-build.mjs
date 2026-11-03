// Plain text keeps measurements readable when messaging apps change fonts or wrap lines.
export function tabelaTextoMensagem(linhas){
 if(!linhas?.length)return '';
 const limpar=v=>String(v??'').replace(/\s+/g,' ').trim();
 const cabecalhos=linhas[0].map(limpar);
 const dados=linhas.slice(1).map(l=>l.map(limpar)).filter(l=>l.some(Boolean));
 if(cabecalhos.join('|')==='Pç|Medidas|Comprimento|Volume')return dados.map(l=>l.join(' | ')).join('\n');
 if(cabecalhos.join('|')==='Pç|Larg.cm|m³'){
  return dados.map(l=>`${l[0]} pç · ${l[1]} cm · ${l[2]} m³`).join('\n');
 }
 return [cabecalhos.join(' | '),...dados.map(l=>l.join(' | '))].join('\n');
}
export function applyReadableCopy(html){
 const marker='const TEMPLATE=',start=html.indexOf(marker)+marker.length;
 if(start<marker.length||html[start]!=='"')throw Error('Aplicação não encontrada para formatar cópia.');
 let end=start+1;for(;end<html.length;end++){if(html[end]==='\\'){end++;continue;}if(html[end]==='"'){end++;break;}}
 let app=JSON.parse(html.slice(start,end));
 const begin=app.indexOf('function tabelaTextoCopia('),finish=app.indexOf('function textoExportacao(',begin);
 if(begin<0||finish<0||app.indexOf('function tabelaTextoCopia(',begin+1)!==-1)throw Error('Formatador de cópia não encontrado ou duplicado.');
 app=app.slice(0,begin)+tabelaTextoMensagem.toString().replace('tabelaTextoMensagem','tabelaTextoCopia')+'\n'+app.slice(finish);
 const antiga="medida=titulo;linhas.push([qtd[1],larg[1],vol[1]]);";
 const nova="medida=titulo;linhas.push([qtd[1]+'pç',larg[1]+'×'+esp[1]+'cm',comp[1]+'m',vol[1]+'m³']);";
 if(app.includes(antiga)){
  app=app.replace("const linhas=[['Pç','Larg.cm','m³']],notas=[];let medida='';","const linhas=[['Pç','Medidas','Comprimento','Volume']],notas=[];let medida='';");
  app=app.replace(antiga,nova);
 }else if(!app.includes(nova))throw Error('Linhas de estoque para cópia não encontradas.');
 const cargaInicio=app.indexOf('function tabelaTextoV412('),cargaFim=app.indexOf('function camposClienteTextoV409(',cargaInicio);
 if(cargaInicio<0||cargaFim<0)throw Error('Formatador de carregamentos não encontrado.');
 app=app.slice(0,cargaInicio)+`function tabelaTextoV412(itens,comercial){
    return itens.map(i=>{
      const c=celulasLinhaV412(i,comercial),u=unidadeLinhaV410(i);
      const tipo=i.tipoMedida||i.tipoCadastro||'m3';
      const comp=numeroCurtoV410(i.comprimento)+'m';
      const medidas=tipo==='linear'?String(i.produto||i.tipoLinear||'Produto'):
        tipo==='m2'?numeroCurtoV410(i.largura)+'cm':
        tipo==='granel'?'A granel':numeroCurtoV410(i.largura)+'×'+numeroCurtoV410(i.espessura)+'cm';
      const partes=[c[0]+'pç',medidas];
      if(tipo!=='granel')partes.push(comp);
      partes.push(c[2]+u.volume,c[3]+' '+u.preco,'R$ '+c[4]);
      return partes.join(' | ');
    });
  }
  `+app.slice(cargaFim);
 return html.slice(0,start)+JSON.stringify(app).replaceAll('</','<\\/')+html.slice(end);
}
