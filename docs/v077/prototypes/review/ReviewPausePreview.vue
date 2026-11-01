<script lang="ts">
import {computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch} from 'vue';
import {createReviewPauseController, bindReviewAutoPause, type PauseSession, type PauseReason} from '../../../../src/review/review-pause-controller';

interface DemoCard { id:string;type:'question'|'qa'|'direct';title:string;body:string;options?:string[];answer:string;explanation:string; }
const cards:DemoCard[]=[
 {id:'demo-question',type:'question',title:'必要条件推理 · 逻辑判断',body:'只有坚持科学决策，才能提高公共治理的效能。根据这句话，以下哪项一定成立？',options:['A. 坚持科学决策，一定能提高治理效能','B. 没有科学决策，就不能提高治理效能','C. 治理效能提高，说明没有科学决策','D. 没有提高治理效能，就一定没有科学决策'],answer:'B',explanation:'“只有 A，才 B”表示 B → A。科学决策是提高效能的必要条件，否定 A 就能否定 B。'},
 {id:'demo-qa',type:'qa',title:'申论写作 · 解释因果机制',body:'申论中，怎样把“A 是 B 的关键”写成有说服力的因果链？',answer:'先指出 A 解决什么问题，再交代 A 通过什么机制产生变化，最后落到 B 的具体提升。',explanation:'结构可写为：现实问题 → 关键条件 → 作用机制 → 最终结果。'},
 {id:'demo-direct',type:'direct',title:'资料分析 · 基期量公式',body:'已知现期量 A，增长率 r，基期量如何求？',answer:'基期量 = 现期量 ÷ (1 + 增长率)。',explanation:'增长率为负时分母小于 1；先确认 r 的正负号。'},
];
const pad=(n:number)=>String(n).padStart(2,'0');
const formatTime=(seconds:number)=>`${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`;

