import fs from 'fs'
import path from 'path'
import { __dirname } from './constants.ts'

// ================================================================
// #region - 常量
// ================================================================

/** GitHub 组织名 */
const GITHUB_ORG = 'tnotesjs'

/** GitHub raw 文件 CDN 基础 URL */
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com'

// #endregion

// ================================================================
// #region - 远程文件读取
// ================================================================

/** 最大重试次数 */
const MAX_RETRIES = 3

/** 单次请求超时（毫秒） */
const FETCH_TIMEOUT = 10_000

/**
 * 延迟指定毫秒
 */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 从 GitHub raw CDN 获取远程文件内容（带重试 + 超时）
 *
 * @param repoName 仓库名称，如 TNotes.leetcode
 * @param filePath 文件路径，如 tnotes.json 或 TOC.md
 * @param branch 分支名，默认 main
 * @returns 文件内容字符串，失败返回 null
 */
async function fetchRemoteFile(
  repoName: string,
  filePath: string,
  branch = 'main',
): Promise<string | null> {
  const url = `${GITHUB_RAW_BASE}/${GITHUB_ORG}/${repoName}/${branch}/${filePath}`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)

      if (!res.ok) {
        console.warn(`⚠️  远程文件获取失败: ${url} (${res.status})`)
        return null
      }
      return await res.text()
    } catch (error: unknown) {
      if (attempt < MAX_RETRIES) {
        const waitMs = attempt * 1000
        await delay(waitMs)
      } else {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`⚠️  远程文件获取异常: ${url} — ${message}`)
        return null
      }
    }
  }
  return null
}

/**
 * 读取子仓库中的文件内容（本地优先，可选远程回退）
 *
 * 本地候选目录（按序）：
 *   1. `<root>/../kbs/<repo>`   —— 现行布局（kbs/ 集中存放）
 *   2. `<root>/../<repo>`       —— 旧平铺布局
 *
 * @param repoName 仓库名称
 * @param filePath 文件相对路径
 * @param options.forceRemote 强制使用远程读取
 * @returns 文件内容字符串，失败返回 null
 */
async function readRepoFile(
  repoName: string,
  filePath: string,
  options: { forceRemote?: boolean } = {},
): Promise<string | null> {
  const { forceRemote = false } = options

  // 本地读取
  if (!forceRemote) {
    const candidates = [
      path.resolve(__dirname, '..', '..', 'kbs', repoName, filePath),
      path.resolve(__dirname, '..', '..', repoName, filePath),
    ]
    for (const localPath of candidates) {
      if (fs.existsSync(localPath)) {
        try {
          return fs.readFileSync(localPath, 'utf8')
        } catch {
          // 本地读取失败，尝试下一个候选
        }
      }
    }
  }

  // 远程读取
  return fetchRemoteFile(repoName, filePath)
}

/**
 * 读取子仓库中的 JSON 文件
 *
 * @param repoName 仓库名称
 * @param filePath JSON 文件相对路径
 * @param options.forceRemote 强制使用远程读取
 * @returns 解析后的 JSON 对象，失败返回 null
 */
async function readRepoJSON<T = any>(
  repoName: string,
  filePath: string,
  options: { forceRemote?: boolean } = {},
): Promise<T | null> {
  const content = await readRepoFile(repoName, filePath, options)
  if (content === null) return null
  try {
    return JSON.parse(content)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`⚠️  JSON 解析失败 [${repoName}/${filePath}]: ${message}`)
    return null
  }
}

// #endregion

// ================================================================
/**
 * 并发控制的 Promise.all
 *
 * @param items 要处理的元素数组
 * @param fn 异步处理函数
 * @param concurrency 最大并发数，默认 3
 * @returns 所有元素的处理结果（保持顺序）
 */
async function pMap<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency = 3,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return results
}

// #endregion

export { fetchRemoteFile, pMap, readRepoFile, readRepoJSON }
