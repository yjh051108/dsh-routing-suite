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

> `dsh-routing-suite/preset` = 路由预设源码目录（仓库内普通目录），含三大预设：
> **router-standard（v34，主力）** / **router-react（v17）** / **router-spec（v10)**。
> 本文档给 agent/开发者：怎么改、怎么验、怎么同步到 DSH、怎么生效。
> 权威规范（哲学/设计）见 `README.md` 与 `docs/`；演进史见 `CHANGELOG.md`。

## 开发链路全貌（DSH 0.2.x · bundle 模式）

```
改源码(无版本别名) → selftest 就地验证 → sync-preset 同步带版本快照 + bump patch ?v=N → dev_reload_preset → DSH 生效
```

DSH 0.2.x 起 agent preset **不再从 `~/.dsh/.agent-presets/` 目录扫描加载**（该目录已无任何读取方）。
预设改为由包的 `cordis.patch.yml`（`dsh.bundle.patch`）以 `preset-<id>` 声明，随 profile bundle 装载：

| 预设 | 源码目录(`preset/`) | patch 声明 id | bootstrap 包子路径 | 当前版本 |
|---|---|---|---|---|
| router-standard | `router-standard/` | `preset-router-standard` | `@dsh-external/dsh-super-injector/preset/router-standard/router-bootstrap-v34.mjs?v=88` | v34 |
| router-react | `router-react/` | `preset-router-react` | `.../preset/router-react/router-bootstrap-v17.mjs` | v17 |
| router-spec | `router-spec/` | `preset-router-spec` | `.../preset/router-spec/router-bootstrap-v10.mjs` | v10 |

> 声明文件 = 仓库根 `cordis.patch.yml`；安装后同一份文件在 profile 的
> `node_modules/@dsh-external/dsh-super-injector/cordis.patch.yml`。

## 编辑基准（改哪里）

**改源码目录的无版本别名**，不是带版本号文件：

- `preset/router-standard/router-bootstrap.mjs` ← 主编辑对象
- `preset/router-standard/router-core.mjs` ← 路由逻辑
- `preset/router-standard/agent.cordis.yml` ← 装配配置（persona/sections/工具行）
- 源码里**无版本别名** == 带版本 `-v34.mjs`（一致），无版本别名是纯源，`-v34` 是同步生成的快照。

> 三个文件常联动改：bootstrap（机制）+ core（逻辑）+ agent.cordis.yml（工具面/版本戳）。

## 验证（改完就地测）

```bash
# 源码目录即可验证（selftest 已同步进源码）：
node preset/router-standard/router-bootstrap-v34.selftest.mjs   # → SELFTEST PASS
# 或完整测试：
node --test preset/router.test.mjs
```

## 同步到 DSH（让改动能跑）

```bash
node preset/scripts/sync-preset.cjs router-standard          # 以无版本别名重生成 router-bootstrap-vN.mjs + router-core-vN.mjs，并跑 selftest
node preset/scripts/sync-preset.cjs router-standard --bump   # + 递增根 cordis.patch.yml 里的 ?v=N（绕 ESM 缓存）
node preset/scripts/sync-preset.cjs router-react             # | router-spec
```

- 同步脚本替代 `routing-probe/sync-*-v*.cjs` 那些散落脚本（已废弃）。
- **`--bump` 在改完 bootstrap/core 后必用**：ESM 按 URL 缓存，`?v=N` 不变则新代码不会被加载。

## 生效（DSH 加载新代码）

DSH 用 ESM 按 URL 缓存模块，**原地覆盖不生效**，需绕缓存：

```bash
# 会话里对模型说（注入器提供）：
dev_reload_preset router-standard    # bump 包内 patch 的 ?v=N → 重建 preset 声明行 → 新会话立即用新代码
```

> 实现：改内存 `config.plugins` 里包子路径的 `?v=N` → `parent.remove(id)` + `parent.create(newOptions)`
> 重建 `preset-<id>` 声明行（`dispose+update` 与 `Include.refresh()` 均无效，已实测）；patch 文件同步 bump 以持久化。


## 关键坑（实测血泪）

1. **不再有「运行目录」**：0.2.x 下没有 `.agent-presets` 目录可同步。sync-preset 只改仓库内文件
   （`preset/<name>/` + 根 `cordis.patch.yml`），安装位置由 profile bundle 决定
   （`<profile>/node_modules/@dsh-external/dsh-super-injector/`）。旧脚本里的 `DSH_HOME` 与作者机器路径
   硬编码已删除——**不要再引入任何硬编码 profile 路径**。
2. **ESM 缓存**：改代码必须 `--bump` + `dev_reload_preset`，否则不生效。
3. **无版本别名 ≠ 历史**：源码的 `router-bootstrap.mjs`/`router-core.mjs` 是**当前版兼容别名**（probe/测试引用），
   不是历史文件。**勿删、勿移**。真正历史版本在 `docs/archive/`（react v1-8/spec v1）。
4. **历史版本堆积**：旧版本按 `docs/archive/` 方式归档（react v1-v8 / spec v1 已在那里），源码只存当前版。
   新归档照此办理，勿在 preset 目录里堆 `_archive_versions/`。

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
node preset/scripts/sync-preset.cjs router-standard --bump
# 4. DSH 会话里 reload
dev_reload_preset router-standard
```
