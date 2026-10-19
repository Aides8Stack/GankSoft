<script setup lang="ts">
import { ref, computed } from "vue";
import { catalogManagement } from "../composables/catalogManagement";
import { liveFolders, liveDecks, folderPath, task, working } from "../store";
const props = defineProps<{ folderId?: string | null }>();
const emit = defineEmits<{ close: []; imported: [id: string] }>();
const token = ref(""),
  name = ref(""),
  folder = ref(props.folderId || null),
  file = ref(""),
  summary = ref<any>(null);
const duplicate = computed(() =>
  liveDecks.value.some(
    (d) => d.name === name.value.trim() && d.folder_id === folder.value,
  ),
);
async function choose() {
  const opened = await task(() => catalogManagement.openCollection());
  if (!opened) return;
  token.value = "";
  summary.value = null;
  if (!opened.name.toLowerCase().endsWith(".zip")) {
    file.value = "请选择卡片集 ZIP 文件";
    return;
  }
  const meta = await task(() =>
    catalogManagement.describeCollection(opened.fileToken),
  );
  if (meta) {
    token.value = opened.fileToken;
    file.value = opened.name;
    name.value = meta.name;
    summary.value = meta;
  }
}
async function commit() {
  if (!token.value || duplicate.value) return;
  const id = await task(
    () =>
      catalogManagement.importCollection(token.value, name.value, folder.value),
    "卡片集已导入",
  );
  if (id) emit("imported", id);
}
</script>
<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section class="modal" role="dialog" aria-label="导入卡片集">
      <div class="section-head">
        <h2>导入卡片集</h2>
        <button class="icon-btn" @click="emit('close')">×</button>
      </div>
      <p>
        选择 GankSoft 卡片集
        ZIP，再确认名称和导入位置。学习历史使用完整备份迁移。
      </p>
      <button class="btn" :disabled="working" @click="choose">
        选择卡片集 ZIP
      </button>
      <p>{{ file }}</p>
      <form v-if="summary" @submit.prevent="commit">
        <p>
          {{ summary.kind === "memory" ? "记忆" : "错题" }} ·
          {{ summary.items }} 张卡片 · {{ summary.knowledge }} 个知识点
        </p>
        <label
          >卡片集名称<input v-model="name" required maxlength="100" /></label
        ><label
          >导入位置<select v-model="folder">
            <option :value="null">卡片库根目录</option>
            <option v-for="f in liveFolders" :key="f.id" :value="f.id">
              {{ folderPath(f.id) }}
            </option>
          </select></label
        >
        <p v-if="duplicate" role="alert">
          该位置已有同名卡片集，请修改名称或导入位置。
        </p>
        <div class="modal-footer">
          <button class="btn" type="button" @click="emit('close')">取消</button
          ><button class="btn primary" :disabled="working || duplicate">
            确认导入
          </button>
        </div>
      </form>
    </section>
  </div>
</template>
