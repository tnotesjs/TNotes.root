export type LocalIdeId = 'vscode' | 'cursor'

export const DEFAULT_LOCAL_IDE: LocalIdeId = 'vscode'

export const LOCAL_IDE_STORAGE_KEY = 'knowledge-navigator-local-ide'

const IDE_SCHEMES: Record<LocalIdeId, string> = {
  vscode: 'vscode',
  cursor: 'cursor',
}

export function normalizeLocalIde(
  value: string | null | undefined,
): LocalIdeId {
  return value === 'cursor' ? 'cursor' : DEFAULT_LOCAL_IDE
}

export function toIdeFileUrl(
  filePath: string,
  ide: LocalIdeId = DEFAULT_LOCAL_IDE,
): string {
  const scheme = IDE_SCHEMES[normalizeLocalIde(ide)]
  return `${scheme}://file/${filePath}`
}

/**
 * 构建本地 IDE 打开链接（VS Code / Cursor）——知识库目录
 */
export function buildIdeLink(
  tnotesDir: string,
  repoName: string,
  ide: LocalIdeId = DEFAULT_LOCAL_IDE,
): string {
  return toIdeFileUrl(`${tnotesDir}/${repoName}`, ide)
}

/**
 * 构建本地 IDE 打开链接——笔记文件
 * @param localPath 以库目录开头的相对路径（TNotes.xxx/notes/NNNN. 标题.md），
 *                  由 collect-sidebars 生成
 */
export function buildIdeNoteLink(
  tnotesDir: string,
  localPath: string,
  ide: LocalIdeId = DEFAULT_LOCAL_IDE,
): string {
  return toIdeFileUrl(`${tnotesDir}/${localPath}`, ide)
}

/**
 * 构建 GitHub 仓库链接
 */
export function buildGitHubLink(repoName: string): string {
  return `https://github.com/tnotesjs/${repoName}`
}
