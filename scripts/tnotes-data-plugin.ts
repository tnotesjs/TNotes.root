/**
 * Vite 插件：tnotes-data
 *
 * 把仓内的 .tnotes.json + toc/<repo>.md（collect.ts 收集的原始副本）
 * 烹饪成组件需要的 rootData 结构，通过虚拟模块 `virtual:tnotes-data` 提供：
 *
 *   import { rootData } from 'virtual:tnotes-data'
 *
 * 构建输入 100% 来自 git 仓内容（本地与 CI 产物一致、可复现）；
 * toc/ 或 .tnotes.json 变化时触发整页刷新（数据是构建期常量，HMR 无增量必要）。
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseTocLine } from '@tnotesjs/kb'
import type { Plugin } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const TOC_DIR = path.join(ROOT, 'toc')
const CONFIG_PATH = path.join(ROOT, '.tnotes.json')

const VIRTUAL_ID = 'virtual:tnotes-data'
const RESOLVED_ID = '\0' + VIRTUAL_ID

// ================================================================
// TOC.md → SidebarItem 烹饪（自原 collect-sidebars.ts 迁入）
// ================================================================

interface SidebarItem {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
  /** 笔记文件在库内的相对路径（TNotes.xxx/notes/NNNN. 标题.md），用于本地 IDE 打开。 */
  localPath?: string
}

/**
 * TOC.md 文本 → SidebarItem 树。
 * 语法：`- Group` / `- [ ] 0001. Title` / `- [x] 0001. Title`（2 空格缩进）。
 * 笔记也可作父级（笔记下可嵌套笔记），items 懒创建。
 */
function tocToSidebarItems(
  tocText: string,
  pageUrl: string,
  repoName: string,
): SidebarItem[] {
  const base = pageUrl.endsWith('/') ? pageUrl : `${pageUrl}/`
  const root: SidebarItem[] = []
  const stack: Array<{ indent: number; container: SidebarItem }> = [
    { indent: -1, container: { text: '', items: root } },
  ]

  for (const line of tocText.split(/\r?\n/)) {
    const parsed = parseTocLine(line)
    if (parsed.kind === 'unknown') continue

    while (
      stack.length > 1 &&
      stack[stack.length - 1].indent >= parsed.indentLevel
    ) {
      stack.pop()
    }
    const parent = stack[stack.length - 1]
    parent.container.items ??= []

    if (parsed.kind === 'group') {
      const group: SidebarItem = {
        text: parsed.title ?? '',
        collapsed: true,
        items: [],
      }
      parent.container.items.push(group)
      stack.push({ indent: parsed.indentLevel, container: group })
      continue
    }

    // note
    const index = parsed.noteIndex!
    const title = parsed.title ?? ''
    const stem = title ? `${index}. ${title}` : index
    const item: SidebarItem = {
      text: `${parsed.done ? '✅' : '⏰'} ${stem}`,
      link: `${base}notes/${Number.parseInt(index, 10)}`,
      localPath: `${repoName}/notes/${stem}.md`,
    }
    parent.container.items.push(item)
    stack.push({ indent: parsed.indentLevel, container: item })
  }

  return root
}

// ================================================================
// rootData 组装
// ================================================================

interface RootData {
  config: any
  sidebars: Record<string, SidebarItem[]>
}

function buildRootData(): RootData {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'))
  const sidebars: Record<string, SidebarItem[]> = {}

  for (const [repo, item] of Object.entries<any>(config.root_items ?? {})) {
    const tocFile = path.join(TOC_DIR, `${repo}.md`)
    if (!fs.existsSync(tocFile)) continue
    const pageUrl =
      item?.link ?? `https://tnotesjs.github.io/${repo}/`
    sidebars[repo] = tocToSidebarItems(
      fs.readFileSync(tocFile, 'utf-8'),
      pageUrl,
      repo,
    )
  }

  return { config, sidebars }
}

// ================================================================
// 插件
// ================================================================

export function tnotesData(): Plugin {
  return {
    name: 'tnotes-data',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },

    load(id) {
      if (id !== RESOLVED_ID) return
      return `export const rootData = ${JSON.stringify(buildRootData())}\n`
    },

    handleHotUpdate({ file, server }) {
      if (file.startsWith(TOC_DIR) || file === CONFIG_PATH) {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
        return []
      }
    },
  }
}
