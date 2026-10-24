import { createHmac,randomBytes,timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { ProtocolError } from '../../../shared/protocol/data.ts';
const secret=randomBytes(32),prefix='gank-tree:';
const Token=z.strictObject({kind:z.enum(['merge','restore']),expires:z.number().int(),value:z.record(z.string(),z.json())});
const sign=(body:string)=>createHmac('sha256',secret).update(body).digest('hex');
export function issueTreePreview(kind:'merge'|'restore',value:z.infer<typeof Token>['value'],now:Date) {
 const body=Buffer.from(JSON.stringify({kind,expires:+now+300000,value})).toString('base64url');return prefix+body+'.'+sign(body);
}
export function decodeTreePreview(token:string,kind:'merge'|'restore',now:Date) {
 try {
  const parts=token.slice(prefix.length).split('.');if(!token.startsWith(prefix)||parts.length!==2)throw Error();
  const [body,sig]=parts,a=Buffer.from(sign(body),'hex'),b=Buffer.from(sig,'hex');if(a.length!==b.length||!timingSafeEqual(a,b))throw Error();
  const parsed=Token.parse(JSON.parse(Buffer.from(body,'base64url').toString()));
  if(parsed.kind!==kind||+now>parsed.expires||parsed.expires>+now+300000)throw Error();return parsed.value;
 }catch{throw new ProtocolError('PREVIEW_STALE','预览已变化或过期，请重新预览后确认');}
}
