<template>
  <div
    class="repo-sidebar-resize-handle"
    :class="{
      'is-hidden': hidden,
      'is-dragging': isResizing,
    }"
  >
    <div
      v-if="!hidden"
      class="resize-hotspot"
      @mousedown.prevent="startResize"
    ></div>

    <div v-if="!hidden" class="resize-indicator"></div>

    <button
      class="sidebar-edge-toggle"
      type="button"
      :title="toggleActionText"
      @click.stop="toggle"
    >
      <img :src="toggleIcon" alt="" />
      <span class="sidebar-edge-tooltip">{{ toggleActionText }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRepoSidebarLayout } from './composables/useRepoSidebarLayout'
import icon__next from '/icon__next.svg'
import icon__prev from '/icon__prev.svg'

const {
  hidden,
  isResizing,
  minWidth,
  maxWidth,
  init,
  toggle,
  setWidth,
  saveWidth,
} = useRepoSidebarLayout()

const toggleActionText = computed(() =>
  hidden.value ? '展开知识库列表' : '收起知识库列表',
)
const toggleIcon = computed(() => (hidden.value ? icon__next : icon__prev))

let paneEl: HTMLElement | null = null

onMounted(() => {
  init()
})

onBeforeUnmount(() => {
  stopResize()
})

function getPaneEl(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return null
  return target.closest('.repo-sidebar-pane') as HTMLElement | null
}

function startResize(event: MouseEvent) {
  if (hidden.value || event.button !== 0) return

  paneEl = getPaneEl(event.currentTarget)
  // 窄屏图标轨道由布局强制宽度，禁止拖拽改宽以免覆盖桌面端偏好
  if (paneEl?.classList.contains('is-icon-rail')) {
    paneEl = null
    return
  }
  isResizing.value = true
  document.body.classList.add('is-repo-sidebar-resizing')
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
  applyWidthFromClientX(event.clientX)
}

function onResize(event: MouseEvent) {
  if (!isResizing.value) return
  applyWidthFromClientX(event.clientX)
}

function stopResize() {
  if (!isResizing.value) return

  isResizing.value = false
  document.body.classList.remove('is-repo-sidebar-resizing')
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
  saveWidth()
  paneEl = null
}

function applyWidthFromClientX(clientX: number) {
  const left = paneEl?.getBoundingClientRect().left ?? 0
  const next = Math.min(maxWidth, Math.max(minWidth, clientX - left))
  setWidth(next)
}
</script>

<style scoped>
.repo-sidebar-resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  width: 10px;
  cursor: col-resize;
}

.repo-sidebar-resize-handle::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 4px;
  width: 2px;
  background: var(--vp-c-brand);
  border-radius: 999px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--vp-c-brand) 25%, transparent);
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}

.resize-hotspot {
  position: absolute;
  inset: 0;
}

.resize-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 28px;
  border-right: 1px solid var(--vp-c-brand);
  border-left: 1px solid var(--vp-c-brand);
  opacity: 0;
  pointer-events: none;
  transform: translate(-50%, -50%);
  transition: opacity 0.18s ease;
}

.sidebar-edge-toggle {
  position: absolute;
  top: 120px;
  left: -2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 44px;
  padding: 0;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.sidebar-edge-toggle img {
  width: 10px;
  height: 10px;
}

.sidebar-edge-tooltip {
  position: absolute;
  top: 50%;
  left: calc(100% + 8px);
  padding: 6px 8px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg-elv);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  font-size: 12px;
  line-height: 18px;
  opacity: 0;
  pointer-events: none;
  white-space: nowrap;
  transform: translate(2px, -50%);
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.sidebar-edge-toggle:hover .sidebar-edge-tooltip,
.sidebar-edge-toggle:focus-visible .sidebar-edge-tooltip {
  opacity: 1;
  transform: translate(0, -50%);
}

.repo-sidebar-resize-handle:hover::before,
.repo-sidebar-resize-handle.is-dragging::before,
.repo-sidebar-resize-handle:hover .resize-indicator,
.repo-sidebar-resize-handle.is-dragging .resize-indicator,
.repo-sidebar-resize-handle:hover .sidebar-edge-toggle,
.repo-sidebar-resize-handle.is-dragging .sidebar-edge-toggle,
.repo-sidebar-resize-handle.is-hidden .sidebar-edge-toggle {
  opacity: 1;
  pointer-events: auto;
}

.sidebar-edge-toggle:hover {
  color: var(--vp-c-brand);
  background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-brand);
}

.repo-sidebar-resize-handle.is-hidden {
  right: auto;
  left: 0;
  width: 14px;
  cursor: default;
}

.repo-sidebar-resize-handle.is-hidden::before,
.repo-sidebar-resize-handle.is-hidden .resize-indicator {
  display: none;
}

.repo-sidebar-resize-handle.is-hidden .sidebar-edge-toggle {
  left: 0;
  border-left-color: var(--vp-c-divider);
  border-radius: 0 7px 7px 0;
}
</style>
