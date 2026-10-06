import fs from 'fs'
import path from 'path'
import minimist from 'minimist'
import { __dirname, ROOT_CONFIG_PATH } from './constants.ts'
import { pMap, readRepoFile, readRepoJSON } from './utils.ts'

/**
 * collect.ts (v4, 2026-10-06)
 *
 * 收集子库原始数据，供根站构建使用：
 *
 *   tnotes.json       → 合并进根配置 root_items（title/details/link/icon）
 *   tnotes.stats.json → 月累计（兼容）+ 根侧聚合热力图数据（v2：每日 commits 用于着色）
 *   TOC.md            → toc/<repo>.md 原始副本
 *
 * 统计优先读 tnotes.stats.json；缺失时回退 tnotes.json → stats.completedNotesCount。
 */

interface DayStat {
  delta: number
  total: number
  /** commits authored that day (v2+); heatmap colour */
  commits?: number
}

interface KbStatsFile {
  version: number
  sourceCommit?: string
  byYear: Record<string, Record<string, Record<string, DayStat>>>
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

const ROOT_STATS_PATH = path.resolve(__dirname, '..', 'tnotes.stats.json')

const readLocalJSON = <T = any>(filePath: string): T | null => {
  try {
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ 读取文件失败: ${filePath}`)
    console.error(`   错误: ${message}`)
    return null
  }
}

/** Latest monthly total (current missing → last month key). */
function latestCompletedCount(counts: Record<string, number> | undefined): number {
  if (!counts) return 0
  const keys = Object.keys(counts).sort()
  return keys.length > 0 ? counts[keys[keys.length - 1]] : 0
}

/** byYear → dense-ish monthly YY.MM → total (last day of each month). */
function monthlyFromByYear(
  byYear: KbStatsFile['byYear'] | undefined,
): Record<string, number> | undefined {
  if (!byYear) return undefined
  const snapshots: Record<string, number> = {}
  for (const year of Object.keys(byYear).sort()) {
    const yy = year.slice(-2)
    const months = byYear[year] ?? {}
    for (const month of Object.keys(months).sort()) {
      const days = months[month] ?? {}
      const dayKeys = Object.keys(days).sort()
      if (dayKeys.length === 0) continue
      const last = days[dayKeys[dayKeys.length - 1]]
      snapshots[`${yy}.${month}`] = last.total
    }
  }
  return Object.keys(snapshots).length > 0 ? snapshots : undefined
}

/**
 * Merge per-KB byYear into an all-site byYear:
 * sum deltas + commits per day; recompute running totals chronologically.
 */
function mergeByYear(parts: KbStatsFile['byYear'][]): KbStatsFile['byYear'] {
  const merged: KbStatsFile['byYear'] = {}
  for (const byYear of parts) {
    for (const year of Object.keys(byYear)) {
      for (const month of Object.keys(byYear[year] ?? {})) {
        for (const day of Object.keys(byYear[year][month] ?? {})) {
          const cell = byYear[year][month][day]
          merged[year] ??= {}
          merged[year][month] ??= {}
          const prev = merged[year][month][day] ?? { delta: 0, total: 0, commits: 0 }
          merged[year][month][day] = {
            delta: prev.delta + (Number(cell.delta) || 0),
            total: 0,
            commits: (prev.commits ?? 0) + (Number(cell.commits) || 0),
          }
        }
      }
    }
  }
  let running = 0
  for (const year of Object.keys(merged).sort()) {
    for (const month of Object.keys(merged[year]).sort()) {
      for (const day of Object.keys(merged[year][month]).sort()) {
        const cell = merged[year][month][day]
        running += cell.delta
        cell.total = running
      }
    }
  }
  return merged
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

  console.log('📚 开始收集知识库数据（tnotes.json + tnotes.stats.json + TOC.md）...\n')
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
      const ref = remote && repoName === triggerRepo && sha ? sha : undefined
      const [config, tocText, statsFile] = await Promise.all([
        readRepoJSON<KbConfig>(repoName, 'tnotes.json', {
          forceRemote: remote,
          ref,
        }),
        readRepoFile(repoName, 'TOC.md', { forceRemote: remote, ref }),
        readRepoJSON<KbStatsFile>(repoName, 'tnotes.stats.json', {
          forceRemote: remote,
          ref,
        }),
      ])
      return { repoName, config, tocText, statsFile }
    },
    6,
  )

  const perKbByYear: Record<string, KbStatsFile['byYear']> = {}
  // When incremental collect, keep previous per-kb buckets from root stats.
  const prevRootStats = readLocalJSON<{
    version?: number
    byYear?: KbStatsFile['byYear']
    byKnowledgeBase?: Record<string, { byYear: KbStatsFile['byYear'] }>
  }>(ROOT_STATS_PATH)
  if (prevRootStats?.byKnowledgeBase) {
    for (const [name, bucket] of Object.entries(prevRootStats.byKnowledgeBase)) {
      if (bucket?.byYear) perKbByYear[name] = bucket.byYear
    }
  }

  for (const { repoName, config, tocText, statsFile } of results) {
    if (!config) {
      console.error(`❌ [${repoName}] 读取 tnotes.json 失败`)
      failCount++
      continue
    }

    const pageUrl = config.pageUrl ?? `https://tnotesjs.github.io/${repoName}/`

    if (tocText) {
      fs.writeFileSync(path.join(tocDir, `${repoName}.md`), tocText, 'utf8')
    } else {
      console.warn(`⚠️  [${repoName}] TOC.md 缺失，跳过目录副本（保留旧数据）`)
    }

    const monthly =
      monthlyFromByYear(statsFile?.byYear) ?? config.stats?.completedNotesCount

    if (statsFile?.byYear) {
      perKbByYear[repoName] = statsFile.byYear
    }

    const prev = rootConfig.root_items[repoName] ?? {}
    rootConfig.root_items[repoName] = {
      ...prev,
      name: repoName,
      title: config.title?.trim() || repoName.replace(/^TNotes\./, ''),
      details: config.description ?? prev.details ?? '',
      link: pageUrl,
      icon: config.icon?.src ? { src: config.icon.src } : prev.icon,
      completed_notes_count: monthly ?? prev.completed_notes_count,
    }
    totalCompleted += latestCompletedCount(monthly)

    const source = statsFile?.byYear
      ? 'tnotes.stats.json'
      : monthly
        ? 'tnotes.json(legacy)'
        : 'none'
    console.log(`✅ [${repoName}] 已收集（统计: ${source}）`)
    successCount++
  }

  // Full-list collect: recompute total from all root_items so incremental mode
  // doesn't under-count other libraries.
  if (!repo) {
    totalCompleted = 0
    for (const name of rootConfig.sub_knowledge_list) {
      totalCompleted += latestCompletedCount(
        rootConfig.root_items[name]?.completed_notes_count,
      )
    }
  } else {
    totalCompleted = 0
    for (const name of rootConfig.sub_knowledge_list) {
      totalCompleted += latestCompletedCount(
        rootConfig.root_items[name]?.completed_notes_count,
      )
    }
  }

  rootConfig.statistic = {
    ...(rootConfig.statistic ?? {}),
    completed_notes_count: totalCompleted,
  }
  fs.writeFileSync(ROOT_CONFIG_PATH, `${JSON.stringify(rootConfig, null, 2)}\n`, 'utf8')

  const allByYear = mergeByYear(Object.values(perKbByYear))
  const rootStats = {
    version: 2 as const,
    generatedAt: new Date().toISOString(),
    byYear: allByYear,
    byKnowledgeBase: Object.fromEntries(
      Object.entries(perKbByYear).map(([name, byYear]) => [name, { byYear }]),
    ),
  }
  fs.writeFileSync(ROOT_STATS_PATH, `${JSON.stringify(rootStats, null, 2)}\n`, 'utf8')

  console.log('\n📊 收集完成统计:')
  console.log(`   ✅ 成功: ${successCount}`)
  console.log(`   ❌ 失败: ${failCount}`)
  console.log(`   📁 输出目录: ${tocDir}`)
  console.log(`   📝 根配置已更新: ${ROOT_CONFIG_PATH}`)
  console.log(`   📈 根统计已更新: ${ROOT_STATS_PATH}`)

  if (failCount > 0) process.exit(1)
}

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
