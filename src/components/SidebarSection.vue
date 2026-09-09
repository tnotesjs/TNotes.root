<template>
  <div class="sidebar-section">
    <div
      class="section-header"
      :class="{ 'is-toggleable': hasItems }"
      @click="hasItems && $emit('toggle')"
    >
      <span
        v-if="hasItems"
        class="collapse-icon"
        :class="{ 'is-collapsed': collapsed }"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            d="M3 1 L7 5 L3 9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <a
        v-if="section.link"
        :href="section.link"
        target="_blank"
        class="section-title section-title-link"
        @click.stop
      >
        {{ section.text }}
      </a>
      <span v-else class="section-title">{{ section.text }}</span>
      <span v-if="hasItems" class="section-count">{{
        section.items.length
      }}</span>
    </div>

    <Transition
      v-if="hasItems"
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @after-enter="onAfterEnter"
      @before-leave="onBeforeLeave"
      @leave="onLeave"
      @after-leave="onAfterLeave"
    >
      <div v-if="!collapsed" class="section-items">
        <SidebarItemContent
          v-for="(item, index) in visibleItems"
          :key="index"
          :item="item"
          :tnotes-dir="tnotesDir"
        />
        <!-- 渐进加载哨兵 -->
        <div v-if="hasMore" ref="sentinelRef" class="load-more-sentinel">
          <span class="load-more-text"
            >已加载 {{ visibleCount }} / {{ totalCount }} 项...</span
          >
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import SidebarItemContent from './SidebarItemContent.vue'

const BATCH_SIZE = 50

interface SidebarItem {
  text: string
  link?: string
  items?: SidebarItem[]
}

interface SidebarSection {
  text: string
  link?: string
  collapsed?: boolean
  items: SidebarItem[]
}

const props = defineProps<{
  section: SidebarSection
  collapsed: boolean
  tnotesDir: string
}>()

defineEmits<{
  toggle: []
}>()

// 渐进式渲染
const visibleCount = ref(BATCH_SIZE)
const sentinelRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const totalCount = computed(() => props.section.items?.length ?? 0)
const hasItems = computed(() => totalCount.value > 0)
const hasMore = computed(() => visibleCount.value < totalCount.value)
const visibleItems = computed(() => {
  if (!props.section.items) return []
  return props.section.items.slice(0, visibleCount.value)
})

// 展开时重置可见数量并启动观察
watch(
  () => props.collapsed,
  (newVal, oldVal) => {
    if (oldVal === true && newVal === false) {
      // 从折叠变为展开：重置渐进加载
      visibleCount.value = BATCH_SIZE
      nextTick(setupObserver)
    } else if (newVal === true) {
      // 折叠时断开观察
      disconnectObserver()
    }
  },
)

// 首次渲染时如果已展开，启动观察
watch(sentinelRef, (el) => {
  if (el) setupObserver()
})

function setupObserver() {
  disconnectObserver()
  if (!sentinelRef.value) return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting && hasMore.value) {
        visibleCount.value = Math.min(
          visibleCount.value + BATCH_SIZE,
          totalCount.value,
        )
        // 如果加载完了，断开观察
        if (!hasMore.value) {
          disconnectObserver()
        }
      }
    },
    { rootMargin: '200px' },
  )
  observer.observe(sentinelRef.value)
}

function disconnectObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

onBeforeUnmount(disconnectObserver)

// 幕布风格展开/折叠动画 (JS hooks)
function onBeforeEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
  htmlEl.style.overflow = 'hidden'
}

function onEnter(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  // 强制 reflow，确保初始状态生效
  void htmlEl.offsetHeight
  htmlEl.style.transition = 'height 0.2s ease, opacity 0.15s ease'
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.opacity = '1'
  const onEnd = () => {
    htmlEl.removeEventListener('transitionend', onEnd)
    done()
  }
  htmlEl.addEventListener('transitionend', onEnd)
}

function onAfterEnter(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.transition = ''
}

function onBeforeLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = htmlEl.scrollHeight + 'px'
  htmlEl.style.overflow = 'hidden'
}

function onLeave(el: Element, done: () => void) {
  const htmlEl = el as HTMLElement
  void htmlEl.offsetHeight
  htmlEl.style.transition = 'height 0.2s ease, opacity 0.15s ease'
  htmlEl.style.height = '0'
  htmlEl.style.opacity = '0'
  const onEnd = () => {
    htmlEl.removeEventListener('transitionend', onEnd)
    done()
  }
  htmlEl.addEventListener('transitionend', onEnd)
}

function onAfterLeave(el: Element) {
  const htmlEl = el as HTMLElement
  htmlEl.style.height = ''
  htmlEl.style.overflow = ''
  htmlEl.style.opacity = ''
  htmlEl.style.transition = ''
}
</script>

<style scoped>
.sidebar-section {
  margin-bottom: 12px;
  margin-right: 12px;
  /* border: 1px solid var(--vp-c-divider); */
  /* background-color: var(--vp-c-bg-soft); */
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 15px;
  /* background-color: var(--vp-c-bg-soft); */
  font-weight: 500;
  user-select: none;
}

.section-header.is-toggleable {
  cursor: pointer;
}

/* .section-header:hover {
  background-color: var(--vp-c-bg-elv);
} */

.collapse-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  transition: transform 0.2s ease;
  transform: rotate(90deg);
  color: var(--vp-c-text-2);
}

.collapse-icon.is-collapsed {
  transform: rotate(0deg);
}

.section-title {
  min-width: 0;
}

.section-title-link {
  flex: 0 1 auto;
  color: var(--vp-c-brand);
  text-decoration: none;
}

.section-title-link:hover {
  text-decoration: underline;
}

.section-count {
  font-size: 12px;
  color: var(--vp-c-text-3);
  background-color: var(--vp-c-bg);
  padding: 1px 8px;
  border-radius: 10px;
  margin-left: auto;
  flex-shrink: 0;
}

.section-items {
  padding: 10px 0;
  background-color: var(--tn-glass-bg-strong);
}

.load-more-sentinel {
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.load-more-text {
  font-size: 12px;
  color: var(--vp-c-text-3);
}
</style>
