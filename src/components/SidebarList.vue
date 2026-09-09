<template>
  <div class="sidebar-list" :class="{ compact: isCompact }">
    <!-- 头部统计 -->
    <div class="sidebar-header">
      <div class="statistics">
        <div class="stat-item" title="已完成笔记数量">
          <span class="stat-number">{{ totalCount }}</span>
        </div>
      </div>
    </div>

    <!-- 知识库列表 -->
    <div class="sidebar-items-container">
      <SidebarItem
        v-for="[key, item] in sortedItems"
        :key="key"
        :repo-key="key"
        :item="item"
        :is-active="activeKey === key"
        :is-compact="isCompact"
        @select="$emit('select', $event)"
      />

      <div v-if="sortedItems.length === 0" class="no-results">
        未找到匹配的知识库
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RootItem } from './composables/useNavigator'
import SidebarItem from './SidebarItem.vue'

defineProps<{
  sortedItems: Array<[string, RootItem]>
  activeKey: string | null
  isCompact: boolean
  totalCount: number
}>()

defineEmits<{
  select: [key: string]
}>()
</script>

<style scoped>
.sidebar-list {
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  background-color: transparent;
  border-right: none;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: inherit;
}

.sidebar-list.compact .sidebar-header {
  padding: 20px 0 15px 0;
}

.sidebar-header {
  position: sticky;
  top: 0;
  background-color: color-mix(in srgb, var(--vp-c-bg-soft) 55%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 10;
}

.statistics {
  padding: 20px 15px 15px 15px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.sidebar-list.compact .statistics {
  padding: 0;
  border-bottom: none;
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--vp-c-brand);
}

.sidebar-items-container {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 20px 0;
}

.no-results {
  padding: 20px 15px;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 14px;
}
</style>
