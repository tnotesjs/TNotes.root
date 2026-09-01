/**
 * migrate-to-npm.ts
 *
 * 一次性批量迁移脚本：将所有子知识库从 git submodule 形式迁移到 NPM @tnotesjs/core 形式
 *
 * 用法：
 *   npx tsx scripts/migrate-to-npm.ts
 *   npx tsx scripts/migrate-to-npm.ts --dry-run   # 仅预览，不实际执行
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import minimist from 'minimist'
import { __dirname, ROOT_CONFIG_PATH } from './constants.ts'

// ================================================================
// #region - 常量
// ================================================================

interface RootConfig {
  sub_knowledge_list: string[]
}

/** 已完成迁移或不需要迁移的仓库 */
const SKIP_LIST = ['TNotes.git-notes', 'TNotes.introduction', 'en-words']

/** 迁移后的 package.json 模板 */
const NPM_PACKAGE_JSON = `{
  "type": "module",
  "scripts": {
    "tn:build": "                       tnotes --build",
    "tn:create-notes": "                tnotes --create-notes",
    "tn:dev": "                         tnotes --dev",
    "tn:fix-timestamps": "              tnotes --fix-timestamps",
    "tn:help": "                        tnotes --help",
    "tn:preview": "                     tnotes --preview",
    "tn:pull": "                        tnotes --pull",
    "tn:push": "                        tnotes --push",
    "tn:update": "                      tnotes --update",
    "tn:update-completed-count": "      tnotes --update-completed-count"
  },
  "devDependencies": {
    "vite": "^7.3.1",
    "vitepress": "^1.6.3",
    "vue": "^3.5.27"
  },
  "dependencies": {
    "@tnotesjs/core": "^0.1.12"
  }
}
`

/** 迁移后的 .vitepress/config.mts 内容 */
const NPM_CONFIG_MTS = `/**
 * .vitepress/config.mts
 *
 * VitePress 站点配置文件 - 连接层
 *
 * 所有配置逻辑封装在 @tnotesjs/core 中，此文件仅作为 VitePress 入口。
 *
 * !注意：主题入口文件模块的位置是 VitePress 规定的，不能更改位置！
 */
import { defineNotesConfig } from '@tnotesjs/core/vitepress/config'

export default defineNotesConfig()
`

/** 迁移后的 .vitepress/theme/index.ts 内容 */
const NPM_THEME_INDEX = `/**
 * .vitepress/theme/index.ts
 *
 * 主题入口文件模块 - 连接层
 *
 * 所有主题逻辑封装在 @tnotesjs/core 中，此文件仅作为 VitePress 入口。
 *
 * !注意：主题入口文件模块的位置是 VitePress 规定的，不能更改位置！
 */
import { defineNotesTheme } from '@tnotesjs/core/vitepress/theme'

export default defineNotesTheme()
`

// #endregion

// ================================================================
// #region - 工具函数
// ================================================================

function run(cmd: string, cwd: string, silent = false): string {
  try {
    return execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    }).trim()
  } catch {
    return ''
  }
}

function runSilent(cmd: string, cwd: string): string {
  return run(cmd, cwd, true)
}

function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath)
}

function rmrf(target: string): void {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true })
  }
}

// #endregion

// ================================================================
// #region - 迁移单个仓库
// ================================================================

