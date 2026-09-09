/**
 * 本地 IDE（VS Code / Cursor）选择状态与展示信息
 */

import { computed, ref } from 'vue'
import {
  DEFAULT_LOCAL_IDE,
  LOCAL_IDE_STORAGE_KEY,
  normalizeLocalIde,
  toIdeFileUrl,
  type LocalIdeId,
} from '../utils/helpers'
import icon__cursor from '/icon__cursor.svg'
import icon__vscode from '/icon__vscode.svg'

const ide = ref<LocalIdeId>(DEFAULT_LOCAL_IDE)
let hydrated = false

function readIdeFromStorage(): LocalIdeId {
  if (typeof window === 'undefined') return DEFAULT_LOCAL_IDE
  return normalizeLocalIde(localStorage.getItem(LOCAL_IDE_STORAGE_KEY))
}

function hydrateFromStorage() {
  if (typeof window === 'undefined' || hydrated) return
  ide.value = readIdeFromStorage()
  hydrated = true
}

export function useLocalIde() {
  hydrateFromStorage()

  const icon = computed(() =>
    ide.value === 'cursor' ? icon__cursor : icon__vscode,
  )

  const shortLabel = computed(() =>
    ide.value === 'cursor' ? 'Cursor' : 'VS Code',
  )

  const openNoteTitle = computed(
    () => `用 ${shortLabel.value} 打开笔记文件夹`,
  )
  const openRepoTitle = computed(
    () => `用 ${shortLabel.value} 打开知识库文件夹`,
  )

  function setLocalIde(next: LocalIdeId) {
    ide.value = normalizeLocalIde(next)
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_IDE_STORAGE_KEY, ide.value)
    }
  }

  function refreshLocalIde() {
    ide.value = readIdeFromStorage()
  }

  function toFileUrl(filePath: string) {
    return toIdeFileUrl(filePath, ide.value)
  }

  return {
    ide,
    icon,
    shortLabel,
    openNoteTitle,
    openRepoTitle,
    setLocalIde,
    refreshLocalIde,
    toFileUrl,
  }
}
