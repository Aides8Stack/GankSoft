import {openDatabase as open} from '../electron/infrastructure/database.ts';
import {MODULES,isMemoryModule} from '../shared/types.ts';
/** Named test decks are explicit fixtures; production never provisions historical module names. */
export function openDatabase(path:string){const db=open(path);for(const name of [...MODULES,'question-default','memory-default']){
 if(!db.prepare('SELECT id FROM decks WHERE id=?').get(name)){
 db.prepare('INSERT INTO decks(id,name,kind) VALUES(?,?,?)').run(name,'测试/'+name,name==='memory-default'||isMemoryModule(name)?'memory':'question');
 db.prepare('INSERT INTO deck_review_policies VALUES(?,?,?)').run(name,15,365);
 }}return db;}

export {transaction,SCHEMA_VERSION} from '../electron/infrastructure/database.ts';
