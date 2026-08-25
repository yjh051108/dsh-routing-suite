# dsh-super-injector 安装手册

> 给第一次接触的人/agent 看。三种方式任选其一，**推荐方式 A**。
> 装完用第 5 节验证，装不上看第 6 节排查，想卸载看第 7 节。
>
> ⚠️ **Windows 用户注意**：下文命令为 bash 语法（`~/`、`mkdir -p`、`tar`、`ln -s`）。
> 请使用 **Git Bash**（Git for Windows 自带）或 WSL 执行；PowerShell 需要等价改写
> （`~` → `$HOME`、`mkdir -p` → `New-Item -ItemType Directory -Force`、`tar` 直接可用）。

---

## 1. 这是什么（30 秒理解）

dsh-super-injector 是 DSH 的**插件注入器**：装好它之后，任意本地插件包都能**免重启**注入运行中的 DSH（`dev_inject_plugin` 一句话的事），还自带热重载、自重载、卸载即净、一键自检。

它本身也是一个标准 DSH 插件（`@yjh051108/dsh-super-injector`），所以安装它 = 走 DSH 官方装配路径一次，之后万物皆可注入。

---

## 2. 方式 A：Release 包安装（推荐，免构建）

### 第 1 步：下载

从 [Releases](https://github.com/yjh051108/dsh-super-injector/releases) 下载最新版：

```
dsh-external-dsh-super-injector-<版本>.tgz
```

> 例如你下载的是 0.2.1，文件名为 `dsh-external-dsh-super-injector-0.2.1.tgz`。
> 下面命令里的 `<版本>` 一律替换成你实际下载的版本号。

### 第 2 步：解压

```bash
# 解压到任意目录（示例；<版本> 换成实际版本号）
mkdir -p ~/dsh-super-injector && tar -xzf dsh-external-dsh-super-injector-<版本>.tgz -C ~/dsh-super-injector --strip-components=1
```

解压后目录里应有：`lib/`、`cordis.patch.yml`、`package.json`、`README.md`、`INSTALL.md`。

### 第 3 步：装配

```bash
dsh plugin --profile web add ~/dsh-super-injector
```

### 第 4 步：重启生效

重启 DSH web 进程（bundle 装配在启动时完成）。重启后向 agent 说一句：`dev_plugin_status`——看到 `dsh-super-injector` 且状态 active 即成功。

> 不想重启？如果你已有另一台机器/环境装过注入器，可以用它的 `dev_inject_plugin` 直接注入本目录（免重启）。

---

## 3. 方式 B：git 装配

```bash
dsh plugin --profile web add github:yjh051108/dsh-super-injector
```

重启 web 后同上验证。（git 安装只取源码，需要本机有构建环境：bash + node + npm + DSH checkout 或 `DSH_CHECKOUT` 环境变量。）

---

## 4. 方式 C：手动 patch（最底层，什么都依赖没有时）

编辑 `~/.dsh/profiles/web/cordis.patch.yml`，把内容替换为：

```yaml
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; !!js expressions allowed).

- id: dsh-super-injector
  name: '@yjh051108/dsh-super-injector'
  config: {}
```

并且保证包能被 loader 解析：把插件目录链接到 profile 的 node_modules。

**先确保父目录存在**（全新 profile 上 `@dsh-external` 可能不存在，否则链接会报"系统找不到指定的路径"）：

```bash
mkdir -p ~/.dsh/profiles/web/node_modules/@dsh-external
```

再建立链接：

```bash
# Windows（junction，无需管理员；用 Git Bash 执行）
ln -s /你的路径/dsh-super-injector ~/.dsh/profiles/web/node_modules/@yjh051108/dsh-super-injector
# 或 cmd（Windows 原生）
mklink /J "%USERPROFILE%\.dsh\profiles\web\node_modules\@dsh-external\dsh-super-injector" "D:\你的路径\dsh-super-injector"
# Linux/macOS（软链）
ln -s /你的路径/dsh-super-injector ~/.dsh/profiles/web/node_modules/@yjh051108/dsh-super-injector
```

> ⚠️ `cordis.patch.yml` 必须是**单一顶层值**（要么 `[]`，要么 `- id:` 列表，不能两者混存——否则 YAML 解析报错）。
>
> ⚠️ **同 id 条目只允许一条**（dsh loader 装配遇同 id 直接报 `duplicate loader entry id`，启动即崩）。
> 方式 C 是给"什么都不依赖"的场景兜底的，**重复执行 / 重复粘贴会制造重复 id**。
> 如果之前已经装过注入器（方式 A/B），**不要**再手动 patch 一次——先跑 `dev_fix_patch` 检查去重。

---

## 5. 故障修复：启动崩溃 `duplicate loader entry id`

### 症状

dsh 启动即退出，报错含：

```
Error: dsh: plugin tree failed to load: failed to apply loader entry include (cordis:include):
duplicate loader entry id: <id>
```

**原因**：`~/.dsh/profiles/<profile>/cordis.patch.yml` 里同 id 条目出现两次（手动 patch
重复执行、重复粘贴、或注入器旧版本盲追加写入）。dsh loader 要求 id 唯一。

### 修复（dsh 起不来时）

发布包自带独立修复脚本（零依赖，node 直接跑，不需要 dsh 启动）：

```bash
# 解压目录里（含 scripts/fix-patch.mjs）：
node scripts/fix-patch.mjs            # 修复全部 profile（自动备份原文件）
node scripts/fix-patch.mjs --check    # 只检查不写（退出码 0=健康 1=有重复）
node scripts/fix-patch.mjs --profile web   # 只修 web profile
```

修复后重新启动 dsh 即可。

### 修复（dsh 能启动时）

直接让注入器修（等价操作，含备份）：

```
dev_fix_patch          # 修复全部 profile
dev_fix_patch --check  # 只检查
```

### 预防

- 注入器 ≥0.3.3 的 `writePatch` **按 id 幂等去重**——它自己写 patch（卸载 disabled、
  self-test 等）不会再制造重复；已有重复也会在写入时顺带清理。
- 手动 patch 前先确认没有装过注入器；装过就用 `dev_fix_patch --check` 验证。

重启 web 后验证。

---

## 5. 验证是否装好

装好后对 agent 说（或自己跑）：

```text
dev_plugin_status     → 看到 dsh-super-injector active，且操作统计面板正常
dev_self_test         → 一键回归 8 项，期望全部 PASS（含注入/热重载/自重载节流/预检拦截/卸载）
```

`dev_self_test` 全部 PASS = 注入器及其环境完全健康。

---

## 6. 常见问题排查

| 症状 | 原因与解法 |
|---|---|
| `dsh` 命令不存在 | dsh CLI 不在 PATH。Windows 上它随 DSH 安装提供（如 `C:\Users\你\.workbuddy\binaries\node\versions\22.22.2\dsh.cmd`），确认 PATH 或使用完整路径 |
| 装了但 `dev_*` 工具不存在 | 注入器未装配成功。检查：bundle 是否在 `~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles` 里；web 是否重启过；确认装的是**正在运行的 profile**（`--profile web` 与你的启动 profile 一致） |
| 装配报 `entry not found` | patch 格式错误（顶层 `- id:` 而不是 `- insert:` 包裹）。参考方式 C 的示例 |
| YAML 解析报错（两个顶层值） | `cordis.patch.yml` 里同时存在 `[]` 和 `- id:` 条目。清理为单一形式 |
| `dev_build_plugin` 报 bash/node 找不到 | 需要 bash（Git for Windows/PortableGit）与 node 在 PATH；或设置 `DSH_CHECKOUT` 环境变量指向 dsh 源码 checkout |
| GitHub 下载/克隆失败 | 网络问题：换代理/镜像，或改用方式 C 手动装配 |
| 注入插件报 `client ✗` | 若插件无 client 声明，这是预期（输出会显示"跳过"）；若显示"注册失败"，检查插件 client bundle 是否构建（`npm run build:client`） |
| 自检的节流/预检显示 `[EXPECTED]` | 这是预期行为（防循环自杀的节流、预检拦截坏代码），计入 PASS，不是故障 |
| 插件升级后 DSH 报版本不兼容 | 本插件 peerDependencies 全是范围声明（`>=0.0.1-rc <2`），DSH 升级无需改插件 |

---

## 7. 卸载 / 回滚

```bash
# 1. 从 profile bundles 移除（官方路径）
dsh plugin --profile web remove @yjh051108/dsh-super-injector

# 2. 清理 profile patch 里的 disabled/配置条目（若存在）
#    编辑 ~/.dsh/profiles/web/cordis.patch.yml，删除含 dsh-super-injector 的条目，
#    保持文件为单一顶层值（[] 或列表）

# 3. 删除 node_modules 链接（若存在）
rm -rf ~/.dsh/profiles/web/node_modules/@yjh051108/dsh-super-injector

# 4. 清理运行时注入清单（若走的是运行时注入）
#    重启后由 agent 执行 dev_uninject_plugin，或直接删除 ~/.dsh/super-injector/registry.json
```

重启 web 后 `dev_*` 工具消失即卸载完成。若只是临时禁用：在 patch 里给 `dsh-super-injector` 加 `disabled: true` 即可（保留数据，随时恢复）。

---

## 8. 给 agent 的一句话

> 本环境装有 dsh-super-injector（dev_* 工具）：任意本地插件包可运行时注入——工具包/守护循环（timer+LLM 自主 agent loop）/UI 面板/混合形态，同一通道；注入即完整生效（host+UI）、可热重载与自重载、卸载即净。插件自身的提示词/工具/循环皆可自我优化；建新插件优先克隆/借鉴/重构生态已有资源，不重复造轮子。若注入器无法支撑此闭环，优先修复注入器。从零体验路径：dev_plugin_status → dev_self_test → dev_scaffold_plugin → dev_build_plugin → dev_inject_plugin → dev_uninject_plugin。

---

**仓库**：https://github.com/yjh051108/dsh-super-injector
**Releases**：https://github.com/yjh051108/dsh-super-injector/releases
