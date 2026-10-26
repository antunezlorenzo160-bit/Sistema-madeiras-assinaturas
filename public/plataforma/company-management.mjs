export function createCompanyManagement({document,api,onChange,status,confirmAction=message=>window.confirm(message)}){
  const $=id=>document.getElementById(id);let state={companies:[],subscriptions:[],plans:[]};
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;};
  const date=value=>value?new Date(value).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não informado';
  const endDate=value=>value?value.split('-').reverse().join('/'):'Sem prazo definido';
  function trialLabel(subscription){
    if(!subscription)return 'Sem assinatura cadastrada';
    if(subscription.status==='trial'){
      if(subscription.trialMode!=='dated')return 'Teste gratuito sem prazo';
      return Number(subscription.trialEndsAt)>Date.now()?'Teste até '+endDate(subscription.trialEndDate):'Prazo do teste encerrado em '+endDate(subscription.trialEndDate)+' — acesso mantido até decisão do administrador';
    }
    return ({active:'Assinatura ativa',past_due:'Assinatura pendente',canceled:'Assinatura cancelada'})[subscription.status]||subscription.status;
  }
  function field(label,value){const p=node('p',null,'company-field');p.append(node('strong',label+': '),document.createTextNode(value||'Não informado'));return p;}
  async function action(form,task){
    const controls=[...form.querySelectorAll('button,input,select,textarea')];controls.forEach(e=>e.disabled=true);
    try{await task();await onChange();status('Alteração salva. A lista foi atualizada.');}
    catch(error){status(error.message,true);}finally{controls.forEach(e=>e.disabled=false);}
  }
  async function detail(id,host){
    host.replaceChildren(node('p','Carregando cadastro…'));
    try{
      const data=await api({action:'company.detail',empresaId:id}),company=data.company,subscription=data.subscription,profile=data.profile||{};
      host.replaceChildren();
      host.append(field('Empresa',profile.nome||company.name),field('CNPJ',profile.cnpj),field('E-mail',profile.email||company.email),
        field('Telefone',profile.telefone),field('Cadastro',date(company.createdAt)),field('Situação',trialLabel(subscription)),
        field('Usuários ativos',data.members.filter(m=>m.ativo).length+' de '+data.members.length+(data.membersTruncated?' (lista parcial)':'')));
      const plan=state.plans.find(p=>p.id===subscription?.planId);if(plan)host.append(field('Plano',plan.name));
      const access=node('form',null,'management-form'),suspended=company.accessStatus==='suspended';
      access.append(node('h3','Acesso ao sistema'));
      access.append(node('p',suspended?'O acesso online desta empresa está suspenso.':'A empresa pode acessar enquanto seu usuário estiver ativo.'));
      if(company.accessReason)access.append(field('Último motivo registrado',company.accessReason));
      const reasonLabel=node('label','Motivo (opcional)'),reason=node('textarea');reason.maxLength=300;reason.rows=2;reasonLabel.append(reason);access.append(reasonLabel);
      const accessButton=node('button',suspended?'Reativar acesso':'Suspender acesso',suspended?'':'danger');accessButton.type='submit';access.append(accessButton);
      access.onsubmit=event=>{event.preventDefault();const target=suspended?'active':'suspended';
        const message=suspended?`Reativar os usuários suspensos pela plataforma da empresa ${company.name}?`:`Suspender o acesso online de ${company.name}? Os dados serão preservados.`;
        if(!confirmAction(message))return;
        return action(access,()=>api({action:'company.access',empresaId:id,accessStatus:target,reason:reason.value,expectedUpdatedAt:company.updatedAt||company.createdAt||0}));
      };host.append(access);
      if(!subscription||subscription.status==='trial'){
        const trial=node('form',null,'management-form');trial.append(node('h3','Teste gratuito'));
        const modeLabel=node('label','Duração do teste'),mode=node('select');
        for(const [value,text]of [['indefinite','Sem prazo definido'],['dated','Definir data de encerramento']]){const option=node('option',text);option.value=value;mode.append(option);}
        mode.value=subscription?.trialMode==='dated'?'dated':'indefinite';modeLabel.append(mode);trial.append(modeLabel);
        const dateLabel=node('label','Último dia do teste (horário de Brasília)'),dateInput=node('input');dateInput.type='date';dateInput.value=subscription?.trialEndDate||'';dateLabel.append(dateInput);trial.append(dateLabel);
        const updateDate=()=>{dateLabel.hidden=mode.value!=='dated';dateInput.required=mode.value==='dated';};mode.onchange=updateDate;updateDate();
        trial.append(node('p','Ao salvar uma data, a empresa recebe um aviso dentro do sistema. A data não gera cobrança nem suspende o acesso automaticamente. Para interromper o acesso, use a opção de suspensão acima.', 'management-note'));
        const save=node('button','Salvar teste gratuito');save.type='submit';trial.append(save);
        trial.onsubmit=event=>{event.preventDefault();return action(trial,()=>api({action:'trial.save',empresaId:id,mode:mode.value,endDate:dateInput.value,expectedUpdatedAt:company.updatedAt||company.createdAt||0}));};
        host.append(trial);
      }
      host.append(node('p','A suspensão bloqueia operações online. Dados já armazenados offline não são apagados dos aparelhos.','management-note'));
    }catch(error){host.replaceChildren(node('p',error.message,'error'));}
  }
  function renderList(){
    const host=$('companies-list'),term=($('company-search')?.value||'').trim().toLocaleLowerCase('pt-BR');host.replaceChildren();
    const companies=state.companies.filter(c=>[c.name,c.email,c.empresaId].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(term)));
    if(!companies.length){host.append(node('p',term?'Nenhuma empresa encontrada.':'Nenhum cadastro por enquanto.'));return;}
    for(const company of companies){
      const card=node('section',null,'company-card'),title=node('div',null,'company-card-title');title.append(node('h3',company.name));
      const suspended=company.accessStatus==='suspended';title.append(node('span',suspended?'Suspensa':'Ativa na plataforma',suspended?'badge suspended':'badge'));card.append(title);
      const subscription=state.subscriptions.find(s=>s.empresaId===company.empresaId||s.id===company.empresaId);card.append(node('p',trialLabel(subscription)));
      const button=node('button','Consultar e gerenciar','secondary'),panel=node('div',null,'company-detail');panel.hidden=true;
      button.type='button';button.setAttribute('aria-expanded','false');
      button.onclick=async()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)await detail(company.empresaId||company.id,panel);};
      card.append(button,panel);host.append(card);
    }
  }
  $('company-search')?.addEventListener('input',renderList);
  return {render(next){state=next;renderList();},trialLabel};
}
