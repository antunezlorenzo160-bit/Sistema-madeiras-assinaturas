export const BILLING_ACCESS_DAY=86400000;
export function billingAccessWindow(endsAt,extra={}){
 if(!Number.isSafeInteger(endsAt)||endsAt<=0)throw new Error('Vencimento inválido.');
 return {...extra,enabled:true,endsAt,graceEndsAt:endsAt+5*BILLING_ACCESS_DAY,consultEndsAt:endsAt+35*BILLING_ACCESS_DAY};
}
export function billingAccessState(policy,now=Date.now()){
 if(!policy||policy.enabled!==true)return {phase:'active',read:true,write:true,controlled:false};
 const valid=[policy.endsAt,policy.graceEndsAt,policy.consultEndsAt].every(Number.isSafeInteger)&&policy.endsAt>0&&policy.graceEndsAt===policy.endsAt+5*BILLING_ACCESS_DAY&&policy.consultEndsAt===policy.endsAt+35*BILLING_ACCESS_DAY;
 const phase=!valid?'settings':now<policy.endsAt?'active':now<policy.graceEndsAt?'grace':now<policy.consultEndsAt?'readonly':'settings';
 return {phase,read:phase!=='settings',write:phase==='active'||phase==='grace',controlled:true,endsAt:policy.endsAt,graceEndsAt:policy.graceEndsAt,consultEndsAt:policy.consultEndsAt};
}
