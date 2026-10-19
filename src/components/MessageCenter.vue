<script setup lang="ts">
import { onMounted } from "vue";
import {
  messages,
  messageFailure,
  loadMessages,
  markMessagesRead,
} from "../composables/notifications";
const emit = defineEmits<{ close: [] }>();
onMounted(() => void loadMessages());
</script>
<template>
  <section class="message-center">
    <div class="page-heading">
      <div>
        <div class="eyebrow">NOTIFICATIONS</div>
        <h1>消息中心</h1>
        <p>查看本机通知历史，关闭后返回原页面。</p>
      </div>
      <div class="inline-actions">
        <button
          class="btn"
          @click="markMessagesRead().catch((e) => (messageFailure = String(e)))"
        >
          全部标为已读</button
        ><button class="btn" @click="emit('close')">返回当前页面</button>
      </div>
    </div>
    <p v-if="messageFailure" role="alert">{{ messageFailure }}</p>
    <div class="panel">
      <article
        v-for="m in messages"
        :key="m.id"
        class="message-row"
        :class="[m.kind, { unread: !m.read }]"
      >
        <span>{{
          m.kind === "error" ? "!" : m.kind === "success" ? "✓" : "i"
        }}</span>
        <div>
          <p class="prewrap">{{ m.text }}</p>
          <small
            >{{ new Date(m.createdAt).toLocaleString("zh-CN") }} ·
            {{ m.read ? "已读" : "未读" }}</small
          >
        </div>
      </article>
      <p v-if="!messages.length" class="empty">暂无通知消息</p>
    </div>
  </section>
</template>
