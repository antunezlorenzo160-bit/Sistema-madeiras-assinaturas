// Synchronous, lossless storage encoding. No record is deleted to make room.
// Code units stay below surrogate ranges so localStorage round-trips them exactly.
const packedStoragePrefixV778='~SM778~';
function storageHashV778(bytes){let hash=2166136261;for(const byte of bytes)hash=Math.imul(hash^byte,16777619);return (hash>>>0).toString(16).padStart(8,'0');}
export function packStorageV778(value){
 const raw=String(value);
 if(raw.length<2048||!/^\s*[\[{]/.test(raw))return raw;
 const bytes=new TextEncoder().encode(raw),codes=[],dictionary=new Map();let next=257,word=bytes[0];
 if(!bytes.length)return raw;
 for(let index=1;index<bytes.length;index++){
  const byte=bytes[index],key=word*256+byte,found=dictionary.get(key);
  if(found!==undefined){word=found;continue;}
  codes.push(word+32);
  if(next<32767)dictionary.set(key,next++);
  else{codes.push(256+32);dictionary.clear();next=257;}
  word=byte;
 }
 codes.push(word+32);
 let payload='';for(let offset=0;offset<codes.length;offset+=8192)payload+=String.fromCharCode(...codes.slice(offset,offset+8192));
 const packed=packedStoragePrefixV778+storageHashV778(bytes)+':'+bytes.length+':'+payload;
 return packed.length<raw.length*.9?packed:raw;
}
export function unpackStorageV778(value){
 if(value===null||!String(value).startsWith(packedStoragePrefixV778))return value;
 const match=String(value).match(/^~SM778~([0-9a-f]{8}):(\d+):/);
 if(!match)throw Error('Registro local compactado inválido. Preserve os dados do navegador.');
 const length=Number(match[2]),payload=value.slice(match[0].length);
 if(!Number.isSafeInteger(length)||length<1||length>64*1024*1024||!payload.length)throw Error('Tamanho do registro local inválido.');
 const output=new Uint8Array(length),parents=new Int32Array(32767),tails=new Uint8Array(32767),stack=new Uint8Array(32768);
 let next=257,previous=-1,position=0;
 function emit(code){
  let depth=0;while(code>=257){if(code>=next||depth>=32767)throw Error('Registro local compactado inconsistente.');stack[depth++]=tails[code];code=parents[code];}
  if(code<0||code>255)throw Error('Código do registro local inválido.');stack[depth++]=code;
  const first=code;while(depth){if(position>=length)throw Error('Registro local excedeu o tamanho salvo.');output[position++]=stack[--depth];}return first;
 }
 for(let offset=0;offset<payload.length;offset++){
  const code=payload.charCodeAt(offset)-32;
  if(code===256){next=257;previous=-1;continue;}
  let first;
  if(previous<0){if(code<0||code>255)throw Error('Início do registro local inválido.');first=emit(code);}
  else{
   if(code<next)first=emit(code);
   else if(code===next){first=emit(previous);if(position>=length)throw Error('Registro local excedeu o tamanho salvo.');output[position++]=first;}
   else throw Error('Dicionário do registro local inválido.');
   if(next<32767){parents[next]=previous;tails[next]=first;next++;}
  }
  previous=code;
 }
 if(position!==length||storageHashV778(output)!==match[1])throw Error('Não foi possível conferir o registro local. Preserve os dados do navegador.');
 return new TextDecoder('utf-8',{fatal:true}).decode(output);
}
export function compactStorageScopeV778(storage,prefix){
 const keys=Array.from({length:storage.length},(_,index)=>storage.key(index)).filter(key=>typeof key==='string'&&key.startsWith(prefix));
 for(const key of keys){
  const raw=storage.getItem(key);if(raw===null||raw.startsWith(packedStoragePrefixV778))continue;
  const packed=packStorageV778(raw);if(packed!==raw)storage.setItem(key,packed);
 }
}
export function writeCompactStorageV778(storage,key,value,prefix){
 const packed=packStorageV778(value);
 try{storage.setItem(key,packed);}
 catch(error){
  if(!['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name))throw error;
  compactStorageScopeV778(storage,prefix);
  storage.setItem(key,packed);
 }
}
