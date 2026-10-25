import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { initializeAuth,browserLocalPersistence,inMemoryPersistence,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,signOut } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const app=initializeApp({apiKey:'AIzaSyBQ1_mmY0mP8mdbonbmWLVv6VaDXuzHZkU',authDomain:'estoque-madeiras-cc4d7.firebaseapp.com',projectId:'estoque-madeiras-cc4d7',appId:'1:201851719270:web:8d71d7f6862d7c4709a7a7'},'sm-madeiras-login');
const auth=initializeAuth(app,{persistence:[browserLocalPersistence,inMemoryPersistence]}),$=id=>document.getElementById(id);
// O convite fica no fragmento, fora dos logs de requisição e do cabeçalho Referer.
const token=new URLSearchParams(location.hash.slice(1)).get('convite');
let busy=false;
function status(text){$('status').textContent=text;}
function message(error){return ({'auth/email-already-in-use':'Este e-mail já tem conta. Escolha “Já tenho conta”.','auth/invalid-credential':'Confira o e-mail e a senha.','auth/weak-password':'Escolha uma senha com pelo menos 8 caracteres.','auth/network-request-failed':'Confira a conexão e tente novamente.','auth/too-many-requests':'Muitas tentativas. Aguarde um pouco antes de tentar novamente.'})[error.code]|| (error.code?'Não foi possível concluir. Confira os dados e tente novamente.':error.message);}
async function run(task){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await task();}catch(error){status(message(error));}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function complete(){
 const user=auth.currentUser;if(!user)throw Error('Entre com sua conta.');
 await user.reload();
 if(!user.emailVerified){$('verification').hidden=false;$('change-account').hidden=false;status('Confirme seu e-mail para liberar o acesso.');return;}
 status('Concluindo o cadastro da empresa…');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const idToken=await user.getIdToken(true);
  const response=await fetch('/.netlify/functions/company-register',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+idToken},body:JSON.stringify({token,name:$('company-name').value.trim()}),signal:controller.signal});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Não foi possível concluir o cadastro.');
  $('register-form').hidden=true;$('verification').hidden=true;$('open-system').hidden=false;$('change-account').hidden=true;
  status('Empresa cadastrada. Seu teste gratuito está liberado, sem prazo definido e sem cobrança automática.');
 }finally{clearTimeout(timer);}
}
$('register-form').onsubmit=event=>{event.preventDefault();run(async()=>{
 if(!token)throw Error('Abra o link completo de convite enviado pelo administrador.');
 status('Verificando conta…');
 const password=$('password').value;$('password').value='';
 const sign=$('mode').value==='create'?createUserWithEmailAndPassword:signInWithEmailAndPassword;
 const {user}=await sign(auth,$('email').value.trim(),password);
 $('change-account').hidden=false;
 if(!user.emailVerified){$('verification').hidden=false;await sendEmailVerification(user);}
 await complete();
});};
$('confirm').onclick=()=>run(complete);
$('resend').onclick=()=>run(async()=>{await sendEmailVerification(auth.currentUser);status('Confirmação enviada. Confira também o spam.');});
$('change-account').onclick=()=>run(async()=>{await signOut(auth);$('verification').hidden=true;$('change-account').hidden=true;status('Entre com o e-mail do convite.');});
if(!token){$('register-form').hidden=true;status('Este cadastro exige o link completo de convite enviado pelo administrador.');}
