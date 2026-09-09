/**
 * .vitepress/theme/index.ts
 */

// https://vitepress.dev/zh/guide/custom-theme

import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import KnowledgeNavigator from '../components/KnowledgeNavigator.vue'
import './styles/custom.css'

export default {
  extends: DefaultTheme,

  // doc: https://vitepress.dev/zh/guide/extending-default-theme#registering-global-components
  enhanceApp({ app, router }) {
    // 注册自定义全局组件
    app.component('KnowledgeNavigator', KnowledgeNavigator)

    // 全局拦截所有链接点击，强制在新标签页打开（包括思维导图等动态生成的链接）
    if (typeof window !== 'undefined') {
      // 使用事件委托，在 document 级别监听所有点击
      const handleLinkClick = (e: MouseEvent) => {
        // 找到被点击的 <a> 标签（可能点击的是子元素）
        const target = (e.target as HTMLElement).closest('a')
        if (!target) return

        const href = target.getAttribute('href')
        if (!href) return

        // 跳过 VitePress 内部路由链接（相对路径且不以 http 开头）
        if (
          href.startsWith('#') ||
          (!href.startsWith('http') && !href.startsWith('//'))
        ) {
          return
        }

        // 如果用户按住了 Ctrl/Cmd/Shift 等修饰键，保留浏览器默认行为
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
          return
        }

        // 如果是中键点击，保留默认行为
        if (e.button !== 0) {
          return
        }

        // 阻止默认行为，用 window.open 打开
        e.preventDefault()
        window.open(href, '_blank', 'noopener,noreferrer')
      }

      // 立即添加监听器（处理初始页面和后续所有动态内容）
      // 由于使用事件委托，一次绑定即可处理所有当前和未来的链接
      document.addEventListener('click', handleLinkClick, true)
    }
  },
} satisfies Theme
