import test from 'node:test';
import assert from 'node:assert/strict';
import {tabelaTextoMensagem,applyReadableCopy} from '../scripts/copy-readable-build.mjs';
test('stock copy has explicit units and preserves screenshot quantities and volumes',()=>{
 assert.equal(tabelaTextoMensagem([['Pç','Larg.cm','m³'],['8','15','0,0900'],['35','12','0,3150']]),'8 pç · 15 cm · 0,0900 m³\n35 pç · 12 cm · 0,3150 m³');
 assert.equal(tabelaTextoMensagem([['Pç','Larg.cm','m³'],['3','25','0,0750']]),'3 pç · 25 cm · 0,0750 m³');
});
test('other tables retain long descriptions, services and prices without truncation',()=>{
 const description='Angelim com medida especial para produção';
 const text=tabelaTextoMensagem([['Peças','Medidas','Serviços','Valor'],['125',description,'Aplainar e cortar','R$ 1.234,56'],['2','20 × 30 × 6 m','','R$ 50,00']]);
 assert(text.includes(description));assert(text.includes('Aplainar e cortar'));assert(text.includes('R$ 1.234,56'));assert(text.includes('Peças | Medidas | Serviços | Valor'));assert(!text.includes('```'));
});
test('build changes only formatter; repeat builds are stable and invalid input fails closed',()=>{
 const source=`before();
function tabelaTextoCopia(linhas){return linhas.join(' ');}
function textoExportacao(alvo){return alvo;}
function estoque(){const linhas=[['Pç','Medidas','Comprimento','Volume']],notas=[];let medida='';medida=titulo;linhas.push([qtd[1]+'pç',larg[1]+'×'+esp[1]+'cm',comp[1]+'m',vol[1]+'m³']);}
function tabelaTextoV412(itens,comercial){return [];}
function camposClienteTextoV409(){return '';}
stock();`;
 const html='<script>const TEMPLATE='+JSON.stringify(source)+';</script>';
 const result=applyReadableCopy(html);
 assert.equal(applyReadableCopy(result),result);
 const decode=s=>JSON.parse(s.slice(s.indexOf('const TEMPLATE=')+15,s.lastIndexOf(';</script>')));
 const before=decode(html),after=decode(result);
 assert(after.includes('function textoExportacao(alvo){return alvo;}'));
 assert.equal(before.slice(0,before.indexOf('function tabelaTextoCopia(')),after.slice(0,after.indexOf('function tabelaTextoCopia(')));
 assert.throws(()=>applyReadableCopy('invalid'));
});
