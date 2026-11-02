// Textos atuais da interface; os avisos fiscais e de cobranças de teste são preservados.
export function cleanInterfaceCopy(app){
 return app
  .replaceAll('Sincronização da empresa — teste entre aparelhos (V428)','Sincronização da empresa')
  .replaceAll('Nesta versão de testes, a empresa é definida pelo vínculo da conta no servidor.','A empresa é definida pelo vínculo da sua conta.')
  .replaceAll('Ativar sincronização de teste','Ativar sincronização')
  .replace("if(el)el.textContent='V492 • SIMULAÇÃO • '+empresaV456+' • Projeto '+firebaseConfig.projectId+' • aparelho '+DEVICE_ID.slice(0,8);","if(el)el.textContent='Sincronização vinculada à empresa';")
  .replace(/<button\b[^>]*\bid="(?:btnTesteSync|btnConsultarSync)"[^>]*>[\s\S]*?<\/button>/g,'');
}

