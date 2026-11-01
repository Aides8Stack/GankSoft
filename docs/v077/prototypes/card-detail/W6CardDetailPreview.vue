<script setup lang="ts">
import { computed, ref } from 'vue'

type Mode = 'question' | 'qa' | 'direct'
type Node = { id: string; path: string }
const mode = ref<Mode>('question')
const selected = ref(['necessary', 'logic'])
const pending = ref<string[]>([])
const pickerOpen = ref(false)
const saved = ref(true)
const score = ref(6.6)
const question = '某市工作报告指出：“只有持续听取居民意见，公共服务改革才能贴近实际。”下列理解正确的是：'
const options = [
  '持续听取居民意见是改革贴近实际的必要条件',
  '只要持续听取居民意见，改革就一定贴近实际',
  '没有持续听取居民意见，改革也一定能贴近实际',
  '改革未贴近实际，说明一定没有听取居民意见',
]
const nodes: Node[] = [
  { id: 'necessary', path: '判断推理 / 逻辑判断 / 必要条件' },
  { id: 'logic', path: '判断推理 / 逻辑判断 / 充分条件与必要条件' },
  { id: 'negation', path: '判断推理 / 逻辑判断 / 否定命题' },
]
const visibleNodes = computed(() => nodes.map(n => ({ ...n, checked: pending.value.includes(n.id) })))
function openPicker() { pending.value = [...selected.value]; pickerOpen.value = true; saved.value = true }
function toggle(id: string) { pending.value = pending.value.includes(id) ? pending.value.filter(x => x !== id) : [...pending.value, id]; saved.value = false }
function saveLinks() { selected.value = [...pending.value]; pickerOpen.value = false; saved.value = true }
function cancelLinks() { pending.value = [...selected.value]; pickerOpen.value = false; saved.value = true }
</script>

<template>
  <main class="w6-preview">
    <header class="top"><div><small>行测申论·模拟体验（6张） / 卡片详情</small><h1>只有A才B：判断必要条件</h1><span>单选错题 · 原创模拟训练</span></div><button>编辑卡片</button></header>
    <section class="panel content">
      <h2>题目与选项</h2>
      <p class="stem">{{ mode === 'question' ? question : mode === 'qa' ? '看到“只有A才B”，如何在15秒内判断其必要条件关系？' : '只有A才B：B成立必须有A。' }}</p>
      <div v-if="mode === 'question'" class="options">
        <div v-for="(option, index) in options" :key="index" class="option"><b>{{ String.fromCharCode(65 + index) }}</b><span>{{ option }}</span></div>
      </div>
      <div v-else-if="mode === 'qa'" class="answer-pair"><b>问题</b><p>如何判断“只有A才B”？</p><b>答案</b><p>改写为 B→A，A 是 B 的必要条件。</p></div>
      <div v-else class="direct"><p>只有A才B 表示 B→A。</p><p>A 是 B 的必要条件。</p></div>
    </section>
    <section class="panel answer">
      <h2>{{ mode === 'question' ? '答案与解析' : mode === 'qa' ? '补充说明' : '正文要点' }}</h2>
      <div v-if="mode === 'question'" class="correct"><strong>正确答案 A</strong><span>持续听取居民意见是改革贴近实际的必要条件</span></div>
      <p>设 A=持续听取意见、B=改革贴近实际。“只有A才B”表示 B→A：B成立必须先有A。A正确；B把必要误当充分；C与B→A冲突；D是“¬B→¬A”，并非合法逆否。</p>
    </section>
    <section class="panel stats">
      <div class="stats-head"><div><h2>学习统计</h2><small>趋势、最近学习与历史集中展示</small></div><strong>全部历史</strong></div>
      <div class="metrics"><div><small>累计复盘</small><b>1 次</b></div><div><small>最近自评</small><b>{{ score.toFixed(1) }} / 10</b></div><div><small>观察次数</small><b>1 次</b></div><div><small>历史记录</small><b>完整保留</b></div></div>
      <div class="stats-columns"><div><h3>单卡学习趋势</h3><div class="chart"><span>10</span><i style="left:66%;bottom:55%"></i><span>5</span><span>0</span></div></div><div><h3>最近学习</h3><div class="recent"><b>{{ score.toFixed(1) }}</b><div><strong>2026/11/1</strong><small>12秒 · 回答错误</small></div><button>查看</button></div></div></div>
      <details><summary>复盘趋势与完整历史</summary><p>第 1 次 · 自评 {{ score.toFixed(1) }} · 12 秒 · 回答错误</p></details>
    </section>
    <section class="panel knowledge">
      <div class="knowledge-head"><div><h2>已关联知识点</h2><small>当前卡片的真实关联关系（原型示例）</small></div><button @click="openPicker">修改关联</button></div>
      <div v-if="selected.length" class="chips"><span v-for="id in selected" :key="id">{{ nodes.find(n => n.id === id)?.path ?? '知识点不可用' }}</span></div>
      <p v-else class="empty">当前尚未关联知识点</p>
      <small v-if="!saved">有未保存的关联修改</small>
    </section>
    <div v-if="pickerOpen" class="overlay" @click.self="cancelLinks">
      <section class="dialog"><header><div><h2>修改知识点关联</h2><small>选择器只暂存选择，不会立即写入数据库</small></div><button @click="cancelLinks">关闭</button></header>
        <label v-for="node in visibleNodes" :key="node.id" class="node"><input type="checkbox" :checked="node.checked" @change="toggle(node.id)"><span>{{ node.path }}</span></label>
        <footer><button @click="cancelLinks">放弃修改</button><button class="primary" @click="saveLinks">保存关联</button></footer>
      </section>
    </div>
  </main>
