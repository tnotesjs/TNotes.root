/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module 'virtual:tnotes-data' {
  export const rootData: {
    config: any
    sidebars: Record<string, any[]>
    stats: {
      byYear: Record<string, any>
      byKnowledgeBase: Record<string, { byYear: Record<string, any> }>
    } | null
  }
}
