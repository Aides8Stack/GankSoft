// Retained S8.b test entry; never imported by the production application.
import {createFullRestoreSession as createSession,type RestoreSessionPorts} from '../../electron/modules/storage-unified/restore-session.ts';
import {appendMethods,createAppendController} from '../../electron/modules/storage-unified/append-session.ts';
export function createFullRestoreSession(control:string,ports:RestoreSessionPorts & {selectDatabase:()=>Promise<string|null>}){
 return createSession(control,{...ports,isolatedExtension:owner=>({methods:appendMethods,...createAppendController(control,{
  ...owner,selectDatabase:ports.selectDatabase,workspaceParent:ports.workspaceParent,
 })})});
}
