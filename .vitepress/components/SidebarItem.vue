<template>
  <div
    class="sidebar-item"
    :class="{ active: isActive, compact: isCompact }"
    @click="onClick"
  >
    <div class="folder-icon">
      <img v-if="item.icon?.src" :src="item.icon.src" :alt="item.title" />
      <div v-else class="default-folder-icon">📁</div>
    </div>
    <div v-if="!isCompact" class="folder-name">
      {{ item.title || repoKey }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RootItem } from './composables/useNavigator'

const props = defineProps<{
  repoKey: string
  item: RootItem
  isActive: boolean
  isCompact: boolean
}>()

const emit = defineEmits<{
  select: [key: string]
}>()

const onClick = () => {
  emit('select', props.repoKey)
}
</script>

<style scoped>
.sidebar-item {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  margin: 0 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.sidebar-item.compact {
  justify-content: center;
  padding: 10px;
  margin: 0 6px;
}

.sidebar-item:hover {
  background-color: color-mix(in srgb, var(--vp-c-brand) 14%, transparent);
}

.sidebar-item.active {
  background-color: color-mix(in srgb, var(--vp-c-brand) 42%, transparent);
  color: var(--vp-c-text-1);
}

.folder-icon {
  margin-right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sidebar-item.compact .folder-icon {
  margin-right: 0;
}

.folder-icon img {
  width: 20px;
  height: 20px;
}

.default-folder-icon {
  font-size: 18px;
}

.folder-name {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.increments {
  font-size: 12px;
  margin-left: 2px;
}
</style>
