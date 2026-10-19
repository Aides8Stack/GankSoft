<script setup lang="ts">
import {
  moduleFilter,
  QUESTION_MODULES,
  deckName,
  deckPath,
  inDeckScope,
} from "../store";
import { services } from "../services";
import { reactive, computed, watch } from "vue";
import ImageAttachments, { type EditableImage } from "./ImageAttachments.vue";
import { ref } from "vue";
import KnowledgePicker from "./KnowledgePicker.vue";
import { type Question } from "../../shared/types";
import { state, task, working, assetUrl } from "../store";
const props = defineProps<{ question?: Question }>();
const emit = defineEmits<{ close: []; saved: [id: string] }>();
const form = reactive({
  id: props.question?.id,
  title: props.question?.title ?? "",
  module:
    props.question?.module ??
    (QUESTION_MODULES.value.includes(moduleFilter.value)
      ? moduleFilter.value
      : (QUESTION_MODULES.value[0] ?? "")),
  stem: props.question?.stem ?? "",
  options: props.question?.options ?? "",
  answer: props.question?.answer ?? "",
  analysis: props.question?.analysis ?? "",
  source: props.question?.source ?? "",
  initial_thought: props.question?.initial_thought ?? "",
  material: props.question?.material ?? "",
  material_id: props.question?.material_id ?? null,
  status: "ready",
  knowledge_ids: [...(props.question?.knowledge_ids ?? [])],
  version: props.question?.version,
});
watch(
  () => form.module,
  () => {
    form.knowledge_ids = [];
  },
);
const materials = computed(
  () =>
    state.value?.questions.filter(
      (q) =>
        q.material &&
        !q.deleted_at &&
        q.id !== form.id &&
        q.module === form.module,
    ) ?? [],
);
const images = ref<EditableImage[]>(
  (props.question?.assets ?? []).map((a) => ({ id: a.id, role: a.role, layout: a.layout })),
);
async function save() {
  const result = await task(
    () =>
      services.question.save({
        ...form,
        images: images.value.map(({ id, role, layout }) => ({ id, role, layout })),
      }),
    "错题已保存",
  );
  if (result) emit("saved", result);
}
</script>
<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <section class="modal large">
      <div class="section-head">
        <div>
          <h2>{{ form.id ? "编辑错题" : "录入错题" }}</h2>
          <p class="muted">
            可直接添加题目和解析图片，保存时统一提交；取消不修改原卡片。
          </p>
        </div>
        <button class="icon-btn" @click="emit('close')">×</button>
      </div>
      <form @submit.prevent="save">
        <div class="form-grid">
          <label
            >所属卡片集<select v-model="form.module">
              <option v-for="m in QUESTION_MODULES" :key="m" :value="m">
                {{ deckPath(m) }}
              </option>
            </select></label
          ><label
            >标题（可自动生成）<input
              v-model="form.title"
              placeholder="如：主旨判断 · 转折后的重点"
          /></label>
        </div>
        <label
          >题目内容／图片题说明<textarea
            v-model="form.stem"
            rows="4"
            placeholder="输入题干；图片题可填写简短说明，并在下方直接添加截图。"
            required
          /></label
        ><ImageAttachments
          v-model="images"
          :deck-id="form.module"
          purpose="question"
        /><label
          >选项<textarea
            v-model="form.options"
            rows="3"
            placeholder="A. …&#10;B. …&#10;C. …&#10;D. …"
          />
        </label>
        <div class="form-grid">
          <label
            >正确答案<select v-model="form.answer" required>
              <option value="">请选择正确答案</option>
              <option v-for="a in ['A', 'B', 'C', 'D']" :key="a">
                {{ a }}
              </option>
            </select></label
          >
        </div>
        <div class="field-label">关联知识点（可多选）</div>
        <KnowledgePicker v-model="form.knowledge_ids" :deck-id="form.module" />
        <p
          v-if="props.question && form.module !== props.question.module"
          class="field-hint"
        >
          保存后解除原卡片集的知识点关联；卡片和复盘历史保留。取消则不移动。
        </p>
        <label
          >解析<textarea
            v-model="form.analysis"
            rows="4"
            placeholder="保留原解析，也可以补充自己的理解。"
          /></label
        ><ImageAttachments
          v-model="images"
          :deck-id="form.module"
          purpose="analysis"
        /><label
          >我当时怎么想、为什么错<textarea
            v-model="form.initial_thought"
            rows="2"
            placeholder="例如：把例子中的细节当成了全文主旨。"
          /></label
        ><label
          >公共材料（可选）<textarea
            v-model="form.material"
            @input="form.material_id = null"
            rows="3"
            placeholder="本组题目的共用材料。复制其他题的材料可在下方选择。"
          /></label
        ><label v-if="materials.length"
          >引用已有公共材料<select
            @change="
              ((q) => {
                if (q) {
                  form.material = q.material;
                  form.material_id = q.material_id;
                }
              })(
                materials.find(
                  (q) => q.id === ($event.target as HTMLSelectElement).value,
                ),
              )
            "
          >
            <option value="">选择已有材料</option>
            <option v-for="q in materials" :key="q.id" :value="q.id">
              {{ q.title }}
            </option>
          </select></label
        ><label
          >来源<input
            v-model="form.source"
            placeholder="考试、年份、书籍或机构（选填）"
        /></label>
        <div class="modal-footer">
          <span class="muted"
            >{{ form.knowledge_ids.length }} 个知识点已关联</span
          ><button type="button" class="btn" @click="emit('close')">取消</button
          ><button class="btn primary" :disabled="working">保存错题</button>
        </div>
      </form>
    </section>
  </div>
</template>
