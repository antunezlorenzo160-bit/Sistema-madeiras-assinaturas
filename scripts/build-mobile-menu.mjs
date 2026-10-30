import { applyCalculatorLoadDelete } from './calculator-load-delete.mjs';
import { applyOfflineBoot } from './offline-boot.mjs';
import { applyCalculatorSummaryPolicy } from './calculator-summary-policy.mjs';
import { applyDesktopCalculatorParity } from './desktop-calculator-parity.mjs';
import { applyLinearCmdp } from './linear-cmdp.mjs';
import { applyLinearServices } from './linear-services.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

// The legacy application lives in a JSON string. Inject inside its iframe so
// the menu works on every tab without changing the login or signature pages.
const root = new URL('../', import.meta.url);
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
let app = applyCalculatorSummaryPolicy(applyDesktopCalculatorParity(applyLinearCmdp(applyLinearServices(JSON.parse(html.slice(start, end))))));
app = applyCalculatorLoadDelete(app);
const keyboard = readFileSync(new URL('ui/calculator-keyboard.js', root), 'utf8');
const keyboardPattern = /(<script id="v118-atalho-espaco-lancar-pc">)[\s\S]*?<\/script>/;
if (!keyboardPattern.test(app)) throw new Error('Atalho da calculadora não encontrado.');
app = app.replace(keyboardPattern, (_, opening) => opening + keyboard + '</script>');
const css = readFileSync(new URL('ui/mobile-menu.css', root), 'utf8');
const js = readFileSync(new URL('ui/mobile-menu.js', root), 'utf8') + '\n' + readFileSync(new URL('ui/package-counter.js', root), 'utf8');
const injection = `<style id="mobile-menu-styles">${css}</style><script id="mobile-menu-script">${js}</script>`;
app = app.replace(/<style id="mobile-menu-styles">[\s\S]*?<\/script>/, '');
if (!app.includes('</body>')) throw new Error('Fim da aplicação não encontrado.');
app = app.replace('</body>', injection + '</body>');
html = html.slice(0, start) + JSON.stringify(app).replaceAll('</', '<\\/') + html.slice(end);
writeFileSync(file, applyOfflineBoot(html));
console.log('Menu retrátil preparado somente para celular.');
