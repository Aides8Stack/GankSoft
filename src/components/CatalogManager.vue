<script setup lang="ts">
import { ref, reactive } from "vue";
import { catalogManagement } from "../composables/catalogManagement";
import { services } from "../services";
import { state, liveFolders, folderPath, task, working } from "../store";
const emit = defineEmits<{ removed: [id: string] }>();
async function exportCurrent() {
  await task(() => catalogManagement.exportDeck(form.id), "卡片集导出完成");
}
async function removeCurrent() {
  if (!confirm("将此卡片集及内容移入回收站？")) return;
  const id = form.id;
  const ok = await task(
    () => catalogManagement.removeDeck(id),
    "卡片集已移入回收站",
  );
  if (ok) {
    visible.value = false;
    emit("removed", id);
  }
}
const visible = ref(false),
  category = ref("deck");
const form = reactive<any>({});
function open(
  kind: string,
  key = "",
  parent: string | null = null,
  deckKind = "memory",
) {
  category.value = kind;
  Object.keys(form).forEach((k) => delete form[k]);
  const item = key
    ? (kind === "folder" ? state.value?.folders : state.value?.decks)?.find(
        (v) => v.id === key,
      )
    : null;
  Object.assign(
    form,
    item
      ? { ...item }
      : {
          name: "",
          kind: deckKind,
          folder_id: parent,
          parent_id: kind === "folder" ? parent : null,
          sort_order: 0,
        },
  );
  if (kind === "deck") form.parent_id = null;
  visible.value = true;
}
async function save() {
  const result = await task(
    () =>
      (category.value === "folder" ? services.folder.save : services.deck.save)(
        form,
      ),
    "已保存",
  );
  if (result) visible.value = false;
}
defineExpose({ open });
</script>
<template>
  <div v-if="visible" class="modal-backdrop" @click.self="visible = false">
    <section
      class="modal"
      role="dialog"
      :aria-label="category === 'deck' ? '卡片集管理' : '文件夹管理'"
    >
      <div class="section-head">
        <h2>
          {{ form.id ? "编辑" : "新建"
          }}{{ category === "folder" ? "文件夹" : "卡片集" }}
        </h2>
        <button class="icon-btn" @click="visible = false">×</button>
      </div>
      <form @submit.prevent="save">
        <label
          >名称<input
            v-model="form.name"
            required
            maxlength="100"
            autofocus /></label
        ><label v-if="category === 'deck'"
          >卡片集类型<select v-model="form.kind" :disabled="!!form.id">
            <option value="memory">记忆积累</option>
            <option value="question">错题复盘</option>
          </select></label
        ><label
          >移动到文件夹<select
            v-if="category === 'deck'"
            v-model="form.folder_id"
          >
            <option :value="null">卡片库根目录</option>
            <option v-for="f in liveFolders" :key="f.id" :value="f.id">
              {{ folderPath(f.id) }}
            </option></select
          ><select v-else v-model="form.parent_id">
            <option :value="null">卡片库根目录</option>
            <option
              v-for="f in liveFolders.filter((f) => f.id !== form.id)"
              :key="f.id"
              :value="f.id"
            >
              {{ folderPath(f.id) }}
            </option>
          </select></label
        ><label
          >位置顺序（数字越小越靠前）<input
            type="number"
            v-model.number="form.sort_order"
        /></label>
        <div v-if="form.id && category === 'deck'" class="inline-actions">
          <button
            type="button"
            class="btn"
            @click="exportCurrent"
            :disabled="working"
          >
            导出卡片集…</button
          ><button
            type="button"
            class="btn danger"
            @click="removeCurrent"
            :disabled="working"
          >
            删除卡片集
          </button>
        </div>
        <div class="modal-footer">
          <button class="btn" type="button" @click="visible = false">
            取消</button
          ><button class="btn primary" :disabled="working">保存</button>
        </div>
      </form>
    </section>
  </div>
</template>
