<template>
  <div ref="containerRef" class="knowledge-navigator-container">
    <!-- 导航头部 -->
    <div class="navigator-header">
      <ViewSwitcher v-model="viewMode" />
      <SearchBar
        v-model="searchQuery"
        :placeholder="
          viewMode === 'search' ? '搜索「所有知识库」...' : '搜索「当前知识库」...'
        "
      />

      <!-- 主题切换按钮 -->
      <button
        class="theme-btn"
        :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
        @click="toggleTheme"
      >
        <svg
          v-if="isDark"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <svg
          v-else
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </button>

      <!-- 设置按钮 -->
      <button class="settings-btn" title="设置" @click="showSettings = true">
        <img :src="icon__setting" alt="Settings" />
      </button>
    </div>

    <!-- 左侧知识库列表 -->
    <div
      v-if="viewMode !== 'search'"
      class="repo-sidebar-pane"
      :class="{
        'is-collapsed': sidebarHidden,
        'is-resizing': isSidebarResizing,
        'is-icon-rail': isCompact,
      }"
      :style="{ width: effectiveSidebarLayoutWidth + 'px' }"
    >
      <SidebarList
        v-show="!sidebarHidden"
        :sorted-items="sortedRootItems"
        :active-key="activeKey"
        :is-compact="sidebarCompact"
        :total-count="totalNotesCount"
        @select="selectSidebar"
      />
      <RepoSidebarResizeHandle />
    </div>

    <!-- 右侧内容区 -->
    <div class="content-area">
      <!-- 文件夹视图 -->
      <div
        v-if="viewMode === 'folder' && activeSidebar && activeSidebarItem"
        class="sidebar-content"
      >
        <RepoInfo :item="activeSidebarItem" :tnotes-dir="tnotesDir" />

        <div class="collapse-toggle">
          <!-- <span class="collapse-toggle-label">{{
            allCollapsed ? '全部展开' : '全部折叠'
          }}</span> -->
          <button
            class="switch-btn"
            :class="{ 'is-on': !allCollapsed }"
            :title="allCollapsed ? '全部展开' : '全部折叠'"
            @click="toggleAllSections"
          >
            <span class="switch-knob" />
          </button>
        </div>

        <SidebarSection
          v-for="(section, index) in activeSidebar"
          :key="index"
          :section="section"
          :collapsed="getSectionState(Number(index))"
          :tnotes-dir="tnotesDir"
          @toggle="toggleSection(Number(index))"
        />
      </div>

      <!-- 全局搜索视图 -->
      <GlobalSearchView
        v-else-if="viewMode === 'search'"
        :search-query="searchQuery"
        :root-data="rootData"
      />

      <div v-else class="empty-content">请选择一个知识库查看内容</div>
    </div>

    <!-- 设置对话框 -->
    <SettingsDialog
      v-model="showSettings"
      v-model:tnotes-dir="tnotesDir"
      v-model:sort-option="sortOption"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { rootData } from "virtual:tnotes-data";
import { useNavigator } from "./composables/useNavigator";
import { useRepoSidebarLayout } from "./composables/useRepoSidebarLayout";
import { useResponsive } from "./composables/useResponsive";
import { useTheme } from "./composables/useTheme";
import GlobalSearchView from "./GlobalSearchView.vue";
import RepoInfo from "./RepoInfo.vue";
import RepoSidebarResizeHandle from "./RepoSidebarResizeHandle.vue";
import SearchBar from "./SearchBar.vue";
import SettingsDialog from "./SettingsDialog.vue";
import SidebarList from "./SidebarList.vue";
import SidebarSection from "./SidebarSection.vue";
import ViewSwitcher from "./ViewSwitcher.vue";
import icon__setting from "/icon__setting.svg";

const showSettings = ref(false);
const containerRef = ref<HTMLElement | null>(null);

const { isDark, toggle: toggleTheme } = useTheme();

const {
  activeKey,
  sortOption,
  tnotesDir,
  searchQuery,
  viewMode,
  sortedRootItems,
  activeSidebar,
  activeSidebarItem,
  allCollapsed,
  selectSidebar,
  toggleSection,
  toggleAllSections,
  getSectionState,
  setDefaultActiveKey,
} = useNavigator(rootData);

const { isCompact } = useResponsive();
const {
  hidden: sidebarHidden,
  isResizing: isSidebarResizing,
  layoutWidth: sidebarLayoutWidth,
  isIconCompact,
  iconRailWidth,
  init: initRepoSidebarLayout,
} = useRepoSidebarLayout();

const sidebarCompact = computed(() => isCompact.value || isIconCompact.value);

/** 窄屏已切到图标模式时，强制使用图标轨道宽度，避免沿用桌面端 300px 挤占内容区 */
const effectiveSidebarLayoutWidth = computed(() => {
  if (sidebarHidden.value) return sidebarLayoutWidth.value;
  if (isCompact.value) return iconRailWidth;
  return sidebarLayoutWidth.value;
});

// 获取总笔记数（statistic 为数字类型）
const totalNotesCount = computed(() => {
  const { completed_notes_count } = rootData.config.statistic;
  return typeof completed_notes_count === "number" ? completed_notes_count : 0;
});

