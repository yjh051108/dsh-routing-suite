/**
 * gitbash-executor — Git for Windows (MSYS) bash as a preset shell service (win32).
 *
 * 机制参照 [liceses/dsh-gitbash-preset](https://github.com/liceses/dsh-gitbash-preset)（MIT）：
 * host 组合在 win32 只装配 pwsh 的 shell seam（dsh-base disabled bash-sandbox），
 * 本行在预设内以 isolate realm 提供私有 `shell` 服务 + 同组 `tool-bash`，
 * 让 Windows 上拿到真正的 Git Bash（<gitBash> -lc <command> 每次新 shell，无 PTY 持久会话）。
 *
 * 诚实边界（不绕过沙箱）：MSYS 运行时无法在 Windows 受限令牌内启动（信号管道限制）——
 * 执行器不声明 sandboxMode（tool-bash 因此不做策略检查），限制由工具描述/阶段指引说明：
 * workspace-write（或更窄）下 bash 启动可能失败，按指引做单次 danger-full-access 升级。
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export const name = 'gitbash-executor'
export const inject = ['subprocess']

/** Git Bash 探测：GIT_BASH env → 常见安装目录 → PATH 兜底 'bash'（bootstrap 已前置 Git bin）。 */
export function gitBashPath(config = {}) {
  const env = config.shellPath || process.env.GIT_BASH
  if (env && existsSync(env)) return env
  const pf = process.env['ProgramFiles'] || 'C:\\Program Files'
  const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const la = process.env['LOCALAPPDATA'] || join(homedir(), 'AppData\\Local')
  for (const p of [
    join(pf, 'Git\\bin\\bash.exe'),
    join(pf, 'Git\\usr\\bin\\bash.exe'),
    join(pf86, 'Git\\bin\\bash.exe'),
    join(la, 'Programs\\Git\\bin\\bash.exe'),
  ]) if (existsSync(p)) return p
  return 'bash' // PATH 兜底
}

export function apply(ctx, config = {}) {
  const defaultTimeout = Number(config.timeoutMs || 120000)
  const defaultMaxOutput = Number(config.maxOutputBytes || 256 * 1024)
  const bashPath = gitBashPath(config)

  const finalOutput = (reader) => {
    try {
      const r = reader?.readFrom?.(0)
      return { text: (r && (r.text || '')) || '', truncated: Boolean(r?.truncated), spillPath: r?.spillPath }
    } catch { return { text: '', truncated: false } }
  }
  const mkSpec = (request) => {
    const timeoutMs = Math.min(600000, Number(request?.timeoutMs || defaultTimeout))
    const stdoutMaxBytes = Math.min(4 * 1024 * 1024, Number(request?.stdoutMaxBytes || defaultMaxOutput))
    return {
      command: String(request?.command || ''),
      workdir: request?.workdir || process.cwd(),
      timeoutMs,
      stdoutMaxBytes,
      ...request?.signal !== void 0 ? { signal: request.signal } : {},
    }
  }

  const shell = {
    // 不声明 sandboxMode：Git Bash（MSYS）在受限令牌内无法启动——限制由指引说明，不做策略伪装
    resolve(request) { return mkSpec(request) },
    async run(spec) {
      const ac = new AbortController()
      const timer = setTimeout(() => ac.abort(), spec.timeoutMs)
      let outcome
      let outReader
      let errReader
      let spawnError = ''
      try {
        const handle = ctx.subprocess.spawn({
          argv: [bashPath, '-lc', spec.command],
          cwd: spec.workdir,
          stdio: {
            stdin: 'ignore',
            stdout: { maxBytes: spec.stdoutMaxBytes, spill: { maxBytes: spec.stdoutMaxBytes * 2 } },
            stderr: { maxBytes: spec.stdoutMaxBytes, spill: { maxBytes: spec.stdoutMaxBytes * 2 } },
          },
          graceMs: 3000,
          signal: spec.signal || ac.signal,
        })
        outcome = await handle.done
        outReader = handle.collected?.stdout
        errReader = handle.collected?.stderr
      } catch (e) {
        spawnError = (e && e.message) || String(e)
      } finally { clearTimeout(timer) }
      const timedOut = ac.signal.aborted
      return {
        exitCode: Number(outcome?.exitCode ?? outcome?.code ?? -1),
        signal: outcome?.signal ?? null,
        timedOut,
        aborted: spawnError !== '' ? true : ac.signal.aborted && !timedOut,
        timeoutMs: spec.timeoutMs,
        stdout: finalOutput(outReader),
        stderr: finalOutput(errReader),
        ...spawnError ? { spawnError } : {},
      }
    },
    start(spec) {
      const handle = ctx.subprocess.spawn({
        argv: [bashPath, '-lc', spec.command],
        cwd: spec.workdir,
        stdio: {
          stdin: 'ignore',
          stdout: { maxBytes: spec.stdoutMaxBytes, spill: { maxBytes: spec.stdoutMaxBytes * 2 } },
          stderr: { maxBytes: spec.stdoutMaxBytes, spill: { maxBytes: spec.stdoutMaxBytes * 2 } },
        },
        graceMs: 3000,
        signal: spec.signal,
      })
      return { done: handle.done, pid: handle.pid, collected: handle.collected }
    },
  }

  ctx.provide('shell', shell)
}
