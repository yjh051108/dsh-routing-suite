/**
 * 脚手架产物形态回归测试（2026-11-18 · Creator-mode 重审）
 *
 * 背景：`dev_scaffold_plugin` 早先只写 `dsh.client`，**从不写 `dsh.bundle`、也从不
 * 生成 `cordis.patch.yml`** ⇒ 产物两条安装通道都走不通：
 *   · 官方 `dsh plugin add` / `plugin_manager{install_bundle}` 硬性要求
 *     `dsh.bundle.patch`（plugin-manager/lib/index.js:2074 抛 not-bundle；
 *     没有它 CLI 只打一行 warning 当普通依赖装、entry 永不出现）；
 *   · inventory 拿不到标题/描述（读 `<pkg>/locale/en.json` 的 meta），
 *     显示为裸模块名 + 无图标。
 * 实测复现：link: 装的裸包 `ERR_MODULE_NOT_FOUND`，非 bundle 被 boot 跳过。
 *
 * 本套件锁三件事（防回归到"只能注入、装不回 profile"的半残形态）：
 *   ① package.json 必须发 `dsh.bundle.patch`（**四种形态都要**，host-only 也要）；
 *   ② 必须真的写出 `cordis.patch.yml` / `locale/en.json` / `icon.svg`；
 *   ③ 构建产物 lib/index.js 必须与 src 同步（陈旧 lib ⇒ 运行中的注入器仍发旧模板）。
 *
 * 运行：npm test（或 node --test tests/*.test.mjs）
 */
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = fs.readFileSync(path.join(ROOT, 'src/index.ts'), 'utf8')
const LIB_PATH = path.join(ROOT, 'lib/index.js')
const LIB = fs.existsSync(LIB_PATH) ? fs.readFileSync(LIB_PATH, 'utf8') : undefined

describe('dev_scaffold_plugin：产物必须是标准 bundle（双通道可装）', () => {
  test('package.json 发 dsh.bundle.patch（不再只有 dsh.client）', () => {
    assert.match(
      SRC,
      /bundle:\s*\{\s*patch:\s*'\.\/cordis\.patch\.yml'\s*\}/,
      '脚手架 package.json 缺 dsh.bundle.patch ⇒ 官方通道必然 not-bundle，'
        + '刷新不了 profile。四种形态都要发（host-only 也不例外）。',
    )
    // 反向守卫：不许退回到"只有 client 表单页才设 dsh 字段"的旧形态
    assert.doesNotMatch(
      SRC,
      /if \(withClient\) \{\s*;(\(pkg as Record<string, unknown>\)\.dsh) = \{/,
      'dsh 字段又变回 client-only 分支了 —— dsh.bundle 必须无条件写',
    )
  })

  test('scaffold 真的写出 cordis.patch.yml / locale/en.json / icon.svg', () => {
    for (const [file, why] of [
      ['cordis.patch.yml', '官方装配入口（bundle patch）'],
      ['locale/en.json', 'inventory 的标题/描述来源（readPluginMeta → meta.title）'],
      ['icon.svg', '插件图标（官方要求 SVG/PNG/JPEG/WebP，<256KiB）'],
    ]) {
      assert.ok(
        SRC.includes(`['${file}'`),
        `脚手架未把 ${file} 写进产物 —— ${why} 缺失，产物只能注入、装不回 profile`,
      )
    }
    // patch 内容必须是合法 loader patch（insert 一行同名 entry）
    assert.match(SRC, /- insert:\r?\n\s+- id: \$\{entryId\}\r?\n\s+name: '\$\{pkgName\}'/, 'cordis.patch.yml 模板不是 loader 的 insert 形态')
  })

  test('package.json 的 files/exports 覆盖新产物（npm pack 不带丢）', () => {
    for (const needle of ["'cordis.patch.yml'", "'locale/*.json'", "'icon.svg'"]) {
      assert.ok(
        SRC.includes(`files: ['lib', ${needle}`) || SRC.includes(`files: ['lib', 'cordis.patch.yml', 'locale/*.json', 'icon.svg'`),
        `package.json files 未包含 ${needle} ⇒ npm pack 后官方通道缺文件`,
      )
    }
    assert.ok(SRC.includes("'./locale/*.json': './locale/*.json'"), 'exports 未暴露 ./locale/*.json ⇒ meta 读不到')
    assert.ok(SRC.includes("'./icon': './icon.svg'"), 'exports 未暴露 ./icon ⇒ 图标读不到')
  })

  test('已构建的 lib/index.js 与 src 同步（否则运行中的注入器仍发旧模板）', { skip: LIB === undefined && 'lib/index.js 未构建' }, () => {
    assert.ok(LIB !== undefined)
    assert.ok(LIB.includes('cordis.patch.yml'), 'lib/index.js 陈旧：重跑 tsdown / prepare.mjs')
    assert.ok(LIB.includes('locale/en.json'), 'lib/index.js 陈旧：缺本轮 scaffold 展示资源，重跑构建')
  })
})