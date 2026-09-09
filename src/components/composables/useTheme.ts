import { ref } from 'vue'

const STORAGE_KEY = 'tnotes-theme'

const isDark = ref(true)

function apply(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * 主题开关：默认暗色（对齐原 VitePress appearance: 'dark'），
 * 用户选择持久化到 localStorage。
 */
export function useTheme() {
  const init = () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    isDark.value = saved ? saved === 'dark' : true
    apply(isDark.value)
  }

  const toggle = () => {
    isDark.value = !isDark.value
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
    apply(isDark.value)
  }

  return { isDark, init, toggle }
}
