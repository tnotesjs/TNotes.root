/**
 * 根知识库左侧列表：宽度拖拽 + 收起/展开
 */

import { computed, ref } from 'vue'

const SIDEBAR_HIDDEN_KEY = 'knowledge-navigator-sidebar-hidden'
const SIDEBAR_WIDTH_KEY = 'knowledge-navigator-sidebar-width'

const SIDEBAR_MIN_WIDTH = 60
const SIDEBAR_MAX_WIDTH = 400
const SIDEBAR_DEFAULT_WIDTH = 300
const SIDEBAR_COLLAPSED_WIDTH = 14
/** 窄屏/紧凑模式下仅展示图标时的轨道宽度 */
const SIDEBAR_ICON_RAIL_WIDTH = 64

const hidden = ref(false)
const width = ref(SIDEBAR_DEFAULT_WIDTH)
const isResizing = ref(false)
let initialized = false

function canUseDOM() {
  return typeof window !== 'undefined'
}

function clampWidth(nextWidth: number) {
  if (!Number.isFinite(nextWidth)) return SIDEBAR_DEFAULT_WIDTH
  return Math.min(
    SIDEBAR_MAX_WIDTH,
    Math.max(SIDEBAR_MIN_WIDTH, Math.round(nextWidth)),
  )
}

function readStoredWidth() {
  if (!canUseDOM()) return SIDEBAR_DEFAULT_WIDTH
  const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY)
  if (!saved) return SIDEBAR_DEFAULT_WIDTH
  return clampWidth(Number(saved))
}

function persistHidden(nextHidden: boolean) {
  if (!canUseDOM()) return
  try {
    localStorage.setItem(SIDEBAR_HIDDEN_KEY, nextHidden ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function persistWidth(nextWidth: number) {
  if (!canUseDOM()) return
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampWidth(nextWidth)))
  } catch {
    /* ignore */
  }
}

export function useRepoSidebarLayout() {
  function init() {
    if (!canUseDOM() || initialized) return
    hidden.value = localStorage.getItem(SIDEBAR_HIDDEN_KEY) === '1'
    width.value = readStoredWidth()
    initialized = true
  }

  function setHidden(nextHidden: boolean) {
    hidden.value = nextHidden
    persistHidden(nextHidden)
  }

  function toggle() {
    setHidden(!hidden.value)
  }

  function setWidth(nextWidth: number) {
    width.value = clampWidth(nextWidth)
  }

  function saveWidth() {
    persistWidth(width.value)
  }

  const layoutWidth = computed(() =>
    hidden.value ? SIDEBAR_COLLAPSED_WIDTH : width.value,
  )

  const isIconCompact = computed(() => width.value <= 88)

  return {
    hidden,
    width,
    isResizing,
    layoutWidth,
    isIconCompact,
    minWidth: SIDEBAR_MIN_WIDTH,
    maxWidth: SIDEBAR_MAX_WIDTH,
    defaultWidth: SIDEBAR_DEFAULT_WIDTH,
    iconRailWidth: SIDEBAR_ICON_RAIL_WIDTH,
    init,
    setHidden,
    toggle,
    setWidth,
    saveWidth,
  }
}
