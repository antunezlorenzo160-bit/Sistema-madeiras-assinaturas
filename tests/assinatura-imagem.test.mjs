import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { validateSignatureImage } from '../Netlify/Funtions/assinatura-imagem.mjs';

function chunk(type, data) {
  const body=Buffer.concat([Buffer.from(type),data]); let crc=0xffffffff;
  for(const byte of body){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  const size=Buffer.alloc(4), checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([size,body,checksum]);
}
function png({blank=false,width=600,height=200,filter=0,short=false}={}) {
  const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
  const pixels=Buffer.alloc((width*4+1)*height,255);
  for(let y=0;y<height;y++){
    const start=y*(width*4+1);pixels[start]=filter;
    if(!blank&&y>50&&y<80)for(let x=100;x<400;x++)pixels.fill(17,start+1+x*4,start+1+x*4+3);
  }
  const raw=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',deflateSync(short?pixels.subarray(0,10):pixels)),chunk('IEND',Buffer.alloc(0))]);
  return 'data:image/png;base64,'+raw.toString('base64');
}
test('accepts a drawn PNG',()=>assert.doesNotThrow(()=>validateSignatureImage(png())));
test('rejects blank PNG',()=>assert.throws(()=>validateSignatureImage(png({blank:true})),/Desenhe/));
test('rejects missing, SVG and oversized input',()=>{for(const value of [undefined,'data:image/svg+xml;base64,AAAA','data:image/png;base64,'+'A'.repeat(250001)])assert.throws(()=>validateSignatureImage(value));});
test('rejects invalid dimensions, filters and decompressed lengths',()=>{for(const opts of [{width:99},{height:601},{filter:5},{short:true}])assert.throws(()=>validateSignatureImage(png(opts)));});
test('rejects corrupt and truncated image',()=>{const value=png();assert.throws(()=>validateSignatureImage(value.slice(0,-20)));assert.throws(()=>validateSignatureImage(value.replace('IHDR','FAIL').slice(0,-10)+'AAAAAAAAAA'));});
