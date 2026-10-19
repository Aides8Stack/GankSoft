<script setup lang="ts">
import { isMemoryModule, MODULES, deckName, deckPath } from "../store";
import { ref, computed, reactive, watch } from "vue";
import { services } from "../services";

import {
  state,
  task,
  working,
  moduleFilter,
  formatDate,
  liveKnowledge,
  resetExplorerView,
} from "../store";
async function exportDeck() {
  await task(
    () => services.deck.export({ id: moduleFilter.value }),
    "卡片集导出完成",
  );
}
async function exportAll() {
  await task(() => services.maintenance.backup(), "完整压缩备份已导出");
}
async function restoreAll() {
  await task(() => services.maintenance.restore(), "备份已恢复");
}
const pkg = ref<any>(null),
  preview = ref<any>(null),
  fileName = ref(""),
  result = ref<any>(null),
  tab = ref("import");
const emit = defineEmits<{ navigate: [page: string, id?: string] }>();
const recentBatches = computed(() =>
  state
    .value!.importBatches.filter((batch) =>
      batch.deck_ids.includes(moduleFilter.value),
    )
    .slice(0, 50),
);
const previewStale = ref(false);
const options = reactive({
  targetDeckId: moduleFilter.value,
  allowItemUpdates: false,
  allowKnowledgeUpdates: false,
  mapping: {} as Record<string, string>,
  excludedKeys: [] as string[],
});
watch(
  options,
  () => {
    previewStale.value = true;
    result.value = null;
  },
  { deep: true },
);
function resetOptions() {
  options.allowKnowledgeUpdates = false;
  options.mapping = {};
  options.excludedKeys = [];
  preview.value = null;
  result.value = null;
}
async function openFile() {
  const data = await task(() => services.exchange.open());
  if (data) {
    resetOptions();
    pkg.value = data.package;
    fileName.value = data.name;
    await check();
  }
}
async function check() {
  if (!pkg.value) return;
  const data = await task(() =>
    services.exchange.preview({ package: pkg.value, options }),
  );
  if (data) {
    preview.value = data;
    previewStale.value = false;
  }
}
async function commit() {
  if (!preview.value) return;
  const data = await task(
    () =>
      services.exchange.commit({
        package: pkg.value,
        options,
        expected: {
          checksum: preview.value.checksum,
          revision: preview.value.revision,
        },
      }),
    "导入操作已完成，查看报告",
  );
  if (data) {
    result.value = data;
    resetExplorerView(moduleFilter.value);
    preview.value = null;
  }
}
function exclude(key: string, value: boolean) {
  options.excludedKeys = value
    ? [...new Set([...options.excludedKeys, key])]
    : options.excludedKeys.filter((k) => k !== key);
}
</script>
<template>
  <section class="panel">
    <div class="section-head">
      <h2>当前卡片集：{{ deckPath(moduleFilter) }}</h2>
      <button class="btn" @click="exportDeck">导出当前卡片集</button>
    </div>
    <p class="muted">
      导入内容绑定当前卡片集；完成后同步刷新卡片、知识点和复盘统计。
    </p>
    <label class="check-option"
      ><input
        type="checkbox"
        v-model="options.allowItemUpdates"
      />允许更新相同来源编号的已有卡片（保留复习历史；核心内容变化后重新验证）</label
    >
    <p v-if="preview" class="info-box">
      本次更新已有卡片 {{ preview.counts.itemsUpdated ?? 0 }} 张。{{
        options.allowItemUpdates
          ? "请核对下面的条目与知识点差异后提交。"
          : "默认保留本地内容。"
      }}
    </p>
  </section>
  <div class="page-heading">
    <div>
      <div class="eyebrow">DATA EXCHANGE</div>
      <h1>批量导入与导出</h1>
      <p>当前卡片集的内容交换；导入先预览，再写入。</p>
    </div>
    <div class="inline-actions">
      <button class="btn" @click="tab = 'import'">标准数据导入</button>
    </div>
  </div>
  <template v-if="tab === 'import'"
    ><section class="panel">
      <div class="section-head">
        <h2>1．选择数据包</h2>
        <button class="btn primary" @click="openFile" :disabled="working">
          选择数据包文件（JSON / ZIP）
        </button>
      </div>
      <p>
        支持 ganksoft.content 2.0 的 .gank.json /
        .gank.zip：知识点数据、错题、记忆卡及图片。Word／PDF／截图先处理为协议数据包，再在这里导入。
      </p>
      <p class="footnote">
        {{ fileName || "还没有选择文件" }} · 相同 packageId
        幂等处理，默认保留已有内容。
      </p>
    </section>
    <section v-if="pkg" class="panel">
      <div class="section-head">
        <h2>2．核对映射与导入策略</h2>
        <button class="btn" @click="check" :disabled="working">重新预览</button>
      </div>
      <label class="check-option"
        ><input
          type="checkbox"
          v-model="options.allowKnowledgeUpdates"
        />允许更新已有知识点内容及父子层级（保持 ID、错题和历史关联）</label
      >
      <p class="footnote">
        默认保留本地知识卡和已有连线说明，只对应关联；按稳定编号对应，其次精确匹配同科目同层名称；不做模糊自动合并。未包含的现有节点和关系保留。修改策略后需要重新预览。
      </p>
      <template v-if="preview"
        ><div class="stats-grid">
          <div class="stat-card">
            <span>新增知识点</span
            ><strong>{{ preview.counts.knowledgeNew }}</strong>
          </div>
          <div class="stat-card">
            <span>更新知识点</span
            ><strong>{{ preview.counts.knowledgeUpdated }}</strong>
          </div>
          <div class="stat-card">
            <span>新增学习条目</span
            ><strong>{{ preview.counts.itemsNew }}</strong>
          </div>
          <div class="stat-card">
            <span>跳过／取消选中</span
            ><strong>{{ preview.counts.itemsSkipped }}</strong>
          </div>
        </div>
        <div v-if="preview.alreadyImported" class="info-box">
          本包已导入，确认后只返回原报告，不覆盖当前学习数据。
        </div>
        <div v-if="preview.errors.length" class="info-box import-errors">
          <strong>需要先解决</strong>
          <p v-for="(e, i) in preview.errors" :key="i">{{ e }}</p>
        </div>
        <details v-if="preview.warnings.length">
          <summary>注意事项（{{ preview.warnings.length }}）</summary>
          <p class="footnote" v-for="(w, i) in preview.warnings" :key="i">
            {{ w }}
          </p>
        </details>
        <p v-if="previewStale" class="info-box">
          策略或选择已变化，请重新预览后再确认导入。
        </p>
        <div class="import-submit-bar">
          <div>
            <strong>核对后提交到当前卡片集</strong
            ><span class="muted"
              >{{ preview.items.length }} 条预览 ·
              {{ deckPath(moduleFilter) }}</span
            >
          </div>
          <button
            class="btn primary"
            :disabled="working || preview.errors.length > 0 || previewStale"
            @click="commit"
          >
            确认导入
          </button>
        </div>
        <h4>知识点映射</h4>
        <table>
          <thead>
            <tr>
              <th>来源编号</th>
              <th>知识点</th>
              <th>处理</th>
              <th>手动指定现有节点</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in preview.nodes" :key="n.ref">
              <td>{{ n.ref }}</td>
              <td>
                {{ n.incomingName
                }}<small v-if="n.incomingName !== n.value.name" class="muted"
                  >（当前：{{ n.value.name }}）</small
                >
                <details v-if="n.differences.length">
                  <summary>查看 {{ n.differences.length }} 处差异</summary>
                  <div v-for="d in n.differences" :key="d.field">
                    <strong>{{
                      (
                        {
                          name: "名称",
                          module: "科目",
                          parent_id: "父节点",
                          aliases: "别名",
                          principle: "原理",
                          conditions: "条件",
                          method: "方法",
                          traps: "易错点",
                        } as any
                      )[d.field]
                    }}</strong>
                    <p class="prewrap">
                      当前：{{ d.before || "空" }}<br />来源：{{
                        d.after || "空"
                      }}
                    </p>
                  </div>
                </details>
              </td>
              <td>
                {{
                  (
                    {
                      create: "新增",
                      reuse: "复用",
                      keep: "保留本地",
                      update: "更新",
                    } as any
                  )[n.action]
                }}
              </td>
              <td>
                <select
                  :value="options.mapping[n.ref] ?? ''"
                  @change="
                    options.mapping[n.ref] = (
                      $event.target as HTMLSelectElement
                    ).value
                  "
                >
                  <option value="">按默认规则匹配</option>
                  <option
                    v-for="k in liveKnowledge.filter(
                      (k) => k.module === n.value.module,
                    )"
                    :key="k.id"
                    :value="k.id"
                  >
                    {{ k.name }} · {{ k.id.slice(0, 8) }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>
        <h4>条目预览</h4>
        <table>
          <thead>
            <tr>
              <th>导入</th>
              <th>条目</th>
              <th>科目</th>
              <th>知识点数</th>
              <th>处理</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in preview.items" :key="item.key">
              <td>
                <input
                  type="checkbox"
                  :checked="!options.excludedKeys.includes(item.key)"
                  @change="
                    exclude(
                      item.key,
                      !($event.target as HTMLInputElement).checked,
                    )
                  "
                />
              </td>
              <td>
                {{ item.title
                }}<small v-if="item.action === 'update'" class="block muted"
                  >原标题：{{ item.beforeTitle }} · 保留原卡片编号与历史</small
                ><small class="muted"> · {{ item.key }}</small>
              </td>
              <td>{{ deckName(item.subject) }}</td>
              <td>
                {{ item.knowledgeIds.length }}
                <details v-if="item.differences?.length">
                  <summary>查看内容差异</summary>
                  <div v-for="d in item.differences" :key="d.field">
                    <strong>{{ d.field }}</strong>
                    <p class="prewrap">
                      当前：{{ d.before }}<br />导入：{{ d.after }}
                    </p>
                  </div>
                </details>
              </td>
              <td>
                {{
                  (
                    {
                      create: "新增",
                      update: "更新已有卡片",
                      skip: "已存在",
                      conflict: "内容冲突",
                      excluded: "取消选中",
                    } as any
                  )[item.action]
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>
      <p v-else class="muted">
        点击“重新预览”，检查当前策略下的新增、复用与冲突。
      </p>
      <div v-if="result" class="info-box">
        <h3>{{ result.duplicate ? "本包已导入，未重复写入" : "导入完成" }}</h3>
        <p>
          新增条目 {{ result.report.itemsNew }}，新增知识点
          {{ result.report.knowledgeNew }}，更新知识点
          {{ result.report.knowledgeUpdated }}。
        </p>
        <p class="muted">
          已清除当前卡片集的列表筛选，导入的卡片可直接查看和学习。
        </p>
        <button class="btn primary" @click="emit('navigate', 'cards')">
          查看卡片
        </button>
      </div>
    </section>
    <section class="panel">
      <div class="section-head"><h2>最近导入</h2></div>
      <div class="list-row" v-for="batch in recentBatches" :key="batch.id">
        <div>
          <strong>{{ batch.package_id }}</strong
          ><small
            >{{ JSON.parse(batch.report).itemsNew }} 条新增 ·
            {{ JSON.parse(batch.report).knowledgeNew }} 个新知识点</small
          >
        </div>
        <span>{{ formatDate(batch.created_at) }}</span>
      </div>
      <p v-if="!recentBatches.length" class="muted">当前卡片集暂无导入记录。</p>
    </section></template
  >
</template>
