import { readFileSync, writeFileSync } from 'node:fs';

// Keep the legacy embedded application intact in source control. Apply these
// focused changes when Netlify builds the site, failing if its layout changes.
const file = new URL('../public/index.html', import.meta.url);
let html = readFileSync(file, 'utf8');
if (html.includes("import { setupSignaturePad } from './signature-pad.js';")) {
  console.log('Tela de assinatura já preparada.');
  process.exit(0);
}
function replaceOnce(text, before, after) {
  if (!text.includes(before) || text.indexOf(before) !== text.lastIndexOf(before)) {
    throw new Error('Estrutura da página mudou. Revise o ajuste de assinatura: ' + before.slice(0, 70));
  }
  return text.replace(before, () => after);
}
function patch(before, after) { html = replaceOnce(html, before, after); }

patch('Informe seu nome e o código que recebeu para confirmar o recebimento.',
  'Informe seu nome, o código recebido e desenhe sua assinatura para confirmar o recebimento.');
patch('<button id="assinatura-enviar-v683"',
  '<p id="assinatura-ajuda">Assine no quadro com o dedo ou o mouse.</p><canvas id="assinatura-desenho" width="600" height="240" aria-label="Área para desenhar sua assinatura" aria-describedby="assinatura-ajuda" style="display:block;width:100%;height:auto;background:#fff;border:2px solid #789383;border-radius:8px;touch-action:none"></canvas><button id="assinatura-limpar" type="button">Limpar assinatura</button><button id="assinatura-enviar-v683"');
patch('<div role="status" id="assinatura-status-publico-v683" aria-live="polite"></div></form>',
  '</form><div role="status" id="assinatura-status-publico-v683" aria-live="polite"></div>');
patch('const assinaturaTokenV683=',
  "import { setupSignaturePad } from './signature-pad.js';\nconst readSignature = setupSignaturePad(document.getElementById('assinatura-desenho'), document.getElementById('assinatura-limpar'));\nconst assinaturaTokenV683=");
patch("b.disabled=true;st.textContent='Registrando confirmação…';try{",
  "b.disabled=true;document.getElementById('assinatura-limpar').disabled=true;st.textContent='Registrando confirmação…';try{const signature=readSignature();");
patch("action:'sign',token:assinaturaTokenV683,", "action:'sign',signature,token:assinaturaTokenV683,");
patch("st.textContent=String(e?.message||e);b.disabled=false;",
  "st.textContent=String(e?.message||e);b.disabled=false;document.getElementById('assinatura-limpar').disabled=false;");

const start = html.indexOf('const TEMPLATE=') + 'const TEMPLATE='.length;
if (start < 'const TEMPLATE='.length) throw new Error('Aplicação incorporada não encontrada.');
let end = start + 1;
for (; end < html.length; end++) {
  if (html[end] === '\\') { end++; continue; }
  if (html[end] === '"') { end++; break; }
}
let template = JSON.parse(html.slice(start, end));
const renderer = `function desenhoAssinaturaPedido(o){
 const d=o.assinaturaDesenho;
 if(!d||d.version!==1||!Array.isArray(d.strokes))return '';
 const paths=d.strokes.slice(0,100).map(s=>{
  const p=s.points;
  if(!Array.isArray(p)||p.length<4||p.length>8000||p.length%2||!p.every((n,i)=>Number.isInteger(n)&&n>=0&&n<=(i%2?240:600)))return '';
  return '<polyline points="'+p.reduce((a,n,i)=>a+(i%2?',':' ')+n,'').trim()+'"/>';
 }).join('');
 return '<details style="margin-top:8px"><summary>Ver assinatura</summary><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" role="img" aria-label="Assinatura de recebimento" style="width:100%;max-width:420px;background:white;border:1px solid #ccc" fill="none" stroke="#152d22" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'+paths+'</svg></details>';
}
`;
const position = template.indexOf('  const assinaturaEntrega=');
const script = template.lastIndexOf('<script', position);
if (position < 0 || script < 0) throw new Error('Lista de pedidos não encontrada.');
const scriptStart = template.indexOf('>', script) + 1;
template = template.slice(0, scriptStart) + '\n' + renderer + template.slice(scriptStart);
template = replaceOnce(template, '${dataHoraCurta(o.assinadoEm)}</div>`',
  '${dataHoraCurta(o.assinadoEm)}</div>${desenhoAssinaturaPedido(o)}`');
html = html.slice(0, start) + JSON.stringify(template).replaceAll('</', '<\\/') + html.slice(end);
writeFileSync(file, html);
console.log('Tela de assinatura preparada.');
