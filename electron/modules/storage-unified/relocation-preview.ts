import {existsSync,lstatSync,realpathSync,statfsSync} from 'node:fs';
import {dirname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {DomainError} from '../../../shared/domain-error.ts';
import {guardDatabaseAccess} from '../../infrastructure/write-owner.ts';
import {inspectDatabaseBaseline} from '../../infrastructure/migrations/baseline.ts';
import {openUnifiedOwner} from '../../infrastructure/migrations/coordinator.ts';
const inside=(root:string,path:string)=>{const r=relative(root,path);return r===''||!isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);};
const fail=(code:string,message:string):never=>{throw new DomainError(code,message);};
/** Read-only path and complete WAL/media capacity preflight. The returned
 * identity binds a later confirmation to the current owner, not a write permit. */
export function previewRelocation(owner:ReturnType<typeof openUnifiedOwner>,controlDirectory:string,parentDirectory:string){
 guardDatabaseAccess(owner.db);
 if(!isAbsolute(parentDirectory)||realpathSync(parentDirectory)!==resolve(parentDirectory)||!lstatSync(parentDirectory).isDirectory())fail('RELOCATE_TARGET_INVALID','目标父目录必须是非符号链接的现有目录');
 const parent=realpathSync(parentDirectory),control=realpathSync(controlDirectory),source=realpathSync(owner.dataDir),destination=join(parent,'GankSoftData');
 if(inside(control,parent)||inside(parent,control)||inside(source,parent)||inside(parent,source))fail('RELOCATE_TARGET_CONFLICT','目标目录不能与当前数据或控制目录重叠');
 if(existsSync(destination))fail('RELOCATE_TARGET_EXISTS','目标数据目录已存在，请选择其他位置');
 if(lstatSync(dirname(destination)).isSymbolicLink())fail('RELOCATE_TARGET_INVALID','目标父目录不能是符号链接');
 const before=inspectDatabaseBaseline(join(source,'ganksoft.sqlite'),source,606),meta=owner.db.prepare('SELECT epoch,revision FROM protocol_meta WHERE singleton=1').get()!;
 if(String(meta.epoch)!==owner.epoch)fail('DATA_EPOCH_CHANGED','当前所有者代次已变化');
 const size=(name:string)=>existsSync(name)?BigInt(lstatSync(name).size):0n;
 const bytes=size(join(source,'ganksoft.sqlite'))+size(join(source,'ganksoft.sqlite-wal'))+BigInt(before.media.reduce((n,m)=>n+m.size,0));
 const space=statfsSync(parent,{bigint:true}),required=bytes*3n+16n*1024n*1024n;
 if(space.bavail*space.bsize<required)fail('RELOCATE_SPACE_REQUIRED','目标空间不足以保存完整数据库、媒体和校验候选');
 if(inspectDatabaseBaseline(join(source,'ganksoft.sqlite'),source,606).digest!==before.digest)fail('RELOCATE_SOURCE_CHANGED','预检期间活动库已变化');
 return {previewId:randomUUID(),source,destination,sourceDigest:before.digest,expectedEpoch:owner.epoch,expectedRevision:Number(meta.revision),mediaFiles:before.media.length,mediaBytes:before.media.reduce((n,m)=>n+m.size,0),estimatedBytes:bytes.toString(),availableBytes:(space.bavail*space.bsize).toString(),requiredBytes:required.toString()};
}
