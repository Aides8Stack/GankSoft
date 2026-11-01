// Original synthetic W6 fixtures. No user database or external media.
import {randomUUID} from 'node:crypto';
import {Transformer} from '@napi-rs/image';
import {stageImage} from '../../electron/modules/media/drafts.ts';
import {placementUrl} from '../../shared/editor/document.ts';
import type {Context} from '../../electron/infrastructure/context.ts';
import {createClient} from '../../shared/protocol/client.ts';
export async function seedW6(api:ReturnType<typeof createClient>,ctx:Context){
 const deckId=(await api.call('workspace.catalog.save',{kind:'deck',name:'W6 合成验收',parentId:null})).id;
 const add=async(parentId:string|null,name:string)=>{const t=await api.call('knowledge.tree.read',{deckId});return (await api.call('knowledge.node.create',{deckId,parentId,name,expectedTreeHash:t.treeHash})).nodeId;};
 const root=await add(null,'W6逻辑根'),A=await add(root,'知识点A'),B=await add(root,'知识点B'),C=await add(root,'知识点C'),D=await add(root,'知识点D');
 const publish=async(mode:'question'|'qa'|'direct',material=false)=>{
  const image=stageImage(ctx,deckId,'analysis',Transformer.fromRgbaPixels(Buffer.from([40,130,90,255]),1,1).pngSync(),'image/png');
  const ref={assetId:image.id,placementId:randomUUID(),width:35,fileName:image.id+'.png',mime:'image/png' as const,role:'analysis' as const};
  const media=`![W6合成图](${placementUrl({assetId:ref.assetId,placementId:ref.placementId,width:35})})`;
  const table='| 条件 | 结果 |\n| --- | --- |\n| A | B |';
  const payload=mode==='question'?{encoding:'question-v1' as const,mode,fields:{material:material?'材料位于题干之前。':'',stem:'只有A才B，判断必要条件。 **完整题干**',options:[{optionId:'original-c',position:0,markdown:'**首个选项** '+('很长的选项说明，需在文字列换行。'.repeat(8))},{optionId:'original-a',position:1,markdown:'第二项 $x^2$'},{optionId:'original-d',position:2,markdown:'第三项\n\n'+table},{optionId:'original-b',position:3,markdown:'第四项'}],correctOptionId:'original-a',analysis:'**解析紧随答案** $E=mc^2$\n\n'+table+'\n\n'+media,initialThought:'初始推理保留',source:'W6原创合成'}}:mode==='qa'?{encoding:'qa-v1' as const,mode,fields:{front:'QA问题 **如何判断**',back:'QA答案 $x^2$\n\n'+media,supplement:'补充内容\n\n'+table,source:'W6原创合成'}}:{encoding:'direct-v1' as const,mode,fields:{body:'# 直接记忆正文\n\n**必要条件** $x^2$\n\n'+table+'\n\n'+media,source:'W6原创合成'}};
  const draft=await api.call('draft.create',{deckId,initialType:mode});
  const saved=await api.call('draft.save',{deckId,cardId:draft.cardId,expectedPublishedRevision:0,expectedDraftRevision:draft.revision,fields:{title:'W6-'+mode+(material?'-材料':''),payload,mediaRefs:[ref]}});
  await api.call('card.publish',{deckId,cardId:draft.cardId,expectedPublishedRevision:0,expectedDraftRevision:saved.revision,resetStudyCycle:false});return draft.cardId;
 };
 const question=await publish('question',true),emptyMaterial=await publish('question'),qa=await publish('qa'),direct=await publish('direct');
 await api.call('knowledge.cardLinks.set',{deckId,cardId:question,nodeIds:[A,B,C],expectedRevision:0});
 const events=[];
 for(let i=0;i<23;i++){
  let s=await api.call('learning.session.open',{deckId,cardIds:[question]});
  if(s.stage==='answer')s=await api.call('learning.session.change',{deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'reveal',draft:{...s.draft,selectedOptionId:'original-a',thought:'当时思路'+i}});
  s=await api.call('learning.session.change',{deckId,sessionId:s.sessionId,expectedRevision:s.revision,action:'save',draft:{...s.draft,scoreTenths:85,faults:['知识不足'],gaps:'当次知识漏洞',reflection:'当次反思'+i}});
  const e=await api.call('learning.review.submit',{deckId,sessionId:s.sessionId,expectedRevision:s.revision,eventId:s.entry.eventId,scoreTenths:85,practice:false,faults:['知识不足'],gaps:'当次知识漏洞',reflection:'当次反思'+i});events.push(e.eventId);
 }
 return {deckId,question,emptyMaterial,qa,direct,root,A,B,C,D,events};
}
