import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectAndPush } from './collect-ci.mjs'

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'tnotes-collect-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const remote = join(dir, 'remote.git'),
    runner = join(dir, 'runner'),
    rival = join(dir, 'rival')
  const git = (cwd, ...args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  git(dir, 'init', '--bare', '--initial-branch=main', remote)
  git(dir, 'clone', remote, runner)
  const identify = (cwd) => {
    git(cwd, 'config', 'user.name', 'test')
    git(cwd, 'config', 'user.email', 'test@example.com')
  }
  identify(runner)
  mkdirSync(join(runner, 'toc'))
  writeFileSync(
    join(runner, '.tnotes.json'),
    '{"manual":"initial","generated":0}\n',
  )
  writeFileSync(join(runner, 'toc/demo.md'), 'initial\n')
  git(runner, 'add', '.')
  git(runner, 'commit', '-m', 'initial')
  git(runner, 'push', 'origin', 'main')
  git(dir, 'clone', remote, rival)
  identify(rival)
  const advance = () => {
    git(rival, 'pull', '--ff-only')
    const config = JSON.parse(readFileSync(join(rival, '.tnotes.json')))
    config.manual += '-remote'
    writeFileSync(join(rival, '.tnotes.json'), JSON.stringify(config) + '\n')
    git(rival, 'add', '.')
    git(rival, 'commit', '-m', 'remote edit')
    git(rival, 'push', 'origin', 'main')
  }
  const collect = () => {
    const config = JSON.parse(readFileSync(join(runner, '.tnotes.json')))
    config.generated = 1
    writeFileSync(join(runner, '.tnotes.json'), JSON.stringify(config) + '\n')
    writeFileSync(join(runner, 'toc/demo.md'), 'new metadata\n')
  }
  const result = () =>
    JSON.parse(git(runner, 'show', 'origin/main:.tnotes.json'))
  return { runner, rival, remote, git, advance, collect, result }
}

test('starts from latest main even when checkout was stale', (t) => {
  const f = fixture(t)
  f.advance()
  collectAndPush({ cwd: f.runner, message: 'collect', collect: f.collect })
  assert.deepEqual(f.result(), { manual: 'initial-remote', generated: 1 })
})

test('recollects when remote changes during collection, preserving manual fields', (t) => {
  const f = fixture(t)
  let calls = 0
  collectAndPush({
    cwd: f.runner,
    message: 'collect',
    collect: () => {
      f.collect()
      if (++calls === 1) {
        writeFileSync(join(f.runner, 'toc/stale.md'), 'discard me')
        f.advance()
      }
    },
  })
  assert.equal(calls, 2)
  assert.deepEqual(f.result(), { manual: 'initial-remote', generated: 1 })
  assert.throws(() => f.git(f.runner, 'show', 'origin/main:toc/stale.md'))
})

test('retries real non-fast-forward rejection during push', (t) => {
  const f = fixture(t)
  const quote = (s) => "'" + s.replaceAll("'", "'\\''") + "'"
  writeFileSync(
    join(f.runner, '.git/hooks/pre-push'),
    `#!/bin/sh\nrm -- "$0"\nprintf '\\nremote edit\\n' >> ${quote(join(f.rival, 'toc/demo.md'))}\ngit -C ${quote(f.rival)} add .\ngit -C ${quote(f.rival)} commit -m racing-edit\ngit -C ${quote(f.rival)} push origin main\n`,
    { mode: 0o755 },
  )
  let calls = 0
  collectAndPush({
    cwd: f.runner,
    message: 'collect',
    collect: () => {
      calls++
      f.collect()
    },
  })
  assert.equal(calls, 2)
  assert.match(
    f.git(f.runner, 'log', '--oneline', 'origin/main'),
    /racing-edit/,
  )
  assert.equal(f.result().generated, 1)
})

test('no-change collection still refreshes after remote advances', (t) => {
  const f = fixture(t)
  let calls = 0
  collectAndPush({
    cwd: f.runner,
    message: 'collect',
    collect: () => {
      if (++calls === 1) f.advance()
    },
  })
  assert.equal(calls, 2)
  assert.equal(
    f.git(f.runner, 'rev-parse', 'HEAD'),
    f.git(f.runner, 'rev-parse', 'origin/main'),
  )
})

test('stops after bounded contention', (t) => {
  const f = fixture(t)
  let calls = 0
  assert.throws(
    () =>
      collectAndPush({
        cwd: f.runner,
        message: 'collect',
        maxAttempts: 2,
        collect: () => {
          calls++
          f.collect()
          f.advance()
        },
      }),
    /after 2 attempts/,
  )
  assert.equal(calls, 2)
  assert.equal(f.result().generated, 0)
})

test('does not retry unrelated push rejection', (t) => {
  const f = fixture(t)
  let calls = 0
  writeFileSync(
    join(f.remote, 'hooks/pre-receive'),
    '#!/bin/sh\necho policy-rejected >&2\nexit 1\n',
    { mode: 0o755 },
  )
  assert.throws(
    () =>
      collectAndPush({
        cwd: f.runner,
        message: 'collect',
        collect: () => {
          calls++
          f.collect()
        },
      }),
    /policy-rejected/,
  )
  assert.equal(calls, 1)
})

test('refuses dirty checkout before discarding any content', (t) => {
  const f = fixture(t)
  writeFileSync(join(f.runner, 'unsaved.txt'), 'keep me')
  assert.throws(
    () =>
      collectAndPush({ cwd: f.runner, message: 'collect', collect: f.collect }),
    /clean checkout/,
  )
  assert.equal(readFileSync(join(f.runner, 'unsaved.txt'), 'utf8'), 'keep me')
})
