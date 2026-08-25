# AGENTS.md — dsh-router-standard 预设开发指南

> **中心思想（理念与精神）** —— 这是本预设研发的最高纲领，一切决策以它为准。
>
> 1. **研发核心是「底层注意力机制」和「交付质量收敛」，不是自研工具。** 工具（page_check 等）
>    大道至简——删掉反复出 bug 的自研工具，让模型自己装 CLI 自测（bash 跑 playwright/headless Chrome），
>    预设专注注意力机制 + delivery_check 门禁。
> 2. **从「模型底层特性」入手，用数据说话，拒绝形而上学。** 每一条引导/机制都要在真实会话或 api1
>    实测（读 `reasoning_content`）验证过，不凭空造机制、不为填充而改。
> 3. **深度思考无所谓，重要的是「提高思考质量、打破局限思维」。** 不压制思考、不催速；
>    但警惕"局部最优思维"（卡在单点细节反复循环）——引导模型保持整体可用、别被顽固细节卡住交付。
> 4. **道德为主、法治为辅。** 引导内在动机（"做扎实、给安全感、不焦虑下阶段"）优于外部强制规则；
>    gate（delivery_check）兜底施压但不制造焦虑。
> 5. **不惯性、不时务**：报废的技术不优化、直接删；不因"以前这么做"而延续；每个判断基于当下的实测。
> 6. **重成果，思时间**：看思考质量/是否专注/是否偏离，而非跑多久；每会话 2h 预算上限。
> 7. **对外：公开产线要稳定**；对数据：标签+实验记录，测完归档到 `dsh-实测归档/`，测试环境保持干净。
>
> 相关演进见 `CHANGELOG.md`；核心机制判断见 `docs/` 与归档 `核心机制反馈-v123-优化方向.md`。

> `dsh-routing-suite/preset` = 路由预设源码仓库（子模块），含三大预设：
> **router-standard（v34，主力）** / **router-react（v17）** / **router-spec（v10)**。
> 本文档给 agent/开发者：怎么改、怎么验、怎么同步到 DSH、怎么生效。
> 权威规范（哲学/设计）见 `README.md` 与 `docs/`；演进史见 `CHANGELOG.md`。

## 开发链路全貌

```
改源码(无版本别名) → selftest 就地验证 → 同步脚本 → 运行目录(版本快照) → dev_reload → DSH 生效
```

每个预设都是「**源码 = 编辑基准，运行目录 = 版本快照**」：

| 预设 | 源码目录(preset/preset/) | 运行目录(~/.dsh/.agent-presets/) | 当前版本 |
|---|---|---|---|
| router-standard | `router-standard/` | `router-standard-v22/` | v34 |
| router-react | `router-react/` | `router-react/` | v17 |
| router-spec | `router-spec/` | `router-spec/` | v10 |

> ⚠️ **运行目录名只是历史遗留**：`router-standard-v22` 里的 `v22` 是旧目录名，**内容是 v34**（agent.cordis.yml 指 `-v34`）。改名会有风险，勿动目录名。

## 编辑基准（改哪里）

**改源码目录的无版本别名**，不是带版本号文件：

- `preset/preset/router-standard/router-bootstrap.mjs` ← 主编辑对象
- `preset/preset/router-standard/router-core.mjs` ← 路由逻辑
- `preset/preset/router-standard/agent.cordis.yml` ← 装配配置（persona/sections/工具行）
- 源码里**无版本别名** == 带版本 `-v34.mjs`（一致），无版本别名是纯源，`-v34` 是同步生成的快照。

> 三个文件常联动改：bootstrap（机制）+ core（逻辑）+ agent.cordis.yml（工具面/版本戳）。

## 验证（改完就地测）

```bash
# 源码目录即可验证（selftest 已同步进源码）：
node preset/router-standard/router-bootstrap-v34.selftest.mjs   # → SELFTEST PASS
# 或完整测试（依赖 node，来自 Eldwen 用户 nvm）：
# node --test router.test.mjs   # 单元测试
```

## 同步到 DSH（让改动能跑）

```bash
node scripts/sync-preset.cjs router-standard          # 复制 bootstrap/core/agent.cordis/preset/selftest → 运行目录 + 跑 selftest
node scripts/sync-preset.cjs router-standard --bump   # + 递增 ?v=N（绕 ESM 缓存）
node scripts/sync-preset.cjs router-react | router-spec
```

- 同步脚本替代 `routing-probe/sync-*-v*.cjs` 那些散落脚本（已废弃）。
- **`--bump` 在改完 agent.cordis.yml/需要 DSH 加载新代码时用**（递增源码+运行目录双侧 `?v=N`，保持一致）。

## 生效（DSH 加载新代码）

DSH 用 ESM 按 URL 缓存模块，**原地覆盖不生效**，需绕缓存：

```bash
# 会话里对模型说（注入器提供）：
dev_reload_preset router-standard    # ?v=N query 变化 → 新会话立即用新代码
```

> 若 `?v=N` 未变，DSH 内存里还是旧代码。**bump 必须同时改源码 & 运行目录**（脚本 `--bump` 已做）。

## 关键坑（实测血泪）

1. **`.dsh` 根目录错位**：shell 里 `USERPROFILE/HOME=Administrator`，但 DSH 真实 profile/运行目录在 **`C:\Users\Eldwen`**。
   同步脚本已显式用 `DSH_HOME || 'C:\\Users\\Eldwen'`，**勿改成走 `USERPROFILE`**（会让你同步到错误路径）。
2. **ESM 缓存**：改代码必须 `--bump` + `dev_reload_preset`，否则不生效。
3. **无版本别名 ≠ 历史**：源码的 `router-bootstrap.mjs`/`router-core.mjs` 是**当前版兼容别名**（probe/测试引用），
   不是历史文件。**勿删、勿移**。真正历史版本在 `docs/archive/`（react v1-8/spec v1）。
4. **历史版本堆积**：运行目录旧版本文件已在 `_archive_versions/`（v22-v33），源码只存当前版。
   若再堆积，用 `_archive_versions/` 方式归档而非删除。

## 版控边界（.gitignore）

- `probe/` 是**历史实验快照**（脚本已断链，不修依赖），数据/大件入 `.gitignore`。
- **保留**：`probe/*.mjs`、`probe/*.py`、`probe/README.md`（历史档案）。
- **忽略**：`probe/deepseek-v4-pro-weights`/`dsh-2020-dataset`/`deepseek-tokenizer`/`results`/`sessions`/候选池 json。
- probe 详细说明见 `probe/README.md`。

## 工作流速查

```bash
# 1. 改编辑基准（无版本别名）
# 2. 就地验证
node preset/router-standard/router-bootstrap-v34.selftest.mjs
# 3. 同步到 DSH（带 bump 绕缓存）
node scripts/sync-preset.cjs router-standard --bump
# 4. DSH 会话里 reload
dev_reload_preset router-standard
```
