// No acknowledgement is inferred from connection state or a successful read.
export function offlineQueueStateV792(queue,failure){
 const rows=Array.isArray(queue)?queue:[];
 const blocked=failure&&rows.some(op=>op.chave===failure.key&&String(op.revisao||op.criadoEm||0)===failure.revision);
 return {pending:rows.length,error:blocked?failure.code:''};
}
export function loadCompletionMessageV792(adjusted,pending){
 const result=adjusted?'Ajuste rápido realizado e estoque baixado.':'Carregamento conferido e estoque baixado.';
 return result+(pending?'\n\nSalvo neste aparelho. Há envio pendente de confirmação; pode ainda não aparecer no outro aparelho. Não repita a baixa.':'');
}
