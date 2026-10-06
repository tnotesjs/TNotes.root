<template>
  <span class="note-status-dot" :data-done="done" aria-hidden="true" />
  <span class="visually-hidden">{{ done ? '已完成' : '待完成' }}</span>
</template>

<script setup lang="ts">
/**
 * 笔记完成状态圆点（空心环 = 待完成，实心 = 已完成）。
 *
 * 与 Desk（NoteDoneToggle `.done-dot`）、SSG 静态站（`.tn-site-sidebar-status`）
 * 同一套：形状是主信号，颜色只是强化；尺寸 7px、边框 1.5px，颜色取
 * `--tn-c-success` / `--tn-c-warning`（值与 @tnotesjs/ui tokens 一致，见 theme.css）。
 * 读屏器从旁边的视觉隐藏文字拿到状态。
 */
defineProps<{
  done: boolean
}>()
</script>

<style scoped>
.note-status-dot {
  flex: none;
  display: inline-block;
  width: 7px;
  height: 7px;
  border: 1.5px solid var(--tn-c-warning);
  border-radius: 50%;
  background: transparent;
}

.note-status-dot[data-done='true'] {
  border-color: var(--tn-c-success);
  background: var(--tn-c-success);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
