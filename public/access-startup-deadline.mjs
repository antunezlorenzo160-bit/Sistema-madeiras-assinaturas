export async function withAccessDeadline(task,label,milliseconds=6000){
 let timer;
 try{
  return await Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{
   timer=setTimeout(()=>reject(Object.assign(Error('A conexão demorou ao '+label+'. Verificando o acesso salvo neste aparelho.'),{code:'deadline-exceeded'})),milliseconds);
  })]);
 }finally{clearTimeout(timer);}
}
