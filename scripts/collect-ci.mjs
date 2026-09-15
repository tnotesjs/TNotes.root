import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

/** Run only in a disposable, clean checkout: retries discard generated output. */
export function collectAndPush({
  cwd = process.cwd(),
  args = [],
  message,
  collect,
  maxAttempts = 4,
}) {
  const git = (...argv) =>
    execFileSync('git', argv, { cwd, encoding: 'utf8' }).trim()
  if (git('status', '--porcelain'))
    throw new Error('Collection requires a clean checkout')
  const runCollect =
    collect ??
    (() =>
      execFileSync('pnpm', ['tsx', 'scripts/collect.ts', ...args], {
        cwd,
        stdio: 'inherit',
      }))

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    git('fetch', 'origin', 'main')
    const base = git('rev-parse', 'origin/main')
    // This checkout is disposable; never merge stale generated metadata.
    git('reset', '--hard', base)
    git('clean', '-f', '--', 'toc/')
    runCollect()
    git('add', '--', '.tnotes.json', 'toc/')
    const changed = git('diff', '--cached', '--name-only')
    if (changed) git('commit', '-m', message)

    // Also check the no-change case, so the build cannot silently use an old tip.
    git('fetch', 'origin', 'main')
    if (git('rev-parse', 'origin/main') !== base) {
      console.log(
        `Remote main advanced; recollecting (${attempt}/${maxAttempts})`,
      )
      continue
    }
    if (!changed) {
      console.log('Metadata is already up to date')
      return
    }
    try {
      git('push', 'origin', 'HEAD:refs/heads/main')
      console.log('Collected metadata pushed successfully')
      return
    } catch (error) {
      git('fetch', 'origin', 'main')
      if (git('rev-parse', 'origin/main') === base) throw error
      console.log(
        `Remote main advanced during push; recollecting (${attempt}/${maxAttempts})`,
      )
    }
  }
  throw new Error(
    `Remote main kept changing; collection stopped after ${maxAttempts} attempts`,
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.env.GITHUB_ACTIONS !== 'true')
    throw new Error(
      'This script is only for disposable GitHub Actions checkouts',
    )
  const args = ['--remote']
  const repo = process.env.COLLECT_REPO || ''
  const triggerRepo = process.env.TRIGGER_REPO || ''
  const sha = process.env.TRIGGER_SHA || ''
  let message = 'chore: collect all sub-repo metadata'
  if (process.env.COLLECT_EVENT === 'workflow_dispatch' && repo) {
    args.push('--repo', repo)
    message = `chore: collect metadata from ${repo}`
  } else if (process.env.COLLECT_EVENT === 'repository_dispatch') {
    if (triggerRepo && sha)
      args.push('--trigger-repo', triggerRepo, '--sha', sha)
    message = `chore: collect all metadata (triggered by ${triggerRepo})`
  }
  collectAndPush({ args, message })
}
