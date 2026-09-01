import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('the root package runs the injector prepare hook for git installs', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'dsh-routing-suite-prepare-'))

  try {
    mkdirSync(join(fixture, 'injector', 'scripts'), { recursive: true })
    mkdirSync(join(fixture, 'injector', 'lib'), { recursive: true })
    copyFileSync(join(repoRoot, 'package.json'), join(fixture, 'package.json'))
    copyFileSync(
      join(repoRoot, 'injector', 'scripts', 'prepare.mjs'),
      join(fixture, 'injector', 'scripts', 'prepare.mjs'),
    )
    writeFileSync(join(fixture, 'injector', 'lib', 'index.js'), '')
    writeFileSync(join(fixture, 'injector', 'lib', 'client.js'), '')

    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const result = spawnSync(npm, ['run', 'prepare'], {
      cwd: fixture,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    assert.match(result.stdout, /\[prepare\] lib\/ already built/)
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})

test('the prepared injector entry points are included in the package', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'dsh-routing-suite-pack-'))

  try {
    mkdirSync(join(fixture, 'injector', 'lib'), { recursive: true })
    copyFileSync(join(repoRoot, 'package.json'), join(fixture, 'package.json'))
    copyFileSync(join(repoRoot, 'injector', '.gitignore'), join(fixture, 'injector', '.gitignore'))

    const npmIgnore = join(repoRoot, 'injector', '.npmignore')
    if (existsSync(npmIgnore)) {
      copyFileSync(npmIgnore, join(fixture, 'injector', '.npmignore'))
    }

    writeFileSync(join(fixture, 'injector', 'lib', 'index.js'), '')
    writeFileSync(join(fixture, 'injector', 'lib', 'client.js'), '')

    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const result = spawnSync(npm, ['pack', '--dry-run', '--json', '--ignore-scripts'], {
      cwd: fixture,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
    const paths = JSON.parse(result.stdout)[0].files.map(({ path }) => path)
    assert.ok(paths.includes('injector/lib/index.js'), 'package omits injector/lib/index.js')
    assert.ok(paths.includes('injector/lib/client.js'), 'package omits injector/lib/client.js')
  } finally {
    rmSync(fixture, { recursive: true, force: true })
  }
})