onMounted(() => {
  initRepoSidebarLayout();

  const savedSortOption = localStorage.getItem(
    "knowledge-navigator-sort-option",
  );
  if (savedSortOption === "name-asc" || savedSortOption === "name-desc") {
    sortOption.value = savedSortOption;
  }

  const savedTnotesDir = localStorage.getItem("tnotes-dir");
  if (savedTnotesDir) tnotesDir.value = savedTnotesDir;

  const savedViewMode = localStorage.getItem("knowledge-navigator-view-mode");
  if (savedViewMode === "folder" || savedViewMode === "search") {
    viewMode.value = savedViewMode;
  }

  setDefaultActiveKey();
});
</script>

<style scoped>
.knowledge-navigator-container {
  --tn-glass-radius: 16px;
  --tn-glass-gap: 12px;
  --tn-glass-bg: color-mix(in srgb, var(--vp-c-bg-soft) 72%, transparent);
  --tn-glass-bg-strong: color-mix(in srgb, var(--vp-c-bg-elv) 78%, transparent);
  --tn-glass-border: color-mix(in srgb, var(--vp-c-divider) 70%, transparent);

  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--tn-glass-gap);
  padding: var(--tn-glass-gap);
  box-sizing: border-box;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
    Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  position: relative;
  overflow: hidden;
  /* 全屏即应用：容器恒为视口高度 */
  height: 100dvh;
  background: var(--vp-c-bg);
}

.navigator-header {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  flex-wrap: wrap;
  min-height: 63px;
  box-sizing: border-box;
  border-radius: var(--tn-glass-radius);
  background: var(--tn-glass-bg);
  border: 1px solid var(--tn-glass-border);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
}

.navigator-header :deep(.search-bar) {
  flex: 1;
  min-width: 200px;
  padding: 0;
  border-bottom: none;
}

.navigator-header :deep(.search-input) {
  border-radius: 10px;
  background: color-mix(in srgb, var(--vp-c-bg) 70%, transparent);
  border-color: color-mix(in srgb, var(--vp-c-divider) 80%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
  opacity: 0.6;
  flex-shrink: 0;
  color: var(--vp-c-text-1);
}

.theme-btn:hover {
  background-color: color-mix(in srgb, var(--vp-c-bg) 55%, transparent);
  opacity: 1;
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background-color: transparent;
  cursor: pointer;
  transition: all 0.2s;
  padding: 4px;
  opacity: 0.6;
  flex-shrink: 0;
}

.settings-btn:hover {
  background-color: color-mix(in srgb, var(--vp-c-bg) 55%, transparent);
  opacity: 1;
}

.settings-btn img {
  width: 20px;
  height: 20px;
  display: block;
}

/* 全局搜索时单列布局 */
.knowledge-navigator-container:has(.content-area .global-search-view) {
  grid-template-columns: 1fr;
}

.knowledge-navigator-container > .repo-sidebar-pane {
  position: relative;
  display: flex;
  flex-direction: column;
  grid-column: 1;
  grid-row: 2;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  transition: width 0.2s ease;
  border-radius: var(--tn-glass-radius);
  background: var(--tn-glass-bg);
  border: 1px solid var(--tn-glass-border);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
}

.knowledge-navigator-container > .repo-sidebar-pane.is-resizing {
  transition: none;
}

.knowledge-navigator-container > .repo-sidebar-pane.is-collapsed {
  background: transparent;
  border-color: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

/* 窄屏图标轨道：禁用拖拽改宽，保留收起/展开按钮 */
.knowledge-navigator-container > .repo-sidebar-pane.is-icon-rail :deep(.resize-hotspot),
.knowledge-navigator-container
  > .repo-sidebar-pane.is-icon-rail
  :deep(.resize-indicator) {
  display: none;
}

.knowledge-navigator-container
  > .repo-sidebar-pane.is-icon-rail
  :deep(.repo-sidebar-resize-handle) {
  cursor: default;
}

.content-area {
  grid-column: 2;
  grid-row: 2;
  min-height: 0;
  padding: 12px 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: var(--tn-glass-radius);
  background: var(--tn-glass-bg-strong);
  border: 1px solid var(--tn-glass-border);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
}

/* 全局搜索时内容区占满宽度 */
.knowledge-navigator-container:has(.content-area .global-search-view)
  .content-area {
  grid-column: 1;
}

.content-area .sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

:global(body.is-repo-sidebar-resizing),
:global(body.is-repo-sidebar-resizing *) {
  cursor: col-resize !important;
  user-select: none !important;
}

.collapse-toggle {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 12px 12px;
}

/* .collapse-toggle-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  user-select: none;
} */

.switch-btn {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  background-color: var(--vp-c-divider);
  cursor: pointer;
  transition: background-color 0.2s ease;
  padding: 0;
  flex-shrink: 0;
}

.switch-btn.is-on {
  background-color: var(--vp-c-brand);
}

.switch-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #fff;
  transition: transform 0.2s ease;
}

.switch-btn.is-on .switch-knob {
  transform: translateX(16px);
}

.empty-content {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  color: var(--vp-c-text-2);
  font-size: 16px;
}

@media (max-width: 768px) {
  .knowledge-navigator-container {
    --tn-glass-radius: 12px;
    --tn-glass-gap: 8px;
  }

  .navigator-header {
    padding: 8px 10px;
    gap: 8px;
  }

  .navigator-header :deep(.search-bar) {
    min-width: 150px;
  }

  .navigator-header :deep(.search-input) {
    font-size: 13px;
    padding: 6px 28px 6px 10px;
  }

  .content-area {
    padding: 10px 12px;
  }
}
</style>
