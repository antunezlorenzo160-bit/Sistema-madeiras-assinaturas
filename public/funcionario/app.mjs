import {resolveEmployeeEntry} from './access-flow.mjs?v=2';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js';
import { initializeAuth,browserLocalPersistence,inMemoryPersistence,createUserWithEmailAndPassword,signInWithEmailAndPassword,sendEmailVerification,signOut,sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js';
const app=initializeApp({apiKey:'AIzaSyBQ1_mmY0mP8mdbonbmWLVv6VaDXuzHZkU',authDomain:'estoque-madeiras-cc4d7.firebaseapp.com',projectId:'estoque-madeiras-cc4d7',appId:'1:201851719270:web:8d71d7f6862d7c4709a7a7'},'sm-madeiras-login');
const auth=initializeAuth(app,{persistence:[browserLocalPersistence,inMemoryPersistence]}),$=id=>document.getElementById(id);
// O convite fica no fragmento, fora dos logs de requisição e do cabeçalho Referer.
const token=new URLSearchParams(location.hash.slice(1)).get('convite');
const empresaId=new URLSearchParams(location.hash.slice(1)).get('empresa');
let busy=false;
function status(text){$('status').textContent=text;}
function message(error){return ({'auth/email-already-in-use':'Este e-mail já tem conta. Escolha “Já tenho conta”.','auth/invalid-credential':'Confira o e-mail e a senha.','auth/weak-password':'Escolha uma senha com pelo menos 8 caracteres.','auth/network-request-failed':'Confira a conexão e tente novamente.','auth/too-many-requests':'Muitas tentativas. Aguarde um pouco antes de tentar novamente.'})[error.code]|| (error.code?'Não foi possível concluir. Confira os dados e tente novamente.':error.message);}
async function run(task){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await task();}catch(error){status(message(error));}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}
async function complete(){
 const user=auth.currentUser;if(!user)throw Error('Entre com sua conta.');
 await user.reload();
 if(!user.emailVerified){$('verification').hidden=false;$('change-account').hidden=false;status('Confirme seu e-mail para liberar o acesso.');return;}
 status('Verificando seu acesso…');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 try{
  const result=await resolveEmployeeEntry({user,token,empresaId,signal:controller.signal});
  $('register-form').hidden=true;$('forgot-password').hidden=true;$('verification').hidden=true;$('open-system').hidden=false;$('change-account').hidden=true;
  status(result.existing?'Seu acesso já está ativo. Abra o sistema para continuar.':'Acesso ativado. Abra o sistema com esta conta para usar as áreas liberadas.');
 }finally{clearTimeout(timer);}
}
function showPassword(visible){
 $('password').type=visible?'text':'password';
 $('toggle-password').setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha');
 $('toggle-password').setAttribute('aria-pressed',String(visible));
 $('password-slash').hidden=!visible;
}
$('toggle-password').addEventListener('pointerdown',event=>event.preventDefault());
$('toggle-password').onclick=()=>{
 const field=$('password'),position=field.selectionStart;showPassword(field.type==='password');
 field.focus({preventScroll:true});if(position!==null)try{field.setSelectionRange(position,position);}catch{}
};
$('forgot-password').onclick=()=>run(async()=>{
 const email=$('email').value.trim();
 if(!email||!$('email').validity.valid){status('Informe um e-mail válido no campo E-mail para recuperar sua senha.');$('email').focus();return;}
 if(!navigator.onLine){status('Conecte-se à internet para recuperar sua senha.');return;}
 status('Solicitando recuperação de senha…');
 const success='Se houver uma conta com este e-mail, você receberá um link para criar uma nova senha. Confira também a caixa de spam. Sua senha atual só muda se você concluir a redefinição.';
 try{auth.languageCode='pt-BR';await sendPasswordResetEmail(auth,email);status(success);}
 catch(error){status(error.code==='auth/user-not-found'?success:({'auth/invalid-email':'Confira o e-mail informado.','auth/too-many-requests':'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.','auth/network-request-failed':'Não foi possível conectar. Confira a internet e tente novamente.'}[error.code]||'Não foi possível solicitar a recuperação. Tente novamente mais tarde.'));}
});
$('register-form').onsubmit=event=>{event.preventDefault();run(async()=>{
 if($('mode').value==='create'&&(!token||!empresaId))throw Error('Abra o link completo de convite enviado pelo administrador para criar seu acesso.');
 status('Verificando conta…');
 const password=$('password').value;$('password').value='';showPassword(false);
 const sign=$('mode').value==='create'?createUserWithEmailAndPassword:signInWithEmailAndPassword;
 const {user}=await sign(auth,$('email').value.trim(),password);
 $('change-account').hidden=false;
 if(!user.emailVerified){$('verification').hidden=false;await sendEmailVerification(user);}
 await complete();
});};
$('confirm').onclick=()=>run(complete);
$('resend').onclick=()=>run(async()=>{await sendEmailVerification(auth.currentUser);status('Confirmação enviada. Confira também o spam.');});
$('change-account').onclick=()=>run(async()=>{await signOut(auth);$('verification').hidden=true;$('change-account').hidden=true;status('Entre com o e-mail do convite.');});
function updateEntryMode(){
 const creating=$('mode').value==='create';
 $('submit').textContent=creating?'Continuar cadastro':'Entrar';
 $('password').autocomplete=creating?'new-password':'current-password';
 $('password').minLength=creating?8:6;
}
$('mode').addEventListener('change',updateEntryMode);
if(!token||!empresaId){
 $('mode').value='login';$('mode').querySelector('option[value="create"]').disabled=true;
 document.querySelector('h1').textContent='Entre como funcionário.';
 status('Use sua conta já ativada. Para o primeiro acesso, abra o convite enviado pelo administrador.');
}
updateEntryMode();
