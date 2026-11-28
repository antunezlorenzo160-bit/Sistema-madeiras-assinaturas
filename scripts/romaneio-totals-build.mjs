export function applyRomaneioTotalsV789(app){
 if(app.includes('data-physical-totals-v789'))return app;
 const begin=app.indexOf('  function blocoRomaneioV418(g){'),end=app.indexOf('  function documentoRomaneioV418(',begin);
 if(begin<0||end<0)throw Error('Romaneio não encontrado.');
 let body=app.slice(begin,end);const table='<table class="v404-carga-tabela">';if(body.split(table).length!==2)throw Error('Tabela do romaneio mudou.');
 body=body.replace(table,'<table class="v404-carga-tabela" data-physical-totals-v789="${esc(JSON.stringify(metricas))}">');
 return app.slice(0,begin)+body+app.slice(end);
}
