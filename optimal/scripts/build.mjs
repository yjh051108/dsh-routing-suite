/**
 * build — dsh-optimal-mode host 构建：把 src/*.js 复制到 lib/（纯 ESM,零编译,产物即源码）。
 *
 * 为什么 lib/（而非官方链 src 直跑）：注入器热重载/自重载通道按「构建产物形态」工作
 * （<pkg>/lib/index.js + 磁盘降级 import realpath），src 直跑不在 loader 缓存匹配范围,
 * 无法在线换代。复制产物保证 lib URL 是全新模块树——reload 即换新代码。
 *
 * 用法：node scripts/build.mjs（package.json scripts.build）
 */
import { cpSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const srcDir = join(root, 'src')
const libDir = join(root, 'lib')

rmSync(libDir, { recursive: true, force: true })
mkdirSync(libDir, { recursive: true })

const clientDir = join(root, 'client')

let count = 0
for (const f of readdirSync(srcDir)) {
  const p = join(srcDir, f)
  if (statSync(p).isFile() && /\.(js|mjs)$/.test(f)) {
    cpSync(p, join(libDir, f))
    count++
  }
}
// client 入口（exports["./client"] 指向 lib/client.js；dsh.client 声明触发
// dsh-client-modules 装配链 serve /plugins/<id>/client.js）
mkdirSync(join(libDir, 'client'), { recursive: true })
for (const f of readdirSync(clientDir)) {
  const p = join(clientDir, f)
  if (statSync(p).isFile() && /\.(js|mjs)$/.test(f)) {
    cpSync(p, join(libDir, 'client', f))
    count++
  }
}
cpSync(join(clientDir, 'client.js'), join(libDir, 'client.js'))
count++
if (!existsSync(join(libDir, 'index.js'))) {
  console.error('BUILD FAIL: lib/index.js 缺失')
  process.exit(1)
}
console.log(`BUILD OK: ${count} files → lib/`)
