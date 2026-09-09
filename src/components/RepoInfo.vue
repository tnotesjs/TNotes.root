<template>
  <div class="repo-info">
    <div class="repo-header">
      <h2 title="知识库的在线访问链接">
        <a :href="item.link" target="_blank">{{ repoName }}</a>
      </h2>
      <p class="repo-details">{{ item.details }}</p>
    </div>

    <div class="repo-actions">
      <a
        v-if="tnotesDir"
        :title="openRepoTitle"
        target="_blank"
        :href="ideLink"
      >
        <img
          :src="localIdeIcon"
          :alt="openRepoTitle"
          class="repo-action-icon"
        />
      </a>

      <a title="打开知识库仓库" target="_blank" :href="githubLink">
        <img :src="icon__github" alt="GitHub" class="repo-action-icon" />
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLocalIde } from "./composables/useLocalIde";
import type { RootItem } from "./composables/useNavigator";
import { buildGitHubLink, buildIdeLink } from "./utils/helpers";
import icon__github from "/icon__github.svg";

const props = defineProps<{
  item: RootItem;
  tnotesDir: string;
}>();

const { ide, icon: localIdeIcon, openRepoTitle } = useLocalIde();

/** 仓库名（TNotes.xxx）：新数据由 collect 写入 name；旧数据回退 title 拼接。 */
const repoName = computed(
  () => props.item.name || `TNotes.${props.item.title}`,
);

const ideLink = computed(() =>
  buildIdeLink(props.tnotesDir, repoName.value, ide.value),
);
const githubLink = computed(() => buildGitHubLink(repoName.value));
</script>

<style scoped>
.repo-info {
  margin-bottom: 20px;
  padding: 12px 14px 15px;
  border-bottom: 1px solid
    color-mix(in srgb, var(--vp-c-divider) 75%, transparent);
  position: sticky;
  top: 0;
  background-color: var(--vp-c-bg-soft);
  border-radius: 12px;
  z-index: 10;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.repo-header {
  flex: 1;
}

.repo-header h2 {
  margin-top: 0rem;
  margin-bottom: 10px;
  padding-top: 0px;
  border-top: none;
}

.repo-header h2 a {
  text-decoration: none;
}

.repo-header h2 a:hover {
  text-decoration: underline !important;
}

.repo-details {
  color: var(--vp-c-text-2);
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
}

.repo-actions {
  display: flex;
  gap: 8px;
  margin-right: 12px;
  margin-top: 1rem;
}

.repo-action-icon {
  width: 1.2rem;
  height: 1.2rem;
  opacity: 0.7;
  transition: opacity 0.2s;
  cursor: pointer;
}

.repo-action-icon:hover {
  opacity: 1;
}
</style>
