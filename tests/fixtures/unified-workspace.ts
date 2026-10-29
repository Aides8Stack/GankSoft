import { join } from 'node:path';
import { schema604Fixture } from './v075-schema604.ts';
import { prepareAndActivateUnified, openUnifiedOwner } from '../../electron/infrastructure/migrations/coordinator.ts';
import { Application } from '../../electron/application.ts';
import { createApplicationProtocol } from '../../electron/protocol/gateway.ts';
import { createClient } from '../../shared/protocol/client.ts';
import type { DraftPayloadDTO } from '../../shared/protocol/card-draft.ts';

export async function unifiedWorkspaceFixture(options:{configureSource?:(source:ReturnType<typeof schema604Fixture>)=>void}={}) {
  const source=schema604Fixture();source.db.exec("UPDATE platform_operations SET state='completed'");
  options.configureSource?.(source);
  let clock=new Date(source.at);
  const control=join(source.root,'unified-control'),target=join(source.root,'unified-active');
  await prepareAndActivateUnified({db:source.db,dataDir:source.dataDir,now:()=>new Date(clock)},control,target);
  let owner=openUnifiedOwner(control),released=false;
  let ctx={db:owner.db,dataDir:owner.dataDir,now:()=>new Date(clock)};
  let host=createApplicationProtocol(new Application(ctx));
  const client=createClient(r=>host.execute(r));await client.call('app.capabilities',{});
  return {source,control,client,get ctx(){return ctx;},get host(){return host;},
    advance(ms:number){clock=new Date(clock.getTime()+ms);},
    release(){if(!released)owner.close();released=true;},
    reopen(){if(!released)owner.close();owner=openUnifiedOwner(control);released=false;ctx={...ctx,db:owner.db};host=createApplicationProtocol(new Application(ctx));},
    async card(mode:'question'|'qa'|'direct',deckId=source.ids.qDeck) {
      const draft=await client.call('draft.create',{deckId,initialType:mode});
      const scope={cardId:draft.cardId,deckId};
      const payload:DraftPayloadDTO=mode==='question'?{encoding:'question-v1',mode,fields:{stem:'合成题干',material:'',analysis:'合成解析',source:'',initialThought:'',
        options:[{optionId:'stable:a',position:0,markdown:'甲'},{optionId:'stable:b',position:1,markdown:'乙'}],correctOptionId:'stable:b'}}:
        mode==='qa'?{encoding:'qa-v1',mode,fields:{front:'合成问题',back:'合成答案',supplement:'',source:''}}:
          {encoding:'direct-v1',mode,fields:{body:'合成直接记忆',source:''}};
      const saved=await client.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:1,fields:{title:'合成'+mode,payload,mediaRefs:[]}});
      const publication=await client.call('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});
      return {...scope,publication,payload};
    },
    close(){if(!released)owner.close();source.close();},
  };
}
