import { ref } from 'vue'

/** 内容区页宽：normal = 限宽居中（默认）；wide = 铺满内容区（对齐 Desk 笔记「超宽显示」）。 */
export type PageWidth = 'normal' | 'wide'

const STORAGE_KEY = 'tnotes-root-page-width'

function readSaved(): PageWidth {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'wide' ? 'wide' : 'normal'
  } catch {
    return 'normal'
  }
}

const pageWidth = ref<PageWidth>(readSaved())

export function usePageWidth() {
  const toggle = () => {
    pageWidth.value = pageWidth.value === 'wide' ? 'normal' : 'wide'
    try {
      localStorage.setItem(STORAGE_KEY, pageWidth.value)
    } catch {
      /* ignore */
    }
  }
  return { pageWidth, toggle }
}
