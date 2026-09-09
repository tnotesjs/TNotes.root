import fs from 'fs'
import path from 'path'
import minimist from 'minimist'
import { parseTocLine } from '@tnotesjs/kb'
import { __dirname, ROOT_CONFIG_PATH } from './constants.ts'
import { pMap, readRepoFile, readRepoJSON } from './utils.ts'

/**
 * collect-sidebars.ts (v2, 2026-09-09)
 *
 * 新架构数据管线：子库已迁移为单文件格式（tnotes.json + TOC.md + notes/*.md），
 * 本脚本从这两个文件派生导航站所需的全部数据：
 *
 *   tnotes.json → root_items[].title / details / link / icon / completed_notes_count
 *   TOC.md      → sidebars/<repo>/sidebar.json（✅/⏰ 前缀 + 新站深链 + localPath）
 *
 * 本地优先读取（../<repo>），--remote 强制走 GitHub raw（CI 用）。
 */

interface SidebarItem {
  text: string
  link?: string
  collapsed?: boolean
  items?: SidebarItem[]
  /** 笔记文件在库内的相对路径（新格式），用于本地 IDE 打开。 */
  localPath?: string
}

interface KbConfig {
  name?: string
  title?: string
  description?: string
  icon?: { src?: string }
  pageUrl?: string
  stats?: { enabled?: boolean; completedNotesCount?: Record<string, number> }
}

interface RootItem {
  icon?: { src: string }
  title: string
  name?: string
  completed_notes_count?: Record<string, number>
  details?: string
  link?: string
  created_at?: number
  updated_at?: number
  days_since_birth?: number
  is_visible_in_root_folder?: boolean
}

interface RootConfig {
  statistic?: { completed_notes_count?: number }
  sub_knowledge_list: string[]
  root_items: Record<string, RootItem>
}

const readLocalJSON = <T = any>(filePath: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ 读取文件失败: ${filePath}`)
    console.error(`   错误: ${message}`)
    return null
  }
}

/** 最新月份的完成数（current 缺失时取最后一个月份）。 */
function latestCompletedCount(counts: Record<string, number> | undefined): number {
  if (!counts) return 0
  const keys = Object.keys(counts).sort()
  return keys.length > 0 ? counts[keys[keys.length - 1]] : 0
}

/**
 * TOC.md 文本 → SidebarItem 树。
 * 语法：`- 分组` / `- [ ] 0001. 标题` / `- [x] 0001. 标题`（2 空格缩进一级）。
 * localPath 以「库目录」开头（如 TNotes.webpack/notes/0001. xxx.md），
 * 与设置里的本地知识库根目录拼接后即可用 IDE 打开。
 */
function tocToSidebarItems(
  tocText: string,
  pageUrl: string,
  repoName: string,
): SidebarItem[] {
  const base = pageUrl.endsWith('/') ? pageUrl : `${pageUrl}/`
  const root: SidebarItem[] = []
  // 栈元素是「容器」：根伪节点 / 分组 / 笔记。笔记也可作父级（TOC 支持笔记下
  // 嵌套笔记），items 懒创建——只有真正挂子节点时才生成，避免空数组。
  const stack: Array<{ indent: number; container: SidebarItem }> = [
    { indent: -1, container: { text: '', items: root } },
  ]

  for (const line of tocText.split(/\r?\n/)) {
    const parsed = parseTocLine(line)
    if (parsed.kind === 'unknown') continue

    while (stack.length > 1 && stack[stack.length - 1].indent >= parsed.indentLevel) {
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

async function collectSidebars(
  options: { remote?: boolean; repo?: string } = {},
): Promise<void> {
  const { remote = false, repo } = options

  console.log('📚 开始收集知识库数据（tnotes.json + TOC.md）...\n')
  if (remote) console.log('🌐 使用远程模式读取\n')
  if (repo) console.log(`🎯 增量模式：仅收集 ${repo}\n`)

  const rootConfig = readLocalJSON<RootConfig>(ROOT_CONFIG_PATH)
  if (!rootConfig || !rootConfig.sub_knowledge_list) {
    console.error('❌ 无法读取根配置或子知识库列表为空')
    process.exit(1)
  }
  rootConfig.root_items ??= {}

  const sidebarsDir = path.resolve(__dirname, '..', 'sidebars')
  fs.mkdirSync(sidebarsDir, { recursive: true })

  const repoList = repo
    ? [repo].filter((r) => rootConfig.sub_knowledge_list.includes(r))
    : rootConfig.sub_knowledge_list

  if (repo && repoList.length === 0) {
    console.error(`❌ ${repo} 不在 sub_knowledge_list 中`)
    process.exit(1)
  }

  let successCount = 0
  let failCount = 0
  let totalCompleted = 0

  const results = await pMap(
    repoList,
    async (repoName) => {
      const [config, tocText] = await Promise.all([
        readRepoJSON<KbConfig>(repoName, 'tnotes.json', { forceRemote: remote }),
        readRepoFile(repoName, 'TOC.md', { forceRemote: remote }),
      ])
      return { repoName, config, tocText }
    },
    6,
  )

  for (const { repoName, config, tocText } of results) {
    if (!config) {
      console.error(`❌ [${repoName}] 读取 tnotes.json 失败`)
      failCount++
      continue
    }

    const pageUrl = config.pageUrl ?? `https://tnotesjs.github.io/${repoName}/`

    // 1. TOC.md → sidebar.json（TOC 缺失不致命：信息卡仍更新）
    if (tocText) {
      const sidebar = tocToSidebarItems(tocText, pageUrl, repoName)
      const targetDir = path.join(sidebarsDir, repoName)
      fs.mkdirSync(targetDir, { recursive: true })
      fs.writeFileSync(
        path.join(targetDir, 'sidebar.json'),
        JSON.stringify(sidebar),
        'utf8',
      )
    } else {
      console.warn(`⚠️  [${repoName}] TOC.md 缺失，跳过目录树（保留旧数据）`)
    }

    // 2. tnotes.json → root_items（保留根仓本地维护的字段）
    const prev = rootConfig.root_items[repoName] ?? {}
    const completedCounts = config.stats?.completedNotesCount
    rootConfig.root_items[repoName] = {
      ...prev,
      name: repoName,
      title: config.title?.trim() || repoName.replace(/^TNotes\./, ''),
      details: config.description ?? prev.details ?? '',
      link: pageUrl,
      icon: config.icon?.src ? { src: config.icon.src } : prev.icon,
      completed_notes_count: completedCounts ?? prev.completed_notes_count,
    }
    totalCompleted += latestCompletedCount(completedCounts)

    console.log(`✅ [${repoName}] 已收集`)
    successCount++
  }

  // 3. 汇总总完成数并写回根配置
  rootConfig.statistic = {
    ...(rootConfig.statistic ?? {}),
    completed_notes_count: totalCompleted,
  }
  fs.writeFileSync(ROOT_CONFIG_PATH, `${JSON.stringify(rootConfig, null, 2)}\n`, 'utf8')

  console.log('\n📊 收集完成统计:')
  console.log(`   ✅ 成功: ${successCount}`)
  console.log(`   ❌ 失败: ${failCount}`)
  console.log(`   📁 输出目录: ${sidebarsDir}`)
  console.log(`   📝 根配置已更新: ${ROOT_CONFIG_PATH}`)

  if (failCount > 0) process.exit(1)
}

// CLI 入口
const args = minimist(process.argv.slice(2))
collectSidebars({
  remote: !!args.remote,
  repo: args.repo || undefined,
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('❌ 收集失败:', message)
  process.exit(1)
})
