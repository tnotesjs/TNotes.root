<template>
  <div class="view-switcher">
    <button
      class="view-btn"
      :class="{ active: modelValue === 'folder' }"
      title="文件夹视图"
      @click="$emit('update:modelValue', 'folder')"
    >
      <img :src="icon__folder" alt="Folder View" />
    </button>
    <button
      class="view-btn"
      :class="{ active: modelValue === 'search' }"
      title="全局搜索视图"
      @click="$emit('update:modelValue', 'search')"
    >
      <img :src="icon__search" alt="Search View" />
    </button>
  </div>
</template>

<script setup lang="ts">
import icon__folder from '/icon__folder.svg'
import icon__search from '/icon__search.svg'

defineProps<{
  modelValue: 'folder' | 'search'
}>()

defineEmits<{
  'update:modelValue': [value: 'folder' | 'search']
}>()
</script>

<style scoped>
.view-switcher {
  display: flex;
  gap: 4px;
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
  opacity: 0.6;
}

.view-btn:hover {
  background-color: var(--vp-c-bg-soft);
  opacity: 1;
}

.view-btn.active {
  background-color: var(--vp-c-brand-soft);
  opacity: 1;
}

.view-btn img {
  width: 18px;
  height: 18px;
  display: block;
}

@media (max-width: 768px) {
  .view-btn {
    width: 28px;
    height: 28px;
  }

  .view-btn img {
    width: 16px;
    height: 16px;
  }
}
</style>
