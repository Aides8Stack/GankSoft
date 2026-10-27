import type {Context} from '../../electron/infrastructure/context.ts';
/** Synthetic topology only, no real-user database or downloaded content. */
export function seedLargeKnowledge(ctx:Context,deckId:string){
 const id=(n:number)=>`20000000-0000-4000-8000-${n.toString().padStart(12,'0')}`,at=ctx.now().toISOString();
 const insert=ctx.db.prepare('INSERT INTO knowledge(id,module,name,parent_id,principle,created_at,updated_at) VALUES(?,?,?,?,?,?,?)');let n=1;
 ctx.db.exec('BEGIN');try{
  for(let r=0;r<20;r++){const root=id(n++);insert.run(root,deckId,'分层根'+r,null,'',at,at);
   for(let c=0;c<10;c++){const child=id(n++);insert.run(child,deckId,`分层子${r}-${c}`,root,'',at,at);
    for(let l=0;l<9;l++)insert.run(id(n++),deckId,`分层叶${r}-${c}-${l}`,child,'合成正文哨兵'+(r===0&&c===0&&l===0?'内容'.repeat(10000):''),at,at);
   }
  }
  for(let r=0;r<110;r++)insert.run(id(n++),deckId,'分页根'+r,null,'',at,at);
  ctx.db.exec('COMMIT');
 }catch(e){ctx.db.exec('ROLLBACK');throw e;}
 return {root:id(1),child:id(2),leaf:id(3),added:n-1};
}
