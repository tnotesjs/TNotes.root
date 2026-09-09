<template>
  <div class="section-item">
    <!-- 第一级 -->
    <div class="level-1">
      <a :href="item.link" target="_blank" class="item-link">{{ item.text }}</a>
      <a
        v-if="item.link && tnotesDir"
        :title="openNoteTitle"
        :href="ideLink(item)"
        target="_blank"
      >
        <img :src="localIdeIcon" :alt="openNoteTitle" class="repo-action-icon" />
      </a>
    </div>

    <!-- 第二级 -->
    <div v-if="item.items?.length" class="level-2-container">
      <div
        v-for="(subItem, subIndex) in item.items"
        :key="subIndex"
        class="level-2"
      >
        <div class="level-2-content">
          <a :href="subItem.link" target="_blank" class="item-link">{{
            subItem.text
          }}</a>
          <a
            v-if="subItem.link && tnotesDir"
            :title="openNoteTitle"
            :href="ideLink(subItem)"
            target="_blank"
          >
            <img
              :src="localIdeIcon"
              :alt="openNoteTitle"
              class="repo-action-icon"
            />
          </a>
        </div>

        <!-- 第三级 -->
        <div v-if="subItem.items?.length" class="level-3-container">
          <div
            v-for="(subSubItem, subSubIndex) in subItem.items"
            :key="subSubIndex"
            class="level-3"
          >
            <div class="level-3-content">
              <a :href="subSubItem.link" class="item-link" target="_blank">{{
                subSubItem.text
              }}</a>
              <a
                v-if="subSubItem.link && tnotesDir"
                :title="openNoteTitle"
                :href="ideLink(subSubItem)"
                target="_blank"
              >
                <img
                  :src="localIdeIcon"
                  :alt="openNoteTitle"
                  class="repo-action-icon"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLocalIde } from './composables/useLocalIde'
import { buildIdeNoteLink } from './utils/helpers'

interface SidebarItem {
  text: string
  link?: string
  items?: SidebarItem[]
  /** 以库目录开头的本地相对路径（collect v2），用于 IDE 打开笔记文件。 */
  localPath?: string
}

const props = defineProps<{
  item: SidebarItem
  tnotesDir: string
}>()

const {
  ide,
  icon: localIdeIcon,
  openNoteTitle,
} = useLocalIde()

function ideLink(item: SidebarItem): string {
  // 新数据带 localPath（TNotes.xxx/notes/NNNN. 标题.md），直接拼本地根目录；
  // 旧数据回退到 URL 推导（notes/<dir>/README 目录形式）。
  if (item.localPath) {
    return buildIdeNoteLink(props.tnotesDir, item.localPath, ide.value)
  }
  const cleanPath = (item.link ?? '')
    .replace('https://tnotesjs.github.io/', '')
    .replace('/README', '')
  return buildIdeNoteLink(props.tnotesDir, cleanPath, ide.value)
}
</script>

<style scoped>
.section-item {
  padding: 8px 15px 8px 35px;
}

.level-1,
.level-2-content,
.level-3-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 5px;
}

.level-1 {
  padding: 0;
  margin-bottom: 5px;
}

.level-2 {
  padding: 5px 0;
}

.level-3 {
  padding: 5px 0;
}

.level-2-container {
  padding-left: 20px;
  margin-top: 5px;
}

.level-3-container {
  padding-left: 20px;
  margin-top: 5px;
}

.item-link {
  color: var(--vp-c-brand);
  text-decoration: none;
  font-size: 14px;
}

.item-link:hover {
  text-decoration: underline;
}

.repo-action-icon {
  width: 1.2rem;
  height: 1.2rem;
  opacity: 0.7;
  transition: opacity 0.2s;
  cursor: pointer;
  flex-shrink: 0;
}

.repo-action-icon:hover {
  opacity: 1;
}
</style>