export default defineComponent({
 name:'ReviewPausePreview',
 setup(){
  const cardIndex=ref(0),page=ref<'review'|'cards'>('review'),now=ref(Date.now());
  const score=ref(8.0),chosen=ref(''),thought=ref(''),revealed=ref(false),saved=ref(false);
  const logs=ref<{title:string;score:number;seconds:number}[]>([]),apiError=ref('');
  let persisted:PauseSession={deckId:'preview-deck',sessionId:'preview-session',entry:{cardId:cards[0].id},revision:1,paused:false,completed:false,stage:'answer',elapsedSeconds:0,totalSeconds:0};
  let runningSince=Date.now();
  const duplicate=()=>({...persisted,entry:{...persisted.entry}});
  const transport={
   async change(action:'pause'|'resume'){
    if(action==='pause'&&!persisted.paused){const delta=Math.max(0,Math.floor((Date.now()-runningSince)/1000));persisted={...persisted,paused:true,revision:persisted.revision+1,elapsedSeconds:persisted.elapsedSeconds+delta,totalSeconds:persisted.totalSeconds+delta};}
    if(action==='resume'&&persisted.paused){persisted={...persisted,paused:false,revision:persisted.revision+1};runningSince=Date.now();}
    return duplicate();
   },
   async get(){return duplicate();}
  };
  const controller=createReviewPauseController({initial:duplicate(),transport});
  const state=shallowRef(controller.getState());
  const stop=controller.subscribe(next=>{state.value=next;apiError.value=next.error;});
  const card=computed(()=>cards[cardIndex.value]);
  const cardType=computed(()=>({question:'单选错题',qa:'问答记忆',direct:'直接记忆'})[card.value.type]);
  const activeTime=computed(()=>formatTime(controller.getState().cardSeconds));
  const totalTime=computed(()=>formatTime(controller.getState().totalSeconds));
  const canAnswer=computed(()=>page.value==='review'&&!state.value.blocked&&!state.value.busy&&!saved.value);
  const continuation=ref<HTMLButtonElement|null>(null);
  watch(()=>state.value.blocked,async paused=>{if(paused&&page.value==='review'){await nextTick();continuation.value?.focus();}});
  let timer:ReturnType<typeof setInterval>|undefined,unbind:()=>void=()=>{};
  onMounted(()=>{timer=setInterval(()=>now.value=Date.now(),200);unbind=bindReviewAutoPause({pause:(reason:PauseReason)=>page.value==='review'?controller.pause(reason):Promise.resolve()},window,document);});
  onBeforeUnmount(()=>{clearInterval(timer);unbind();stop();controller.dispose();});
  // Render timer is a projection only. The existing study session API remains authoritative.
  const renderedCardTime=computed(()=>{void now.value;return activeTime.value;});
  const renderedTotalTime=computed(()=>{void now.value;return totalTime.value;});
  const pause=()=>controller.pause('manual');
  const continueReview=()=>controller.resume();
  const simulateBlur=()=>controller.pause('window-blur');
  const leave=async()=>{await controller.leave();page.value='cards';};
  const returnReview=async()=>{page.value='review';if(!state.value.blocked)await controller.pause('navigation');await nextTick();continuation.value?.focus();};
  function submit(){if(!canAnswer.value||!revealed.value)return;
   const seconds=controller.getState().cardSeconds,total=controller.getState().totalSeconds;
   logs.value=[...logs.value,{title:card.value.title,score:score.value,seconds}];saved.value=true;
   persisted={...persisted,paused:true,revision:persisted.revision+1,stage:'result',completed:cardIndex.value===cards.length-1,elapsedSeconds:seconds,totalSeconds:total};
   controller.sync(duplicate());
  }
  function next(){if(!saved.value||cardIndex.value>=cards.length-1)return;
   cardIndex.value++;score.value=8.0;chosen.value='';thought.value='';revealed.value=false;saved.value=false;
   persisted={...persisted,entry:{cardId:cards[cardIndex.value].id},revision:persisted.revision+1,stage:'answer',paused:false,completed:false,elapsedSeconds:0};
   runningSince=Date.now();controller.sync(duplicate());
  }
  return {cards,cardIndex,page,now,card,cardType,score,chosen,thought,revealed,saved,logs,state,apiError,
    renderedCardTime,renderedTotalTime,canAnswer,continuation,pause,continueReview,simulateBlur,leave,returnReview,submit,next,formatTime};
 }
});
</script>
<template>
<section class="rp-wrap" aria-label="复盘暂停与单卡计时 Vue API 预览">
  <aside class="rp-rail" aria-label="窄图标导航"><div class="rp-logo">G</div>
    <button type="button" class="rp-rail-item" :class="{active:page==='cards'}" title="卡片集列表" aria-label="卡片集列表" @click="leave">▤</button>
    <button type="button" class="rp-rail-item" :class="{active:page==='review'}" title="学习与复盘" aria-label="学习与复盘" @click="page==='cards'&&returnReview()">◷</button>
    <div class="rp-rail-item" aria-hidden="true">◈</div><div class="rp-rail-bottom">⚙</div></aside>
  <aside class="rp-sidebar"><h3>学习工作台</h3><div class="rp-deck-label">卡片集</div><div class="rp-deck-name">📚 行测 · 申论测试集</div><div class="rp-side-divider"></div><h4>本次复盘</h4>
    <div v-for="(item,i) in cards" :key="item.id" class="rp-side-card" :class="{active:i===cardIndex}"><span class="rp-side-number">{{i+1}}</span><span>{{item.title}}</span><span v-if="logs.some(l=>l.title===item.title)" class="rp-check">✓</span></div>
    <div class="rp-side-tip"><strong>计时说明</strong><p>只累计正在做题的时间；切换页面或窗口失焦会自动暂停。</p></div>
  </aside>
  <main class="rp-main">
    <div class="rp-topbar"><nav class="rp-breadcrumbs" aria-label="顶部导航">
       <button type="button" class="rp-top-link" @click="leave">学习总览</button><span class="rp-chevron">›</span>
       <button type="button" class="rp-top-link" @click="leave">行测 · 申论测试集</button><span class="rp-chevron">›</span>
       <button type="button" class="rp-top-link" aria-current="page" @click="page==='cards'&&returnReview()">{{page==='review'?'学习与复盘':'卡片集概览'}}</button>
      </nav><span class="rp-proto-tag">Vue 交互预览 · 不写数据库</span></div>
    <div v-if="page==='review'" class="rp-review-area" data-testid="review-content-area">
      <div class="rp-review-inner" :inert="state.blocked" :aria-hidden="state.blocked">
      <header class="rp-heading"><div><div class="rp-eyebrow">SESSION / 03</div><h2>学习与复盘</h2><p>当前第 {{cardIndex+1}} / {{cards.length}} 张 · 每张卡片独立计时</p></div>
        <div class="rp-head-actions"><button class="rp-ghost" @click="leave">离开复盘</button><button class="rp-warning" :disabled="saved||state.busy" @click="pause">⏸ 暂停复盘</button></div>
      </header>
      <div class="rp-stats"><div class="rp-stat"><small>本题有效用时</small><strong class="rp-clock">{{renderedCardTime}}</strong><span>{{state.blocked?'计时已冻结':'正在计时'}}</span></div>
       <div class="rp-stat"><small>本轮累计用时</small><strong class="rp-clock">{{renderedTotalTime}}</strong><span>不包含暂停时间</span></div>
       <div class="rp-stat"><small>学习进度</small><strong>{{cardIndex+1}} <em>/ {{cards.length}}</em></strong><span>{{saved?'本题已提交（模拟）':state.blocked?'本题已暂停':'本题进行中'}}</span></div></div>
      <section class="rp-card"><div class="rp-card-head"><span class="rp-type">{{cardType}}</span><span class="rp-card-status" :class="{paused:state.blocked}">{{saved?'已完成':state.blocked?'已暂停':'进行中'}}</span></div>
      <h3>{{card.title}}</h3><p class="rp-question">{{card.body}}</p>
      <fieldset v-if="card.type==='question'" :disabled="!canAnswer" class="rp-options"><legend class="sr-only">单选题选项</legend>
       <label v-for="(option,i) in card.options" :key="option" class="rp-option" :class="{selected:chosen===String.fromCharCode(65+i)}"><input v-model="chosen" type="radio" :value="String.fromCharCode(65+i)" name="rp-choice"/>{{option}}</label></fieldset>
      <label v-else-if="card.type==='qa'" class="rp-text-label">独立思路<textarea v-model="thought" :disabled="!canAnswer" placeholder="先回忆自己的作答思路……" rows="3"/></label>
      <div v-if="revealed||card.type==='direct'" class="rp-answer"><strong>参考答案与解析</strong><p>{{card.answer}}</p><p class="rp-explain">{{card.explanation}}</p></div>
      <div class="rp-card-foot" v-if="!saved">
       <button v-if="!revealed" class="rp-secondary" :disabled="!canAnswer" @click="revealed=true">{{card.type==='direct'?'完成阅读':'揭示答案'}}</button>
       <div v-else class="rp-rating"><label for="rp-score">本次自评分 <b>{{score.toFixed(1)}} / 10</b></label><input id="rp-score" v-model.number="score" :disabled="!canAnswer" type="range" min="0" max="10" step="0.1"/><button class="rp-primary" :disabled="!canAnswer" @click="submit">保存本题结果（模拟）</button></div>
      </div>
      <div v-else class="rp-card-foot rp-finished"><div>✓ 已模拟完成本题，本题有效用时 <strong>{{formatTime(logs[logs.length-1].seconds)}}</strong></div><button v-if="cardIndex<cards.length-1" class="rp-primary" @click="next">进入下一张 →</button><span v-else>本次模拟复盘完成</span></div>
      </section>
      <div class="rp-lab"><div><b>交互测试</b><span>可以模拟真实离开行为</span></div><div class="rp-lab-actions"><button @click="simulateBlur" :disabled="saved">模拟窗口失焦</button><button @click="leave">模拟切换页面</button></div></div>
      </div>
      <!-- Only the review content area is dimmed; app header and navigation remain clickable. -->
      <div v-if="state.blocked" class="rp-overlay" role="presentation" @click.self.prevent>
        <div class="rp-modal" role="dialog" aria-modal="false" aria-labelledby="rp-pause-title" aria-describedby="rp-pause-desc" @keydown.esc.prevent>
          <div class="rp-pause-symbol">Ⅱ</div><h3 id="rp-pause-title">复盘已暂停</h3><p id="rp-pause-desc">本题计时已停止，继续后才能作答。</p>
          <div class="rp-pause-time"><span>本题有效用时</span><strong>{{renderedCardTime}}</strong></div>
          <p v-if="apiError" role="alert" class="rp-error">{{apiError}}</p>
          <button ref="continuation" class="rp-primary rp-continue" :disabled="!state.canContinue" @click="continueReview">{{state.busy?'正在核对会话…':'▶ 继续复盘'}}</button>
          <small>导航栏保持可用；点击遮罩不会继续计时</small>
        </div>
      </div>
    </div>
    <template v-else><div class="rp-away"><div class="rp-away-icon">▤</div><h2>已离开复盘页面</h2><p>当前卡片会话已暂停。本页面不显示暂停遮罩，返回原复盘页时才出现。</p><button class="rp-primary" @click="returnReview">返回原复盘会话</button></div></template>
    <div class="rp-footnote">API：pause / resume / leave / sync / getState · 复用现有会话计时字段。演示里的保存不会生成真实学习历史或改变 FSRS。</div>
  </main>
