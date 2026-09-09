import fs from 'fs'
import path from 'path'
import minimist from 'minimist'
import { __dirname, ROOT_CONFIG_PATH } from './constants.ts'
import { pMap, readRepoFile, readRepoJSON } from './utils.ts'

/**
 * collect.ts (v3, 2026-09-09)
 *
 * 收集子库原始数据，供根站构建（scripts/tnotes-data-plugin.ts）使用：
 *
 *   tnotes.json → 合并进根配置 root_items（title/details/link/icon/完成数）
 *   TOC.md      → toc/<repo>.md 原始副本（烹饪在构建期由 Vite 插件完成）
 *
 * 读取模式：
 *   本地（默认）：../kbs/<repo>/ 或 ../<repo>/，用于首次 seed 与手动刷新
 *   远程（--remote）：GitHub raw，CI 用；--trigger-repo + --sha 时该库按
 *   commit sha 精确拉取（不可变 URL，绕过 raw 分支 URL 的 CDN 缓存）
 */

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

async function collect(
  options: {
    remote?: boolean
    repo?: string
    triggerRepo?: string
    sha?: string
  } = {},
): Promise<void> {
  const { remote = false, repo, triggerRepo, sha } = options

  console.log('📚 开始收集知识库数据（tnotes.json + TOC.md）...\n')
  if (remote) console.log('🌐 使用远程模式读取\n')
  if (repo) console.log(`🎯 增量模式：仅收集 ${repo}\n`)
  if (triggerRepo && sha) {
    console.log(`📌 触发库 ${triggerRepo} 按 sha ${sha.slice(0, 7)} 精确拉取\n`)
  }

  const rootConfig = readLocalJSON<RootConfig>(ROOT_CONFIG_PATH)
  if (!rootConfig || !rootConfig.sub_knowledge_list) {
    console.error('❌ 无法读取根配置或子知识库列表为空')
    process.exit(1)
  }
  rootConfig.root_items ??= {}

  const tocDir = path.resolve(__dirname, '..', 'toc')
  fs.mkdirSync(tocDir, { recursive: true })

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
      // 触发库按 sha 拉取（仅远程模式有意义）；其余库走 main / 本地
      const ref = remote && repoName === triggerRepo && sha ? sha : undefined
      const [config, tocText] = await Promise.all([
        readRepoJSON<KbConfig>(repoName, 'tnotes.json', {
          forceRemote: remote,
          ref,
        }),
        readRepoFile(repoName, 'TOC.md', { forceRemote: remote, ref }),
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

    // 1. TOC.md → toc/<repo>.md 原始副本（TOC 缺失不致命：信息卡仍更新）
    if (tocText) {
      fs.writeFileSync(path.join(tocDir, `${repoName}.md`), tocText, 'utf8')
    } else {
      console.warn(`⚠️  [${repoName}] TOC.md 缺失，跳过目录副本（保留旧数据）`)
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
  console.log(`   📁 输出目录: ${tocDir}`)
  console.log(`   📝 根配置已更新: ${ROOT_CONFIG_PATH}`)

  if (failCount > 0) process.exit(1)
}

// CLI 入口
const args = minimist(process.argv.slice(2))
collect({
  remote: !!args.remote,
  repo: args.repo || undefined,
  triggerRepo: args['trigger-repo'] || undefined,
  sha: args.sha || undefined,
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error('❌ 收集失败:', message)
  process.exit(1)
})
