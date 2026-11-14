import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {financePreviewContext} from '../scripts/pending-preview-build.mjs';
test('report route uses stock permission and financial controls remain denied to employees',()=>{
 const source=readFileSync(new URL('../ui/employee-frame.js',import.meta.url),'utf8');let member={papel:'employee'};
 const parent={__smEmployeeMember:()=>member,__smEmployeeCan:(area,write)=>area==='stock'&&!write};
 const a=source.indexOf('function employeeAreaForTab('),b=source.indexOf('function employeePanelArea(',a),actionStart=source.indexOf('function employeeActionAllowed('),actionEnd=source.indexOf("document.addEventListener('click'",actionStart);
 const c={parent};vm.createContext(c);vm.runInContext(source.slice(a,b)+'\n'+source.slice(actionStart,actionEnd),c);
 assert.equal(c.employeeTabAllowed('relatorios'),true);assert.equal(c.employeeTabAllowed('empresa'),false);
 const control={id:'scRefreshV720',dataset:{},closest:selector=>selector==='#stockChartsV720'?{}:null};const target={closest:()=>control};assert.equal(c.employeeActionAllowed(target),true);
 control.id='finLoadV722';control.closest=selector=>selector==='#financePanelV722'?{}:null;assert.equal(c.employeeActionAllowed(target),false);
 parent.__smEmployeeCan=()=>false;assert.equal(c.employeeTabAllowed('relatorios'),false);
});
test('financial data isolation defaults to preview and switches only in the production build',()=>{
 for(const context of [undefined,'deploy-preview','branch-deploy','test',''])assert.equal(financePreviewContext(context),true);assert.equal(financePreviewContext('production'),false);
});
