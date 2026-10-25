import { readFileSync, writeFileSync } from 'node:fs';

// Platform configuration is maintained through repository access and deploys.
// No tenant API, role, company document or local preference can edit it.
const root = new URL('../', import.meta.url);
const policy = JSON.parse(readFileSync(new URL('config/pdf-watermark.json', root), 'utf8'));
if (policy.imagem !== 'marca-do-sistema' || !Number.isFinite(policy.larguraMm) ||
    policy.larguraMm < 80 || policy.larguraMm > 190 || !Number.isFinite(policy.opacidade) ||
    policy.opacidade <= 0 || policy.opacidade > 0.15) throw new Error('Configuração da marca d’água inválida.');
const file = new URL('public/index.html', root);
let html = readFileSync(file, 'utf8');
const marker = 'const TEMPLATE=';
const start = html.indexOf(marker) + marker.length;
if (start < marker.length || html[start] !== '"') throw new Error('Aplicação não encontrada.');
let end = start + 1;
for (; end < html.length; end++) {
  if (html[end] === '\\') { end++; continue; }
  if (html[end] === '"') { end++; break; }
}
let app = JSON.parse(html.slice(start, end));
const controls = /<div id="marcaAguaConfigV551"[\s\S]*?<p id="marcaAguaStatusV551"[^>]*>[\s\S]*?<\/p><\/div>/;
const oldLogic = /const marcaAguaKeyV551=[\s\S]*?\naplicarMarcaAguaV551\(\);/;
const newLogic = /\/\/ PLATFORM_WATERMARK_BEGIN[\s\S]*?\/\/ PLATFORM_WATERMARK_END/;
if (!app.includes('// PLATFORM_WATERMARK_BEGIN') && (!controls.test(app) || !oldLogic.test(app))) {
  throw new Error('Configurações da marca d’água mudaram. Revise a integração.');
}
app = app.replace(controls, '');
const replacement = `// PLATFORM_WATERMARK_BEGIN
let politicaMarcaAguaPdf = Object.freeze(${JSON.stringify(policy)});
function aplicarMarcaAguaPlataforma(){
 document.body.style.setProperty('--marca-agua-largura-v551',politicaMarcaAguaPdf.larguraMm+'mm');
 document.body.style.setProperty('--marca-agua-opacidade-v551',String(politicaMarcaAguaPdf.opacidade));
 for(const id of ['marcaAguaPdfV549','marcaAguaPdfV550','marcaAguaOrcamentoV552']){
  const imagem=document.getElementById(id);
  if(imagem)imagem.src=politicaMarcaAguaPdf.image||logoPadraoV531;
 }
}
const estiloMarcaPlataforma=document.createElement('style');
estiloMarcaPlataforma.id='marca-agua-plataforma';
estiloMarcaPlataforma.textContent='@media print{html body #marcaAguaPdfV549,html body.custom-print #printAreaCustom #marcaAguaPdfV550,html body:not(.custom-print) #orcamento #orcAtualPainel #marcaAguaOrcamentoV552{width:var(--marca-agua-largura-v551)!important;opacity:var(--marca-agua-opacidade-v551)!important}}';
document.head.appendChild(estiloMarcaPlataforma);
window.addEventListener('beforeprint',aplicarMarcaAguaPlataforma);
aplicarMarcaAguaPlataforma();
async function carregarMarcaAguaPlataforma(){
 const usuario=parent.__v470Runtime()?.auth?.currentUser;
 if(!usuario||!navigator.onLine)return;
 const controle=new AbortController(),timer=setTimeout(()=>controle.abort(),4000);
 try{
  const token=await usuario.getIdToken();
  const resposta=await fetch('/.netlify/functions/platform-watermark',{headers:{Authorization:'Bearer '+token},signal:controle.signal});
  if(!resposta.ok)return;
  const dados=await resposta.json();
  if(!Number.isFinite(dados.widthMm)||dados.widthMm<80||dados.widthMm>190||!Number.isFinite(dados.opacity)||dados.opacity<.01||dados.opacity>.15)return;
  politicaMarcaAguaPdf=Object.freeze({larguraMm:dados.widthMm,opacidade:dados.opacity,image:typeof dados.image==='string'?dados.image:''});
  aplicarMarcaAguaPlataforma();
 }catch{}finally{clearTimeout(timer);}
}
const gerarPdfPlataformaOriginal=gerarPdfBloco;
gerarPdfBloco=async function(...argumentos){await carregarMarcaAguaPlataforma();return gerarPdfPlataformaOriginal(...argumentos);};
window.gerarPdfBloco=gerarPdfBloco;
window.addEventListener('focus',()=>carregarMarcaAguaPlataforma());
carregarMarcaAguaPlataforma();
// PLATFORM_WATERMARK_END`;
app = app.replace(newLogic.test(app) ? newLogic : oldLogic, () => replacement);
app = app.replace('copiar:copiarBloco,pdf:gerarPdfBloco,', 'copiar:copiarBloco,pdf:(...args)=>gerarPdfBloco(...args),');
html = html.slice(0, start) + JSON.stringify(app).replaceAll('</', '<\\/') + html.slice(end);
writeFileSync(file, html);
console.log('Marca d’água definida pela plataforma; controles das empresas removidos.');
