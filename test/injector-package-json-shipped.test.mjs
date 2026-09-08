import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Regression guard: the injector is a *sub* package (injector/package.json).
 * The root "files" whitelist must ship it, otherwise a git-hosted install
 * (dsh plugin --profile web add github:...) drops the file and DSH fails to
 * boot with MODULE_NOT_FOUND on injector/lib/index.js.
 */
test('injector/package.json is shipped in the published tarball', () => {
  const raw = execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    { cwd: repoRoot, encoding: 'utf8', shell: process.platform === 'win32' },
  )

  // npm may print script output (e.g. "[prepare] ...") before the JSON payload;
  // locate the array start by matching '[' followed by a '{' object.
  const start = raw.search(/\[\s*\{/)
  assert.notEqual(start, -1, `no JSON payload found in npm pack output:\n${raw}`)
  const json = raw.slice(start)
  const [{ files }] = JSON.parse(json)
  const paths = files.map((f) => f.path)

  assert.ok(
    paths.includes('injector/package.json'),
    'injector/package.json must be listed in "files" of the root package.json',
  )
  assert.ok(
    paths.includes('injector/lib/index.js'),
    'injector/lib/index.js must be shipped (entry point)',
  )
})