</template>

<style scoped>
.w6-preview{font:14px/1.6 Inter,"Microsoft YaHei",sans-serif;color:#263b30;background:#f4f7f5;padding:22px;max-width:1100px;margin:auto}
.w6-preview h1{font-size:21px;margin:5px 0}.w6-preview h2{font-size:15px;margin:0 0 13px}.w6-preview h3{font-size:13px;margin:0 0 9px}.w6-preview small{font-size:11px;color:#7b8b80}
.top,.stats-head,.knowledge-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.top{padding:8px 4px 17px}.top button,.knowledge-head button,.dialog button{border:1px solid #d6e1d9;background:#fff;border-radius:8px;padding:8px 12px;color:#315b45}
.panel{background:white;border:1px solid #e0e8e2;border-radius:12px;padding:18px;margin-bottom:13px}.stem{font-weight:600;margin:0 0 14px}.options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.option{display:grid;grid-template-columns:27px minmax(0,1fr);gap:9px;padding:11px;border:1px solid #e4ebe6;border-radius:8px;min-width:0}.option b{display:grid;place-items:center;background:#edf4ef;border-radius:6px;height:27px}.option span{min-width:0;overflow-wrap:anywhere}.correct{display:grid;gap:4px;padding:12px;background:#eff6f0;border-radius:8px;margin-bottom:12px}.answer p{margin:0;line-height:1.8}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:15px 0}.metrics div{background:#f6f8f6;border-radius:8px;padding:11px;display:grid;gap:4px}.metrics b{font-size:17px}.stats-columns{display:grid;grid-template-columns:1.2fr 1fr;gap:16px}.chart{height:120px;border:1px solid #e6ece8;border-radius:8px;position:relative;display:flex;justify-content:space-between;padding:7px;color:#91a096;font-size:10px}.chart i{position:absolute;width:9px;height:9px;border-radius:50%;background:#2e8463}.recent{display:flex;align-items:center;gap:10px}.recent>b{background:#e8f3ec;color:#28714f;padding:9px;border-radius:8px}.recent div{display:grid;flex:1}.recent small{color:#89968d}.recent button{border:0;background:none;color:#28714f}.knowledge-head{margin-bottom:12px}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips span{background:#eef5f0;border:1px solid #dce9df;padding:6px 9px;border-radius:7px;font-size:12px}.empty{color:#839187}.overlay{position:fixed;inset:0;background:#1e312a66;display:grid;place-items:center;padding:20px}.dialog{background:white;border-radius:13px;padding:18px;width:min(560px,100%);box-shadow:0 20px 70px #172f1d33}.dialog header,.dialog footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.dialog footer{justify-content:flex-end;margin:16px 0 0}.node{display:flex;gap:10px;padding:10px;border-bottom:1px solid #edf1ee}.node input{accent-color:#2c7654}.dialog .primary{background:#286d54;color:white;border-color:#286d54}
@media(max-width:850px){.options,.stats-columns{grid-template-columns:1fr}}@media(max-width:620px){.w6-preview{padding:12px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.top{align-items:flex-start}.top button{white-space:nowrap}}
</style>
