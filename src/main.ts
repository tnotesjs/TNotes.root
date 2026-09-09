import { createApp } from 'vue'
import App from './App.vue'
import { useTheme } from './components/composables/useTheme'
import './styles/theme.css'

// index.html 的防闪烁脚本已设置 html.dark，这里同步 ref 状态
useTheme().init()

createApp(App).mount('#app')

// 全局拦截外链点击，强制新标签页打开（搬运自原 .vitepress/theme/index.ts）
// 内部锚点与相对路径不受影响
document.addEventListener(
  'click',
  (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest('a')
    if (!target) return

    const href = target.getAttribute('href')
    if (!href) return

    // 相对路径 / 锚点不拦截
    if (href.startsWith('#') || (!href.startsWith('http') && !href.startsWith('//'))) {
      return
    }

    // 修饰键 / 中键点击保留默认行为
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
    if (e.button !== 0) return

    e.preventDefault()
    window.open(href, '_blank', 'noopener,noreferrer')
  },
  true,
)
