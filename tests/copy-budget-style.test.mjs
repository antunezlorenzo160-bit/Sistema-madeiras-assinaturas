import test from 'node:test';
import assert from 'node:assert/strict';
import {tabelaTextoMensagem,applyReadableCopy} from '../scripts/copy-readable-build.mjs';
test('stock copy repeats full dimensions per line like the budget, without inventing prices',()=>{
 const text=tabelaTextoMensagem([['Pç','Medidas','Comprimento','Volume'],['8pç','15×2,5cm','3,0m','0,0900m³'],['35pç','12×2,5cm','3,0m','0,3150m³']]);
 assert.equal(text,'8pç | 15×2,5cm | 3,0m | 0,0900m³\n35pç | 12×2,5cm | 3,0m | 0,3150m³');
 assert(!text.includes('R$'));
});
const tabelas=[
 ['Resumo da calculadora',['Pç','Espessura','Largura','Comprimento','Volume'],['8pç','2,5 cm','15 cm','3,0 m','0,0900 m³']],
 ['Cadastro m³',['Bitola','Tipo','Larguras','Atacado','Varejo'],['2,5 cm','Angelim','12 / 15 cm','R$ 100,00','R$ 150,00']],
 ['Cadastro m²',['Espécie','Produto','Qualidade','Código','Preço/m²','Estoque m²','Mínimo m²'],['Angelim','Forro','A','001','R$ 50,00','10,00','2,00']],
 ['Cadastro linear',['Espécie','Tipo / produto','Código','Atacado/m','Varejo/m','Estoque m'],['Garrote','Rodapé','002','R$ 5,00','R$ 7,00','120,00']],
 ['Granel',['Produto','Código','Atacado/m³','Estoque m³','Observação'],['Cavaco','003','R$ 100,00','10,0000','Retirar na empresa']],
 ['Estoque por lançamento',['Madeira','Qtd.','Medidas','Comp.','m³/m²'],['Angelim','8','15×2,5cm','3,0m','0,0900m³']],
 ['Movimentações',['data / hora','mov.','origem','destino','Volume'],['03/11/2026 13:00','Saída','Estoque 1','Cliente','0,0900m³']],
 ['Orçamento salvo',['Pç','Medidas','Comp.','Volume','Serviços','Valor'],['1pç','45×2,5cm','3,0m','0,0338m³','Aplainar e cortar','R$ 123,45']],
 ['Produção',['Peças','Descrição','Status'],['8','Angelim sob medida para acabamento especial','Em produção']]
];
for(const [nome,cab,linha] of tabelas)test(nome+' preserva campos, posição e valores sem alinhamento por espaços',()=>{
 const result=tabelaTextoMensagem([cab,linha]);
 assert.equal(result,cab.join(' | ')+'\n'+linha.join(' | '));
 assert(!result.includes('```'));
});
test('célula vazia mantém associação com cabeçalho e zero não desaparece',()=>{
 assert.equal(tabelaTextoMensagem([['Qtd','Serviços','Valor'],[0,'','R$ 0,00']]),'Qtd | Serviços | Valor\n0 |  | R$ 0,00');
});