</section>
</template>
<style scoped>
.rp-wrap{--ink:#254438;--soft:#71877b;--green:#286f4d;--line:#deebe2;--mint:#eaf5ee;position:relative;display:grid;grid-template-columns:54px 236px minmax(0,1fr);min-height:715px;background:#f6f9f7;color:var(--ink);border:1px solid #dce6de;border-radius:13px;overflow:hidden;font:13px/1.55 'Segoe UI','Microsoft YaHei',sans-serif}
.rp-wrap *{box-sizing:border-box}.rp-wrap button,.rp-wrap textarea,.rp-wrap input{font:inherit}.rp-wrap button{cursor:pointer}.rp-wrap button:disabled{cursor:not-allowed;opacity:.55}
.rp-rail{display:flex;align-items:center;flex-direction:column;gap:17px;padding:16px 0;background:#264b3c;color:#e2f0e9}.rp-logo{background:#f3f8f4;color:#264b3c;font-size:20px;font-weight:900;width:32px;height:32px;border-radius:10px;text-align:center;line-height:32px;margin-bottom:15px}.rp-rail-item{width:34px;height:34px;display:grid;place-items:center;border-radius:9px;font-size:19px;opacity:.65;background:transparent;border:0;color:inherit;padding:0}.rp-rail-item.active{background:#47745c;opacity:1}.rp-rail button.rp-rail-item:hover{background:#47745c;opacity:1}.rp-rail-bottom{margin-top:auto;font-size:20px;opacity:.75}
.rp-sidebar{background:#fff;border-right:1px solid var(--line);padding:20px 12px}.rp-sidebar h3{font-size:14px;margin:2px 4px 24px}.rp-deck-label,.rp-sidebar h4{font-size:11px;color:#83998b;font-weight:500;margin:0 8px 8px}.rp-deck-name{border-radius:8px;background:#eaf4ed;padding:10px 8px;color:#295d44;font-weight:650}.rp-side-divider{height:1px;background:var(--line);margin:18px 5px}.rp-side-card{display:flex;align-items:center;gap:9px;padding:10px 8px;color:#627b6c;border-radius:8px;font-size:11px}.rp-side-card.active{background:#e4f2e8;color:#286c49;font-weight:650}.rp-side-number{flex:0 0 21px;height:21px;border-radius:6px;background:#eef1ef;text-align:center;line-height:21px}.rp-side-card.active .rp-side-number{background:#c8e5d1}.rp-check{color:var(--green);margin-left:auto}.rp-side-tip{background:#f5f8f5;border-radius:9px;padding:12px;margin-top:50px;font-size:11px}.rp-side-tip strong{color:#4c6e58}.rp-side-tip p{color:#829487;margin:5px 0 0}
.rp-main{min-width:0;padding:0 25px 20px}.rp-topbar{display:flex;align-items:center;justify-content:space-between;gap:8px;height:51px;border-bottom:1px solid var(--line);font-size:11px;color:#829688}.rp-breadcrumbs{display:flex;align-items:center;min-width:0;gap:3px}.rp-top-link{padding:5px 4px;border:0;background:transparent;color:#607e69;white-space:nowrap;font-size:11px}.rp-top-link:hover{text-decoration:underline;color:#286f4d}.rp-review-area{position:relative;isolation:isolate;min-height:600px}.rp-review-inner{position:relative}.rp-chevron{padding:0 5px;color:#b3c3b8}.rp-proto-tag{background:#e7f1e9;color:#528267;padding:4px 9px;border-radius:999px;white-space:nowrap}.rp-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 0 16px}.rp-eyebrow{color:#9eb2a2;letter-spacing:2px;font-size:10px}.rp-heading h2{font-size:21px;margin:1px 0 3px;font-weight:700}.rp-heading p{color:#829587;margin:0;font-size:11px}.rp-head-actions{display:flex;gap:8px}.rp-ghost,.rp-warning,.rp-secondary{border:1px solid #dce6df;background:#fff;border-radius:8px;padding:8px 13px;color:#526d5c}.rp-warning{color:#8b6937;background:#fff9f0;border-color:#f1dfc0}.rp-primary{border:0;border-radius:8px;background:#28724b;color:#fff;padding:10px 18px;font-weight:650;box-shadow:0 2px 7px #24593a18}.rp-primary:hover:not(:disabled){background:#205f3e}
.rp-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}.rp-stat{min-width:0;border:1px solid var(--line);border-radius:10px;padding:12px 15px;background:#fff}.rp-stat small{display:block;color:#8ba293;font-size:11px}.rp-stat strong{font-weight:700;display:block;font-size:24px;margin:2px 0 0}.rp-stat strong em{font-weight:400;color:#a0b0a4;font-style:normal;font-size:14px}.rp-stat .rp-clock{font-variant-numeric:tabular-nums;letter-spacing:1px}.rp-stat span{font-size:10px;color:#96a89b}
.rp-card{background:#fff;border:1px solid #dfe8e0;border-radius:13px;padding:22px;min-height:295px;box-shadow:0 8px 26px #315d3f0a}.rp-card-head{display:flex;align-items:center;justify-content:space-between}.rp-type{font-size:11px;background:#e4f2e8;color:#3d7854;padding:5px 10px;border-radius:5px}.rp-card-status{font-size:11px;color:#46835f}.rp-card-status.paused{color:#a77936}.rp-card h3{margin:13px 0 10px;font-size:17px;line-height:1.35}.rp-question{font-size:13px;color:#4e6757;line-height:1.75;margin:0 0 16px}.rp-options{border:0;padding:0;margin:0;display:grid;grid-template-columns:1fr 1fr;gap:9px}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}.rp-option{display:flex;align-items:flex-start;gap:7px;border:1px solid #e4eae5;border-radius:8px;padding:10px;font-size:11px;color:#5c7164}.rp-option.selected{border-color:#4b9a6a;background:#f0f9f3}.rp-option input{accent-color:#387e52;margin:2px 0}.rp-answer{background:#f2f8f2;border:1px solid #dcebdd;border-radius:8px;padding:12px;margin:13px 0;color:#41644b}.rp-answer strong{font-size:12px}.rp-answer p{margin:5px 0}.rp-explain{font-size:11px;color:#6b8871}.rp-text-label{font-size:11px;color:#58715f}.rp-text-label textarea{width:100%;display:block;margin-top:8px;padding:10px;border:1px solid #dbe7dc;border-radius:7px;resize:vertical;min-height:70px}.rp-card-foot{display:flex;align-items:center;justify-content:flex-end;margin-top:15px;border-top:1px solid #edf2ed;padding-top:14px}.rp-rating{display:flex;align-items:center;gap:16px;flex:1}.rp-rating label{white-space:nowrap;color:#6b826e;font-size:12px}.rp-rating label b{color:#2a7a4f}.rp-rating input{accent-color:#2e8b58;flex:1;min-width:40px}.rp-finished{justify-content:space-between;font-size:12px;color:#467654}
.rp-lab{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:17px;border:1px dashed #b9d4c2;border-radius:9px;padding:11px 14px;background:#eff6f0}.rp-lab>div:first-child{display:flex;flex-direction:column}.rp-lab b{font-size:12px}.rp-lab span{color:#889b8c;font-size:11px}.rp-lab-actions{display:flex;gap:7px}.rp-lab-actions button{border:1px solid #cee0d2;border-radius:7px;background:#fff;color:#47815a;padding:7px 11px;font-size:11px}.rp-footnote{font-size:10px;color:#96a99c;line-height:1.55;margin-top:17px}.rp-away{max-width:500px;margin:130px auto;text-align:center}.rp-away-icon{font-size:35px;color:#5f9c74}.rp-away h2{font-size:21px}.rp-away p{color:#829687}.rp-away button{margin-top:15px}
.rp-overlay{position:absolute;z-index:20;inset:0;background:#10241cb8;display:flex;align-items:center;justify-content:center;padding:20px;border-radius:10px}.rp-modal{width:min(100%,380px);border-radius:16px;background:#fff;padding:28px 28px 24px;text-align:center;box-shadow:0 28px 75px #07160f4d;outline:none}.rp-pause-symbol{width:50px;height:50px;border-radius:15px;margin:0 auto 15px;background:#f4eacf;color:#a7802e;display:grid;place-items:center;font-size:26px;font-weight:700}.rp-modal h3{font-size:21px;margin:0;color:#2a4c3b}.rp-modal>p{color:#879c8d;font-size:12px;margin:8px 0 16px}.rp-pause-time{background:#f3f8f4;border:1px solid #e4efe7;border-radius:9px;margin-bottom:19px;padding:12px;display:flex;align-items:center;justify-content:space-between}.rp-pause-time span{color:#708e7c;font-size:11px}.rp-pause-time strong{font:700 21px/1.4 'Segoe UI',sans-serif;color:#286c47;letter-spacing:1px;font-variant-numeric:tabular-nums}.rp-continue{width:100%;font-size:13px;padding:12px}.rp-modal small{display:block;margin-top:12px;color:#9aab9d;font-size:10px}.rp-modal .rp-error{color:#b24c3b;font-size:11px}
@media(max-width:1000px){.rp-wrap{grid-template-columns:49px 176px minmax(0,1fr)}.rp-main{padding:0 15px 15px}.rp-sidebar{padding:16px 8px}.rp-card{padding:16px}.rp-options{grid-template-columns:1fr}.rp-topbar{font-size:10px}.rp-proto-tag{display:none}.rp-rating{flex-wrap:wrap}}
@media(max-width:680px){.rp-wrap{grid-template-columns:45px minmax(0,1fr)}.rp-sidebar{display:none}.rp-heading{align-items:flex-start;flex-wrap:wrap}.rp-stats{gap:6px}.rp-stat{padding:9px}.rp-stat strong{font-size:18px}.rp-lab{flex-wrap:wrap}.rp-card h3{font-size:15px}}
</style>