function migrateRepo(
  repoDir: string,
  repoName: string,
  dryRun: boolean,
): boolean {
  const folderName = path.basename(repoDir)

  if (!fs.existsSync(repoDir)) {
    console.warn(`  ⚠️  目录不存在，跳过`)
    return false
  }

  if (!fs.existsSync(path.join(repoDir, 'package.json'))) {
    console.warn(`  ⚠️  无 package.json，跳过`)
    return false
  }

  // 检查是否已经迁移（package.json 中有 @tnotesjs/core 且没有旧的 tsx 脚本）
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(repoDir, 'package.json'), 'utf-8'),
    )
    const hasCore = pkg.dependencies?.['@tnotesjs/core']
    const hasTsx = Object.values(pkg.scripts || {}).some((s: any) =>
      s.includes('tsx'),
    )
    if (hasCore && !hasTsx) {
      console.log(`  ℹ️  已是 NPM 形式，跳过`)
      return false
    }
  } catch {}

  if (dryRun) {
    console.log(`  🔍 [dry-run] 将执行迁移`)
    return true
  }

  // Step 1: 重写 package.json
  console.log(`  📦 重写 package.json`)
  fs.writeFileSync(
    path.join(repoDir, 'package.json'),
    NPM_PACKAGE_JSON.trim() + '\n',
    'utf-8',
  )

  // Step 2: 重写 .vitepress/config.mts
  const configPath = path.join(repoDir, '.vitepress', 'config.mts')
  if (fileExists(configPath)) {
    console.log(`  📝 重写 .vitepress/config.mts`)
    fs.writeFileSync(configPath, NPM_CONFIG_MTS, 'utf-8')
  }

  // Step 3: 重写 .vitepress/theme/index.ts
  const themePath = path.join(repoDir, '.vitepress', 'theme', 'index.ts')
  if (fileExists(themePath)) {
    console.log(`  📝 重写 .vitepress/theme/index.ts`)
    fs.writeFileSync(themePath, NPM_THEME_INDEX, 'utf-8')
  }

  // Step 4: 清理 git submodule 残留
  console.log(`  🧹 清理 submodule 残留`)

  // 删除 .gitmodules 文件（工作区）
  const gitmodulesPath = path.join(repoDir, '.gitmodules')
  if (fileExists(gitmodulesPath)) {
    fs.unlinkSync(gitmodulesPath)
  }

  // git rm --cached .gitmodules（忽略报错 —— 可能未被跟踪）
  runSilent('git rm --cached .gitmodules', repoDir)

  // git rm --cached .vitepress/tnotes（移除 gitlink 条目）
  runSilent('git rm --cached .vitepress/tnotes', repoDir)

  // 删除实际目录
  rmrf(path.join(repoDir, '.vitepress', 'tnotes'))

  // 清理子模块元数据
  rmrf(path.join(repoDir, '.git', 'modules', '.vitepress', 'tnotes'))
  // 有些仓库可能存储在 .git/modules/ 下不同的路径
  rmrf(path.join(repoDir, '.git', 'modules'))

  // 清理 .git/config 中的 submodule 段落
  const gitConfigPath = path.join(repoDir, '.git', 'config')
  if (fileExists(gitConfigPath)) {
    try {
      runSilent(
        'git config --remove-section submodule.".vitepress/tnotes"',
        repoDir,
      )
    } catch {}
  }

  // Step 5: 清理旧 node_modules 和缓存
  console.log(`  🗑️  清理旧缓存`)
  rmrf(path.join(repoDir, 'node_modules'))
  rmrf(path.join(repoDir, 'pnpm-lock.yaml'))
  rmrf(path.join(repoDir, '.vitepress', 'cache'))

  // Step 6: pnpm install
  console.log(`  📥 安装依赖 (pnpm install)`)
  try {
    run('pnpm install', repoDir)
  } catch (err) {
    console.error(`  ❌ pnpm install 失败`)
    return false
  }

  // Step 7: git commit
  console.log(`  💾 Git commit`)
  run('git add -A', repoDir)
  try {
    runSilent(
      'git commit -m "chore: migrate from submodule to @tnotesjs/core npm package"',
      repoDir,
    )
  } catch {
    console.log(`  ℹ️  无变更需要提交`)
  }

  return true
}

// #endregion

// ================================================================
// #region - 主流程
// ================================================================

const args = minimist(process.argv.slice(2), {
  boolean: ['dry-run'],
})

const dryRun = args['dry-run'] || false

// 读取根配置
const rootConfig: RootConfig = JSON.parse(
  fs.readFileSync(ROOT_CONFIG_PATH, 'utf8'),
)

const repos = rootConfig.sub_knowledge_list.filter(
  (name: string) => !SKIP_LIST.includes(name),
)

console.log('')
console.log('═'.repeat(60))
console.log(
  dryRun
    ? '🔍 [DRY RUN] 预览迁移计划'
    : '🚀 开始批量迁移：submodule → @tnotesjs/core NPM',
)
console.log('═'.repeat(60))
console.log(`  待处理：${repos.length} 个仓库`)
console.log(`  跳过：${SKIP_LIST.join(', ')}`)
console.log('')

let successCount = 0
let failCount = 0
let skipCount = 0

for (const repoName of repos) {
  const repoDir = path.resolve(__dirname, '..', '..', repoName)
  console.log(`\n▶️  [${repoName}]`)
  console.log('─'.repeat(40))

  const result = migrateRepo(repoDir, repoName, dryRun)
  if (result) {
    successCount++
    console.log(`  ✅ 完成`)
  } else {
    // check if it was skipped or failed
    skipCount++
  }
}

console.log('')
console.log('═'.repeat(60))
console.log(`🎉 迁移完成！`)
console.log(`  ✅ 成功：${successCount}`)
console.log(`  ⏭️  跳过：${skipCount}`)
console.log('═'.repeat(60))
console.log('')

if (!dryRun) {
  console.log('⚠️  注意：所有变更已 commit 但未 push。')
  console.log('   确认无误后，可在根仓库执行：')
  console.log('   pnpm tn:cmd --cmd "git push"')
  console.log('')
}

// #endregion
