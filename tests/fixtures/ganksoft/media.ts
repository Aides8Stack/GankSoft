import {readFileSync,writeFileSync} from 'node:fs';
import {createFullRestoreSession} from '../../../electron/modules/storage-unified/restore-session.ts';
import {createClient} from '../../../shared/protocol/client.ts';
import {stageImage} from '../../../electron/modules/media/drafts.ts';
import {placementUrl} from '../../../shared/editor/document.ts';
import {Transformer} from '@napi-rs/image';
import {exchangeFixture} from './exchange.ts';
export async function mediaFixture(cache='validation-results/r5-media/fixture.json'){
 const f=await exchangeFixture(cache),owner=await createFullRestoreSession(f.data+'-control606',{workspaceParent:f.root,selectBackup:async()=>null,allowLegacyRestore:false});
 try{const api=createClient(r=>owner.execute(r));await api.call('app.capabilities',{});
 const image=(n:number,deck=f.deck.id,purpose='question')=>stageImage(owner.ctx,deck,purpose,Transformer.fromRgbaPixels(Buffer.from([n,120,60,255]),1,1).pngSync(),'image/png');
 const shared=image(11),orphan=image(22),immutable=image(33),mutable=image(44),other=image(55,f.secondDeck.id);
 const fields=(asset:any)=>{const placement={assetId:asset.id,placementId:crypto.randomUUID(),width:40};return {title:asset.id===shared.id?'共享图片草稿':asset.id===immutable.id?'不可变图片发布':'仅草稿图片',payload:{encoding:'direct-v1' as const,mode:'direct' as const,fields:{body:'图片合成正文\n\n![合成图片]('+placementUrl(placement)+')',source:''}},mediaRefs:[{...placement,fileName:asset.id+'.png',mime:'image/png' as const,role:'question' as const}]};};
 const card=async(asset:any,publish=false)=>{const d=await api.call('draft.create',{deckId:f.deck.id,initialType:'direct'});const scope={deckId:f.deck.id,cardId:d.cardId};const doc=await api.call('draft.save',{...scope,expectedPublishedRevision:0,expectedDraftRevision:d.revision,fields:fields(asset)});if(publish)await api.call('card.publish',{...scope,expectedPublishedRevision:0,expectedDraftRevision:doc.revision,resetStudyCycle:false});return scope;};
 const sharedCard=await card(shared),publishedCard=await card(immutable,true),mutableCard=await card(mutable);
 const n=await api.call('knowledge.node.read',{deckId:f.deck.id,nodeId:f.ids[1]});const p1=placementUrl({assetId:shared.id,placementId:crypto.randomUUID(),width:25}),p2=placementUrl({assetId:shared.id,placementId:crypto.randomUUID(),width:65});await api.call('knowledge.node.save',{deckId:f.deck.id,nodeId:n.nodeId,expectedRevision:n.revision,markdown:`共享节点\n\n![同图甲](${p1})\n\n![同图乙](${p2})`});
 const result={...f,mediaVersion:1,mediaDefinition:{pixels:[11,22,33,44,55],sharedPlacements:3,immutablePublished:1},shared,orphan,immutable,mutable,other,sharedCard,publishedCard,mutableCard};writeFileSync(cache,JSON.stringify(result,null,2)+'\n');return result;
 }finally{owner.close();}
}
